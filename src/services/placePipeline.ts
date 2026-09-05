import type { FilterState, Place, PlaceRelevanceEvidence, PriceLevel, VybeCategory } from '../types';
import { evaluatePlaceRelevance } from '../data/categoryTaxonomy.ts';
import { haversineDistanceKm } from '../lib/distance.ts';

/**
 * Pure discovery pipeline stages shared by every discovery surface
 * (Explore, Map, Search, legacy vybe-next engine).
 *
 * Order is contractually fixed:
 *   1. annotate distances          (distPlaces)
 *   2. dedupe by provider identity (deduplicatePlaces)
 *   3. hard relevance gate         (gatePlaces)   — REJECT happens BEFORE ranking
 *   4. explicit filters            (extras)
 *   5. rank                        (rankPlaces)
 *   6. explicit coverage limit     (limitCoverage)
 */

export const MAX_RESULTS = 100;

export function distPlaces(ps: Place[], lat?: number, lng?: number): Place[] {
  return ps.map(p => ({
    ...p,
    distanceKm: lat !== undefined && lng !== undefined && Number.isFinite(p.location.lat) && Number.isFinite(p.location.lng)
      ? haversineDistanceKm(lat, lng, p.location.lat, p.location.lng)
      : undefined,
  }));
}

export function deduplicatePlaces(ps: Place[]): Place[] {
  const map = new Map<string, Place>();
  for (const place of ps) {
    if (!place.provider || !place.providerPlaceId) continue;
    const key = `${place.provider}:${place.providerPlaceId}`;
    map.set(key, map.get(key) ?? place);
  }
  return [...map.values()];
}

/** Hard relevance gate. A place failing identity/evidence/category/intent is
 *  rejected here, before ranking, and never reaches the results list. */
export function gatePlaces(
  ps: Place[],
  query: string,
  requested: VybeCategory[]
): Place[] {
  const accepted: Place[] = [];
  for (const place of ps) {
    const evidence = evaluatePlaceRelevance({
      provider: place.provider === 'google' ? 'google' : place.provider === 'osm' ? 'osm' : 'vybe',
      providerPlaceId: place.providerPlaceId,
      providerTypes: place.providerTypes,
      providerPrimaryType: place.providerPrimaryType,
      canonicalCategory: place.canonicalCategory,
      name: place.name,
      query,
      requestedCategory: requested.length === 1 ? requested[0] : null,
      distanceKm: place.distanceKm,
    });
    if (evidence.decision !== 'ACCEPT') continue;
    accepted.push({
      ...place,
      relevance: evidence as PlaceRelevanceEvidence,
      providerIdentityConfidence: evidence.providerIdentityConfidence,
      secondaryCategories: evidence.secondaryCategories,
    });
  }
  return accepted;
}

export function extras(ps: Place[], filters?: Partial<FilterState>): Place[] {
  return ps
    .filter(p => !filters?.priceLevels?.length || filters.priceLevels.includes(p.priceLevel))
    .filter(p => !filters?.moods?.length || filters.moods.includes(p.primaryMood))
    .filter(p => !filters?.onlyOpenNow || p.openingHours.isOpenNow === true)
    .filter(p => !filters?.onlyFree || p.features.isFree)
    .filter(p => !filters?.onlyHiddenGems || p.features.isSecretGem)
    .filter(p => !filters?.onlyLateNight || p.features.isLateNight)
    .filter(p => filters?.maxDistanceKm === undefined || (p.distanceKm ?? Infinity) <= filters.maxDistanceKm)
    .filter(p => !filters?.companion || p.suitableFor.includes(filters.companion));
}

const PRICE_ORDER: Record<PriceLevel, number> = { free: 0, $: 1, $$: 2, $$$: 3, $$$$: 4 };

export function rankPlaces(
  ps: Place[],
  sort: FilterState['sortBy'] = 'vybe-score'
): Place[] {
  return [...ps].sort((a, b) => {
    if (sort === 'distance') return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    if (sort === 'rating') return (b.rating - a.rating) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    if (sort === 'price-asc') return PRICE_ORDER[a.priceLevel] - PRICE_ORDER[b.priceLevel];
    return b.baseVybeScore - a.baseVybeScore;
  });
}

/** Explicit maximum-result policy shared by every discovery call. */
export function limitCoverage(ps: Place[]): Place[] {
  return ps.slice(0, MAX_RESULTS);
}
