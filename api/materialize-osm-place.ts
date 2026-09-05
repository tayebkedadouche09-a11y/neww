// Inlined verbatim from api/_shared/classify.ts — the Vercel runtime fails to bundle api/_shared imports (FUNCTION_INVOCATION_FAILED). Keep in sync with that file.
type CategoryType='food-drink'|'nightlife'|'arts-culture'|'outdoors-nature'|'entertainment'|'arcade-gaming'|'hidden-gems'|'chill-spots'|'shopping-vintage';
type MoodType='energetic'|'chill'|'romantic'|'creative'|'party'|'curious'|'hungry'|'outdoor'|'gaming'|'music'|'explore'|'lazy';
type VybeCategory='restaurant'|'cafe'|'games'|'cinema'|'park'|'gym'|'shopping'|'nightlife'|'family-kids'|'tourist'|'arts-culture'|'outdoors'|'wellness'|'hotel'|'library'|'worship'|'entertainment';
type IntentKind='gaming'|'quiet'|'romantic'|'family'|'outdoor'|'nightlife'|'food'|'coffee'|'culture'|'shopping'|'wellness'|'tourist'|'entertainment';
interface ProviderCategoryDefinition{id:VybeCategory;label:string;legacyCategory:CategoryType;mood:MoodType;aliases:string[];googleIncludedTypes:string[];googleTextQueries:string[];osmClauses:string[];signals:string[];}
const definitions:ProviderCategoryDefinition[]=[
{id:'restaurant',label:'Restaurant',legacyCategory:'food-drink',mood:'hungry',aliases:['restaurant','restaurants','resto','food','dining','eat','manger'],googleIncludedTypes:['restaurant'],googleTextQueries:['restaurants nearby'],osmClauses:['amenity="restaurant"','amenity="fast_food"','amenity="food_court"'],signals:['restaurant','resto','pizzeria','pizza','burger','tacos','grill','snack','fast food']},
{id:'cafe',label:'Cafe',legacyCategory:'food-drink',mood:'chill',aliases:['cafe','cafes','café','coffee','coffee shop','coffee shops','salon de thé','tea'],googleIncludedTypes:['cafe','coffee_shop'],googleTextQueries:['cafes nearby','coffee shops nearby'],osmClauses:['amenity="cafe"'],signals:['cafe','café','coffee','coffee shop','tea room','salon de thé']},
{id:'games',label:'Games',legacyCategory:'arcade-gaming',mood:'gaming',aliases:['games','game','gaming','arcade','arcades','game room','game center','game centre','salle de jeux','salle de jeu','jeux','jeux video','jeux vidéo','video games','kids games','recreation','bowling','billiards','billiard','billard','pool hall','play center','play centre'],googleIncludedTypes:['video_arcade','amusement_center','indoor_playground','bowling_alley','miniature_golf_course','paintball_center','go_karting_venue','internet_cafe','adventure_sports_center'],googleTextQueries:['arcade game room kids entertainment nearby','bowling billiards recreation nearby'],osmClauses:['leisure="amusement_arcade"','leisure="bowling_alley"','amenity="internet_cafe"','amenity="games_centre"','amenity="game_centre"','shop="video_games"'],signals:['arcade','gaming','game','game room','game center','game centre','salle de jeux','jeux','jeux video','jeux vidéo','video game','playstation','xbox','bowling','billiards','billiard','billard','pool hall','recreation','cyber']},
{id:'cinema',label:'Cinema',legacyCategory:'entertainment',mood:'chill',aliases:['cinema','cinemas','cinéma','cinémas','movie','movie theater','movie theatre','film'],googleIncludedTypes:['movie_theater'],googleTextQueries:['cinemas nearby','movie theaters nearby'],osmClauses:['amenity="cinema"'],signals:['cinema','cinéma','movie theater','movie theatre','film']},
{id:'park',label:'Park',legacyCategory:'outdoors-nature',mood:'outdoor',aliases:['park','parks','parc','parcs'],googleIncludedTypes:['park','city_park','state_park','national_park'],googleTextQueries:['parks nearby'],osmClauses:['leisure="park"'],signals:['park','parc','city park','state park','national park']},
{id:'gym',label:'Gym',legacyCategory:'outdoors-nature',mood:'energetic',aliases:['gym','gyms','fitness','fitness center','fitness centre','sport','sports'],googleIncludedTypes:['gym','sports_complex','sports_club'],googleTextQueries:['gyms nearby','fitness centers nearby'],osmClauses:['leisure="fitness_centre"','leisure="sports_centre"','sport'],signals:['gym','fitness','sports complex','sports club']},
{id:'shopping',label:'Shopping',legacyCategory:'shopping-vintage',mood:'explore',aliases:['shopping','shop','shops','stores','store','mall','malls','market','markets','magasin','shopping mall'],googleIncludedTypes:['shopping_mall','department_store','store','clothing_store','book_store','thrift_store','flea_market','toy_store','gift_shop'],googleTextQueries:['shopping malls nearby','stores nearby'],osmClauses:['shop','amenity="marketplace"'],signals:['shopping','shop','store','mall','market','magasin','boutique','retail']},
{id:'nightlife',label:'Nightlife',legacyCategory:'nightlife',mood:'party',aliases:['nightlife','night life','bar','bars','club','clubs','nightclub','night club','pub','karaoke','live music'],googleIncludedTypes:['bar','night_club','cocktail_bar','karaoke','live_music_venue'],googleTextQueries:['nightlife nearby','bars and clubs nearby'],osmClauses:['amenity~"bar|pub|nightclub|biergarten"'],signals:['bar','pub','club','nightclub','night club','discotheque','karaoke','lounge','cocktail']},
{id:'family-kids',label:'Family & Kids',legacyCategory:'entertainment',mood:'energetic',aliases:['family','family and kids','family kids','kids','children','childrens','playground','playgrounds'],googleIncludedTypes:['indoor_playground','playground','amusement_center','amusement_park','water_park','zoo','aquarium','childrens_camp'],googleTextQueries:['kids entertainment nearby','family entertainment nearby'],osmClauses:['leisure="playground"','tourism~"zoo|aquarium"'],signals:['kids','children','childrens','family','playground','play center','amusement center','amusement park','water park','zoo','aquarium']},
{id:'tourist',label:'Tourist',legacyCategory:'hidden-gems',mood:'explore',aliases:['tourist','tourism','tourist attractions','attraction','attractions','monument','landmark','sightseeing','visiting'],googleIncludedTypes:['tourist_attraction','monument','observation_deck','cultural_landmark','historical_place','historical_landmark','castle','visitor_center','plaza'],googleTextQueries:['tourist attractions nearby','sightseeing nearby'],osmClauses:['tourism~"attraction|viewpoint"','historic'],signals:['tourist','tourism','attraction','monument','landmark','historical','castle','visitor center','sightseeing']},
{id:'arts-culture',label:'Arts & Culture',legacyCategory:'arts-culture',mood:'curious',aliases:['arts','art','arts and culture','culture','museum','museums','gallery','galleries','theatre','theater'],googleIncludedTypes:['museum','art_gallery','art_museum','performing_arts_theater','cultural_center','art_studio'],googleTextQueries:['museums and galleries nearby','arts and culture nearby'],osmClauses:['tourism~"museum|gallery"','amenity~"theatre|arts_centre"'],signals:['museum','musée','gallery','galerie','theatre','theater','culture','cultural','art']},
{id:'outdoors',label:'Outdoors',legacyCategory:'outdoors-nature',mood:'outdoor',aliases:['outdoors','outdoor','nature','hiking','hike','beach','beaches','garden','gardens','camping','campground'],googleIncludedTypes:['hiking_area','beach','garden','botanical_garden','campground','nature_preserve','wildlife_park','wildlife_refuge','scenic_spot','mountain_peak','lake','river','woods'],googleTextQueries:['outdoor activities nearby','nature spots nearby'],osmClauses:['leisure~"garden|nature_reserve|camp_site"','natural="beach"'],signals:['outdoors','outdoor','nature','hiking','hike','beach','plage','garden','jardin','camping','campground','scenic spot','mountain','lake','river','woods']},
{id:'wellness',label:'Wellness',legacyCategory:'chill-spots',mood:'lazy',aliases:['wellness','spa','spas','relax','relaxation','massage','yoga'],googleIncludedTypes:['spa','wellness_center','massage','massage_spa','yoga_studio','sauna'],googleTextQueries:['spas nearby','wellness nearby'],osmClauses:['leisure="sauna"'],signals:['spa','wellness','relax','massage','yoga','sauna']},
{id:'hotel',label:'Hotel',legacyCategory:'chill-spots',mood:'chill',aliases:['hotel','hotels','hôtel','hôtels','hostel','lodging','resort','guest house','guesthouse'],googleIncludedTypes:['hotel','lodging','hostel','guest_house','motel','resort_hotel'],googleTextQueries:['hotels nearby'],osmClauses:['tourism~"hotel|hostel|guest_house|motel"'],signals:['hotel','hôtel','hostel','lodging','resort','guest house','guesthouse','motel']},
{id:'library',label:'Library',legacyCategory:'arts-culture',mood:'curious',aliases:['library','libraries','bibliothèque','bibliotheque'],googleIncludedTypes:['library'],googleTextQueries:['libraries nearby'],osmClauses:['amenity="library"'],signals:['library','libraries','bibliothèque','bibliotheque']},
{id:'worship',label:'Places of Worship',legacyCategory:'arts-culture',mood:'curious',aliases:['mosque','mosques','mosquée','church','churches','temple','synagogue','worship'],googleIncludedTypes:['mosque','church','hindu_temple','synagogue'],googleTextQueries:['mosques nearby','churches nearby'],osmClauses:['amenity="place_of_worship"'],signals:['mosque','mosquée','masjid','مسجد','church','église','eglise','temple','synagogue']},
{id:'entertainment',label:'Entertainment',legacyCategory:'entertainment',mood:'energetic',aliases:['entertainment','fun','activities','events','amusement'],googleIncludedTypes:['amphitheatre','auditorium','comedy_club','concert_hall','event_venue','ferris_wheel','roller_coaster','planetarium'],googleTextQueries:['entertainment nearby','fun activities nearby'],osmClauses:['amenity~"arts_centre|theatre|cinema"'],signals:['entertainment','fun','activity','activities','amusement','events']}
];
const VYBE_CATEGORY_DEFINITIONS=Object.fromEntries(definitions.map(d=>[d.id,d])) as Record<VybeCategory,ProviderCategoryDefinition>;
const ALL_CATEGORIES=definitions.map(d=>d.id);const PRECEDENCE:VybeCategory[]=['games','cinema','restaurant','cafe','nightlife','gym','park','family-kids','shopping','tourist','arts-culture','library','worship','outdoors','wellness','hotel','entertainment'];
const LEGACY_CATEGORY_TO_CANONICAL:Record<CategoryType,VybeCategory[]>={'food-drink':['restaurant','cafe'],'nightlife':['nightlife'],'arts-culture':['arts-culture','library','worship'],'outdoors-nature':['park','gym','outdoors'],'entertainment':['cinema','family-kids','entertainment'],'arcade-gaming':['games'],'hidden-gems':['tourist'],'chill-spots':['wellness','hotel'],'shopping-vintage':['shopping']};
interface UserIntent{rawQuery:string;requestedCategory:VybeCategory|null;kinds:IntentKind[];terms:string[]};export interface RelevanceEvidence{identityValid:boolean;providerEvidenceSufficient:boolean;providerIdentityConfidence:number;categoryMatch:'YES'|'NO'|'N/A';intentMatch:'HIGH'|'MEDIUM'|'LOW'|'N/A';distanceKm?:number;provider:'google'|'osm'|'vybe';decision:'ACCEPT'|'REJECT';reasons:string[]};
function normalizeText(value?:string){return(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,' ').replace(/\s+/g,' ').trim()};function providerToken(value?:string){return normalizeText(value).replace(/ /g,'_')};function cleanedQuery(value?:string){return normalizeText(value).replace(/\b(near me|nearby|around me|a proximite|a proximite de moi|pres de moi|pres moi|ici)\b/g,' ').replace(/\s+/g,' ').trim()};
const STRONG_NON_VYBE_PRIMARY_TYPES=new Set(['hospital','doctor','pharmacy','dentist','police','fire_station','courthouse','government_office','post_office','school','university','airport','bus_station','train_station','transit_station']);
const INTENT_TERMS:Array<[IntentKind,string[]]>=[['gaming',['gaming','game','games','arcade','playstation','xbox','bowling','billiards','billard','game room','jeux video','jeux vidéo','salle de jeux']],['quiet',['quiet','calm','chill','relax','peaceful','tranquil','study']],['romantic',['romantic','romance','date','couple','cozy','intimate']],['family',['family','kids','children','childrens','child friendly']],['outdoor',['outdoor','outdoors','nature','hiking','beach','garden','park']],['nightlife',['nightlife','bar','club','night club','nightclub','pub','karaoke']],['food',['food','eat','dining','restaurant','resto','pizza','burger','tacos']],['coffee',['coffee','cafe','café','tea','salon de thé']],['culture',['museum','gallery','theatre','theater','culture','art','library']],['shopping',['shopping','shop','store','mall','market']],['wellness',['wellness','spa','massage','yoga','relax']],['tourist',['tourist','tourism','attraction','landmark','monument','sightseeing']],['entertainment',['entertainment','fun','activity','activities','events','amusement','cinema','movie']]];
function normalizeCategoryQuery(query?:string):VybeCategory|null{const n=cleanedQuery(query);if(!n)return null;const exact=ALL_CATEGORIES.find(c=>VYBE_CATEGORY_DEFINITIONS[c].aliases.some(a=>normalizeText(a)===n));if(exact)return exact;const matches=ALL_CATEGORIES.filter(c=>VYBE_CATEGORY_DEFINITIONS[c].aliases.some(a=>{const x=normalizeText(a);return x.length>=4&&(n.includes(x)||x.includes(n))}));return matches.length===1?matches[0]:null;}
function extractCategoryHint(query?:string):VybeCategory|null{const n=cleanedQuery(query);if(!n)return null;let best:{category:VybeCategory;position:number;length:number}|null=null;for(const c of ALL_CATEGORIES)for(const alias of VYBE_CATEGORY_DEFINITIONS[c].aliases){const a=normalizeText(alias);if(a.length<4)continue;let from=0;while(true){const p=n.indexOf(a,from);if(p<0)break;if((p===0||n[p-1]===' ')&&(p+a.length===n.length||n[p+a.length]===' ')){if(!best||p>best.position||(p===best.position&&a.length>best.length))best={category:c,position:p,length:a.length};}from=p+a.length;}}return best?.category??null;}
function parseUserIntent(query?:string):UserIntent{const raw=String(query??'').trim(),n=cleanedQuery(raw),requestedCategory=extractCategoryHint(raw),kinds:IntentKind[]=[],terms:string[]=[];for(const[kind,words]of INTENT_TERMS)if(words.some(word=>n.includes(normalizeText(word)))){kinds.push(kind);terms.push(kind)}return{rawQuery:raw,requestedCategory,kinds,terms:[...new Set(terms)]};}
function matchesType(d:ProviderCategoryDefinition,types:string[]){const n=types.map(providerToken);return n.some(t=>d.googleIncludedTypes.some(x=>providerToken(x)===t))}function nameSignal(d:ProviderCategoryDefinition,name?:string){const n=normalizeText(name);return d.signals.some(s=>n.includes(normalizeText(s)))}
function isGooglePhotoIdentityExact(providerPlaceId:string,photoName:string){const id=providerPlaceId.trim(),name=photoName.trim();return Boolean(id&&/^[A-Za-z0-9_-]{1,300}$/.test(id)&&new RegExp(`^places/${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/photos/[^/]+$`).test(name))}
function classifyProviderPlace(providerTypes:string[]=[],providerPrimaryType?:string,name?:string){const types=[...new Set(providerTypes.filter(Boolean))],primary=providerToken(providerPrimaryType),strongNonVybe=STRONG_NON_VYBE_PRIMARY_TYPES.has(primary);const primaryMatch=ALL_CATEGORIES.find(c=>VYBE_CATEGORY_DEFINITIONS[c].googleIncludedTypes.some(t=>providerToken(t)===primary));let primaryCategory=primaryMatch??null;let evidenceSource:'primaryType'|'types'|'name'=primaryMatch?'primaryType':'types';if(!primaryCategory&&!strongNonVybe)primaryCategory=PRECEDENCE.find(c=>matchesType(VYBE_CATEGORY_DEFINITIONS[c],types))??null;if(!primaryCategory&&!strongNonVybe){primaryCategory=PRECEDENCE.find(c=>nameSignal(VYBE_CATEGORY_DEFINITIONS[c],name))??null;evidenceSource='name'}if(!primaryCategory)primaryCategory='entertainment';const secondary=PRECEDENCE.filter(c=>c!==primaryCategory&&matchesType(VYBE_CATEGORY_DEFINITIONS[c],types)).slice(0,4),d=VYBE_CATEGORY_DEFINITIONS[primaryCategory],confidence=strongNonVybe?.99:primaryMatch?.99:types.some(t=>matchesType(d,[t]))?.94:nameSignal(d,name)?.78:.35;return{canonicalCategory:primaryCategory,legacyCategory:d.legacyCategory,mood:d.mood,confidence,secondaryCategories:secondary,evidenceSource,providerIdentityValid:!strongNonVybe}}


