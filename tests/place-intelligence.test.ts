import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProviderPlace, evaluatePlaceRelevance, extractCategoryHint, parseUserIntent, isGooglePhotoIdentityExact, VYBE_CATEGORY_DEFINITIONS, type VybeCategory } from '../api/_shared/classify.ts';
import { MAX_RESULTS, deduplicatePlaces, gatePlaces, rankPlaces, limitCoverage, distPlaces } from '../src/services/placePipeline.ts';
import type { Place } from '../src/types/index.ts';
import { googlePlaceToVybePlace } from '../src/services/googlePlacesAdapter.ts';
import type { GooglePlaceResult, GooglePlacePhoto } from '../src/services/googlePlacesTypes.ts';

type ProviderPlace = { providerTypes?: string[]; primaryType?: string; name: string };

function classify(types: string[] | undefined, primaryType: string | undefined, name: string) {
  return classifyProviderPlace(types ?? [], primaryType, name);
}

function rel(p: ProviderPlace & { providerPlaceId?: string; provider?: 'google' | 'osm' | 'vybe'; query?: string; requested?: VybeCategory | null; distanceKm?: number }) {
  return evaluatePlaceRelevance({
    provider: p.provider ?? 'google',
    providerPlaceId: p.providerPlaceId ?? 'ChIJcert',
    providerTypes: p.providerTypes ?? [],
    providerPrimaryType: p.primaryType,
    name: p.name,
    query: p.query,
    requestedCategory: p.requested,
    distanceKm: p.distanceKm,
  });
}

function accept(p: ProviderPlace & { query?: string; requested?: VybeCategory | null }) {
  return rel(p).decision === 'ACCEPT';
}

// ---------------------------------------------------------------------------
// Factory for a real Place shape usable by the pure discovery pipeline.
// ---------------------------------------------------------------------------
function makePlace(overrides: Partial<Place> & { provider?: 'google' | 'osm' | 'vybe'; providerPlaceId?: string; name: string; canonicalCategory?: VybeCategory }): Place {
  const provider = overrides.provider ?? 'google';
  const providerPlaceId = overrides.providerPlaceId ?? (provider === 'osm' ? `osm:node:${Math.floor(Math.random() * 1e9)}` : `ChIJtest${Math.floor(Math.random() * 1e6)}`);
  const category = overrides.canonicalCategory ?? 'entertainment';
  const definition = VYBE_CATEGORY_DEFINITIONS[category];
  return {
    id: `${provider}:${providerPlaceId}`,
    name: overrides.name,
    tagline: overrides.tagline ?? '',
    description: '',
    category: definition.legacyCategory,
    canonicalCategory: category,
    primaryMood: definition.mood,
    secondaryMoods: [],
    secondaryCategories: overrides.secondaryCategories,
    provider,
    providerPlaceId,
    providerTypes: overrides.providerTypes ?? [],
    providerPrimaryType: overrides.providerPrimaryType,
    location: overrides.location ?? { address: '', neighborhood: '', city: '', lat: 36.75, lng: 3.05 },
    distanceKm: overrides.distanceKm,
    priceLevel: overrides.priceLevel ?? '$$',
    approxCostUsd: 0,
    rating: 4.0,
    reviewCount: 10,
    baseVybeScore: 75,
    images: [],
    tags: overrides.providerTypes ?? [],
    estimatedDuration: '',
    openingHours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' },
    features: {
      isFree: false, isOutdoor: false, isIndoor: true, hasFood: false, hasAlcohol: false,
      isLateNight: false, isSecretGem: false, isPetFriendly: false, isWifiFriendly: false,
      isPhotoSpot: false, isAccessible: false,
    },
    suitableFor: ['solo', 'friends'],
    reviews: [],
    ...overrides,
  };
}

