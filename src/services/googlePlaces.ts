import { googleMapsConfig } from '../lib/env';
import { loadGoogleMaps } from '../lib/googleMapsLoader';
import { Place } from '../types';
import { GooglePlaceResult } from './googlePlacesTypes';
import { googlePlaceToVybePlace } from './googlePlacesAdapter';

/**
 * Google Places service — REAL-world place discovery via the Google Maps
 * JavaScript API's Places library.
 *
 * IMPORTANT ARCHITECTURE NOTE: the Places *Web Service* REST endpoints
 * (`https://maps.googleapis.com/maps/api/place/<method>/json`) do not send
 * CORS headers, so fetch()/XHR calls to them from a browser always fail
 * (opaque response / "Failed to fetch"). This module therefore exclusively
 * uses the browser-compatible Places library obtained through the existing
 * singleton loader's `google.maps.importLibrary("places")` — no second script
 * injection, no REST Places calls.
 *
 * All public methods return normalized VYBE Place models via the single
 * adapter layer (googlePlaceToVybePlace); raw Google objects never leak.
 */

/** Fields requested for every search/details call (new Places API names). */
const PLACE_FIELDS: string[] = [
  'id',
  'displayName',
  'formattedAddress',
  'shortFormattedAddress',
  'location',
  'types',
  'rating',
  'userRatingCount',
  'priceLevel',
  'photos',
  'regularOpeningHours',
  'businessStatus',
  'nationalPhoneNumber',
  'websiteURI',
];

/** New-API price level strings, ordered to match the legacy 0-4 scale. */
const PRICE_LEVEL_ORDER = ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'];

/**
 * Loads the Places library through the existing singleton Google Maps loader.
 * The loader is idempotent — the Maps script is injected at most once and
 * concurrent callers share the same promise.
 */
async function importPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (!googleMapsConfig.apiKey) {
    throw new Error('Google Maps API key not configured');
  }
  await loadGoogleMaps();
  if (!window.google?.maps?.importLibrary) {
    throw new Error('Google Maps JavaScript API did not provide importLibrary');
  }
  return window.google.maps.importLibrary('places');
}

/**
 * Convert a Places-library Place into the GooglePlaceResult shape consumed by
 * the single adapter (googlePlaceToVybePlace). Missing fields stay undefined —
 * no fake values are invented for the UI.
 */
function libraryPlaceToResult(p: google.maps.places.Place): GooglePlaceResult {
  const loc = p.location;
  const priceIndex = p.priceLevel ? PRICE_LEVEL_ORDER.indexOf(p.priceLevel) : -1;

  return {
    place_id: p.id,
    name: p.displayName ?? '',
    formatted_address: p.formattedAddress ?? undefined,
    geometry: loc ? { location: { lat: loc.lat(), lng: loc.lng() } } : undefined,
    types: p.types ?? undefined,
    rating: p.rating ?? undefined,
    user_ratings_total: p.userRatingCount ?? undefined,
    price_level: priceIndex >= 0 ? priceIndex : undefined,
    photos: (p.photos ?? []).slice(0, 5).map(photo => ({
      // getURI() returns a complete signed image URL for the Places JS
      // library — the adapter passes absolute URLs through unchanged.
      photo_reference: photo.getURI({ maxWidth: 1200 }),
      height: photo.heightPx ?? 0,
      width: photo.widthPx ?? 0,
      html_attributions: (photo.authorAttributions ?? []).map(a => a.displayName),
    })),
    opening_hours: p.regularOpeningHours
      ? { weekday_text: p.regularOpeningHours.weekdayDescriptions ?? undefined }
      : undefined,
    formatted_phone_number: p.nationalPhoneNumber ?? undefined,
    website: p.websiteURI ?? undefined,
    business_status: p.businessStatus ?? undefined,
    vicinity: p.shortFormattedAddress ?? p.formattedAddress ?? undefined,
  };
}

function toVybePlaces(places: google.maps.places.Place[] | null | undefined): Place[] {
  return (places ?? []).map(p => googlePlaceToVybePlace(libraryPlaceToResult(p)));
}

