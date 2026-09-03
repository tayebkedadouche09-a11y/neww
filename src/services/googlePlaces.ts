import { googleMapsConfig } from '../lib/env';
import { loadGoogleMaps } from '../lib/googleMapsLoader';
import { Place } from '../types';
import { GooglePlaceResult } from './googlePlacesTypes';
import { googlePlaceToVybePlace } from './googlePlacesAdapter';

const PLACE_FIELDS: string[] = [
  'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'location',
  'types', 'primaryType', 'rating', 'userRatingCount', 'priceLevel', 'photos',
  'regularOpeningHours', 'businessStatus', 'nationalPhoneNumber', 'websiteURI',
];

const PRICE_LEVEL_ORDER = ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'];

async function importPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (!googleMapsConfig.apiKey) throw new Error('Google Maps API key not configured');
  await loadGoogleMaps();
  if (!window.google?.maps?.importLibrary) {
    throw new Error('Google Maps JavaScript API did not provide importLibrary');
  }
  return window.google.maps.importLibrary('places');
}

async function libraryPlaceToResult(p: google.maps.places.Place): Promise<GooglePlaceResult> {
  const loc = p.location;
  const priceIndex = p.priceLevel ? PRICE_LEVEL_ORDER.indexOf(p.priceLevel) : -1;
  let openNow: boolean | undefined;
  if (p.regularOpeningHours) {
    try {
      const placeWithOpen = p as google.maps.places.Place & { isOpen?: () => Promise<boolean | undefined> };
      if (typeof placeWithOpen.isOpen === 'function') openNow = await placeWithOpen.isOpen();
    } catch {
      // Keep unknown rather than guessing.
    }
  }

  const photos = (p.photos ?? []).slice(0, 5).flatMap(photo => {
    try {
      const uri = photo.getURI({ maxWidth: 1200, maxHeight: 750 });
      const authorAttributions = (photo.authorAttributions ?? [])
        .map(author => ({
          displayName: author.displayName,
          ...(author.uri ? { uri: author.uri } : {}),
          ...(author.photoURI ? { photoUri: author.photoURI } : {}),
        }))
        .filter(author => Boolean(author.displayName));
      return uri ? [{
        photo_reference: uri,
        height: photo.heightPx ?? 0,
        width: photo.widthPx ?? 0,
        html_attributions: authorAttributions.map(a => a.displayName),
        author_attributions: authorAttributions,
      }] : [];
    } catch {
      return [];
    }
  });

  const placeWithPrimary = p as google.maps.places.Place & { primaryType?: string };
  return {
    place_id: p.id,
    name: p.displayName ?? '',
    formatted_address: p.formattedAddress ?? undefined,
    geometry: loc ? { location: { lat: loc.lat(), lng: loc.lng() } } : undefined,
    types: p.types ?? undefined,
    primary_type: placeWithPrimary.primaryType ?? undefined,
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

const buildNearbyRequest = (
  lat: number,
  lng: number,
  radiusKm: number,
  includedTypes?: string[],
): google.maps.places.SearchNearbyRequest => ({
  fields: PLACE_FIELDS,
  locationRestriction: { center: { lat, lng }, radius: Math.min(radiusKm * 1000, 50000) },
  maxResultCount: 20,
  ...(includedTypes?.length ? { includedTypes } : {}),
});

async function searchNearbyGooglePlacesSingle(lat: number, lng: number, radiusKm: number, types?: string[]): Promise<Place[]> {
  const { Place } = await importPlacesLibrary();
  const request = buildNearbyRequest(lat, lng, radiusKm, types);
  const { places } = await Place.searchNearby(request);
  return toVybePlaces(places);
}

export async function searchNearbyGooglePlaces(lat: number, lng: number, radiusKm: number = 5, type?: string | string[], keyword?: string): Promise<Place[]> {
  if (keyword?.trim()) return searchGooglePlacesText(keyword, lat, lng, radiusKm);
  const includedTypes = Array.isArray(type) ? [...new Set(type.filter(Boolean))] : type ? [type] : undefined;
  return searchNearbyGooglePlacesSingle(lat, lng, radiusKm, includedTypes);
}

export async function searchGooglePlacesText(
  query: string,
  lat?: number,
  lng?: number,
  radiusKm?: number,
  includedType?: string,
): Promise<Place[]> {
  const { Place } = await importPlacesLibrary();
  const request: google.maps.places.SearchByTextRequest = {
    textQuery: query,
    fields: PLACE_FIELDS,
    maxResultCount: 20,
    ...(includedType ? { includedType, strictTypeFiltering: true } : {}),
  };
  if (lat !== undefined && lng !== undefined) {
    request.locationBias = { center: { lat, lng }, radius: Math.min((radiusKm ?? 5) * 1000, 50000) };
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
