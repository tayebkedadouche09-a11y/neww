/**
 * DB row ↔ UI model mappers.
 * The UI consumes rich client types (src/types). Services translate to/from
 * snake_case PostgreSQL rows here — nowhere else.
 */
import { Collection, Place, PlaceOpeningHours, PlaceReview, PlanItem, VybePlan, MoodType, CategoryType, PriceLevel, CompanionType, ProviderType } from '../types';

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
  museum: 'arts-culture', art_gallery: 'arts-culture', art_museum: 'arts-culture', library: 'arts-culture', historical_place: 'arts-culture', historical_landmark: 'arts-culture', performing_arts_theater: 'arts-culture',
  park: 'outdoors-nature', city_park: 'outdoors-nature', playground: 'outdoors-nature', indoor_playground: 'outdoors-nature', skateboard_park: 'outdoors-nature', water_park: 'outdoors-nature', zoo: 'outdoors-nature', aquarium: 'outdoors-nature', campground: 'outdoors-nature', gym: 'outdoors-nature', fitness_center: 'outdoors-nature', botanical_garden: 'outdoors-nature', national_park: 'outdoors-nature', hiking_area: 'outdoors-nature', beach: 'outdoors-nature',
  amusement_park: 'entertainment', amusement_center: 'entertainment', bowling_alley: 'arcade-gaming', movie_theater: 'entertainment', casino: 'entertainment', go_karting_venue: 'entertainment', miniature_golf_course: 'arcade-gaming', paintball_center: 'entertainment',
  video_arcade: 'arcade-gaming', internet_cafe: 'arcade-gaming',
  shopping_mall: 'shopping-vintage', store: 'shopping-vintage', clothing_store: 'shopping-vintage', book_store: 'shopping-vintage', thrift_store: 'shopping-vintage', flea_market: 'shopping-vintage', toy_store: 'shopping-vintage', gift_shop: 'shopping-vintage',
  spa: 'chill-spots', garden: 'chill-spots',
  tourist_attraction: 'hidden-gems', monument: 'hidden-gems', observation_deck: 'hidden-gems', plaza: 'hidden-gems', cultural_landmark: 'hidden-gems',
  sports_complex: 'outdoors-nature', sports_club: 'outdoors-nature', sports_activity_location: 'outdoors-nature', swimming_pool: 'outdoors-nature', tennis_court: 'outdoors-nature', athletic_field: 'outdoors-nature', stadium: 'entertainment', arena: 'entertainment', adventure_sports_center: 'entertainment',
  mosque: 'arts-culture', church: 'arts-culture', hindu_temple: 'arts-culture', synagogue: 'arts-culture', place_of_worship: 'arts-culture',
  hospital: 'chill-spots', doctor: 'chill-spots', pharmacy: 'chill-spots', dentist: 'chill-spots',
  hotel: 'chill-spots', lodging: 'chill-spots',
};