/**
 * Search for places near a location using the Places library
 * (`Place.searchNearby`). An explicit keyword is served by a location-biased
 * text search, which is how the JavaScript API expresses "nearby coffee".
 */
export async function searchNearbyGooglePlaces(
  lat: number,
  lng: number,
  radiusKm: number = 5,
  type?: string | string[],
  keyword?: string
): Promise<Place[]> {
  if (keyword && keyword.trim()) {
    return searchGooglePlacesText(keyword, lat, lng, radiusKm);
  }

  const { Place } = await importPlacesLibrary();

  const request: google.maps.places.SearchNearbyRequest = {
    fields: PLACE_FIELDS,
    locationRestriction: {
      center: { lat, lng },
      radius: Math.min(radiusKm * 1000, 50000),
    },
    maxResultCount: 20,
    rankPreference: 'POPULARITY',
  };
  // includedPrimaryTypes accepts up to 50 Table A types, so a whole category
  // group can be filtered server-side by Google in a single call.
  if (type && !(Array.isArray(type) && type.length === 0)) {
    request.includedPrimaryTypes = Array.isArray(type) ? type : [type];
  }

  const { places } = await Place.searchNearby(request);
  // SAFE DIAGNOSTIC (no apiKey/token data): raw Google result count before
  // normalization so we can pinpoint where real places get dropped.
  const typeLabel = Array.isArray(type) ? type.join('+') : type ?? 'any';
  console.log(`[discovery] location=(${lat.toFixed(5)}, ${lng.toFixed(5)}) radiusKm=${radiusKm} type=${typeLabel}`);
  console.log(`[discovery] rawGoogleResultsCount: ${places?.length ?? 0}`);
  const vybePlaces = toVybePlaces(places);
  console.log(`[discovery] normalizedResultsCount: ${vybePlaces.length}`);
  return vybePlaces;
}

/**
 * Search for places by text query using the Places library
 * (`Place.searchByText`), optionally biased to a location.
 */
export async function searchGooglePlacesText(
  query: string,
  lat?: number,
  lng?: number,
  radiusKm?: number
): Promise<Place[]> {
  const { Place } = await importPlacesLibrary();

  const request: google.maps.places.SearchByTextRequest = {
    textQuery: query,
    fields: PLACE_FIELDS,
    maxResultCount: 20,
  };

  if (lat !== undefined && lng !== undefined) {
    request.locationBias = {
      center: { lat, lng },
      radius: Math.min((radiusKm ?? 5) * 1000, 50000),
    };
  }

  const { places } = await Place.searchByText(request);
  // SAFE DIAGNOSTIC: raw Google text-search count before normalization.
  console.log(`[discovery] location=(${lat?.toFixed(5) ?? 'none'}, ${lng?.toFixed(5) ?? 'none'}) textQuery="${query}"`);
  console.log(`[discovery] rawGoogleResultsCount: ${places?.length ?? 0}`);
  const vybePlaces = toVybePlaces(places);
  console.log(`[discovery] normalizedResultsCount: ${vybePlaces.length}`);
  return vybePlaces;
}

/**
 * Get detailed information about a place by its Google Place ID using the
 * Places library (`Place.fetchFields`).
 */
export async function getGooglePlaceDetails(placeId: string): Promise<Place | null> {
  const { Place } = await importPlacesLibrary();

  const place = new Place({ id: placeId });
  await place.fetchFields({ fields: PLACE_FIELDS });

  if (!place.id || (!place.displayName && !place.location)) return null;
  return googlePlaceToVybePlace(libraryPlaceToResult(place));
}

/**
 * Get a Google Maps directions URL for navigation.
 */
export function getGoogleDirectionsUrl(
  destinationLat: number,
  destinationLng: number,
  originLat?: number,
  originLng?: number
): string {
  const destination = `${destinationLat},${destinationLng}`;
  if (originLat !== undefined && originLng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destination}&travelmode=walking`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

/**
 * Get a Google Maps URL for a place by its Place ID.
 */
export function getGoogleMapsPlaceUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}
