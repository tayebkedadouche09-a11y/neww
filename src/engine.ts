export type Category = 'all' | 'gaming' | 'food' | 'cafe' | 'nightlife' | 'outdoors' | 'culture' | 'shopping' | 'sports' | 'family' | 'wellness' | 'stay' | 'services';
export type Mood = 'all' | 'gaming' | 'chill' | 'party' | 'hungry' | 'curious' | 'outdoor' | 'energetic' | 'romantic' | 'creative' | 'explore';

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  type: string;
  tags: string[];
  category: Exclude<Category, 'all'>;
  mood: Exclude<Mood, 'all'>;
  distanceKm: number;
  score: number;
  confidence: number;
  rating?: number;
  reviews?: number;
  price: 'free' | '$' | '$$' | '$$$';
  indoor: boolean;
  outdoor: boolean;
  reason: string;
  source: 'OpenStreetMap';
  photoFallback?: string;
  website?: string;
  phone?: string;
  osmUrl: string;
};

export type City = { id: string; label: string; lat: number; lng: number };

export const CITIES: City[] = [
  { id: 'bejaia', label: 'Béjaïa', lat: 36.7525, lng: 5.0556 },
  { id: 'algiers', label: 'Alger', lat: 36.7538, lng: 3.0588 },
  { id: 'oran', label: 'Oran', lat: 35.6971, lng: -0.6308 },
  { id: 'setif', label: 'Sétif', lat: 36.1898, lng: 5.4108 },
  { id: 'constantine', label: 'Constantine', lat: 36.365, lng: 6.6147 },
];

const QUERIES: Record<Exclude<Category, 'all'>, string> = {
  gaming: 'nwr["amenity"~"^(internet_cafe|arcade|amusement_arcade|bowling_alley)$"];nwr["shop"="video_games"]',
  food: 'nwr["amenity"~"^(restaurant|fast_food|food_court|ice_cream)$"]',
  cafe: 'nwr["amenity"="cafe"]',
  nightlife: 'nwr["amenity"~"^(bar|pub|nightclub|disco|biergarten)$"]',
  outdoors: 'nwr["leisure"~"^(park|garden|playground|nature_reserve|picnic_table)$"];nwr["natural"~"^(beach|peak|wood)$"]',
  culture: 'nwr["amenity"~"^(library|theatre|cinema|arts_centre|community_centre)$"];nwr["tourism"~"^(museum|gallery|attraction)$"]',
  shopping: 'nwr["shop"];nwr["amenity"="marketplace"]',
  sports: 'nwr["leisure"~"^(sports_centre|stadium|pitch|fitness_centre|swimming_pool)$"]',
  family: 'nwr["leisure"="playground"];nwr["tourism"~"^(zoo|aquarium)$"];nwr["amenity"="childcare"]',
  wellness: 'nwr["leisure"="fitness_centre"];nwr["amenity"~"^(spa|clinic|dentist)$"]',
  stay: 'nwr["tourism"~"^(hotel|hostel|guest_house|motel|camp_site)$"]',
  services: 'nwr["amenity"~"^(hospital|clinic|pharmacy|bank|post_office|fuel|car_wash)$"]',
};