const GOOGLE_TYPE_TO_MOOD: Record<string, MoodType> = {
  restaurant: 'hungry', cafe: 'chill', bakery: 'hungry', meal_takeaway: 'hungry', meal_delivery: 'hungry', coffee_shop: 'chill', dessert_shop: 'hungry',
  bar: 'party', night_club: 'party', cocktail_bar: 'party', karaoke: 'party', live_music_venue: 'music',
  museum: 'curious', art_gallery: 'creative', art_museum: 'curious', library: 'lazy', historical_place: 'curious', historical_landmark: 'curious', performing_arts_theater: 'creative',
  park: 'outdoor', city_park: 'outdoor', playground: 'energetic', indoor_playground: 'energetic', skateboard_park: 'energetic', water_park: 'energetic', zoo: 'explore', aquarium: 'curious', campground: 'outdoor', gym: 'energetic', fitness_center: 'energetic', botanical_garden: 'outdoor', national_park: 'outdoor', hiking_area: 'outdoor', beach: 'outdoor',
  amusement_park: 'energetic', amusement_center: 'energetic', bowling_alley: 'gaming', movie_theater: 'chill', casino: 'party', go_karting_venue: 'energetic', miniature_golf_course: 'gaming', paintball_center: 'energetic',
  video_arcade: 'gaming', internet_cafe: 'gaming',
  shopping_mall: 'explore', store: 'explore', clothing_store: 'explore', book_store: 'curious', thrift_store: 'explore', flea_market: 'explore', toy_store: 'explore', gift_shop: 'explore',
  spa: 'lazy', garden: 'chill', tourist_attraction: 'explore', monument: 'explore', observation_deck: 'explore', plaza: 'explore', cultural_landmark: 'explore',
  sports_complex: 'energetic', sports_club: 'energetic', sports_activity_location: 'energetic', swimming_pool: 'energetic', tennis_court: 'energetic', athletic_field: 'energetic', stadium: 'energetic', arena: 'energetic', adventure_sports_center: 'energetic',
  mosque: 'curious', church: 'curious', hindu_temple: 'curious', synagogue: 'curious', place_of_worship: 'curious', hospital: 'explore', doctor: 'explore', pharmacy: 'explore', dentist: 'explore', hotel: 'chill', lodging: 'chill',
};

const NAME_RULES: Array<{ category: CategoryType; mood: MoodType; words: string[] }> = [
  { category: 'arcade-gaming', mood: 'gaming', words: ['arcade', 'gaming', 'gamer', 'video game', 'video games', 'playstation', 'xbox', 'espace jeux', 'salle de jeux', 'jeux video', 'jeux vidéos', 'jeux', 'gaming lounge', 'game room'] },
  { category: 'food-drink', mood: 'hungry', words: ['restaurant', 'resto', 'pizzeria', 'pizza', 'burger', 'grill', 'tacos', 'snack', 'fast food', 'café', 'cafe', 'coffee', 'coffee shop', 'bakery', 'boulangerie', 'patisserie', 'pâtisserie', 'tea room', 'salon de thé'] },
  { category: 'nightlife', mood: 'party', words: ['bar', 'pub', 'club', 'nightclub', 'boite de nuit', 'discothèque', 'disco', 'karaoke', 'lounge', 'cocktail'] },
  { category: 'outdoors-nature', mood: 'outdoor', words: ['park', 'parc', 'jardin', 'garden', 'forêt', 'forest', 'plage', 'beach', 'promenade', 'hiking', 'randonnée', 'nature'] },
  { category: 'entertainment', mood: 'energetic', words: ['cinema', 'cinéma', 'theatre', 'théâtre', 'amusement', 'manège', 'karting', 'paintball'] },
  { category: 'shopping-vintage', mood: 'explore', words: ['mall', 'centre commercial', 'shopping', 'boutique', 'store', 'magasin', 'marché', 'market', 'friperie', 'bookstore', 'librairie'] },
  { category: 'arts-culture', mood: 'curious', words: ['mosquée', 'mosquee', 'mosque', 'مسجد', 'جامع', 'église', 'eglise', 'church', 'temple', 'synagogue', 'museum', 'musée', 'musee', 'gallery', 'galerie', 'library', 'bibliothèque', 'bibliotheque'] },
  { category: 'chill-spots', mood: 'lazy', words: ['spa', 'hotel', 'hôtel', 'resort', 'wellness', 'relax'] },
];

function normalizeName(value?: string): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
}

export function classifyPlace(types?: string[], name?: string): { category: CategoryType; mood: MoodType } {
  const normalized = normalizeName(name);
  const typeSet = new Set(types ?? []);

  // Google-provided place types are the authoritative discovery signal. Name keywords
  // are only a fallback for providers/results that do not expose a recognized type.
  for (const type of typeSet) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) return { category: GOOGLE_TYPE_TO_CATEGORY[type], mood: GOOGLE_TYPE_TO_MOOD[type] ?? 'explore' };
  }

  for (const rule of NAME_RULES) {
    if (rule.words.some(word => normalized.includes(normalizeName(word)))) return { category: rule.category, mood: rule.mood };
  }

  return { category: 'hidden-gems', mood: 'explore' };
}

