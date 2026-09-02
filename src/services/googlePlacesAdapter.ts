import { googleMapsConfig } from '../lib/env';
import { Place, CategoryType, MoodType, PriceLevel, CompanionType, PlaceOpeningHours, ProviderType } from '../types';
import { GooglePlaceResult } from './googlePlacesTypes';
import { newUuid } from './mappers';

/**
 * Normalize Google Places data into VYBE's Place model.
 * This is the single adapter layer — raw Google objects never leak into the UI.
 */

function googlePriceLevelToVybe(priceLevel?: number): PriceLevel {
  if (priceLevel === undefined || priceLevel === null) return '$$';
  const levels: PriceLevel[] = ['free', '$', '$$', '$$$', '$$$$'];
  return levels[Math.min(priceLevel, 4)] ?? '$$';
}

function googlePhotosToUrls(photos?: { photo_reference?: string }[]): string[] {
  if (!photos || photos.length === 0) return [];
  return photos.slice(0, 5).map(photo =>
    // Places JavaScript library photos already carry a complete signed image
    // URI from getURI() — pass it through. Only legacy photo references go
    // through the photo web-service endpoint (fine for <img>, no CORS issue).
    photo.photo_reference && /^https?:\/\//.test(photo.photo_reference)
      ? photo.photo_reference
      : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photo.photo_reference}&key=${googleMapsConfig.apiKey}`
  );
}

/**
 * Fallback image URLs cycled when Google Places returns no photos.
 * Uses Unsplash's random endpoint so results vary per request rather
 * than a single hardcoded image.
 */
const FALLBACK_IMAGE_URLS = [
  'https://source.unsplash.com/featured/?restaurant,food',
  'https://source.unsplash.com/featured/?cafe,coffee',
  'https://source.unsplash.com/featured/?nightlife,bar',
  'https://source.unsplash.com/featured/?park,outdoors',
  'https://source.unsplash.com/featured/?shopping,market',
];

function googleWeekdayToOpeningHours(weekdayText?: string[]): Partial<PlaceOpeningHours> {
  if (!weekdayText || weekdayText.length === 0) return {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Partial<PlaceOpeningHours> = {};
  for (const entry of weekdayText) {
    const match = entry.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const dayKey = match[1].toLowerCase();
      const dayIndex = days.indexOf(dayKey);
      if (dayIndex >= 0) {
        (result as Record<string, string>)[days[dayIndex]] = match[2];
      }
    }
  }
  return result;
}

const GOOGLE_TYPE_TO_CATEGORY: Record<string, CategoryType> = {
  restaurant: 'food-drink', cafe: 'food-drink', bar: 'nightlife', night_club: 'nightlife',
  meal_takeaway: 'food-drink', bakery: 'food-drink', museum: 'arts-culture',
  art_gallery: 'arts-culture', park: 'outdoors-nature', zoo: 'outdoors-nature',
  aquarium: 'outdoors-nature', amusement_park: 'entertainment', bowling_alley: 'entertainment',
  movie_theater: 'entertainment', casino: 'entertainment', shopping_mall: 'shopping-vintage',
  store: 'shopping-vintage', clothing_store: 'shopping-vintage', book_store: 'shopping-vintage',
  gym: 'outdoors-nature', spa: 'chill-spots', campground: 'outdoors-nature',
  tourist_attraction: 'hidden-gems', point_of_interest: 'hidden-gems', establishment: 'hidden-gems',
};

const GOOGLE_TYPE_TO_MOOD: Record<string, MoodType> = {
  restaurant: 'hungry', cafe: 'chill', bar: 'party', night_club: 'party',
  bakery: 'hungry', museum: 'curious', art_gallery: 'creative', library: 'lazy',
  park: 'outdoor', zoo: 'explore', aquarium: 'curious', amusement_park: 'energetic',
  bowling_alley: 'gaming', movie_theater: 'chill', casino: 'party',
  shopping_mall: 'explore', store: 'explore', clothing_store: 'explore',
  book_store: 'curious', gym: 'energetic', spa: 'lazy', campground: 'outdoor',
  tourist_attraction: 'explore',
};

function googleTypesToCategory(types?: string[]): CategoryType {
  if (!types) return 'hidden-gems';
  for (const type of types) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) return GOOGLE_TYPE_TO_CATEGORY[type];
  }
  return 'hidden-gems';
}

function googleTypesToMood(types?: string[]): MoodType {
  if (!types) return 'explore';
  for (const type of types) {
    if (GOOGLE_TYPE_TO_MOOD[type]) return GOOGLE_TYPE_TO_MOOD[type];
  }
  return 'explore';
}

function googleTypesToSuitableFor(types?: string[]): CompanionType[] {
  const suitable: CompanionType[] = ['solo', 'friends'];
  if (!types) return suitable;
  const typeSet = new Set(types);
  if (typeSet.has('restaurant') || typeSet.has('cafe') || typeSet.has('bar') || typeSet.has('night_club')) {
    suitable.push('couple', 'group');
  }
  if (typeSet.has('park') || typeSet.has('amusement_park') || typeSet.has('shopping_mall')) {
    suitable.push('family', 'group');
  }
  return [...new Set(suitable)];
}

/**
 * Convert a Google Places result into a VYBE Place model.
 */
export function googlePlaceToVybePlace(gp: GooglePlaceResult): Place {
  const category = googleTypesToCategory(gp.types);
  const primaryMood = googleTypesToMood(gp.types);
  const photoUrls = googlePhotosToUrls(gp.photos);
  const openingHours = googleWeekdayToOpeningHours(gp.opening_hours?.weekday_text);

  return {
    id: newUuid(),
    provider: 'google' as ProviderType,
    providerPlaceId: gp.place_id,
    name: gp.name,
    tagline: gp.vicinity || gp.formatted_address || '',
    description: '',
    category,
    primaryMood,
    secondaryMoods: [],
    location: {
      address: gp.formatted_address || gp.vicinity || '',
      neighborhood: '',
      city: '',
      lat: gp.geometry?.location?.lat ?? 0,
      lng: gp.geometry?.location?.lng ?? 0,
    },
    priceLevel: googlePriceLevelToVybe(gp.price_level),
    approxCostUsd: gp.price_level != null ? gp.price_level * 15 : 0,
    rating: gp.rating ?? 0,
    reviewCount: gp.user_ratings_total ?? 0,
    baseVybeScore: 75,
    images: photoUrls.length > 0 ? photoUrls : [FALLBACK_IMAGE_URLS[Math.floor(Math.random() * FALLBACK_IMAGE_URLS.length)]],
    tags: gp.types?.slice(0, 5).map(t => t.replace(/_/g, ' ')) ?? [],
    estimatedDuration: '',
    openingHours: {
      monday: '', tuesday: '', wednesday: '', thursday: '',
      friday: '', saturday: '', sunday: '',
      isOpenNow: gp.opening_hours?.open_now,
      ...openingHours,
    },
    features: {
      isFree: gp.price_level === 0,
      isOutdoor: gp.types?.some(t => ['park', 'campground', 'zoo'].includes(t)) ?? false,
      isIndoor: gp.types?.some(t => ['restaurant', 'cafe', 'museum', 'art_gallery', 'movie_theater', 'shopping_mall', 'library'].includes(t)) ?? true,
      hasFood: gp.types?.some(t => ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery'].includes(t)) ?? false,
      hasAlcohol: gp.types?.some(t => ['bar', 'night_club', 'casino'].includes(t)) ?? false,
      isLateNight: gp.types?.some(t => ['bar', 'night_club', 'casino'].includes(t)) ?? false,
      isSecretGem: false,
      isPetFriendly: false,
      isWifiFriendly: gp.types?.some(t => ['cafe', 'library', 'restaurant'].includes(t)) ?? false,
      isPhotoSpot: gp.types?.some(t => ['tourist_attraction', 'art_gallery', 'park', 'museum'].includes(t)) ?? false,
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