describe('CERT 180 — Requirement 3: place identity detection (provider truth is authoritative)', () => {
  it('Hotel XYZ Restaurant → primary hotel, restaurant is a secondary service', () => {
    const x = classify(['hotel', 'restaurant', 'lodging'], 'hotel', 'Hotel XYZ Restaurant');
    assert.equal(x.canonicalCategory, 'hotel');
    assert.equal(x.providerIdentityValid, true);
    assert.ok(x.secondaryCategories.includes('restaurant'));
    assert.equal(x.evidenceSource, 'primaryType');
  });
  it('Café Inside Hotel ABC → primary cafe, hotel stays secondary metadata', () => {
    const x = classify(['cafe', 'hotel', 'lodging'], 'cafe', 'Café Inside Hotel ABC');
    assert.equal(x.canonicalCategory, 'cafe');
    assert.ok(x.secondaryCategories.includes('hotel'));
  });
  it('Game Zone Mall → primary shopping (provider type), not games because of the name', () => {
    const x = classify(['shopping_mall'], 'shopping_mall', 'Game Zone Mall');
    assert.equal(x.canonicalCategory, 'shopping');
    assert.equal(x.secondaryCategories.includes('games'), false);
  });
  it('Cinema Café with cafe provider type stays cafe — the name never overrides types', () => {
    const x = classify(['cafe'], 'cafe', 'Cinema Café');
    assert.equal(x.canonicalCategory, 'cafe');
    assert.equal(x.secondaryCategories.includes('cinema'), false);
  });
  it('Cinema Café with movie_theater provider type stays cinema', () => {
    const x = classify(['movie_theater', 'cafe'], 'movie_theater', 'Cinema Café');
    assert.equal(x.canonicalCategory, 'cinema');
    assert.ok(x.secondaryCategories.includes('cafe'));
  });
  it('Restaurant at Hotel XYZ → primary hotel; restaurant wording in the name is secondary', () => {
    const x = classify(['hotel', 'restaurant'], 'hotel', 'Restaurant at Hotel XYZ');
    assert.equal(x.canonicalCategory, 'hotel');
    assert.ok(x.secondaryCategories.includes('restaurant'));
  });
  it('Sports Hotel → primary hotel, not gym', () => {
    const x = classify(['hotel', 'lodging'], 'hotel', 'Sports Hotel');
    assert.equal(x.canonicalCategory, 'hotel');
    assert.equal(x.secondaryCategories.includes('gym'), false);
  });
  it('Museum Café → primary cafe (provider), museum is a secondary service', () => {
    const x = classify(['cafe', 'museum'], 'cafe', 'Museum Café');
    assert.equal(x.canonicalCategory, 'cafe');
    assert.ok(x.secondaryCategories.includes('arts-culture'));
  });
  it('Church Hall Restaurant → primary worship (church provider type), restaurant secondary', () => {
    const x = classify(['church', 'restaurant'], 'church', 'Church Hall Restaurant');
    assert.equal(x.canonicalCategory, 'worship');
    assert.ok(x.secondaryCategories.includes('restaurant'));
  });
  it('Shopping Mall Cinema → primary shopping, cinema secondary', () => {
    const x = classify(['shopping_mall', 'movie_theater'], 'shopping_mall', 'Shopping Mall Cinema');
    assert.equal(x.canonicalCategory, 'shopping');
    assert.ok(x.secondaryCategories.includes('cinema'));
  });
  it('name signals are only a weak fallback when no provider type matches', () => {
    const typed = classify(['cafe'], 'cafe', 'Hotel Restaurant Games');
    assert.equal(typed.canonicalCategory, 'cafe');
    assert.equal(typed.evidenceSource, 'primaryType');
    const untyped = classify([], undefined, 'Café de la Plage');
    assert.equal(untyped.canonicalCategory, 'cafe');
    assert.equal(untyped.evidenceSource, 'name');
    assert.ok(untyped.confidence < 0.9, 'name-only identity must carry lower confidence than provider evidence');
  });
});

