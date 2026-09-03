import { CategoryType, FilterState, Place } from '../types';
import { isGoogleMapsConfigured } from '../lib/env';
import { searchNearbyGooglePlaces, searchGooglePlacesText } from './googlePlaces';
import { haversineDistanceKm } from '../hooks/useGeolocation';
import { classifyPlace } from './googlePlacesAdapter';

export interface DiscoveryOptions { userLat?: number; userLng?: number; radiusKm?: number; searchQuery?: string; filters?: Partial<FilterState>; }

const CATEGORY_TYPES: Record<CategoryType, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'coffee_shop', 'dessert_shop'],
  nightlife: ['bar', 'night_club', 'karaoke', 'live_music_venue', 'cocktail_bar'],
  'arts-culture': ['museum', 'art_gallery', 'art_museum', 'library', 'historical_landmark', 'performing_arts_theater'],
  'outdoors-nature': ['park', 'playground', 'zoo', 'aquarium', 'campground', 'gym', 'fitness_center', 'botanical_garden', 'national_park', 'hiking_area'],
  entertainment: ['movie_theater', 'bowling_alley', 'amusement_park', 'amusement_center', 'water_park', 'go_karting_venue', 'miniature_golf_course', 'paintball_center'],
  'arcade-gaming': ['video_arcade', 'amusement_center', 'bowling_alley', 'internet_cafe'],
  'hidden-gems': ['tourist_attraction', 'historical_landmark', 'monument', 'observation_deck', 'plaza'],
  'chill-spots': ['cafe', 'spa', 'library', 'internet_cafe', 'botanical_garden', 'garden'],
  'shopping-vintage': ['shopping_mall', 'store', 'clothing_store', 'book_store', 'thrift_store', 'flea_market', 'toy_store', 'gift_shop'],
};

function deduplicate(places: Place[]): Place[] { return [...new Map(places.map(place => [place.providerPlaceId || place.id, place])).values()]; }
function withDistance(places: Place[], userLat?: number, userLng?: number): Place[] {
  if (userLat === undefined || userLng === undefined) return places;
  return places.map(place => !Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng) ? place : { ...place, distanceKm: haversineDistanceKm(userLat, userLng, place.location.lat, place.location.lng) });
}

function applySmartClassification(place: Place): Place {
  const { category, mood } = classifyPlace(place.tags, place.name);
  return { ...place, category, primaryMood: mood };
}

function matchesFilters(place: Place, filters?: Partial<FilterState>): boolean {
  if (!filters) return true;
  const classified = applySmartClassification(place);
  if (filters.moods?.length && !filters.moods.includes(classified.primaryMood) && !classified.secondaryMoods.some(mood => filters.moods?.includes(mood))) return false;
  if (filters.categories?.length && !filters.categories.includes(classified.category)) return false;
  if (filters.priceLevels?.length && !filters.priceLevels.includes(classified.priceLevel)) return false;
  if (filters.maxBudget !== undefined && !classified.features.isFree && classified.approxCostUsd > 0 && classified.approxCostUsd > filters.maxBudget) return false;
  if (filters.companion && !classified.suitableFor.includes(filters.companion)) return false;
  if (filters.onlyOpenNow && classified.openingHours.isOpenNow !== true) return false;
  if (filters.onlyFree && !classified.features.isFree) return false;
  if (filters.onlyHiddenGems && !classified.features.isSecretGem) return false;
  if (filters.onlyLateNight && !classified.features.isLateNight) return false;
  if (filters.maxDistanceKm !== undefined && (classified.distanceKm === undefined || classified.distanceKm > filters.maxDistanceKm)) return false;
  return true;
}

export async function discoverPlaces(options: DiscoveryOptions): Promise<Place[]> {
  if (!isGoogleMapsConfigured) throw new Error('Google Places is not configured. Add a valid Google Maps JavaScript API key.');
  const { userLat, userLng, radiusKm = 5, filters } = options;
  if (userLat === undefined || userLng === undefined) return [];
  const query = options.searchQuery?.trim();
  let places: Place[];
  if (query) places = await searchGooglePlacesText(query, userLat, userLng, radiusKm);
  else if (filters?.categories?.length) {
    const types = [...new Set(filters.categories.flatMap(category => CATEGORY_TYPES[category]))];
    places = await searchNearbyGooglePlaces(userLat, userLng, radiusKm, types);
  } else places = await searchNearbyGooglePlaces(userLat, userLng, radiusKm);

  const result = deduplicate(withDistance(places, userLat, userLng)).map(applySmartClassification).filter(place => matchesFilters(place, filters));
  console.log(`[discovery] discoveryServiceResultCount: ${result.length}`);
  return result;
}
