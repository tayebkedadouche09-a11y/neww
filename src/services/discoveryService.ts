import { CategoryType, FilterState, Place, PlaceOpeningHours, PriceLevel } from '../types';
import { isGoogleMapsConfigured } from '../lib/env';
import { searchNearbyGooglePlaces, searchGooglePlacesText } from './googlePlaces';
import { haversineDistanceKm } from '../hooks/useGeolocation';
import { classifyPlace } from './googlePlacesAdapter';

export interface DiscoveryOptions { userLat?: number; userLng?: number; radiusKm?: number; searchQuery?: string; filters?: Partial<FilterState>; }

const CATEGORY_TYPES: Record<CategoryType, string[]> = {
  'food-drink': ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'coffee_shop', 'dessert_shop'],
  nightlife: ['bar', 'night_club', 'karaoke', 'live_music_venue', 'cocktail_bar'],
  'arts-culture': ['museum', 'art_gallery', 'art_museum', 'library', 'historical_landmark', 'performing_arts_theater', 'place_of_worship'],
  'outdoors-nature': ['park', 'playground', 'zoo', 'aquarium', 'campground', 'gym', 'fitness_center', 'botanical_garden', 'national_park', 'hiking_area', 'beach'],
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
function applySmartClassification(place: Place): Place { const { category, mood } = classifyPlace(place.tags, place.name); return { ...place, category, primaryMood: mood }; }
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
function normalize(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

const OSM_PLACE_QUERIES: Record<string, string[]> = {
  mosque: ['amenity="place_of_worship"[religion="muslim"]', 'amenity="place_of_worship"[name~"mosque|mosquee|mosquée|masjid|مسجد|جامع",i]'],
  restaurant: ['amenity="restaurant"', 'amenity="fast_food"'],
  cafe: ['amenity="cafe"'],
  park: ['leisure="park"', 'leisure="garden"'],
  cinema: ['amenity="cinema"'],
  gym: ['leisure="fitness_centre"', 'amenity="gym"'],
  hotel: ['tourism="hotel"', 'tourism="hostel"', 'tourism="guest_house"'],
  shopping: ['shop="mall"', 'shop="department_store"', 'shop="supermarket"', 'shop="clothes"'],
  library: ['amenity="library"'],
  museum: ['tourism="museum"', 'amenity="museum"'],
  'sports center': ['leisure="sports_centre"', 'leisure="stadium"', 'leisure="pitch"', 'sport'],
  nightlife: ['amenity="bar"', 'amenity="pub"', 'amenity="nightclub"'],
  'arcade gaming': ['leisure="amusement_arcade"', 'leisure="bowling_alley"', 'amenity="internet_cafe"'],
  'live music': ['amenity="music_venue"', 'amenity="theatre"[theatre:type="music"]'],
  hospital: ['amenity="hospital"', 'amenity="clinic"'],
  theatre: ['amenity="theatre"'],
  playground: ['leisure="playground"'],
  beach: ['natural="beach"'],
};
const OSM_BROAD_QUERIES = [
  'amenity~"restaurant|fast_food|cafe|bar|pub|nightclub|cinema|theatre|library|hospital|clinic|place_of_worship|music_venue"',
  'leisure~"park|garden|playground|fitness_centre|sports_centre|stadium|pitch|amusement_arcade|bowling_alley"',
  'tourism~"hotel|hostel|guest_house|museum"',
  'shop~"mall|department_store|supermarket|clothes|books|second_hand|toys|gift"',
  'natural="beach"',
];
function buildOsmQuery(lat: number, lng: number, radiusMeters: number, clauses: string[]): string {
  return `[out:json][timeout:20];(${clauses.map(clause => `nwr(around:${radiusMeters},${lat},${lng})[${clause}];`).join('')});out center tags;`;
}
function pickOsmCoordinates(element: any): { lat: number; lng: number } | null {
  if (Number.isFinite(element?.lat) && Number.isFinite(element?.lon)) return { lat: element.lat, lng: element.lon };
  if (Number.isFinite(element?.center?.lat) && Number.isFinite(element?.center?.lon)) return { lat: element.center.lat, lng: element.center.lon };
  return null;
}
function estimateOsmPrice(tags: Record<string, string>): PriceLevel {
  if (tags.amenity === 'place_of_worship' || tags.leisure === 'park' || tags.leisure === 'playground' || tags.natural === 'beach' || tags.amenity === 'library') return 'free';
  return '$$';
}
function osmOpeningHours(tags: Record<string, string>): PlaceOpeningHours {
  const weekday = tags.opening_hours || '';
  return { monday: weekday, tuesday: weekday, wednesday: weekday, thursday: weekday, friday: weekday, saturday: weekday, sunday: weekday, isOpenNow: undefined };
}
function osmElementToPlace(element: any): Place | null {
  const tags: Record<string, string> = element?.tags || {};
  const name = String(tags.name || '').trim();
  const coords = pickOsmCoordinates(element);
  if (!name || !coords) return null;
  const categoryHint = [tags.amenity, tags.leisure, tags.tourism, tags.shop, tags.sport, tags.natural, tags.religion, tags['theatre:type']].filter(Boolean) as string[];
  const extraNames = [tags.name, tags['name:fr'], tags['name:ar']].filter(Boolean).join(' ');
  const tagsForClassifier = [...categoryHint, ...Object.values(tags).filter(v => typeof v === 'string').slice(0, 8), extraNames].filter(Boolean);
  if (tags.religion === 'muslim' || normalize(name).includes('mosque') || normalize(name).includes('mosquee') || name.includes('مسجد') || name.includes('جامع')) tagsForClassifier.push('mosque');
  const { category, mood } = classifyPlace(tagsForClassifier, name);
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ');
  const priceLevel = estimateOsmPrice(tags);
  const isFree = priceLevel === 'free';
  return {
    id: `osm:${element.type}:${element.id}`,
    providerPlaceId: `osm:${element.type}:${element.id}`,
    name,
    tagline: address || tags['addr:street'] || tags['addr:city'] || 'Nearby place',
    description: tags.description || '',
    category,
    primaryMood: mood,
    secondaryMoods: [],
    location: { address: address || name, neighborhood: tags['addr:suburb'] || '', city: tags['addr:city'] || '', lat: coords.lat, lng: coords.lng },
    priceLevel,
    approxCostUsd: 0,
    rating: 0,
    reviewCount: 0,
    baseVybeScore: 70,
    images: /^https?:\/\//i.test(tags.image || '') ? [tags.image] : [],
    tags: [...new Set([...categoryHint, ...Object.values(tags).filter(v => typeof v === 'string' && v.length < 80).slice(0, 6), name])].slice(0, 12),
    estimatedDuration: '',
    openingHours: osmOpeningHours(tags),
    features: {
      isFree,
      isOutdoor: Boolean(tags.leisure || tags.natural === 'beach' || tags.tourism === 'camp_site'),
      isIndoor: Boolean(tags.amenity || tags.shop || ['hotel', 'hostel', 'guest_house', 'museum'].includes(tags.tourism)),
      hasFood: ['restaurant', 'fast_food', 'cafe', 'pub', 'bar'].includes(tags.amenity),
      hasAlcohol: ['bar', 'pub', 'nightclub'].includes(tags.amenity),
      isLateNight: /(?:24\/7|24 hours|00:?00|01:?00|02:?00|03:?00)/i.test(tags.opening_hours || ''),
      isSecretGem: false,
      isPetFriendly: /pet friendly|pets allowed/i.test(tags.description || ''),
      isWifiFriendly: /wifi|internet/i.test(tags.internet_access || '') || Boolean(tags.internet_access),
      isPhotoSpot: Boolean(tags.image || tags.wikimedia_commons || tags.tourism === 'attraction'),
      isAccessible: ['yes', 'designated'].includes(tags.wheelchair || ''),
    },
    suitableFor: ['solo', 'friends', 'family', 'group'],
    website: tags.website,
    phone: tags.phone,
    instagram: tags['contact:instagram'],
    isFeatured: false,
    isTrending: false,
    reviews: [],
  };
}
async function fetchOsmPlaces(userLat: number, userLng: number, radiusKm: number, searchQuery?: string): Promise<Place[]> {
  const normalizedQuery = normalize(searchQuery || '');
  const clauses = normalizedQuery && OSM_PLACE_QUERIES[normalizedQuery] ? OSM_PLACE_QUERIES[normalizedQuery] : normalizedQuery ? [`name~"${normalizedQuery.replace(/[\\"\n\r]/g, ' ')}",i`] : OSM_BROAD_QUERIES;
  const query = buildOsmQuery(userLat, userLng, Math.min(radiusKm * 1000, 5000), clauses);
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: new URLSearchParams({ data: query }) });
      if (!response.ok) throw new Error(`OSM discovery failed (${response.status})`);
      const payload = await response.json();
      const converted = (payload.elements || []).map(osmElementToPlace).filter(Boolean) as Place[];
      return withDistance(deduplicate(converted), userLat, userLng).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)).slice(0, 120);
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error('OSM discovery is unavailable right now.');
}
export async function discoverPlaces(options: DiscoveryOptions): Promise<Place[]> {
  const { userLat, userLng, radiusKm = 5, filters } = options;
  if (userLat === undefined || userLng === undefined) return [];
  const query = options.searchQuery?.trim();
  let googleError: unknown = null;
  if (isGoogleMapsConfigured) {
    try {
      let places: Place[];
      if (query) places = await searchGooglePlacesText(query, userLat, userLng, radiusKm);
      else if (filters?.categories?.length) {
        const types = [...new Set(filters.categories.flatMap(category => CATEGORY_TYPES[category]))];
        places = await searchNearbyGooglePlaces(userLat, userLng, radiusKm, types);
      } else places = await searchNearbyGooglePlaces(userLat, userLng, radiusKm);
      const result = deduplicate(withDistance(places, userLat, userLng)).map(applySmartClassification).filter(place => matchesFilters(place, filters));
      if (result.length > 0) return result;
    } catch (error) {
      googleError = error;
      console.warn('[discovery] Google provider failed; falling back to OpenStreetMap.', error);
    }
  }
  try {
    const osmPlaces = await fetchOsmPlaces(userLat, userLng, radiusKm, query);
    const result = osmPlaces.map(applySmartClassification).filter(place => matchesFilters(place, filters));
    if (result.length > 0 || !googleError) return result;
    return osmPlaces;
  } catch (osmError) {
    console.error('[discovery] OSM fallback failed:', osmError);
    if (googleError instanceof Error) throw new Error(`${googleError.message} — OpenStreetMap fallback also unavailable.`);
    throw osmError;
  }
}