describe('CERT 180 — Requirement 4: correct classification across all 17 canonical categories', () => {
  const cases: Array<[VybeCategory, string, string]> = [
    ['restaurant', 'restaurant', 'Pizzeria Roma Restaurant'],
    ['cafe', 'cafe', 'Café de la Gare'],
    ['games', 'video_arcade', 'Arcade Game Zone'],
    ['cinema', 'movie_theater', 'Cinéma Atlas'],
    ['park', 'park', 'Parc de la Liberté'],
    ['gym', 'gym', 'Fitness Factory Gym'],
    ['shopping', 'shopping_mall', 'Shopping Mall Center'],
    ['nightlife', 'night_club', 'Nightlife Club 2000'],
    ['family-kids', 'playground', 'Kids Playground Paradise'],
    ['tourist', 'tourist_attraction', 'Tourist Landmark Tower'],
    ['arts-culture', 'museum', 'Museum of Modern Art'],
    ['outdoors', 'beach', 'Beach Garden Resort'],
    ['wellness', 'spa', 'Spa Wellness Center'],
    ['hotel', 'hotel', 'Hotel des Voyageurs'],
    ['library', 'library', 'Bibliothèque Centrale'],
    ['worship', 'mosque', 'Mosquée El Salam'],
    ['entertainment', 'event_venue', 'Event Entertainment Hall'],
  ];
  for (const [canonical, primaryType, name] of cases) {
    it(`classifies ${canonical} (${primaryType}) even when the name points elsewhere`, () => {
      const x = classify([primaryType], primaryType, name);
      assert.equal(x.canonicalCategory, canonical);
      assert.equal(x.providerIdentityValid, true);
    });
  }
  it('defines exactly 17 canonical categories with provider types for each', () => {
    assert.equal(Object.keys(VYBE_CATEGORY_DEFINITIONS).length, 17);
    for (const definition of Object.values(VYBE_CATEGORY_DEFINITIONS)) assert.ok(definition.googleIncludedTypes.length > 0);
  });
});

describe('CERT 180 — Requirement 5: primary vs secondary separation', () => {
  it('Hotel XYZ Restaurant: primary hotel + restaurant secondary remains consistent across classification and relevance', () => {
    const x = classify(['hotel', 'restaurant', 'lodging'], 'hotel', 'Hotel XYZ Restaurant');
    const r = rel({ providerTypes: ['hotel', 'restaurant', 'lodging'], primaryType: 'hotel', name: 'Hotel XYZ Restaurant' });
    assert.equal(x.canonicalCategory, 'hotel');
    assert.equal(r.canonicalCategory, 'hotel');
    assert.deepEqual(x.secondaryCategories, r.secondaryCategories);
    assert.ok(r.secondaryCategories.includes('restaurant'));
  });
  it('Cafe + shopping mixed types keep the provider primary identity and list the other as secondary', () => {
    const x = classify(['cafe', 'store', 'shopping_mall'], 'cafe', 'Café du Coin Mall');
    assert.equal(x.canonicalCategory, 'cafe');
    assert.ok(x.secondaryCategories.includes('shopping'));
  });
  it('Cafe + shopping mixed types with shopping primary stay shopping', () => {
    const x = classify(['shopping_mall', 'cafe', 'store'], 'shopping_mall', 'Mall Café Corner');
    assert.equal(x.canonicalCategory, 'shopping');
    assert.ok(x.secondaryCategories.includes('cafe'));
  });
});

