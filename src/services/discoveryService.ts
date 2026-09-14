import type { CategoryType, FilterState, Place, VybeCategory } from '../types';
import { isGoogleMapsConfigured } from '../lib/env';
import { searchNearbyGooglePlaces, searchGooglePlacesText } from './googlePlaces';
import {
  categoryOsmClauses,
  categorySearchTypes,
  legacyCategoryToCanonical,
  extractCategoryHint,
  VYBE_CATEGORY_DEFINITIONS,
} from '../data/categoryTaxonomy';
import {
  MAX_RESULTS,
  deduplicatePlaces,
  distPlaces,
  gatePlaces,
  extras,
  rankPlaces,
  limitCoverage,
} from './placePipeline';

export {
  MAX_RESULTS,
  deduplicatePlaces,
  distPlaces,
  gatePlaces,
  rankPlaces,
  limitCoverage,
} from './placePipeline';

export interface DiscoveryOptions {
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
  searchQuery?: string;
  filters?: Partial<FilterState>;
}

const BAD_GOOGLE_TYPES = new Set([
  'airport',
  'bus_station',
  'train_station',
  'transit_station',
  'school',
  'university',
  'hospital',
  'doctor',
  'pharmacy',
  'dentist',
  'police',
  'fire_station',
  'courthouse',
  'government_office',
  'post_office',
]);

function targets(o: DiscoveryOptions): VybeCategory[] {
  const q = o.searchQuery?.trim() || o.filters?.searchQuery?.trim() || '';
  const c = extractCategoryHint(q);
  return c ? [c] : [...new Set((o.filters?.categories ?? []).flatMap(legacyCategoryToCanonical))];
}

/** Detect strong mosque intent so we can prefer mosque-only results. */
function isMosqueIntent(query: string, categories: VybeCategory[]): boolean {
  const n = query.toLowerCase();
  if (/mosque|mosqu[eé]|masjid|مسجد|مسجد/.test(n)) return true;
  // UI category button for Mosques maps to worship; treat pure worship selection as mosque-first.
  return categories.length === 1 && categories[0] === 'worship';
}

// Google Places browser API enforces per-key quota/minute. Discovery paces its
// requests (one in flight at a time with a small gap) and keeps the fan-out
// tight so consecutive user searches do not trip rate limits.
const GOOGLE_REQUEST_PACING_MS = 750;
const pace = () => new Promise(r => setTimeout(r, GOOGLE_REQUEST_PACING_MS));

async function google(
  o: DiscoveryOptions,
  t: VybeCategory[]
): Promise<{ places: Place[]; failures: number }> {
  if (!isGoogleMapsConfigured || o.userLat === undefined || o.userLng === undefined) {
    return { places: [], failures: 0 };
  }

  const q = o.searchQuery?.trim() || o.filters?.searchQuery?.trim() || '';
  const r = o.radiusKm ?? 5;
  const out: Place[] = [];
  let failures = 0;

  const add = async (fn: Promise<Place[]>) => {
    try {
      out.push(...(await fn));
    } catch (e) {
      failures += 1;
      console.warn('[VYBE] Google search failed', e);
    }
  };

  const mosqueMode = isMosqueIntent(q, t);

  if (t.length) {
    if (mosqueMode) {
      // Prefer real mosques only — avoid mixing churches/temples.
      await add(searchNearbyGooglePlaces(o.userLat, o.userLng, r, ['mosque']));
      await pace();
      await add(searchGooglePlacesText('mosques nearby', o.userLat, o.userLng, r, 'mosque'));
      await pace();
      await add(searchGooglePlacesText('masjid mosque', o.userLat, o.userLng, r));
      await pace();
    } else {
      const types = categorySearchTypes(t);
      if (types.length) {
        await add(searchNearbyGooglePlaces(o.userLat, o.userLng, r, types));
        await pace();
      }
      for (const c of t) {
        const d = VYBE_CATEGORY_DEFINITIONS[c];
        for (const text of d.googleTextQueries) {
          await add(searchGooglePlacesText(text, o.userLat, o.userLng, r));
          await pace();
        }
      }
    }
  } else if (q) {
    await add(searchGooglePlacesText(q, o.userLat, o.userLng, r));
  } else {
    await add(searchNearbyGooglePlaces(o.userLat, o.userLng, r));
  }

  let places = out.filter(
    p => p.provider === 'google' && !p.providerTypes?.some(x => BAD_GOOGLE_TYPES.has(x))
  );

  // Extra safety: when user asked for mosques, drop obvious non-mosque worship places.
  if (mosqueMode) {
    places = places.filter(p => {
      const types = (p.providerTypes ?? []).map(t => t.toLowerCase());
      const primary = (p.providerPrimaryType ?? '').toLowerCase();
      const name = (p.name ?? '').toLowerCase();
      const isMosque =
        primary === 'mosque' ||
        types.includes('mosque') ||
        /mosque|masjid|مسجد|islamic center|islamic centre/.test(name);
      const isClearlyOther =
        primary === 'church' ||
        primary === 'hindu_temple' ||
        primary === 'synagogue' ||
        types.includes('church') ||
        types.includes('hindu_temple') ||
        types.includes('synagogue') ||
        /church|cathedral|temple|synagogue|presbyterian|catholic|baptist/.test(name);
      return isMosque || !isClearlyOther;
    });
  }

  return { places, failures };
}

