import { Place, CategoryType, MoodType, PriceLevel, CompanionType, PlaceOpeningHours, ProviderType } from '../types';
import { GooglePlaceResult } from './googlePlacesTypes';

function googlePriceLevelToVybe(priceLevel?: number): PriceLevel {
  if (priceLevel === undefined || priceLevel === null) return '$$';
  const levels: PriceLevel[] = ['free', '$', '$$', '$$$', '$$$$'];
  return levels[Math.min(Math.max(priceLevel, 0), 4)] ?? '$$';
}

function googlePhotosToUrls(photos?: { photo_reference?: string }[]): string[] {
  if (!photos?.length) return [];
  return photos.map(photo => photo.photo_reference?.trim()).filter((uri): uri is string => Boolean(uri && /^https?:\/\//i.test(uri)));
}

function googleWeekdayToOpeningHours(weekdayText?: string[]): Partial<PlaceOpeningHours> {
  if (!weekdayText?.length) return {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Partial<PlaceOpeningHours> = {};
  for (const entry of weekdayText) {
    const match = entry.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const dayIndex = days.indexOf(match[1].toLowerCase());
      if (dayIndex >= 0) (result as Record<string, string>)[days[dayIndex]] = match[2];
    }
  }
  return result;
}

function hasLateNightHours(weekdayText?: string[]): boolean {
  if (!weekdayText?.length) return false;
  return weekdayText.some(entry => {
    const value = entry.toLowerCase();
    if (/24\s*hours|open\s*24/i.test(value)) return true;
    return /(?:1|2|3|4|5)(?::\d{2})?\s*(?:am|a\.m\.)\b/.test(value);
  });
}

const GOOGLE_TYPE_TO_CATEGORY: Record<string, CategoryType> = {
  restaurant: 'food-drink', cafe: 'food-drink', bakery: 'food-drink', meal_takeaway: 'food-drink', meal_delivery: 'food-drink', coffee_shop: 'food-drink', dessert_shop: 'food-drink',
  bar: 'nightlife', night_club: 'nightlife', cocktail_bar: 'nightlife', karaoke: 'nightlife', live_music_venue: 'nightlife',
  museum: 'arts-culture', art_gallery: 'arts-culture', art_museum: 'arts-culture', library: 'arts-culture', historical_place: 'arts-culture', performing_arts_theater: 'arts-culture',
  park: 'outdoors-nature', city_park: 'outdoors-nature', playground: 'outdoors-nature', indoor_playground: 'outdoors-nature', skateboard_park: 'outdoors-nature', water_park: 'outdoors-nature', zoo: 'outdoors-nature', aquarium: 'outdoors-nature', campground: 'outdoors-nature', gym: 'outdoors-nature', fitness_center: 'outdoors-nature', botanical_garden: 'outdoors-nature', national_park: 'outdoors-nature', hiking_area: 'outdoors-nature',
  amusement_park: 'entertainment', amusement_center: 'entertainment', bowling_alley: 'entertainment', movie_theater: 'entertainment', casino: 'entertainment', go_karting_venue: 'entertainment', miniature_golf_course: 'entertainment', paintball_center: 'entertainment',
  video_arcade: 'arcade-gaming', internet_cafe: 'arcade-gaming',
  shopping_mall: 'shopping-vintage', store: 'shopping-vintage', clothing_store: 'shopping-vintage', book_store: 'shopping-vintage', thrift_store: 'shopping-vintage', flea_market: 'shopping-vintage', toy_store: 'shopping-vintage', gift_shop: 'shopping-vintage',
  spa: 'chill-spots', garden: 'chill-spots',
  tourist_attraction: 'hidden-gems', historical_landmark: 'hidden-gems', monument: 'hidden-gems', observation_deck: 'hidden-gems', plaza: 'hidden-gems', cultural_landmark: 'hidden-gems',
  sports_complex: 'outdoors-nature', sports_club: 'outdoors-nature', sports_activity_location: 'outdoors-nature', swimming_pool: 'outdoors-nature', tennis_court: 'outdoors-nature', athletic_field: 'outdoors-nature', stadium: 'entertainment', arena: 'entertainment', adventure_sports_center: 'entertainment',
};

const GOOGLE_TYPE_TO_MOOD: Record<string, MoodType> = {
  restaurant: 'hungry', cafe: 'chill', bakery: 'hungry', meal_takeaway: 'hungry', meal_delivery: 'hungry', coffee_shop: 'chill', dessert_shop: 'hungry',
  bar: 'party', night_club: 'party', cocktail_bar: 'party', karaoke: 'party', live_music_venue: 'music',
  museum: 'curious', art_gallery: 'creative', art_museum: 'curious', library: 'lazy', historical_place: 'curious', performing_arts_theater: 'creative',
  park: 'outdoor', city_park: 'outdoor', playground: 'energetic', indoor_playground: 'energetic', skateboard_park: 'energetic', water_park: 'energetic', zoo: 'explore', aquarium: 'curious', campground: 'outdoor', gym: 'energetic', fitness_center: 'energetic', botanical_garden: 'outdoor', national_park: 'outdoor', hiking_area: 'outdoor',
  amusement_park: 'energetic', amusement_center: 'energetic', bowling_alley: 'gaming', movie_theater: 'chill', casino: 'party', go_karting_venue: 'energetic', miniature_golf_course: 'gaming', paintball_center: 'energetic',
  video_arcade: 'gaming', internet_cafe: 'gaming',
  shopping_mall: 'explore', store: 'explore', clothing_store: 'explore', book_store: 'curious', thrift_store: 'explore', flea_market: 'explore', toy_store: 'explore', gift_shop: 'explore',
  spa: 'lazy', garden: 'chill', tourist_attraction: 'explore', historical_landmark: 'explore', monument: 'explore', observation_deck: 'explore', plaza: 'explore', cultural_landmark: 'explore',
  sports_complex: 'energetic', sports_club: 'energetic', sports_activity_location: 'energetic', swimming_pool: 'energetic', tennis_court: 'energetic', athletic_field: 'energetic', stadium: 'energetic', arena: 'energetic', adventure_sports_center: 'energetic',
};

function googleTypesToCategory(types?: string[]): CategoryType {
  if (!types?.length) return 'food-drink';
  for (const type of types) if (GOOGLE_TYPE_TO_CATEGORY[type]) return GOOGLE_TYPE_TO_CATEGORY[type];
  return 'food-drink';
}

function googleTypesToMood(types?: string[]): MoodType {
  if (!types?.length) return 'explore';
  for (const type of types) if (GOOGLE_TYPE_TO_MOOD[type]) return GOOGLE_TYPE_TO_MOOD[type];
  return 'explore';
}

function googleTypesToSuitableFor(types?: string[]): CompanionType[] {
  const suitable: CompanionType[] = ['solo', 'friends'];
  if (!types) return suitable;
  const typeSet = new Set(types);
  if (['restaurant', 'cafe', 'bar', 'night_club', 'karaoke', 'live_music_venue'].some(t => typeSet.has(t))) suitable.push('couple', 'group');
  if (['park', 'playground', 'indoor_playground', 'amusement_park', 'shopping_mall', 'zoo', 'aquarium', 'water_park', 'sports_complex', 'swimming_pool'].some(t => typeSet.has(t))) suitable.push('family', 'group');
  return [...new Set(suitable)];
}

export function googlePlaceToVybePlace(gp: GooglePlaceResult): Place {
  const providerPlaceId = gp.place_id?.trim();
  const category = googleTypesToCategory(gp.types);
  const primaryMood = googleTypesToMood(gp.types);
  const photoUrls = googlePhotosToUrls(gp.photos);
  const openingHours = googleWeekdayToOpeningHours(gp.opening_hours?.weekday_text);
  const lat = gp.geometry?.location?.lat;
  const lng = gp.geometry?.location?.lng;

  return {
    id: providerPlaceId ? `google:${providerPlaceId}` : `google:${encodeURIComponent(gp.name || 'place')}`,
    provider: 'google' as ProviderType,
    providerPlaceId,
    name: gp.name,
    tagline: gp.vicinity || gp.formatted_address || '',
    description: '',
    category,
    primaryMood,
    secondaryMoods: [],
    location: { address: gp.formatted_address || gp.vicinity || '', neighborhood: '', city: '', lat: Number.isFinite(lat) ? lat! : 0, lng: Number.isFinite(lng) ? lng! : 0 },
    priceLevel: googlePriceLevelToVybe(gp.price_level),
    approxCostUsd: 0,
    rating: gp.rating ?? 0,
    reviewCount: gp.user_ratings_total ?? 0,
    baseVybeScore: 75,
    images: photoUrls,
    tags: gp.types?.slice(0, 5).map(t => t.replace(/_/g, ' ')) ?? [],
    estimatedDuration: '',
    openingHours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '', isOpenNow: gp.opening_hours?.open_now, ...openingHours },
    features: {
      isFree: gp.price_level === 0,
      isOutdoor: gp.types?.some(t => ['park', 'city_park', 'playground', 'indoor_playground', 'skateboard_park', 'water_park', 'campground', 'zoo', 'aquarium', 'botanical_garden', 'national_park', 'hiking_area'].includes(t)) ?? false,
      isIndoor: gp.types?.some(t => ['restaurant', 'cafe', 'museum', 'art_gallery', 'art_museum', 'movie_theater', 'shopping_mall', 'library', 'gym', 'fitness_center', 'spa', 'indoor_playground', 'video_arcade', 'internet_cafe'].includes(t)) ?? false,
      hasFood: gp.types?.some(t => ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery', 'coffee_shop', 'dessert_shop'].includes(t)) ?? false,
      hasAlcohol: gp.types?.some(t => ['bar', 'night_club', 'cocktail_bar', 'casino'].includes(t)) ?? false,
      isLateNight: hasLateNightHours(gp.opening_hours?.weekday_text),
      isSecretGem: false,
      isPetFriendly: false,
      isWifiFriendly: false,
      isPhotoSpot: gp.types?.some(t => ['tourist_attraction', 'historical_landmark', 'art_gallery', 'art_museum', 'park', 'museum', 'observation_deck', 'plaza'].includes(t)) ?? false,
      isAccessible: false,
    },
    suitableFor: googleTypesToSuitableFor(gp.types),
    website: gp.website,
    phone: gp.formatted_phone_number,
    instagram: undefined,
    isFeatured: false,
    isTrending: false,
    reviews: [],
  };
}