type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getBearerToken(req: ApiRequest): string | null {
  const raw = req.headers.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function clientIdentity(req: ApiRequest): string {
  const raw = req.headers['x-forwarded-for'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return text(value).split(',')[0].trim() || 'unknown';
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function jsonBody(req: ApiRequest): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
}

function parseOsmPlaceId(placeId: string): { type: 'node' | 'way' | 'relation'; id: number } | null {
  const match = /^osm:(node|way|relation):([0-9]+)$/.exec(placeId.trim());
  if (!match) return null;
  const id = Number(match[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return { type: match[1] as 'node' | 'way' | 'relation', id };
}

async function requestOverpass(query: string): Promise<Response> {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'VYBE persistence proxy/1.0'
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal
      });
      if (response.ok) return response;
      lastError = new Error(`Overpass returned ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('OpenStreetMap unavailable');
}

async function readUpstreamError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => '');
  if (!raw) return `upstream status ${response.status}`;
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; hint?: unknown; details?: unknown };
    const parts = [parsed.message, parsed.hint, parsed.details]
      .filter((value): value is string => typeof value === 'string' && value.trim())
      .map(value => value.trim());
    return parts.join(' | ').slice(0, 800) || raw.slice(0, 800);
  } catch {
    return raw.replace(/\s+/g, ' ').trim().slice(0, 800);
  }
}

function parseTags(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => [k, String(v)])
  );
}

function coordinates(element: Record<string, unknown>): { latitude: number; longitude: number } | null {
  const center = element.center && typeof element.center === 'object'
    ? element.center as Record<string, unknown>
    : undefined;
  const lat = typeof element.lat === 'number' ? element.lat : center?.lat;
  const lng = typeof element.lon === 'number' ? element.lon : center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = text(process.env.SUPABASE_URL);
  const supabaseAnonKey = text(process.env.SUPABASE_ANON_KEY);
  const supabaseServiceRoleKey = text(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return res.status(503).json({ error: 'Server-side place persistence is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  if (rateLimited(`${clientIdentity(req)}:${token.slice(0, 24)}`)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const payload = jsonBody(req);
  const placeId = text(payload.placeId);
  const parsed = parseOsmPlaceId(placeId);
  if (!parsed) return res.status(400).json({ error: 'Invalid OpenStreetMap place ID.' });

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!authResponse.ok) return res.status(401).json({ error: 'Invalid or expired session.' });

  const osmExternalId = `${parsed.type}/${parsed.id}`;
  const existingResponse = await fetch(
    `${supabaseUrl}/rest/v1/places?select=id,provider&external_place_id=eq.${encodeURIComponent(osmExternalId)}&limit=1`,
    {
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`
      }
    }
  );

  if (existingResponse.ok) {
    const existing = await existingResponse.json() as Array<{ id?: string; provider?: string }>;
    if (existing[0]?.id && existing[0]?.provider === 'osm') {
      return res.status(200).json({ id: existing[0].id });
    }
  }

  const query = `[out:json][timeout:8];${parsed.type}(id:${parsed.id});out center tags;`;
  let overpassResponse: Response;
  try {
    overpassResponse = await requestOverpass(query);
  } catch {
    return res.status(503).json({ error: 'OpenStreetMap is temporarily unavailable.' });
  }

  const overpassBody = await overpassResponse.text();
  let overpass: { elements?: unknown[] } = {};
  try {
    overpass = JSON.parse(overpassBody) as { elements?: unknown[] };
  } catch {
    return res.status(502).json({ error: 'Invalid OpenStreetMap response.' });
  }

  const element = Array.isArray(overpass.elements) && overpass.elements.length > 0
    ? overpass.elements[0]
    : null;

  if (!element || typeof element !== 'object') {
    return res.status(404).json({ error: 'OpenStreetMap place not found.' });
  }

  const record = element as Record<string, unknown>;
  const returnedType = text(record.type);
  const returnedId = Number(record.id);
  if (returnedType !== parsed.type || returnedId !== parsed.id) {
    return res.status(422).json({ error: 'OpenStreetMap returned an invalid place identity.' });
  }

  const tags = parseTags(record.tags);
  const name = text(tags.name || tags['name:fr'] || tags['name:ar']);
  if (!name) return res.status(422).json({ error: 'OpenStreetMap place has no name.' });

  const coords = coordinates(record);
  if (!coords) return res.status(422).json({ error: 'OpenStreetMap place has invalid coordinates.' });

  const providerTypes = [
    tags.amenity,
    tags.leisure,
    tags.tourism,
    tags.shop,
    tags.sport,
    tags.natural,
    tags.religion,
    tags['theatre:type']
  ].filter((value): value is string => Boolean(value)).slice(0, 30);

  const classification = classifyProviderPlace(providerTypes, providerTypes[0], name);
  const address = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city']
  ].filter(Boolean).join(', ') || null;

  const row = {
    id: placeId,
    external_place_id: osmExternalId,
    provider: 'osm',
    name: name.slice(0, 500),
    tagline: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || 'OpenStreetMap place',
    description: text(tags.description) || name,
    category: classification.legacyCategory || 'hidden-gems',
    canonical_category: classification.canonicalCategory || null,
    primary_mood: classification.mood || 'explore',
    secondary_moods: [],
    latitude: coords.latitude,
    longitude: coords.longitude,
    address,
    neighborhood: text(tags['addr:suburb']) || null,
    city: text(tags['addr:city']) || null,
    price_level: null,
    approx_cost_usd: 0,
    rating: 0,
    review_count: 0,
    base_vybe_score: 58,
    photos: [],
    tags: providerTypes,
    provider_types: providerTypes,
    provider_primary_type: providerTypes[0] || null,
    estimated_duration: '',
    opening_hours: {},
    features: {
      isFree: ['park', 'garden', 'playground', 'beach', 'library', 'place_of_worship'].includes(tags.leisure || tags.natural || tags.amenity || ''),
      isOutdoor: Boolean(tags.leisure || tags.natural || tags.tourism === 'camp_site'),
      isIndoor: Boolean(tags.amenity || tags.shop),
      isPhotoSpot: Boolean(tags.image || tags.wikimedia_commons || tags.tourism === 'attraction')
    },
    suitable_for: ['solo', 'friends', 'family', 'group'],
    website: text(tags.website) || null,
    phone: text(tags.phone) || null,
    instagram: text(tags['contact:instagram']) || null,
    featured: false,
    trending: false
  };

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/places`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(row)
  });

  if (!insertResponse.ok) {
    const upstream = await readUpstreamError(insertResponse);
    console.error('[VYBE] OSM place materialization failed', {
      status: insertResponse.status,
      placeId,
      upstream
    });
    if (insertResponse.status === 409) return res.status(200).json({ id: placeId });
    return res.status(500).json({
      error: 'Could not persist the verified OpenStreetMap place.',
      detail: upstream
    });
  }

  return res.status(200).json({ id: placeId });
}
