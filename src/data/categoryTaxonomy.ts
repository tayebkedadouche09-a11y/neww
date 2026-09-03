import { CategoryType, MoodType, VybeCategory } from '../types';

export interface ProviderCategoryDefinition {
  id: VybeCategory;
  label: string;
  legacyCategory: CategoryType;
  mood: MoodType;
  aliases: string[];
  googleIncludedTypes: string[];
  googleTextQueries: string[];
  osmClauses: string[];
  signals: string[];
}

/**
 * Canonical VYBE intent taxonomy.
 * UI labels never become provider type strings directly. Providers map into
 * this model, then the rest of the application consumes canonicalCategory.
 * Google included types are limited to the current Places API (New) Table A.
 */
export const VYBE_CATEGORY_DEFINITIONS: Record<VybeCategory, ProviderCategoryDefinition> = {
  restaurant: {
    id: 'restaurant', label: 'Restaurant', legacyCategory: 'food-drink', mood: 'hungry',
    aliases: ['restaurant', 'restaurants', 'resto', 'food', 'dining', 'eat', 'manger'],
    googleIncludedTypes: ['restaurant'],
    googleTextQueries: ['restaurants nearby'],
    osmClauses: ['amenity="restaurant"', 'amenity="fast_food"', 'amenity="food_court"'],
    signals: ['restaurant', 'resto', 'pizzeria', 'pizza', 'burger', 'tacos', 'grill', 'snack', 'fast food'],
  },
  cafe: {
    id: 'cafe', label: 'Cafe', legacyCategory: 'food-drink', mood: 'chill',
    aliases: ['cafe', 'cafes', 'café', 'coffee', 'coffee shop', 'coffee shops', 'salon de thé', 'tea'],
    googleIncludedTypes: ['cafe', 'coffee_shop'],
    googleTextQueries: ['cafes nearby', 'coffee shops nearby'],
    osmClauses: ['amenity="cafe"', 'name~"cafe|café|coffee|salon de thé",i'],
    signals: ['cafe', 'café', 'coffee', 'coffee shop', 'tea room', 'salon de thé'],
  },
  games: {
    id: 'games', label: 'Games', legacyCategory: 'arcade-gaming', mood: 'gaming',
    aliases: [
      'games', 'game', 'gaming', 'arcade', 'arcades', 'game room', 'game rooms',
      'game center', 'game centre', 'salle de jeux', 'salle de jeu', 'jeux',
      'jeux vidéo', 'jeux video', 'video games', 'kids games', 'kids entertainment',
      'children entertainment', 'children games', 'family games', 'recreation',
      'recreational', 'bowling', 'billiards', 'pool hall', 'play center', 'play centre',
    ],
    googleIncludedTypes: [
      'video_arcade', 'amusement_center', 'indoor_playground', 'bowling_alley',
      'miniature_golf_course', 'paintball_center', 'go_karting_venue', 'internet_cafe',
      'adventure_sports_center',
    ],
    googleTextQueries: ['arcade game room kids entertainment nearby', 'bowling billiards recreation nearby'],
    osmClauses: [
      'leisure="amusement_arcade"',
      'leisure="bowling_alley"',
      'amenity="internet_cafe"',
      'amenity="games_centre"',
      'amenity="game_centre"',
      'shop="video_games"',
      'name~"arcade|gaming|game|jeux|salle de jeux|video game|playstation|xbox|bowling|billiard|billard",i',
    ],
    signals: [
      'arcade', 'gaming', 'game', 'game room', 'game center', 'game centre', 'salle de jeux',
      'jeux', 'jeux video', 'jeux vidéo', 'video game', 'playstation', 'xbox', 'bowling',
      'billiards', 'billiard', 'billard', 'pool hall', 'recreation', 'recreational', 'cyber',
    ],
  },
  cinema: {
    id: 'cinema', label: 'Cinema', legacyCategory: 'entertainment', mood: 'chill',
    aliases: ['cinema', 'cinemas', 'cinéma', 'cinémas', 'movie', 'movie theater', 'movie theatre', 'film'],
    googleIncludedTypes: ['movie_theater'],
    googleTextQueries: ['cinemas nearby', 'movie theaters nearby'],
    osmClauses: ['amenity="cinema"'],
    signals: ['cinema', 'cinéma', 'movie theater', 'movie theatre', 'film'],
  },
  park: {
    id: 'park', label: 'Park', legacyCategory: 'outdoors-nature', mood: 'outdoor',
    aliases: ['park', 'parks', 'parc', 'parcs'],
    googleIncludedTypes: ['park', 'city_park', 'state_park', 'national_park'],
    googleTextQueries: ['parks nearby'],
    osmClauses: ['leisure="park"', 'leisure="garden"', 'boundary="national_park"'],
    signals: ['park', 'parc', 'city park', 'state park', 'national park'],
  },
  gym: {
    id: 'gym', label: 'Gym', legacyCategory: 'outdoors-nature', mood: 'energetic',
    aliases: ['gym', 'gyms', 'fitness', 'fitness center', 'fitness centre', 'sport', 'sports'],
    googleIncludedTypes: ['gym', 'fitness_center', 'sports_complex', 'sports_club'],
    googleTextQueries: ['gyms nearby', 'fitness centers nearby'],
    osmClauses: ['leisure="fitness_centre"', 'leisure="sports_centre"', 'sport'],
    signals: ['gym', 'fitness', 'fitness center', 'fitness centre', 'sports complex', 'sports club'],
  },
  shopping: {
    id: 'shopping', label: 'Shopping', legacyCategory: 'shopping-vintage', mood: 'explore',
    aliases: ['shopping', 'shop', 'shops', 'stores', 'store', 'mall', 'malls', 'market', 'markets', 'magasin', 'shopping mall'],
    googleIncludedTypes: [
      'shopping_mall', 'department_store', 'store', 'clothing_store', 'book_store',
      'thrift_store', 'flea_market', 'toy_store', 'gift_shop',
    ],
    googleTextQueries: ['shopping malls nearby', 'stores nearby'],
    osmClauses: ['shop', 'shop="mall"', 'shop="department_store"', 'amenity="marketplace"'],
    signals: ['shopping', 'shop', 'store', 'mall', 'market', 'magasin', 'boutique', 'retail'],
  },
  nightlife: {
    id: 'nightlife', label: 'Nightlife', legacyCategory: 'nightlife', mood: 'party',
    aliases: ['nightlife', 'night life', 'bar', 'bars', 'club', 'clubs', 'nightclub', 'night club', 'pub', 'karaoke', 'live music'],
    googleIncludedTypes: ['bar', 'night_club', 'cocktail_bar', 'karaoke', 'live_music_venue'],
    googleTextQueries: ['nightlife nearby', 'bars and clubs nearby'],
    osmClauses: ['amenity~"bar|pub|nightclub|biergarten"', 'name~"club|discotheque|discothèque|karaoke|lounge",i'],
    signals: ['bar', 'pub', 'club', 'nightclub', 'night club', 'discotheque', 'discothèque', 'karaoke', 'lounge', 'cocktail'],
  },
  'family-kids': {
    id: 'family-kids', label: 'Family & Kids', legacyCategory: 'entertainment', mood: 'energetic',
    aliases: ['family', 'family and kids', 'family kids', 'kids', 'children', 'childrens', 'kids entertainment', 'family entertainment', 'playground', 'playgrounds'],
    googleIncludedTypes: [
      'indoor_playground', 'playground', 'amusement_center', 'amusement_park',
      'water_park', 'zoo', 'aquarium', 'childrens_camp',
    ],
    googleTextQueries: ['kids entertainment nearby', 'family entertainment nearby'],
    osmClauses: ['leisure="playground"', 'tourism~"zoo|aquarium"', 'amenity="family_centre"', 'leisure~"amusement_park|water_park"'],
    signals: ['kids', 'children', 'childrens', 'family', 'playground', 'play center', 'amusement center', 'amusement park', 'water park', 'zoo', 'aquarium'],
  },
  tourist: {
    id: 'tourist', label: 'Tourist', legacyCategory: 'hidden-gems', mood: 'explore',
    aliases: ['tourist', 'tourism', 'tourist attractions', 'attraction', 'attractions', 'monument', 'landmark', 'sightseeing', 'visiting'],
    googleIncludedTypes: [
      'tourist_attraction', 'monument', 'observation_deck', 'cultural_landmark',
      'historical_place', 'historical_landmark', 'castle', 'visitor_center', 'plaza',
    ],
    googleTextQueries: ['tourist attractions nearby', 'sightseeing nearby'],
    osmClauses: ['tourism~"attraction|museum|viewpoint|gallery"', 'historic', 'amenity="fountain"'],
    signals: ['tourist', 'tourism', 'attraction', 'monument', 'landmark', 'historical', 'castle', 'visitor center', 'sightseeing'],
  },
  'arts-culture': {
    id: 'arts-culture', label: 'Arts & Culture', legacyCategory: 'arts-culture', mood: 'curious',
    aliases: ['arts', 'art', 'arts and culture', 'culture', 'museum', 'museums', 'gallery', 'galleries', 'library', 'theatre', 'theater'],
    googleIncludedTypes: ['museum', 'art_gallery', 'art_museum', 'library', 'performing_arts_theater', 'cultural_center', 'art_studio'],
    googleTextQueries: ['museums and galleries nearby', 'arts and culture nearby'],
    osmClauses: ['tourism~"museum|gallery"', 'amenity~"theatre|arts_centre|library"'],
    signals: ['museum', 'musée', 'gallery', 'galerie', 'library', 'bibliothèque', 'theatre', 'theater', 'culture', 'cultural', 'art'],
  },
  outdoors: {
    id: 'outdoors', label: 'Outdoors', legacyCategory: 'outdoors-nature', mood: 'outdoor',
    aliases: ['outdoors', 'outdoor', 'nature', 'hiking', 'hike', 'beach', 'beaches', 'garden', 'gardens', 'camping', 'campground'],
    googleIncludedTypes: ['hiking_area', 'beach', 'garden', 'botanical_garden', 'campground', 'nature_preserve', 'wildlife_park', 'wildlife_refuge'],
    googleTextQueries: ['outdoor activities nearby', 'nature spots nearby'],
    osmClauses: ['leisure~"garden|nature_reserve|camp_site"', 'natural="beach"', 'tourism~"viewpoint|zoo|aquarium"'],
    signals: ['outdoors', 'outdoor', 'nature', 'hiking', 'hike', 'beach', 'plage', 'garden', 'jardin', 'camping', 'campground'],
  },
  wellness: {
    id: 'wellness', label: 'Wellness', legacyCategory: 'chill-spots', mood: 'lazy',
    aliases: ['wellness', 'spa', 'spas', 'relax', 'relaxation', 'massage', 'yoga'],
    googleIncludedTypes: ['spa'],
    googleTextQueries: ['spas nearby', 'wellness nearby'],
    osmClauses: ['leisure="sauna"', 'leisure="fitness_centre"', 'name~"spa|wellness|relax|massage|yoga",i'],
    signals: ['spa', 'wellness', 'relax', 'massage', 'yoga'],
  },
  hotel: {
    id: 'hotel', label: 'Hotel', legacyCategory: 'chill-spots', mood: 'chill',
    aliases: ['hotel', 'hotels', 'hôtel', 'hôtels', 'hostel', 'lodging', 'resort', 'guest house', 'guesthouse'],
    googleIncludedTypes: ['hotel', 'lodging'],
    googleTextQueries: ['hotels nearby'],
    osmClauses: ['tourism~"hotel|hostel|guest_house|motel"'],
    signals: ['hotel', 'hôtel', 'hostel', 'lodging', 'resort', 'guest house', 'guesthouse', 'motel'],
  },
  library: {
    id: 'library', label: 'Library', legacyCategory: 'arts-culture', mood: 'curious',
    aliases: ['library', 'libraries', 'bibliothèque', 'bibliotheque'],
    googleIncludedTypes: ['library'],
    googleTextQueries: ['libraries nearby'],
    osmClauses: ['amenity="library"'],
    signals: ['library', 'libraries', 'bibliothèque', 'bibliotheque'],
  },
  worship: {
    id: 'worship', label: 'Places of Worship', legacyCategory: 'arts-culture', mood: 'curious',
    aliases: ['mosque', 'mosques', 'mosquée', 'mosquée', 'church', 'churches', 'temple', 'synagogue', 'worship'],
    googleIncludedTypes: ['mosque', 'church', 'hindu_temple', 'synagogue'],
    googleTextQueries: ['mosques nearby', 'churches nearby'],
    osmClauses: ['amenity~"place_of_worship"', 'building~"church|mosque|synagogue"'],
    signals: ['mosque', 'mosquée', 'masjid', 'مسجد', 'church', 'église', 'eglise', 'temple', 'synagogue'],
  },
  entertainment: {
    id: 'entertainment', label: 'Entertainment', legacyCategory: 'entertainment', mood: 'energetic',
    aliases: ['entertainment', 'fun', 'activities', 'events', 'amusement'],
    googleIncludedTypes: ['amphitheatre', 'auditorium', 'comedy_club', 'concert_hall', 'event_venue', 'ferris_wheel', 'roller_coaster', 'planetarium'],
    googleTextQueries: ['entertainment nearby', 'fun activities nearby'],
    osmClauses: ['amenity~"arts_centre|theatre|cinema"', 'leisure~"amusement_park|water_park"'],
    signals: ['entertainment', 'fun', 'activity', 'activities', 'amusement', 'events'],
  },
};

