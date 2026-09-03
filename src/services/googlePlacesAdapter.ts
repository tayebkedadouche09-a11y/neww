import { Place, CategoryType, MoodType, PriceLevel, CompanionType, PlaceOpeningHours, ProviderType, PlacePhotoAttribution, VybeCategory } from '../types';
import { GooglePlaceResult } from './googlePlacesTypes';
import {
  VYBE_CATEGORY_DEFINITIONS,
  LEGACY_CATEGORY_TO_CANONICAL,
  normalizeCategoryQuery,
  classifyProviderPlace,
  placeMatchesCanonicalCategory,
  type ProviderCategoryDefinition,
} from '../data/categoryTaxonomy';

function googlePriceLevelToVybe(priceLevel?: number): PriceLevel {
  if (priceLevel === undefined || priceLevel === null) return '$$';
  const levels: PriceLevel[] = ['free', '$', '$$', '$$$', '$$$$'];
  return levels[Math.min(Math.max(priceLevel, 0), 4)] ?? '$$';
}

function googleApproxCost(priceLevel?: number, isFree = false): number {
  if (isFree || priceLevel === 0) return 0;
  return [0, 10, 25, 50, 100][Math.min(Math.max(priceLevel ?? 2, 1), 4)] ?? 25;
}

function googlePhotosToUrls(photos?: { photo_reference?: string }[]): string[] {
  return (photos ?? [])
    .map(photo => photo.photo_reference?.trim())
    .filter((uri): uri is string => Boolean(uri && /^https?:\/\//i.test(uri)));
}

function googlePhotoAttributions(photos?: Array<{ author_attributions?: Array<{ displayName: string; uri?: string }> }>): PlacePhotoAttribution[] {
  const seen = new Set<string>();
  const result: PlacePhotoAttribution[] = [];
  for (const photo of photos ?? []) {
    for (const author of photo.author_attributions ?? []) {
      const displayName = author.displayName?.trim();
      if (!displayName) continue;
      const key = `${displayName}|${author.uri ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ displayName, ...(author.uri ? { uri: author.uri } : {}) });
    }
  }
  return result.slice(0, 3);
}

function googleWeekdayToOpeningHours(weekdayText?: string[]): Partial<PlaceOpeningHours> {
  if (!weekdayText?.length) return {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Partial<PlaceOpeningHours> = {};
  for (const entry of weekdayText) {
    const match = entry.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const index = days.indexOf(match[1].toLowerCase());
    if (index >= 0) (result as Record<string, string>)[days[index]] = match[2];
  }
  return result;
}

function hasLateNightHours(weekdayText?: string[]): boolean {
  return (weekdayText ?? []).some(entry => {
    const value = entry.toLowerCase();
    return /24\s*hours|open\s*24/.test(value) || /(?:1|2|3|4|5)(?::\d{2})?\s*(?:am|a\.m\.)\b/.test(value);
  });
}

/**
 * Compatibility helper for legacy UI callers. The canonical category is the
 * source of truth; this returns the existing legacy bucket for the UI/storage.
 */
export function classifyPlace(types?: string[], name?: string): { category: CategoryType; mood: MoodType } {
  const result = classifyProviderPlace(types ?? [], undefined, name);
  return { category: result.legacyCategory, mood: result.mood };
}

function googleTypesToSuitableFor(types?: string[]): CompanionType[] {
  const typeSet = new Set(types ?? []);
  const suitable: CompanionType[] = ['solo', 'friends'];
  if (['restaurant', 'cafe', 'bar', 'night_club', 'karaoke', 'live_music_venue', 'video_arcade', 'bowling_alley', 'amusement_center'].some(t => typeSet.has(t))) {
    suitable.push('couple', 'group');
  }
  if (['park', 'playground', 'indoor_playground', 'amusement_center', 'amusement_park', 'shopping_mall', 'zoo', 'aquarium', 'water_park', 'sports_complex', 'swimming_pool', 'children_camp'].some(t => typeSet.has(t))) {
    suitable.push('family', 'group');
  }
  return [...new Set(suitable)];
}

/**
 * Strict provider validation. Query text is only converted into a canonical
 * intent; it never changes the returned place's category by itself.
 */
export function isGooglePlaceValidForRequest(place: Place, request?: { query?: string; categories?: CategoryType[] }): boolean {
  if (place.provider !== 'google' || !place.providerPlaceId || !place.name.trim()) return false;
  if (!Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng) || (place.location.lat === 0 && place.location.lng === 0)) return false;

  const canonicalFromQuery = normalizeCategoryQuery(request?.query);
  const categoryTargets = canonicalFromQuery
    ? [canonicalFromQuery]
    : (request?.categories ?? []).flatMap(category => LEGACY_CATEGORY_TO_CANONICAL[category] ?? []);

  if (!categoryTargets.length) return true;

  return categoryTargets.some(category => placeMatchesCanonicalCategory(place, category));
}

export function googlePlaceToVybePlace(gp: GooglePlaceResult): Place {
  const providerPlaceId = gp.place_id?.trim();
  const providerTypes = [...new Set((gp.types ?? []).filter(Boolean))];
  const analysis = classifyProviderPlace(providerTypes, gp.primary_type, gp.name);
  const categoryDefinition: ProviderCategoryDefinition = VYBE_CATEGORY_DEFINITIONS[analysis.canonicalCategory];
  const photoUrls = googlePhotosToUrls(gp.photos);
  const photoAttributions = googlePhotoAttributions(gp.photos);
  const openingHours = googleWeekdayToOpeningHours(gp.opening_hours?.weekday_text);
  const lat = gp.geometry?.location?.lat;
  const lng = gp.geometry?.location?.lng;
  const isFree = gp.price_level === 0 || providerTypes.some(type => ['park', 'playground', 'library', 'place_of_worship'].includes(type));
  const canonicalCategory: VybeCategory = analysis.canonicalCategory;

  return {
    id: providerPlaceId ? `google:${providerPlaceId}` : `google:${encodeURIComponent(gp.name || 'place')}`,
    provider: 'google' as ProviderType,
    providerPlaceId,
    providerTypes,
    providerPrimaryType: gp.primary_type,
    canonicalCategory,
    name: gp.name,
    tagline: gp.vicinity || gp.formatted_address || '',
    description: '',
    category: categoryDefinition.legacyCategory,
    primaryMood: analysis.mood,
    secondaryMoods: [],
    location: {
      address: gp.formatted_address || gp.vicinity || '',
      neighborhood: '',
      city: '',
      lat: Number.isFinite(lat) ? lat! : 0,
      lng: Number.isFinite(lng) ? lng! : 0,
    },
    priceLevel: isFree ? 'free' : googlePriceLevelToVybe(gp.price_level),
    approxCostUsd: googleApproxCost(gp.price_level, isFree),
    rating: gp.rating ?? 0,
    reviewCount: gp.user_ratings_total ?? 0,
    baseVybeScore: Math.max(1, Math.min(99, Math.round(70 + analysis.confidence * 15 + Math.min(10, (gp.rating ?? 0) * 2)))),
    images: photoUrls,
    photoAttributions,
    tags: providerTypes.slice(0, 15),
    estimatedDuration: '',
    openingHours: {
      monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '',
      isOpenNow: gp.opening_hours?.open_now,
      ...openingHours,
    },
    features: {
      isFree,
      isOutdoor: providerTypes.some(t => ['park', 'city_park', 'state_park', 'national_park', 'hiking_area', 'beach', 'garden', 'botanical_garden', 'campground', 'zoo', 'aquarium', 'wildlife_park', 'wildlife_refuge'].includes(t)),
      isIndoor: providerTypes.some(t => ['restaurant', 'cafe', 'museum', 'art_gallery', 'art_museum', 'library', 'movie_theater', 'video_arcade', 'amusement_center', 'indoor_playground', 'gym', 'spa', 'shopping_mall', 'store'].includes(t)),
      hasFood: providerTypes.some(t => ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery', 'bar', 'food_court'].includes(t)),
      hasAlcohol: providerTypes.some(t => ['bar', 'night_club', 'cocktail_bar', 'brewery', 'wine_bar'].includes(t)),
      isLateNight: hasLateNightHours(gp.opening_hours?.weekday_text),
      isSecretGem: canonicalCategory === 'tourist' || canonicalCategory === 'entertainment',
      isPetFriendly: false,
      isWifiFriendly: providerTypes.includes('internet_cafe'),
      isPhotoSpot: canonicalCategory === 'tourist' || canonicalCategory === 'outdoors',
      isAccessible: false,
    },
    suitableFor: googleTypesToSuitableFor(providerTypes),
    website: gp.website,
    phone: gp.formatted_phone_number,
    instagram: undefined,
    isFeatured: false,
    isTrending: false,
    reviews: [],
  };
}
