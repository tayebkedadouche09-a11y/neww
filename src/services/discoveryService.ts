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

// VYBE discovers a broad set of real-world place types instead of only
// entertainment/food. Google still limits each Nearby Search response, so we
// fan out across type families and deduplicate the results before rendering.
const INITIAL_TYPE_GROUPS = [
  ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'coffee_shop', 'dessert_shop', 'bar', 'night_club', 'cocktail_bar'],
  ['movie_theater', 'bowling_alley', 'amusement_park', 'amusement_center', 'karaoke', 'live_music_venue', 'video_arcade', 'internet_cafe', 'go_karting_venue', 'miniature_golf_course', 'paintball_center'],
  ['park', 'city_park', 'playground', 'indoor_playground', 'skateboard_park', 'water_park', 'zoo', 'aquarium', 'campground', 'botanical_garden', 'national_park', 'hiking_area'],
  ['museum', 'art_gallery', 'art_museum', 'library', 'historical_place', 'historical_landmark', 'monument', 'tourist_attraction', 'observation_deck', 'plaza', 'cultural_landmark'],
  ['shopping_mall', 'store', 'clothing_store', 'book_store', 'thrift_store', 'flea_market', 'toy_store', 'gift_shop', 'supermarket', 'grocery_store', 'department_store'],
  ['gym', 'fitness_center', 'sports_complex', 'sports_club', 'sports_activity_location', 'swimming_pool', 'tennis_court', 'athletic_field', 'stadium', 'arena', 'adventure_sports_center'],
  ['spa', 'garden', 'hair_salon', 'beauty_salon', 'nail_salon', 'laundry', 'dry_cleaning'],
  ['mosque', 'church', 'synagogue', 'hindu_temple', 'place_of_worship', 'cemetery', 'funeral_home'],
  ['school', 'university', 'library', 'preschool', 'primary_school', 'secondary_school'],
  ['hospital', 'doctor', 'dentist', 'pharmacy', 'drugstore', 'physiotherapist', 'veterinary_care'],
  ['hotel', 'lodging', 'hostel', 'motel', 'resort_hotel', 'guest_house'],
  ['airport', 'bus_station', 'train_station', 'transit_station', 'subway_station', 'taxi_stand', 'car_rental', 'travel_agency'],
  ['bank', 'atm', 'post_office', 'government_office', 'police', 'fire_station', 'lawyer', 'real_estate_agency', 'accounting'],
  ['gas_station', 'car_dealer', 'car_repair', 'car_wash', 'electrician', 'plumber', 'locksmith', 'hardware_store', 'home_goods_store'],
];

const CATEGORY_TYPES: Record<CategoryType, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'coffee_shop', 'dessert_shop'],
  nightlife: ['bar', 'night_club', 'karaoke', 'live_music_venue', 'cocktail_bar'],
  'arts-culture': ['museum', 'art_gallery', 'art_museum', 'library', 'historical_place', 'performing_arts_theater'],
  'outdoors-nature': ['park', 'city_park', 'playground', 'zoo', 'aquarium', 'campground', 'gym', 'fitness_center', 'botanical_garden', 'national_park', 'hiking_area'],
  entertainment: ['movie_theater', 'bowling_alley', 'amusement_park', 'amusement_center', 'casino', 'water_park', 'go_karting_venue', 'miniature_golf_course', 'paintball_center'],
  'arcade-gaming': ['video_arcade', 'amusement_center', 'bowling_alley', 'internet_cafe'],
  'hidden-gems': ['tourist_attraction', 'historical_landmark', 'monument', 'observation_deck', 'plaza', 'cultural_landmark'],
  'chill-spots': ['cafe', 'spa', 'library', 'internet_cafe', 'botanical_garden', 'garden'],
  'shopping-vintage': ['shopping_mall', 'store', 'clothing_store', 'book_store', 'thrift_store', 'flea_market', 'toy_store', 'gift_shop'],
};

function deduplicate(places: Place[]): Place[] {
  return [...new Map(places.map(place => [place.providerPlaceId || place.id, place])).values()];
}

function withDistance(places: Place[], userLat?: number, userLng?: number): Place[] {
  if (userLat === undefined || userLng === undefined) return places;
  return places.map(place => {
    if (!Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng)) return place;
    return { ...place, distanceKm: haversineDistanceKm(userLat, userLng, place.location.lat, place.location.lng) };
  });
}

function matchesFilters(place: Place, filters?: Partial<FilterState>): boolean {
  if (!filters) return true;
  if (filters.moods?.length && !filters.moods.includes(place.primaryMood) && !place.secondaryMoods.some(mood => filters.moods?.includes(mood))) return false;
  if (filters.categories?.length && !filters.categories.includes(place.category)) return false;
  if (filters.priceLevels?.length && !filters.priceLevels.includes(place.priceLevel)) return false;
  if (filters.maxBudget !== undefined && !place.features.isFree && place.approxCostUsd > 0 && place.approxCostUsd > filters.maxBudget) return false;
  if (filters.companion && !place.suitableFor.includes(filters.companion)) return false;
  if (filters.onlyOpenNow && place.openingHours.isOpenNow !== true) return false;
  if (filters.onlyFree && !place.features.isFree) return false;
  if (filters.onlyHiddenGems && !place.features.isSecretGem) return false;
  if (filters.onlyLateNight && !place.features.isLateNight) return false;
  if (filters.maxDistanceKm !== undefined && (place.distanceKm === undefined || place.distanceKm > filters.maxDistanceKm)) return false;
  return true;
}

export async function discoverPlaces(options: DiscoveryOptions): Promise<Place[]> {
  if (!isGoogleMapsConfigured) throw new Error('Google Places is not configured. Add a valid Google Maps JavaScript API key.');
  const { userLat, userLng, radiusKm = 5, filters } = options;
  if (userLat === undefined || userLng === undefined) return [];

  const query = options.searchQuery?.trim();
  let places: Place[];
  if (query) {
    places = await searchGooglePlacesText(query, userLat, userLng, radiusKm);
  } else {
    const groups = filters?.categories?.length
      ? [filters.categories.flatMap(category => CATEGORY_TYPES[category])]
      : INITIAL_TYPE_GROUPS;
    const results = await Promise.all(groups.map(types => searchNearbyGooglePlaces(userLat, userLng, radiusKm, types)));
    places = results.flat();
  }

  const result = deduplicate(withDistance(places, userLat, userLng)).filter(place => matchesFilters(place, filters));
  console.log(`[discovery] discoveryServiceResultCount: ${result.length}`);
  return result;
}