async function osm(o: DiscoveryOptions, t: VybeCategory[]): Promise<Place[]> {
  if (o.userLat === undefined || o.userLng === undefined || !t.length) return [];
  const clauses = categoryOsmClauses(t);
  if (!clauses.length) return [];

  try {
    const r = await fetch('/api/osm-discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: o.userLat,
        lng: o.userLng,
        radiusMeters: Math.min(Math.max((o.radiusKm ?? 5) * 1000, 100), 50000),
        clauses,
      }),
    });
    if (!r.ok) {
      console.warn(
        `[VYBE] OSM discovery unavailable (HTTP ${r.status}) — continuing with Google results only.`
      );
      return [];
    }
    const data = (await r.json()) as { elements?: Array<Record<string, any>> };
    return (data.elements ?? []).flatMap(e => {
      const g = e.tags ?? {};
      const n = String(g.name || g['name:fr'] || g['name:ar'] || '').trim();
      const lat = Number.isFinite(e.lat) ? Number(e.lat) : Number(e.center?.lat);
      const lng = Number.isFinite(e.lon) ? Number(e.lon) : Number(e.center?.lon);
      if (!n || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];

      const c = t[0];
      const d = VYBE_CATEGORY_DEFINITIONS[c];
      const pt = [g.amenity, g.leisure, g.tourism, g.shop, g.sport, g.natural, g.religion].filter(
        Boolean
      ) as string[];
      const h = String(g.opening_hours || '');
      const free =
        ['place_of_worship', 'park', 'playground', 'library'].includes(g.amenity) ||
        ['park', 'playground'].includes(g.leisure);

      // When looking for mosques, prefer OSM religion=muslim / mosque tags.
      if (c === 'worship' && isMosqueIntent(o.searchQuery || '', t)) {
        const religion = String(g.religion || '').toLowerCase();
        const amenity = String(g.amenity || '').toLowerCase();
        if (religion && religion !== 'muslim' && religion !== 'islam') return [];
        if (amenity === 'place_of_worship' && religion !== 'muslim' && religion !== 'islam') {
          // keep only if name strongly suggests mosque
          if (!/mosque|masjid|مسجد/.test(n.toLowerCase())) return [];
        }
      }

      const p: Place = {
        id: `osm:${e.type}:${e.id}`,
        provider: 'osm',
        providerPlaceId: `osm:${e.type}:${e.id}`,
        name: n,
        tagline: g.description || n,
        description: g.description || '',
        category: d.legacyCategory,
        canonicalCategory: c,
        primaryMood: d.mood,
        secondaryMoods: [],
        location: {
          address:
            [g['addr:housenumber'], g['addr:street'], g['addr:suburb'], g['addr:city']]
              .filter(Boolean)
              .join(', ') || n,
          neighborhood: g['addr:suburb'] || '',
          city: g['addr:city'] || '',
          lat,
          lng,
        },
        priceLevel: free ? 'free' : '$$',
        approxCostUsd: 0,
        rating: 0,
        reviewCount: 0,
        baseVybeScore: 58,
        images: [],
        tags: pt,
        providerTypes: pt,
        providerPrimaryType: pt[0],
        estimatedDuration: '',
        openingHours: {
          monday: h,
          tuesday: h,
          wednesday: h,
          thursday: h,
          friday: h,
          saturday: h,
          sunday: h,
        },
        features: {
          isFree: free,
          isOutdoor: Boolean(g.leisure || g.natural),
          isIndoor: Boolean(g.amenity || g.shop),
          hasFood: ['restaurant', 'fast_food', 'cafe', 'pub', 'bar'].includes(g.amenity),
          hasAlcohol: ['bar', 'pub', 'nightclub'].includes(g.amenity),
          isLateNight: /24\/7|24 hours/i.test(h),
          isSecretGem: c === 'tourist',
          isPetFriendly: false,
          isWifiFriendly: false,
          isPhotoSpot: false,
          isAccessible: false,
        },
        suitableFor: ['solo', 'friends', 'family', 'group'],
        website: g.website,
        phone: g.phone,
        instagram: g['contact:instagram'],
        reviews: [],
      };
      return [p];
    });
  } catch {
    return [];
  }
}

export async function discoverPlaces(o: DiscoveryOptions): Promise<Place[]> {
  const t = targets(o);
  const q = o.searchQuery?.trim() || o.filters?.searchQuery?.trim() || '';
  const r = o.radiusKm ?? 5;
  const [g, om] = await Promise.all([google(o, t), osm(o, t)]);

  if (!g.places.length && g.failures > 0 && !om.length) {
    throw new Error(
      'Live discovery hit a temporary Google rate limit (429). Please wait a moment and search again.'
    );
  }

  const all = distPlaces(deduplicatePlaces([...g.places, ...om]), o.userLat, o.userLng).filter(
    p =>
      o.userLat === undefined ||
      o.userLng === undefined ||
      (p.distanceKm ?? Infinity) <= r + 0.05
  );

  return limitCoverage(rankPlaces(extras(gatePlaces(all, q, t), o.filters), o.filters?.sortBy));
}
