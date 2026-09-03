import { googleMapsConfig } from '../lib/env';
import { loadGoogleMaps } from '../lib/googleMapsLoader';
import { Place } from '../types';
import { GooglePlaceResult } from './googlePlacesTypes';
import { googlePlaceToVybePlace } from './googlePlacesAdapter';

const PLACE_FIELDS: string[] = ['id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'location', 'types', 'primaryType', 'rating', 'userRatingCount', 'priceLevel', 'photos', 'regularOpeningHours', 'businessStatus', 'nationalPhoneNumber', 'websiteURI'];
const PRICE_LEVEL_ORDER = ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'];

interface RawPlacePhoto {
  name?: string;
  heightPx?: number;
  widthPx?: number;
  authorAttributions?: Array<{ displayName?: string; uri?: string; photoURI?: string }>;
  /** Modern Places API photo helper (available on current Maps JS releases). */
  getURI?: (options?: { maxWidthPx?: number; maxHeightPx?: number }) => string | undefined;
}

/**
 * Maps a raw Places API photo object to a displayable photo URL.
 *
 * The modern Places API exposes `photos` on Place results; each entry carries a
 * stable `name` (e.g. "places/ChIJ…/photos/AU…") and a `getURI()` helper that
 * requires { maxWidthPx / maxHeightPx } options (the older { maxWidth /
 * maxHeight } spelling returns nothing on current releases, which is why every
 * photo silently disappeared). When getURI is unavailable we build the
 * equivalent media URL from the stable photo `name` instead.
 */
function photoToUrl(photo: RawPlacePhoto): string | null {
  try {
    if (typeof photo.getURI === 'function') {
      const uri = photo.getURI({ maxWidthPx: 1200, maxHeightPx: 750 });
      if (typeof uri === 'string' && uri.length > 10) return uri;
    }
  } catch {
    // Fall through to the name-based media URL below.
  }
  const name = typeof photo.name === 'string' ? photo.name.trim() : '';
  if (!name) return null;
  if (!/^places\//.test(name) || name.length > 300) return null;
  const key = googleMapsConfig.apiKey;
  if (!key) return null;
  return `https://places.googleapis.com/v1/${name}/media?maxHeightPx=750&key=${encodeURIComponent(key)}`;
}

async function importPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (!googleMapsConfig.apiKey) throw new Error('Google Maps API key not configured');
  await loadGoogleMaps();
  if (!window.google?.maps?.importLibrary) throw new Error('Google Maps JavaScript API did not provide importLibrary');
  return window.google.maps.importLibrary('places');
}

async function libraryPlaceToResult(p: google.maps.places.Place): Promise<GooglePlaceResult> {
  const loc = p.location;
  const priceIndex = p.priceLevel ? PRICE_LEVEL_ORDER.indexOf(p.priceLevel) : -1;
  let openNow: boolean | undefined;
  if (p.regularOpeningHours) {
    try {
      const x = p as google.maps.places.Place & { isOpen?: () => Promise<boolean | undefined> };
      if (typeof x.isOpen === 'function') openNow = await x.isOpen();
    } catch {
      // Keep unknown rather than guessing.
    }
  }
  const photos = (p.photos ?? []).slice(0, 5).flatMap(rawPhoto => {
    const photo = rawPhoto as RawPlacePhoto;
    const uri = photoToUrl(photo);
    if (!uri) return [];
    const attrs = (photo.authorAttributions ?? [])
      .map(author => ({ displayName: author.displayName, ...(author.uri ? { uri: author.uri } : {}), ...(author.photoURI ? { photoUri: author.photoURI } : {}) }))
      .filter((author): author is { displayName: string } & { uri?: string; photoUri?: string } => Boolean(author.displayName));
    return [{ photo_reference: uri, height: photo.heightPx ?? 0, width: photo.widthPx ?? 0, html_attributions: attrs.map(a => a.displayName), author_attributions: attrs }];
  });
  const primary = p as google.maps.places.Place & { primaryType?: string };
  return {
    place_id: p.id,
    name: p.displayName ?? '',
    formatted_address: p.formattedAddress ?? undefined,
    geometry: loc ? { location: { lat: loc.lat(), lng: loc.lng() } } : undefined,
    types: p.types ?? undefined,
    primary_type: primary.primaryType ?? undefined,
    rating: p.rating ?? undefined,
    user_ratings_total: p.userRatingCount ?? undefined,
    price_level: priceIndex >= 0 ? priceIndex : undefined,
    photos,
    opening_hours: p.regularOpeningHours ? { weekday_text: p.regularOpeningHours.weekdayDescriptions ?? undefined, open_now: openNow } : undefined,
    formatted_phone_number: p.nationalPhoneNumber ?? undefined,
    website: p.websiteURI ?? undefined,
    business_status: p.businessStatus ?? undefined,
    vicinity: p.shortFormattedAddress ?? p.formattedAddress ?? undefined,
  };
}

async function toVybePlaces(places: google.maps.places.Place[] | null | undefined): Promise<Place[]> {
  return Promise.all((places ?? []).map(async p => googlePlaceToVybePlace(await libraryPlaceToResult(p))));
}

const buildNearbyRequest = (lat: number, lng: number, radiusKm: number, includedTypes?: string[]): google.maps.places.SearchNearbyRequest => ({
  fields: PLACE_FIELDS,
  locationRestriction: { center: { lat, lng }, radius: Math.min(radiusKm * 1000, 50000) },
  maxResultCount: 20,
  ...(includedTypes?.length ? { includedTypes } : {}),
});

async function searchNearbyGooglePlacesSingle(lat: number, lng: number, radiusKm: number, types?: string[]): Promise<Place[]> {
  const { Place } = await importPlacesLibrary();
  const { places } = await Place.searchNearby(buildNearbyRequest(lat, lng, radiusKm, types));
  return toVybePlaces(places);
}

export async function searchNearbyGooglePlaces(lat: number, lng: number, radiusKm = 5, type?: string | string[], keyword?: string): Promise<Place[]> {
  if (keyword?.trim()) return searchGooglePlacesText(keyword, lat, lng, radiusKm);
  const includedTypes = Array.isArray(type) ? [...new Set(type.filter(Boolean))] : type ? [type] : undefined;
  return searchNearbyGooglePlacesSingle(lat, lng, radiusKm, includedTypes);
}

const TEXT_SEARCH_MIN_RADIUS_KM = 25;

/**
 * Rectangle bounds (in degrees) that enclose a radius in km around a center.
 * Text Search (New) only accepts a strict locationRestriction as a bounding
 * rectangle (never a circle — the runtime rejects circles with "Invalid
 * LocationRestriction"), so the radius is converted to a lat/lng box.
 */
function radiusToBounds(lat: number, lng: number, radiusKm: number): google.maps.LatLngBoundsLiteral {
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05);
  const dLat = radiusKm / kmPerDegLat;
  const dLng = radiusKm / kmPerDegLng;
  return {
    north: Math.min(lat + dLat, 85),
    south: Math.max(lat - dLat, -85),
    east: Math.min(lng + dLng, 180),
    west: Math.max(lng - dLng, -180),
  };
}