const QUERY_CATEGORY_EXPECTATIONS: Record<string, CategoryType[]> = {
  restaurant: ['food-drink'], cafe: ['food-drink'], park: ['outdoors-nature'], cinema: ['entertainment'], gym: ['outdoors-nature'], hotel: ['chill-spots'], shopping: ['shopping-vintage'], library: ['arts-culture'], museum: ['arts-culture'], 'sports center': ['outdoors-nature', 'entertainment'], nightlife: ['nightlife'], 'arcade gaming': ['arcade-gaming', 'entertainment'], 'live music': ['nightlife'], hospital: ['chill-spots'], theatre: ['arts-culture', 'entertainment'], playground: ['outdoors-nature'], beach: ['outdoors-nature'], mosque: ['arts-culture'],
};

export function isGooglePlaceValidForRequest(place: Place, request?: { query?: string; categories?: CategoryType[] }): boolean {
  if (place.provider !== 'google' || !place.providerPlaceId || !place.name.trim()) return false;
  if (!Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng) || (place.location.lat === 0 && place.location.lng === 0)) return false;
  const expected = new Set<CategoryType>(request?.categories ?? []);
  const normalizedQuery = normalizeName(request?.query);
  if (normalizedQuery && QUERY_CATEGORY_EXPECTATIONS[normalizedQuery]) QUERY_CATEGORY_EXPECTATIONS[normalizedQuery].forEach(category => expected.add(category));
  if (!expected.size) return true;
  return expected.has(place.category);
}

function googleTypesToSuitableFor(types?: string[]): CompanionType[] {
  const suitable: CompanionType[] = ['solo', 'friends'];
  if (!types) return suitable;
  const typeSet = new Set(types);
  if (['restaurant', 'cafe', 'bar', 'night_club', 'karaoke', 'live_music_venue', 'video_arcade', 'bowling_alley'].some(t => typeSet.has(t))) suitable.push('couple', 'group');
  if (['park', 'playground', 'indoor_playground', 'amusement_park', 'shopping_mall', 'zoo', 'aquarium', 'water_park', 'sports_complex', 'swimming_pool'].some(t => typeSet.has(t))) suitable.push('family', 'group');
  return [...new Set(suitable)];
}

