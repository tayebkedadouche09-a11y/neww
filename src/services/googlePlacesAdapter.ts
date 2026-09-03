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
  mosque: 'curious', church: 'curious', hindu_temple: 'curious', synagogue: 'curious', place_of_worship: 'curious',
  hospital: 'explore', doctor: 'explore', pharmacy: 'explore', dentist: 'explore', hotel: 'chill', lodging: 'chill',
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
