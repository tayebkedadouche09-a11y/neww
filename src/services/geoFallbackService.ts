import type { GeoLocation } from '../hooks/useGeolocation';

export type GeoFallbackSource = 'vercel-edge' | 'country-city-default' | 'product-default';

export interface GeoFallbackResult extends GeoLocation {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
  label?: string;
  source: GeoFallbackSource;
}

const SESSION_KEY = 'vybe:geo-fallback';
const SESSION_TTL_MS = 30 * 60 * 1000;

function readSessionCache(): GeoFallbackResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoFallbackResult & { cachedAt?: number };
    if (!parsed || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(result: GeoFallbackResult): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...result, cachedAt: Date.now() }));
  } catch {
    // sessionStorage may be blocked; ignore
  }
}

/**
 * Resolve an approximate location via Vercel edge headers (/api/geo-fallback).
 * Cached in sessionStorage to avoid repeated calls.
 */
export async function fetchGeoFallback(signal?: AbortSignal): Promise<GeoFallbackResult | null> {
  const cached = readSessionCache();
  if (cached) return cached;

  try {
    const response = await fetch('/api/geo-fallback', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
      credentials: 'same-origin',
    });
    if (!response.ok) {
      console.warn('[VYBE] geo-fallback HTTP', response.status);
      return null;
    }
    const data = (await response.json()) as Partial<GeoFallbackResult>;
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const result: GeoFallbackResult = {
      lat,
      lng,
      accuracy: typeof data.accuracy === 'number' && data.accuracy > 0 ? data.accuracy : 25_000,
      timestamp: Date.now(),
      country: data.country ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
      timezone: data.timezone ?? null,
      label: typeof data.label === 'string' ? data.label : data.city || 'Approximate location',
      source: (data.source as GeoFallbackSource) || 'vercel-edge',
    };
    writeSessionCache(result);
    return result;
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') return null;
    console.warn('[VYBE] geo-fallback failed', error);
    return null;
  }
}
