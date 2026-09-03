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
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_RADIUS_METERS = 50_000;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function clientIdentity(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return text(raw).split(',')[0].trim() || 'unknown';
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
    try { return JSON.parse(req.body) as Record<string, unknown>; } catch { return {}; }
  }
  return typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
}

function buildQuery(lat: number, lng: number, radiusMeters: number, clauses: string[]): string {
  return `[out:json][timeout:20];(${clauses.map(clause => `nwr(around:${radiusMeters},${lat},${lng})[${clause}];`).join('')});out center tags;`;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimited(clientIdentity(req))) {
    return res.status(429).json({ error: 'Too many discovery requests. Please try again later.' });
  }

  const payload = jsonBody(req);
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  const radiusMeters = Number(payload.radiusMeters);
  const clauses = Array.isArray(payload.clauses)
    ? payload.clauses.filter((value): value is string => typeof value === 'string' && value.length > 0 && value.length <= 300).slice(0, 6)
    : [];

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid coordinates.' });
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > MAX_RADIUS_METERS) {
    return res.status(400).json({ error: 'Invalid radius.' });
  }
  if (!clauses.length) return res.status(400).json({ error: 'No discovery filters supplied.' });

  const query = buildQuery(lat, lng, radiusMeters, clauses);
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  let lastStatus = 502;
  let lastMessage = 'OpenStreetMap discovery is temporarily unavailable.';

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18_000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'VYBE discovery proxy/1.0'
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        lastStatus = response.status >= 500 ? 503 : response.status;
        lastMessage = `OpenStreetMap discovery failed (${response.status}).`;
        continue;
      }

      const body = await response.text();
      let json: unknown;
      try { json = JSON.parse(body); } catch {
        lastStatus = 502;
        lastMessage = 'OpenStreetMap returned an invalid response.';
        continue;
      }
      return res.status(200).json(json);
    } catch (error) {
      lastStatus = 504;
      lastMessage = error instanceof Error && error.name === 'AbortError'
        ? 'OpenStreetMap discovery timed out.'
        : 'OpenStreetMap discovery is temporarily unavailable.';
    }
  }

  return res.status(lastStatus).json({ error: lastMessage });
}