describe('CERT 180 — Requirement 6: place identity vs user intent', () => {
  it('"gaming cafe": place identity cafe, intent gaming', () => {
    const intent = parseUserIntent('gaming cafe');
    assert.equal(intent.requestedCategory, 'cafe');
    assert.ok(intent.kinds.includes('gaming'));
    const x = classify(['cafe'], 'cafe', 'Café Central');
    assert.equal(x.canonicalCategory, 'cafe', 'identity must not be mutated to games by the query');
  });
  it('"quiet cafe": identity cafe, intent quiet', () => {
    const intent = parseUserIntent('quiet cafe');
    assert.equal(intent.requestedCategory, 'cafe');
    assert.ok(intent.kinds.includes('quiet'));
  });
  it('"romantic restaurant": identity restaurant, intent romantic', () => {
    const intent = parseUserIntent('romantic restaurant');
    assert.equal(intent.requestedCategory, 'restaurant');
    assert.ok(intent.kinds.includes('romantic'));
  });
  it('"family entertainment": identity entertainment/family relevant, intent family', () => {
    const intent = parseUserIntent('family entertainment');
    assert.equal(intent.requestedCategory, 'entertainment');
    assert.ok(intent.kinds.includes('family'));
  });
  it('short aliases (gym, bar, spa, tea) still resolve their category hint (3-char alias fix)', () => {
    for (const [query, expected] of [['gym', 'gym'], ['gym nearby', 'gym'], ['cozy bar', 'nightlife'], ['spa day', 'wellness'], ['tea room', 'cafe'], ['art gallery', 'arts-culture']] as const) {
      assert.equal(extractCategoryHint(query), expected, `extractCategoryHint('${query}')`);
      assert.equal(parseUserIntent(query).requestedCategory, expected, `parseUserIntent('${query}').requestedCategory`);
    }
  });
  it('short alias matching stays whole-word (no substring false-positives)', () => {
    assert.equal(extractCategoryHint('gymnastique'), null, 'gym must not match inside gymnastique');
    assert.equal(extractCategoryHint('bartender school'), null, 'bar must not match inside bartender');
    assert.equal(extractCategoryHint('spaquettes house'), null, 'spa must not match inside spaquettes');
    assert.equal(extractCategoryHint('pubg tournament arena'), null, 'pub must not match inside pubg');
  });
});

