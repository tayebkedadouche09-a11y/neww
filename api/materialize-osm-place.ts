import { classifyProviderPlace } from './_shared/classify';

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
