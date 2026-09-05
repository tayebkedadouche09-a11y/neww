/**
 * VYBE geo fallback — approximate visitor location from Vercel edge headers.
 * Used only when the browser Geolocation API is denied, timed out, or unsupported.
 * Never pretends to be GPS: accuracy is intentionally coarse.
 */

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

/** Product-focused city centroids (Algeria-first). */
const CITY_DEFAULTS: Record<string, { lat: number; lng: number; label: string }> = {
  algiers: { lat: 36.7538, lng: 3.0588, label: 'Algiers' },
  oran: { lat: 35.6969, lng: -0.6331, label: 'Oran' },
  constantine: { lat: 36.365, lng: 6.6147, label: 'Constantine' },
  annaba: { lat: 36.9, lng: 7.7667, label: 'Annaba' },
  setif: { lat: 36.1911, lng: 5.4137, label: 'Sétif' },
  blida: { lat: 36.47, lng: 2.8277, label: 'Blida' },
  batna: { lat: 35.5559, lng: 6.1741, label: 'Batna' },
};

const COUNTRY_DEFAULTS: Record<string, { lat: number; lng: number; label: string }> = {
  DZ: CITY_DEFAULTS.algiers,
};

/** Coarse accuracy (meters) so UI can treat this as approximate, not GPS. */
const IP_ACCURACY_M = 25_000;
const COUNTRY_ACCURACY_M = 50_000;
const DEFAULT_ACCURACY_M = 50_000;

function header(req: ApiRequest, name: string): string {
  const raw = req.headers[name] ?? req.headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

function clientIdentity(req: ApiRequest): string {
  const forwarded = header(req, 'x-forwarded-for');
  return forwarded.split(',')[0].trim() || header(req, 'x-real-ip') || 'unknown';
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

function normalizeCityKey(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function resolveCityDefault(city: string, country: string): { lat: number; lng: number; label: string } | null {
  const key = normalizeCityKey(city);
  if (key && CITY_DEFAULTS[key]) return CITY_DEFAULTS[key];
  // Common French / alternate spellings for Algerian cities
  if (key.includes('alger')) return CITY_DEFAULTS.algiers;
  if (key.includes('wahran') || key.includes('oran')) return CITY_DEFAULTS.oran;
  if (key.includes('qacentina') || key.includes('constantine')) return CITY_DEFAULTS.constantine;
  if (country === 'DZ') return COUNTRY_DEFAULTS.DZ;
  return null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimited(clientIdentity(req))) {
    return res.status(429).json({ error: 'Too many geo requests. Please try again shortly.' });
  }

  const country = header(req, 'x-vercel-ip-country').toUpperCase();
  const region = header(req, 'x-vercel-ip-country-region');
  const city = header(req, 'x-vercel-ip-city');
  const latRaw = header(req, 'x-vercel-ip-latitude');
  const lngRaw = header(req, 'x-vercel-ip-longitude');
  const timezone = header(req, 'x-vercel-ip-timezone');

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  if (hasCoords) {
    return res.status(200).json({
      lat,
      lng,
      accuracy: IP_ACCURACY_M,
      country: country || null,
      region: region || null,
      city: city || null,
      timezone: timezone || null,
      label: city || country || 'Approximate location',
      source: 'vercel-edge',
    });
  }

  const cityDefault = resolveCityDefault(city, country);
  if (cityDefault) {
    return res.status(200).json({
      lat: cityDefault.lat,
      lng: cityDefault.lng,
      accuracy: country === 'DZ' && !city ? COUNTRY_ACCURACY_M : IP_ACCURACY_M,
      country: country || 'DZ',
      region: region || null,
      city: cityDefault.label,
      timezone: timezone || 'Africa/Algiers',
      label: cityDefault.label,
      source: 'country-city-default',
    });
  }

  // Ultimate fallback: product default (Algiers) so discovery never stays empty.
  const fallback = CITY_DEFAULTS.algiers;
  return res.status(200).json({
    lat: fallback.lat,
    lng: fallback.lng,
    accuracy: DEFAULT_ACCURACY_M,
    country: country || 'DZ',
    region: region || null,
    city: fallback.label,
    timezone: timezone || 'Africa/Algiers',
    label: fallback.label,
    source: 'product-default',
  });
}
