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
  gaming: 'nwr["amenity"~"^(internet_cafe|arcade|amusement_arcade|bowling_alley)$"]',
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

const clean = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function haversine(a: number, b: number, c: number, d: number): number {
  const radius = 6371;
  const x = (c - a) * Math.PI / 180;
  const y = (d - b) * Math.PI / 180;
  const q = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function classify(name: string, tags: string[], hint: Category): Exclude<Category, 'all'> {
  const text = clean(`${name} ${tags.join(' ')}`);
  if (/arcade|gaming|internet cafe|bowling|jeux video/.test(text)) return 'gaming';
  if (/restaurant|pizza|burger|fast.?food|snack|ice.?cream/.test(text)) return 'food';
  if (/cafe|coffee/.test(text)) return 'cafe';
  if (/bar|pub|club|disco|night/.test(text)) return 'nightlife';
  if (/park|garden|beach|plage|playground|picnic|nature_reserve/.test(text)) return 'outdoors';
  if (/museum|library|theatre|cinema|arts|gallery|culture/.test(text)) return 'culture';
  if (/mall|market|shop|store|boutique|supermarket/.test(text)) return 'shopping';
  if (/sport|stadium|gym|fitness|pitch|swimming/.test(text)) return 'sports';
  if (/hotel|hostel|guest.?house|motel|camp/.test(text)) return 'stay';
  if (/spa|wellness|dentist|clinic/.test(text)) return 'wellness';
  return hint === 'all' ? 'services' : hint as Exclude<Category, 'all'>;
}

function getMood(category: Exclude<Category, 'all'>): Exclude<Mood, 'all'> {
  const moods: Record<Exclude<Category, 'all'>, Exclude<Mood, 'all'>> = {
    gaming: 'gaming', food: 'hungry', cafe: 'chill', nightlife: 'party', outdoors: 'outdoor', culture: 'curious',
    shopping: 'explore', sports: 'energetic', family: 'explore', wellness: 'chill', stay: 'chill', services: 'explore',
  };
  return moods[category];
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function overpass(query: string): Promise<{ elements: any[] }> {
  const body = new URLSearchParams({ data: query });
  for (const endpoint of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const response = await fetch(endpoint, { method: 'POST', body });
      if (response.ok) return await response.json() as { elements: any[] };
    } catch {
      // Try the next Overpass mirror.
    }
  }
  throw new Error('Discovery service unavailable');
}

function queryBlock(category: Category): string {
  return category === 'all' ? Object.values(QUERIES).join(';') : QUERIES[category];
}

function scorePlace(distanceKm: number, radiusKm: number, rating: number | undefined, reviews: number | undefined, completeness: number, hasImage: boolean, category: Category): number {
  const distanceScore = Math.max(0, 34 - (distanceKm / radiusKm) * 24);
  const ratingScore = rating ? Math.min(18, rating * 3.2) : 0;
  const reviewScore = reviews ? Math.min(10, Math.log10(reviews + 1) * 3.2) : 0;
  const completenessScore = completeness * 22;
  const imageScore = hasImage ? 5 : 0;
  const categoryBoost = category === 'gaming' ? 5 : 0;
  return Math.round(Math.min(100, distanceScore + ratingScore + reviewScore + completenessScore + imageScore + categoryBoost));
}

export async function discover(city: City, radiusKm: number, search: string, category: Category): Promise<Place[]> {
  const radius = Math.max(1, Math.min(20, radiusKm));
  const meters = radius * 1000;
  let query: string;

  if (search.trim()) {
    const safeSearch = escapeRegex(search.trim());
    query = `[out:json][timeout:45];(nwr(around:${meters},${city.lat},${city.lng})["name"~"${safeSearch}",i];nwr(around:${meters},${city.lat},${city.lng})["brand"~"${safeSearch}",i];nwr(around:${meters},${city.lat},${city.lng})["operator"~"${safeSearch}",i];);out center tags;`;
  } else {
    const clauses = queryBlock(category).split(';').map((part) => {
      const index = part.indexOf('[');
      return `${part.slice(0, index)}(around:${meters},${city.lat},${city.lng})${part.slice(index)}`;
    }).join(';');
    query = `[out:json][timeout:60];(${clauses};);out center tags;`;
  }

  const data = await overpass(query);
  const seen = new Set<string>();
  const places: Place[] = [];

  for (const element of data.elements || []) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const name = String(element.tags?.name || '').trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const id = `osm-${element.type}-${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const rawTags = element.tags || {} as Record<string, unknown>;
    const tags = Object.entries(rawTags).map(([key, value]) => `${key}:${String(value)}`);
    const resolvedCategory = classify(name, tags, category);
    const distanceKm = haversine(city.lat, city.lng, Number(lat), Number(lng));
    if (distanceKm > radius + 0.25) continue;

    const ratingNumber = Number(rawTags.rating || rawTags.stars);
    const reviewsNumber = Number(rawTags.reviews || rawTags.review_count);
    const rating = Number.isFinite(ratingNumber) && ratingNumber > 0 ? ratingNumber : undefined;
    const reviews = Number.isFinite(reviewsNumber) && reviewsNumber > 0 ? reviewsNumber : undefined;
    const street = [rawTags['addr:street'], rawTags['addr:housenumber']].filter(Boolean).join(' ');
    const address = String(rawTags['addr:full'] || street || rawTags['addr:place'] || city.label);
    const photoFallback = typeof rawTags.image === 'string' ? rawTags.image : typeof rawTags.wikimedia_commons === 'string' ? undefined : undefined;
    const website = typeof rawTags.website === 'string' ? rawTags.website : typeof rawTags['contact:website'] === 'string' ? rawTags['contact:website'] : undefined;
    const phone = typeof rawTags.phone === 'string' ? rawTags.phone : typeof rawTags['contact:phone'] === 'string' ? rawTags['contact:phone'] : undefined;
    const completeness = [address !== city.label, website, phone, rawTags.opening_hours, rating].filter(Boolean).length / 5;
    const sourceText = clean(`${name} ${tags.join(' ')}`);
    const price: Place['price'] = /park|beach|plage|library|playground|mosque|church/.test(sourceText) ? 'free' : /hotel|nightclub|spa|restaurant/.test(sourceText) ? '$$$' : '$$';
    const outdoor = ['outdoors', 'sports', 'family'].includes(resolvedCategory) || Boolean(rawTags.outdoor_seating === 'yes');
    const confidence = Math.max(0.58, Math.min(0.99, 0.58 + completeness * 0.25 + (rating ? 0.08 : 0) + (photoFallback ? 0.04 : 0)));
    const score = scorePlace(distanceKm, radius, rating, reviews, completeness, Boolean(photoFallback), category);

    places.push({
      id,
      name,
      lat: Number(lat),
      lng: Number(lng),
      address,
      type: String(rawTags.amenity || rawTags.leisure || rawTags.shop || rawTags.tourism || 'place'),
      tags,
      category: resolvedCategory,
      mood: getMood(resolvedCategory),
      distanceKm,
      score,
      confidence,
      rating,
      reviews,
      price,
      indoor: !outdoor,
      outdoor,
      reason: `${resolvedCategory} · ${getMood(resolvedCategory)} · ${distanceKm.toFixed(1)} km · ${Math.round(confidence * 100)}% confidence`,
      source: 'OpenStreetMap',
      photoFallback,
      website,
      phone,
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    });
  }

  return places.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm).slice(0, 1000);
}