export async function searchGooglePlacesText(query: string, lat?: number, lng?: number, radiusKm?: number, includedType?: string): Promise<Place[]> {
  const { Place } = await importPlacesLibrary();
  const request: google.maps.places.SearchByTextRequest = {
    textQuery: query,
    fields: PLACE_FIELDS,
    maxResultCount: 20,
    ...(includedType ? { includedType, useStrictTypeFiltering: true } : {}),
  };
  if (lat !== undefined && lng !== undefined) {
    // Strict location restriction (never a soft bias): a text search must not
    // return venues thousands of kilometers away just because the query string
    // is sparse near the user. The box is capped at 50 km, which keeps every
    // Algerian city/metro-area search local while allowing results to fill the
    // whole metro area.
    const restrictionKm = Math.min(Math.max(radiusKm ?? TEXT_SEARCH_MIN_RADIUS_KM, TEXT_SEARCH_MIN_RADIUS_KM), 50);
    request.locationRestriction = radiusToBounds(lat, lng, restrictionKm);
  }
  const { places } = await Place.searchByText(request);
  return toVybePlaces(places);
}

export async function getGooglePlaceDetails(placeId: string): Promise<Place | null> {
  const normalizedPlaceId = placeId.trim();
  if (!/^[A-Za-z0-9_-]{1,300}$/.test(normalizedPlaceId)) throw new Error('Invalid Google place ID');
  const { Place } = await importPlacesLibrary();
  const place = new Place({ id: normalizedPlaceId });
  await place.fetchFields({ fields: PLACE_FIELDS });
  if (!place.id || (!place.displayName && !place.location)) return null;
  return googlePlaceToVybePlace(await libraryPlaceToResult(place));
}

export function getGoogleDirectionsUrl(destinationLat: number, destinationLng: number, originLat?: number, originLng?: number): string {
  const destination = `${destinationLat},${destinationLng}`;
  if (originLat !== undefined && originLng !== undefined) return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destination}&travelmode=walking`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

export function getGoogleMapsPlaceUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}