describe('CERT 180 — Requirement 7: hard relevance gate before ranking', () => {
  it('"gaming cafe" rejects hotels, hospitals, plain restaurants and generic cafes with no gaming evidence', () => {
    assert.equal(accept({ providerTypes: ['hotel', 'restaurant'], primaryType: 'hotel', name: 'Hotel XYZ Restaurant', query: 'gaming cafe' }), false);
    assert.equal(accept({ providerTypes: ['hospital'], primaryType: 'hospital', name: 'Hospital Games Center', query: 'gaming cafe' }), false);
    assert.equal(accept({ providerTypes: ['restaurant'], primaryType: 'restaurant', name: 'Generic Pasta', query: 'gaming cafe' }), false);
    assert.equal(accept({ providerTypes: ['cafe'], primaryType: 'cafe', name: 'Cozy Corner Coffee', query: 'gaming cafe' }), false);
  });
  it('"gaming cafe" accepts cafes with provider-backed gaming evidence and pure gaming venues', () => {
    const arcadeCafe = rel({ providerTypes: ['cafe', 'internet_cafe'], primaryType: 'cafe', name: 'Arcade Cafe', query: 'gaming cafe' });
    assert.equal(arcadeCafe.decision, 'ACCEPT');
    assert.equal(arcadeCafe.intentMatch, 'HIGH');
    assert.equal(accept({ providerTypes: ['video_arcade'], primaryType: 'video_arcade', name: 'Neon Arcade', query: 'gaming cafe' }), true);
  });
  it('"quiet cafe" rejects unrelated nightlife and hotels without cafe identity', () => {
    assert.equal(accept({ providerTypes: ['bar', 'night_club'], primaryType: 'night_club', name: 'Loud Club', query: 'quiet cafe' }), false);
    assert.equal(accept({ providerTypes: ['hotel'], primaryType: 'hotel', name: 'Grand Hotel', query: 'quiet cafe' }), false);
    assert.equal(accept({ providerTypes: ['cafe'], primaryType: 'cafe', name: 'Quiet Corner Café', query: 'quiet cafe' }), true);
  });
  it('"romantic restaurant" rejects gyms, shopping stores, museums and unrelated cafes', () => {
    assert.equal(accept({ providerTypes: ['gym'], primaryType: 'gym', name: 'Iron Gym', query: 'romantic restaurant' }), false);
    assert.equal(accept({ providerTypes: ['clothing_store'], primaryType: 'clothing_store', name: 'Fashion Store', query: 'romantic restaurant' }), false);
    assert.equal(accept({ providerTypes: ['museum'], primaryType: 'museum', name: 'City Museum', query: 'romantic restaurant' }), false);
    assert.equal(accept({ providerTypes: ['cafe'], primaryType: 'cafe', name: 'Café Express', query: 'romantic restaurant' }), false);
    assert.equal(accept({ providerTypes: ['restaurant'], primaryType: 'restaurant', name: 'Le Candlelit Table', query: 'romantic restaurant' }), true);
  });
  it('ranking happens AFTER the hard relevance gate', () => {
    const cafe = makePlace({ name: 'Low Score Cafe', provider: 'google', providerPlaceId: 'ChIJgatecafe', canonicalCategory: 'cafe', providerTypes: ['cafe'], providerPrimaryType: 'cafe', baseVybeScore: 30 });
    const hotel = makePlace({ name: 'High Score Hotel', provider: 'google', providerPlaceId: 'ChIJgatehotel', canonicalCategory: 'hotel', providerTypes: ['hotel'], providerPrimaryType: 'hotel', baseVybeScore: 99 });
    const gated = gatePlaces([hotel, cafe], 'cafe', ['cafe']);
    assert.ok(!gated.some(p => p.id === hotel.id), 'hotel must be rejected by the gate');
    assert.equal(gated.length, 1);
    assert.equal(gated[0].id, cafe.id);
    const ranked = rankPlaces(gated);
    assert.equal(ranked[0].id, cafe.id);
  });
});

describe('CERT 180 — Requirement 6/7 adversarial mixed places (Requirement 3 examples, end to end)', () => {
  it('hospital with misleading entertainment-like name is always rejected', () => {
    for (const query of ['games', 'gaming cafe', 'entertainment', 'restaurant']) {
      const r = rel({ providerTypes: ['hospital', 'pharmacy'], primaryType: 'hospital', name: 'Sunshine Family Entertainment Hospital', query });
      assert.equal(r.decision, 'REJECT', `must reject hospital for "${query}"`);
      assert.equal(r.identityValid, false);
    }
  });
  it('hotel + restaurant + event venue exposes hotel primary with restaurant and entertainment secondary services', () => {
    const x = classify(['hotel', 'restaurant', 'event_venue', 'lodging'], 'hotel', 'Hotel XYZ Restaurant');
    assert.equal(x.canonicalCategory, 'hotel');
    assert.ok(x.secondaryCategories.includes('restaurant'));
    assert.ok(x.secondaryCategories.includes('entertainment'));
  });
  it('cinema + cafe keeps provider primary', () => {
    assert.equal(classify(['movie_theater', 'cafe'], 'movie_theater', 'Cinema Café').canonicalCategory, 'cinema');
    assert.equal(classify(['cafe', 'movie_theater'], 'cafe', 'Cinema Café').canonicalCategory, 'cafe');
  });
  it('museum + restaurant keeps provider primary', () => {
    assert.equal(classify(['museum', 'restaurant'], 'museum', 'Museum Restaurant').canonicalCategory, 'arts-culture');
    assert.equal(classify(['restaurant', 'museum'], 'restaurant', 'Museum Restaurant').canonicalCategory, 'restaurant');
  });
});