export function googlePlaceToVybePlace(gp: GooglePlaceResult): Place {
  const providerPlaceId = gp.place_id?.trim();
  const { category, mood: primaryMood } = classifyPlace(gp.types, gp.name);
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
      isOutdoor: gp.types?.some(t => ['park', 'city_park', 'playground', 'indoor_playground', 'skateboard_park', 'water_park', 'campground', 'zoo', 'aquarium', 'botanical_garden', 'national_park', 'hiking_area', 'beach'].includes(t)) ?? false,
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

// The actual Google adapter does not need a browser-compatible random source for
// database UUID columns; this fallback remains a standards-compliant UUID v4.
export const newUuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((byte, index) => {
      const hex = byte.toString(16).padStart(2, '0');
      return [4, 6, 8, 10].includes(index) ? `-${hex}` : hex;
    }).join('');
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const r = Math.random() * 16 | 0;
    const v = char === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export interface DbPlaceRow {
  id: string;
  external_place_id: string | null;
  provider: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string;
  primary_mood: string;
  secondary_moods: string[] | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  price_level: string | null;
  approx_cost_usd: number | null;
  rating: number | string | null;
  review_count: number | null;
  base_vybe_score: number | null;
  photos: string[] | null;
  tags: string[] | null;
  estimated_duration: string | null;
  opening_hours: Partial<PlaceOpeningHours> | null;
  features: Partial<Place['features']> | null;
  suitable_for: string[] | null;
  website: string | null;
  phone: string | null;
  instagram: string | null;
  featured: boolean | null;
  trending: boolean | null;
  created_at: string;
}

const DEFAULT_FEATURES: Place['features'] = {
  isFree: false, isOutdoor: false, isIndoor: true, hasFood: false, hasAlcohol: false,
  isLateNight: false, isSecretGem: false, isPetFriendly: false, isWifiFriendly: false,
  isPhotoSpot: false, isAccessible: false
};

const DEFAULT_HOURS: PlaceOpeningHours = {
  monday: 'Closed', tuesday: 'Closed', wednesday: 'Closed', thursday: 'Closed',
  friday: 'Closed', saturday: 'Closed', sunday: 'Closed', isOpenNow: false
};

export function rowToPlace(row: DbPlaceRow): Place {
  return {
    id: row.id,
    provider: (row.provider as ProviderType) ?? 'vybe',
    providerPlaceId: row.external_place_id ?? undefined,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    category: row.category as CategoryType,
    primaryMood: row.primary_mood as MoodType,
    secondaryMoods: (row.secondary_moods ?? []) as MoodType[],
    location: {
      address: row.address ?? '',
      neighborhood: row.neighborhood ?? '',
      city: row.city ?? '',
      lat: row.latitude ?? 0,
      lng: row.longitude ?? 0
    },
    priceLevel: (row.price_level ?? '$$') as PriceLevel,
    approxCostUsd: row.approx_cost_usd ?? 0,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    baseVybeScore: row.base_vybe_score ?? 75,
    images: row.photos ?? [],
    tags: row.tags ?? [],
    estimatedDuration: row.estimated_duration ?? '1h - 2h',
    openingHours: { ...DEFAULT_HOURS, ...(row.opening_hours ?? {}) },
    features: { ...DEFAULT_FEATURES, ...(row.features ?? {}) },
    suitableFor: (row.suitable_for ?? []) as CompanionType[],
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    instagram: row.instagram ?? undefined,
    isFeatured: row.featured ?? false,
    isTrending: row.trending ?? false,
    reviews: []
  };
}

export interface DbCollectionRow {
  id: string; user_id: string; name: string; description: string | null;
  emoji: string; color: string; is_public: boolean; created_at: string; updated_at: string;
}

export interface DbCollectionItemRow { id: string; collection_id: string; place_id: string; }

export function rowToCollection(row: DbCollectionRow, items: DbCollectionItemRow[]): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? '',
    emoji: row.emoji,
    color: row.color,
    isPublic: row.is_public,
    placeIds: items.map(i => i.place_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface DbPlanRow {
  id: string; user_id: string; title: string; date: string | null; mood: string | null;
  budget: number | string | null; cover_image: string | null; is_public: boolean; created_at: string;
}

export interface DbPlanItemRow {
  id: string; plan_id: string; place_id: string;
  start_time: string | null; duration: number | null; notes: string | null; sort_order: number | null;
}

export function rowToPlan(row: DbPlanRow, items: DbPlanItemRow[]): VybePlan {
  const planItems: PlanItem[] = (items ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(i => ({
      id: i.id,
      placeId: i.place_id,
      startTime: i.start_time ?? '20:00',
      durationMinutes: i.duration ?? 90,
      customNote: i.notes ?? undefined,
      order: i.sort_order ?? 0
    }));
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.date ?? 'Upcoming Outing',
    coverImage: row.cover_image ?? undefined,
    mood: (row.mood ?? 'chill') as MoodType,
    targetBudgetUsd: Number(row.budget ?? 50),
    items: planItems,
    isPublic: row.is_public,
    createdAt: row.created_at
  };
}

export function rowToReview(row: DbReviewRow): PlaceReview {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.display_name ?? 'VYBE Explorer',
    userAvatar: row.profiles?.avatar_url ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
    rating: row.rating,
    vibeRating: row.vibe_intensity,
    moodTags: (row.mood_tags ?? []) as MoodType[],
    comment: row.comment,
    createdAt: timeAgo(row.created_at),
    likesCount: 0
  };
}