export const LEGACY_CATEGORY_TO_CANONICAL: Record<CategoryType, VybeCategory[]> = {
  'food-drink': ['restaurant', 'cafe'],
  nightlife: ['nightlife'],
  'arts-culture': ['arts-culture', 'library', 'worship'],
  'outdoors-nature': ['park', 'gym', 'outdoors'],
  entertainment: ['cinema', 'family-kids', 'entertainment'],
  'arcade-gaming': ['games'],
  'hidden-gems': ['tourist'],
  'chill-spots': ['wellness', 'hotel'],
  'shopping-vintage': ['shopping'],
};

const ALL_CATEGORIES = Object.keys(VYBE_CATEGORY_DEFINITIONS) as VybeCategory[];

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanedQuery(value?: string): string {
  const normalized = normalizeText(value);
  return normalized
    .replace(/\b(near me|nearby|around me|a proximite|a proximité|pres de moi|pres moi|pres|ici)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCategoryQuery(query?: string): VybeCategory | null {
  const normalized = cleanedQuery(query);
  if (!normalized) return null;
  const exact = ALL_CATEGORIES.find(category => VYBE_CATEGORY_DEFINITIONS[category].aliases.some(alias => normalizeText(alias) === normalized));
  if (exact) return exact;

  const matches = ALL_CATEGORIES.filter(category =>
    VYBE_CATEGORY_DEFINITIONS[category].aliases.some(alias => {
      const aliasNorm = normalizeText(alias);
      return aliasNorm.length >= 4 && (normalized.includes(aliasNorm) || aliasNorm.includes(normalized));
    })
  );
  return matches.length === 1 ? matches[0] : null;
}

export function legacyCategoryToCanonical(category: CategoryType): VybeCategory[] {
  return LEGACY_CATEGORY_TO_CANONICAL[category] ?? [];
}

export function categoryDefinition(category: VybeCategory): ProviderCategoryDefinition {
  return VYBE_CATEGORY_DEFINITIONS[category];
}

function typeMatches(definition: ProviderCategoryDefinition, providerTypes: string[]): boolean {
  const typeSet = new Set(providerTypes.map(type => normalizeText(type).replace(/ /g, '_')));
  return definition.googleIncludedTypes.some(type => typeSet.has(normalizeText(type).replace(/ /g, '_')))
    || definition.signals.some(signal => providerTypes.some(type => normalizeText(type).includes(normalizeText(signal))));
}

export function classifyProviderPlace(
  providerTypes: string[] = [],
  providerPrimaryType?: string,
  name?: string,
): { canonicalCategory: VybeCategory; legacyCategory: CategoryType; mood: MoodType; confidence: number } {
  const normalizedName = normalizeText(name);
  const types = [...new Set(providerTypes.filter(Boolean))];
  const primary = normalizeText(providerPrimaryType).replace(/ /g, '_');
  const primaryCategory = ALL_CATEGORIES.find(category => {
    const definition = VYBE_CATEGORY_DEFINITIONS[category];
    return definition.googleIncludedTypes.some(type => normalizeText(type).replace(/ /g, '_') === primary);
  });
  if (primaryCategory) {
    const definition = VYBE_CATEGORY_DEFINITIONS[primaryCategory];
    return { canonicalCategory: primaryCategory, legacyCategory: definition.legacyCategory, mood: definition.mood, confidence: 0.99 };
  }

  // Specific intents win over broad entertainment buckets.
  const precedence: VybeCategory[] = [
    'games', 'cinema', 'restaurant', 'cafe', 'nightlife', 'gym', 'park',
    'family-kids', 'shopping', 'tourist', 'arts-culture', 'library', 'worship',
    'outdoors', 'wellness', 'hotel', 'entertainment',
  ];
  for (const category of precedence) {
    const definition = VYBE_CATEGORY_DEFINITIONS[category];
    if (typeMatches(definition, types)) {
      return { canonicalCategory: category, legacyCategory: definition.legacyCategory, mood: definition.mood, confidence: 0.94 };
    }
  }

  for (const category of precedence) {
    const definition = VYBE_CATEGORY_DEFINITIONS[category];
    const signalHit = definition.signals.some(signal => normalizedName.includes(normalizeText(signal)));
    if (signalHit) return { canonicalCategory: category, legacyCategory: definition.legacyCategory, mood: definition.mood, confidence: 0.78 };
  }

  return { canonicalCategory: 'entertainment', legacyCategory: 'hidden-gems', mood: 'explore', confidence: 0.35 };
}

export function placeMatchesCanonicalCategory(
  place: Pick<{
    canonicalCategory?: VybeCategory;
    providerTypes?: string[];
    providerPrimaryType?: string;
    name: string;
  }, 'canonicalCategory' | 'providerTypes' | 'providerPrimaryType' | 'name'>,
  requested: VybeCategory,
): boolean {
  if (place.canonicalCategory === requested) return true;
  const definition = VYBE_CATEGORY_DEFINITIONS[requested];
  const providerTypes = place.providerTypes ?? [];
  const primary = normalizeText(place.providerPrimaryType).replace(/ /g, '_');
  if (definition.googleIncludedTypes.some(type => normalizeText(type).replace(/ /g, '_') === primary)) return true;
  if (definition.googleIncludedTypes.some(type => providerTypes.includes(type))) return true;
  const normalizedName = normalizeText(place.name);
  return definition.signals.some(signal => normalizedName.includes(normalizeText(signal)));
}

export function canonicalLabel(category?: VybeCategory): string {
  return category ? VYBE_CATEGORY_DEFINITIONS[category]?.label ?? 'Place' : 'Place';
}

export function categorySearchTypes(categories: VybeCategory[]): string[] {
  return [...new Set(categories.flatMap(category => VYBE_CATEGORY_DEFINITIONS[category]?.googleIncludedTypes ?? []))];
}

export function categorySearchTextQueries(categories: VybeCategory[]): string[] {
  return [...new Set(categories.flatMap(category => VYBE_CATEGORY_DEFINITIONS[category]?.googleTextQueries ?? []))];
}

export function categoryOsmClauses(categories: VybeCategory[]): string[] {
  return [...new Set(categories.flatMap(category => VYBE_CATEGORY_DEFINITIONS[category]?.osmClauses ?? []))];
}