describe('CERT 180 — Requirement 2: exact Google photo identity', () => {
  it('accepts only places/{exactProviderPlaceId}/photos/{ref}', () => {
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', 'places/ChIJabc_123/photos/xyzref'), true);
  });
  it('rejects photos bound to a different provider place (nearby/cross-place/stale)', () => {
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', 'places/ChIJother_456/photos/xyzref'), false);
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', 'places/ChIJabc_123/photos/'), false);
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', 'osm/node/123/photos/abc'), false);
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', 'places/ChIJabc_1234/photos/xyzref'), false);
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', 'https://example.com/photo.jpg'), false);
    assert.equal(isGooglePhotoIdentityExact('', 'places//photos/x'), false);
  });
  it('rejects malformed or empty provider place ids', () => {
    assert.equal(isGooglePhotoIdentityExact('not a place id', 'places/not a place id/photos/x'), false);
    assert.equal(isGooglePhotoIdentityExact('ChIJabc_123', ''), false);
  });
});

describe('CERT 180 — Requirement 12: result coverage and deduplication behavior', () => {
  it('dedupes by canonical provider identity (provider:providerPlaceId), keeping the first occurrence', () => {
    const a = makePlace({ name: 'Café Alpha', provider: 'google', providerPlaceId: 'ChIJsame', canonicalCategory: 'cafe', providerTypes: ['cafe'], baseVybeScore: 95 });
    const b = makePlace({ name: 'Café Alpha Duplicate Result', provider: 'google', providerPlaceId: 'ChIJsame', canonicalCategory: 'cafe', providerTypes: ['cafe'], baseVybeScore: 40 });
    const osm = makePlace({ name: 'Café Alpha', provider: 'osm', providerPlaceId: 'osm:node:12345', canonicalCategory: 'cafe', providerTypes: ['cafe'] });
    const deduped = deduplicatePlaces([a, b, osm]);
    assert.equal(deduped.length, 2);
    assert.equal(deduped[0].name, 'Café Alpha');
  });
  it('never silently truncates to 1–2 results: coverage keeps every valid result up to the explicit maximum', () => {
    const places = Array.from({ length: MAX_RESULTS + 40 }, (_, i) =>
      makePlace({ name: `Place ${i}`, provider: 'google', providerPlaceId: `ChIJplace${i}`, canonicalCategory: 'cafe', providerTypes: ['cafe'], baseVybeScore: 50 + (i % 50) }));
    const covered = limitCoverage(places);
    assert.equal(covered.length, MAX_RESULTS, 'limit is exactly the documented MAX_RESULTS');
    assert.equal(MAX_RESULTS, 100);
    assert.ok(places.length > MAX_RESULTS);
    const small = limitCoverage(places.slice(0, 7));
    assert.equal(small.length, 7, 'small valid result sets are not truncated');
  });
  it('distPlaces annotates distance and rank orders after gate by vybe score', () => {
    const near = makePlace({ name: 'Near', provider: 'google', providerPlaceId: 'ChIJnear', canonicalCategory: 'cafe', providerTypes: ['cafe'], location: { address: '', neighborhood: '', city: '', lat: 36.75, lng: 3.05 }, baseVybeScore: 60 });
    const far = makePlace({ name: 'Far', provider: 'google', providerPlaceId: 'ChIJfar', canonicalCategory: 'cafe', providerTypes: ['cafe'], location: { address: '', neighborhood: '', city: '', lat: 36.76, lng: 3.06 }, baseVybeScore: 90 });
    const [a, b] = distPlaces([near, far], 36.75, 3.05);
    assert.ok((a.distanceKm ?? Infinity) < (b.distanceKm ?? Infinity));
    const sorted = rankPlaces([a, b], 'vybe-score');
    assert.equal(sorted[0].id, far.id, 'higher score ranks first even if farther');
    const sortedByDistance = rankPlaces([a, b], 'distance');
    assert.equal(sortedByDistance[0].id, near.id);
  });
});

