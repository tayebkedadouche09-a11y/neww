import { CategoryType, FilterState, Place } from '../types';
import { isGoogleMapsConfigured } from '../lib/env';
import { searchNearbyGooglePlaces, searchGooglePlacesText } from './googlePlaces';
import { haversineDistanceKm } from '../hooks/useGeolocation';

export interface DiscoveryOptions {
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
  searchQuery?: string;
  filters?: Partial<FilterState>;
}

const INITIAL_TYPE_GROUPS = [
  ['restaurant', 'cafe', 'bakery', 'meal_takeaway'],
  ['bar', 'night_club', 'movie_theater', 'bowling_alley', 'amusement_park'],
  ['park', 'museum', 'art_gallery', 'shopping_mall', 'book_store', 'gym', 'spa', 'tourist_attraction'],
];

const CATEGORY_TYPES: Record<CategoryType, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'meal_takeaway'],
  nightlife: ['bar', 'night_club'],
  'arts-culture': ['museum', 'art_gallery', 'library'],
  'outdoors-nature': ['park', 'zoo', 'aquarium', 'campground', 'gym'],
  entertainment: ['movie_theater', 'bowling_alley', 'amusement_park', 'casino'],
  'arcade-gaming': ['bowling_alley', 'amusement_arcade'],
  'hidden-gems': ['tourist_attraction', 'point_of_interest'],
  'chill-spots': ['cafe', 'spa', 'library'],
  'shopping-vintage': ['shopping_mall', 'store', 'clothing_store', 'book_store'],
};

function deduplicate(places: Place[]): Place[] {
  return [...new Map(places.map(place => [place.providerPlaceId || place.id, place])).values()];
}

function withDistance(places: Place[], userLat?: number, userLng?: number): Place[] {
  if (userLat === undefined || userLng === undefined) return places;
  return places.map(place => {
    if (!Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng)) return place;
    return {
      ...place,
      distanceKm: haversineDistanceKm(userLat, userLng, place.location.lat, place.location.lng),
    };
  });
}

function matchesFilters(place: Place, filters?: Partial<FilterState>): boolean {
  if (!filters) return true;
  if (filters.moods?.length && !filters.moods.includes(place.primaryMood) &&
      !place.secondaryMoods.some(mood => filters.moods?.includes(mood))) return false;
  if (filters.categories?.length && !filters.categories.includes(place.category)) return false;
  if (filters.priceLevels?.length && !filters.priceLevels.includes(place.priceLevel)) return false;
  if (filters.maxBudget !== undefined && !place.features.isFree && place.approxCostUsd > filters.maxBudget) return false;
  if (filters.companion && !place.suitableFor.includes(filters.companion)) return false;
  if (filters.onlyOpenNow && place.openingHours.isOpenNow !== true) return false;
  if (filters.onlyFree && !place.features.isFree) return false;
  if (filters.onlyHiddenGems && !place.features.isSecretGem) return false;
  if (filters.onlyLateNight && !place.features.isLateNight) return false;
  if (filters.maxDistanceKm !== undefined &&
      (place.distanceKm === undefined || place.distanceKm > filters.maxDistanceKm)) return false;
  return true;
}

export async function discoverPlaces(options: DiscoveryOptions): Promise<Place[]> {
  if (!isGoogleMapsConfigured) {
    throw new Error('Google Places is not configured. Add a valid Google Maps JavaScript API key.');
  }

  const { userLat, userLng, radiusKm = 5, filters } = options;
  if (userLat === undefined || userLng === undefined) return [];

  const query = options.searchQuery?.trim();
  let places: Place[];

  if (query) {
    // Google owns relevance here. Do not apply a second name/tag substring filter.
    places = await searchGooglePlacesText(query, userLat, userLng, radiusKm);
  } else {
    // Push each category group to Google as includedPrimaryTypes so the
    // Places API itself filters by type. The previous approach fetched
    // untyped results and re-filtered client-side by tag — a category/type
    // mapping mismatch that silently dropped valid Google places
    // (20 raw Google results → 5 kept, 3 identical duplicate API calls).
    const groups = filters?.categories?.length
      ? [filters.categories.flatMap(category => CATEGORY_TYPES[category])]
      : INITIAL_TYPE_GROUPS;
    const results = await Promise.all(
      groups.map(types => searchNearbyGooglePlaces(userLat, userLng, radiusKm, types))
    );
    places = results.flat();
  }

  const result = deduplicate(withDistance(places, userLat, userLng)).filter(place => matchesFilters(place, filters));
  // SAFE DIAGNOSTIC: final count leaving discoveryService (after distance + filters).
  console.log(`[discovery] discoveryServiceResultCount: ${result.length}`);
  return result;
}