const ALL_CATEGORIES = Object.keys(QUERIES) as Array<Exclude<Category, 'all'>>;
const clean = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function haversine(a: number, b: number, c: number, d: number) {
  const radius = 6371;
  const x = (c - a) * Math.PI / 180;
  const y = (d - b) * Math.PI / 180;
  const q = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function classify(name: string, tags: string[], hint: Category): Exclude<Category, 'all'> {
  const value = clean(`${name} ${tags.join(' ')}`);

  if (/arcade|gaming|internet cafe|bowling|video game|jeux video/.test(value)) return 'gaming';
  if (/restaurant|pizza|burger|fast.?food|snack|ice.?cream/.test(value)) return 'food';
  if (/cafe|coffee|coffee shop/.test(value)) return 'cafe';
  if (/bar|pub|club|disco|nightclub|night life|nightlife/.test(value)) return 'nightlife';
  if (/hotel|hostel|guest.?house|motel|camp site|camping/.test(value)) return 'stay';
  if (/spa|wellness|dentist|clinic|physio|massage/.test(value)) return 'wellness';
  if (/playground|zoo|aquarium|childcare|kids|children/.test(value)) return 'family';
  if (/museum|library|theatre|cinema|arts|gallery|culture|community centre/.test(value)) return 'culture';
  if (/mall|market|shop|store|boutique|supermarket/.test(value)) return 'shopping';
  if (/sport|stadium|gym|fitness|pitch|swimming|tennis|football|basketball/.test(value)) return 'sports';
  if (/park|garden|beach|plage|picnic|nature reserve|viewpoint|promenade|forêt|forest/.test(value)) return 'outdoors';
  return hint === 'all' ? 'services' : hint as Exclude<Category, 'all'>;
}

function getMood(category: Exclude<Category, 'all'>, name: string, tags: string[]): Exclude<Mood, 'all'> {
  const value = clean(`${name} ${tags.join(' ')}`);

  if (/art|atelier|gallery|creative|craft|studio|design|workshop/.test(value)) return 'creative';
  if (/romantic|couple|sunset|sun rise|sunrise|sea view|sea side|seaside|panorama|viewpoint|scenic|promenade/.test(value)) return 'romantic';

  const moods: Record<Exclude<Category, 'all'>, Exclude<Mood, 'all'>> = {
    gaming: 'gaming',
    food: 'hungry',
    cafe: 'chill',
    nightlife: 'party',
    outdoors: 'outdoor',
    culture: 'curious',
    shopping: 'explore',
    sports: 'energetic',
    family: 'explore',
    wellness: 'chill',
    stay: 'chill',
    services: 'explore',
  };
  return moods[category];
}

function scorePlace(distanceKm: number, radiusKm: number, rating: number | undefined, reviews: number | undefined, complete: number, hasImage: boolean, category: Category) {
  const distance = Math.max(0, 34 - (distanceKm / radiusKm) * 24);
  const ratingScore = rating ? Math.min(18, rating * 3.2) : 0;
  const reviewScore = reviews ? Math.min(10, Math.log10(reviews + 1) * 3.2) : 0;
  return Math.round(Math.min(100, distance + ratingScore + reviewScore + complete * 22 + (hasImage ? 5 : 0) + (category === 'gaming' ? 5 : 0)));
}

async function overpass(query: string): Promise<{ elements: any[] }> {
  const body = new URLSearchParams({ data: query });
  for (const endpoint of [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ]) {
    try {
      const response = await fetch(endpoint, { method: 'POST', body });
      if (response.ok) return await response.json() as { elements: any[] };
    } catch {
      // Try the next mirror.
    }
  }
  throw new Error('Discovery service unavailable');
}

function buildAround(clause: string, radiusMeters: number, city: City) {
  const index = clause.indexOf('[');
  return index === -1
    ? `${clause}(around:${radiusMeters},${city.lat},${city.lng})`
    : `${clause.slice(0, index)}(around:${radiusMeters},${city.lat},${city.lng})${clause.slice(index)}`;
}

function queryForCategory(city: City, radiusMeters: number, category: Exclude<Category, 'all'>) {
  const clauses = QUERIES[category].split(';').map(value => buildAround(value, radiusMeters, city)).join(';');
  return `[out:json][timeout:45];(${clauses};);out center tags;`;
}

function queryForSearch(city: City, radiusMeters: number, text: string) {
  const query = escapeRegex(text.trim());
  return `[out:json][timeout:45];(nwr(around:${radiusMeters},${city.lat},${city.lng})["name"~"${query}",i];nwr(around:${radiusMeters},${city.lat},${city.lng})["brand"~"${query}",i];nwr(around:${radiusMeters},${city.lat},${city.lng})["operator"~"${query}",i];nwr(around:${radiusMeters},${city.lat},${city.lng})["alt_name"~"${query}",i];);out center tags;`;
}

function mapElement(element: any, city: City, radius: number, hint: Category): Place | null {
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const name = String(element.tags?.name || '').trim();
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const raw = element.tags || {};
  const tags = Object.entries(raw).map(([key, value]) => `${key}:${String(value)}`);
  const category = hint === 'all' ? classify(name, tags, hint) : hint;
  const distanceKm = haversine(city.lat, city.lng, lat, lng);
  if (distanceKm > radius + 0.25) return null;

  const ratingValue = Number(raw.rating || raw.stars);
  const reviewsValue = Number(raw.reviews || raw.review_count);
  const rating = Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : undefined;
  const reviews = Number.isFinite(reviewsValue) && reviewsValue > 0 ? reviewsValue : undefined;

  const street = [raw['addr:street'], raw['addr:housenumber']].filter(Boolean).join(' ');
  const address = String(raw['addr:full'] || street || raw['addr:place'] || city.label);
  const photoFallback = typeof raw.image === 'string' ? raw.image : undefined;
  const website = typeof raw.website === 'string' ? raw.website : typeof raw['contact:website'] === 'string' ? raw['contact:website'] : undefined;
  const phone = typeof raw.phone === 'string' ? raw.phone : typeof raw['contact:phone'] === 'string' ? raw['contact:phone'] : undefined;
  const completeness = [address !== city.label, website, phone, raw.opening_hours, rating].filter(Boolean).length / 5;
  const text = clean(`${name} ${tags.join(' ')}`);
  const outdoor = ['outdoors', 'sports', 'family'].includes(category) || raw.outdoor_seating === 'yes';
  const price: Place['price'] = /park|beach|plage|library|playground|mosque|church/.test(text)
    ? 'free'
    : /hotel|nightclub|spa|restaurant/.test(text)
      ? '$$$'
      : '$$';

  const confidence = Math.max(0.58, Math.min(0.99, 0.58 + completeness * 0.25 + (rating ? 0.08 : 0) + (photoFallback ? 0.04 : 0)));
  const mood = getMood(category, name, tags);
  const score = scorePlace(distanceKm, radius, rating, reviews, completeness, Boolean(photoFallback), category);

  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    lat,
    lng,
    address,
    type: String(raw.amenity || raw.leisure || raw.shop || raw.tourism || 'place'),
    tags,
    category,
    mood,
    distanceKm,
    score,
    confidence,
    rating,
    reviews,
    price,
    indoor: !outdoor,
    outdoor,
    reason: `${category} · ${mood} · ${distanceKm.toFixed(1)} km · ${Math.round(confidence * 100)}% confidence`,
    source: 'OpenStreetMap',
    photoFallback,
    website,
    phone,
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}

async function settledQueries(queries: string[], limit = 4): Promise<{ elements: any[] }[]> {
  const results: Array<{ elements: any[] }> = [];
  for (let index = 0; index < queries.length; index += limit) {
    const batch = await Promise.allSettled(queries.slice(index, index + limit).map(overpass));
    for (const result of batch) if (result.status === 'fulfilled') results.push(result.value);
  }
  return results;
}

export async function discover(city: City, radiusKm: number, search: string, category: Category): Promise<Place[]> {
  const radius = Math.max(1, Math.min(20, radiusKm));
  const meters = radius * 1000;
  const trimmedSearch = search.trim();

  let responses: { elements: any[] }[];
  let mappingHint: Category = category;

  if (trimmedSearch) {
    responses = await settledQueries([queryForSearch(city, meters, trimmedSearch)]);
    mappingHint = 'all';
  } else if (category === 'all') {
    responses = await settledQueries(ALL_CATEGORIES.map(item => queryForCategory(city, meters, item)));
    mappingHint = 'all';
  } else {
    responses = await settledQueries([queryForCategory(city, meters, category)]);
  }

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const response of responses) {
    for (const element of response.elements || []) {
      const place = mapElement(element, city, radius, mappingHint);
      if (!place || seen.has(place.id)) continue;
      if (category !== 'all' && place.category !== category) continue;
      seen.add(place.id);
      places.push(place);
    }
  }

  if (!places.length) throw new Error(trimmedSearch ? 'Aucun résultat pour cette recherche' : 'Aucun lieu trouvé dans cette zone');
  return places.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm).slice(0, 1000);
}