describe('CERT 180 — Requirement 1/2: real photo metadata vs generic fallback', () => {
  it('google adapter output must never treat a generic/local URL as a provider photo (identity enforced in adapter)', () => {
    // Engine-level identity predicate the adapter uses: rejects every
    // non-Google-photo shape.
    for (const candidate of [
      'https://images.unsplash.com/photo-1',
      'images/unsplash/1.jpg',
      'places/ChIJother/photos/ref',
      'osm://node/123/photo.jpg',
      '/local/photo.jpg',
    ]) {
      assert.equal(isGooglePhotoIdentityExact('ChIJowner', candidate), false, candidate);
    }
  });

  const exactPhoto: GooglePlacePhoto = {
    name: 'places/ChIJcafeAAA/photos/refexact',
    photo_reference: 'https://places.googleapis.com/v1/places/ChIJcafeAAA/photos/refexact/media',
    height: 300,
    width: 400,
    html_attributions: ['Photo by Alice'],
    author_attributions: [{ displayName: 'Alice', uri: 'https://alice.example' }],
  };
  const crossPlacePhoto: GooglePlacePhoto = {
    name: 'places/ChIJnearbyBBB/photos/refnearby',
    photo_reference: 'https://places.googleapis.com/v1/places/ChIJnearbyBBB/photos/refnearby/media',
    height: 300,
    width: 400,
    html_attributions: ['Photo by Bob'],
    author_attributions: [{ displayName: 'Bob' }],
  };
  const unboundPhoto: GooglePlacePhoto = {
    name: '',
    photo_reference: 'https://places.googleapis.com/v1/media/refwithoutname',
    height: 300,
    width: 400,
    html_attributions: ['Photo by Carol'],
    author_attributions: [{ displayName: 'Carol' }],
  };
  const genericPhoto: GooglePlacePhoto = {
    name: 'places/ChIJcafeAAA/photos/generic',
    photo_reference: 'https://images.example.com/photo.jpg',
    height: 300,
    width: 400,
    html_attributions: [],
    author_attributions: [],
  };

  function result(photos: GooglePlacePhoto[]): GooglePlaceResult {
    return {
      place_id: 'ChIJcafeAAA',
      name: 'Arcade Café',
      geometry: { location: { lat: 36.75, lng: 3.05 } },
      types: ['cafe', 'internet_cafe'],
      primary_type: 'cafe',
      rating: 4.5,
      user_ratings_total: 120,
      photos,
    };
  }

  it('adapter keeps only photos whose name is places/{exactProviderPlaceId}/photos/{ref}', () => {
    const place = googlePlaceToVybePlace(result([exactPhoto, crossPlacePhoto, unboundPhoto]));
    assert.equal(place.images.length, 1, 'cross-place and unbound photos must be rejected, exact photo kept');
    assert.equal(place.images[0], exactPhoto.photo_reference);
  });
  it('adapter never substitutes a generic/non-Google URL as a provider photo even when named like one', () => {
    const place = googlePlaceToVybePlace(result([genericPhoto, exactPhoto]));
    assert.equal(place.images.length, 1);
    assert.equal(place.images[0], exactPhoto.photo_reference);
    assert.ok(!place.images.some(image => image.includes('images.example.com')));
  });
  it('adapter preserves photo attributions only for accepted photos', () => {
    const place = googlePlaceToVybePlace(result([exactPhoto, crossPlacePhoto]));
    assert.deepEqual(place.photoAttributions, [{ displayName: 'Alice', uri: 'https://alice.example' }]);
  });
  it('adapter degrades safely when the provider returns no photos (no fake placeholder becomes a photo)', () => {
    const place = googlePlaceToVybePlace(result([]));
    assert.equal(place.images.length, 0);
    assert.deepEqual(place.photoAttributions, []);
    assert.equal(place.canonicalCategory, 'cafe', 'identity still comes from provider types');
  });
});
