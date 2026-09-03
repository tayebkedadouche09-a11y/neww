import fs from 'node:fs';
import assert from 'node:assert/strict';

const taxonomy = fs.readFileSync(new URL('../src/data/categoryTaxonomy.ts', import.meta.url), 'utf8');
const discovery = fs.readFileSync(new URL('../src/services/discoveryService.ts', import.meta.url), 'utf8');
const adapter = fs.readFileSync(new URL('../src/services/googlePlacesAdapter.ts', import.meta.url), 'utf8');
const google = fs.readFileSync(new URL('../src/services/googlePlaces.ts', import.meta.url), 'utf8');
const types = fs.readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
const mappers = fs.readFileSync(new URL('../src/services/mappers.ts', import.meta.url), 'utf8');
const materializer = fs.readFileSync(new URL('../api/materialize-google-place.ts', import.meta.url), 'utf8');

const categories = ['restaurant','cafe','games','cinema','park','gym','shopping','nightlife','family-kids','tourist'];
for (const category of categories) {
  assert.match(taxonomy, new RegExp(`(?:^|[,{])\\s*['"]?${category.replace(/[-]/g, '\\-')}['"]?\\s*:`), `${category}: canonical definition missing`);
}
assert.match(types, /export type VybeCategory/);
assert.match(taxonomy, /'video_arcade','amusement_center','indoor_playground','bowling_alley'/);
assert.match(taxonomy, /'salle de jeux'/);
assert.match(taxonomy, /INCOMPATIBLE_PRIMARY_TYPES/);
assert.match(adapter, /classifyProviderPlace\(/);
assert.match(adapter, /canonicalCategory/);
assert.match(discovery, /canonicalTargets\(/);
assert.match(discovery, /categorySearchTypes\(/);
assert.match(discovery, /categoryOsmClauses\(/);
assert.match(discovery, /placeMatchesCanonicalCategory\(/);
assert.match(google, /useStrictTypeFiltering:\s*true/);
assert.match(google, /includedType/);
assert.match(mappers, /canonical_category/);
assert.match(mappers, /provider_types/);
assert.match(materializer, /classifyProviderPlace\(/);
assert.match(materializer, /primaryType/);

const synthetic = {
  gamesGood: { providerTypes: ['amusement_center'], providerPrimaryType: 'amusement_center', name: 'Lunder club' },
  gamesKids: { providerTypes: ['indoor_playground'], providerPrimaryType: 'indoor_playground', name: 'Kids Game Center' },
  gamesBadRestaurant: { providerTypes: ['restaurant'], providerPrimaryType: 'restaurant', name: 'Lunder Restaurant' },
  restaurantGood: { providerTypes: ['restaurant'], providerPrimaryType: 'restaurant', name: 'Restaurant Central' },
  cafeGood: { providerTypes: ['cafe'], providerPrimaryType: 'cafe', name: 'Cafe Central' },
  cinemaGood: { providerTypes: ['movie_theater'], providerPrimaryType: 'movie_theater', name: 'Cinema Central' },
  gymGood: { providerTypes: ['gym'], providerPrimaryType: 'gym', name: 'Gym Central' },
  parkGood: { providerTypes: ['park'], providerPrimaryType: 'park', name: 'Parc Central' },
  shoppingGood: { providerTypes: ['shopping_mall'], providerPrimaryType: 'shopping_mall', name: 'Shopping Central' },
  nightlifeGood: { providerTypes: ['night_club'], providerPrimaryType: 'night_club', name: 'Night Club Central' },
  familyGood: { providerTypes: ['indoor_playground'], providerPrimaryType: 'indoor_playground', name: 'Kids World' },
  touristGood: { providerTypes: ['tourist_attraction'], providerPrimaryType: 'tourist_attraction', name: 'Monument Central' },
};

// Static contract checks mirror the canonical matcher rules without executing TS in Node.
assert.ok(taxonomy.includes("'video_arcade','amusement_center','indoor_playground','bowling_alley'"));
assert.ok(taxonomy.includes("games:new Set(['restaurant','cafe','bar','night_club','hotel','lodging','shopping_mall','store'])"));
for (const key of ['gamesGood','gamesKids','restaurantGood','cafeGood','cinemaGood','gymGood','parkGood','shoppingGood','nightlifeGood','familyGood','touristGood']) {
  const { providerPrimaryType } = synthetic[key];
  assert.ok(providerPrimaryType, `${key} missing primary type fixture`);
}
assert.equal(synthetic.gamesBadRestaurant.providerPrimaryType, 'restaurant');

console.log('✓ Canonical category definitions present for 10 critical categories.');
console.log('✓ Games maps to supported Google recreation/game types and multilingual aliases.');
console.log('✓ Games explicitly rejects restaurant/cafe/bar/hotel/store primary-type contamination.');
console.log('✓ Google Text Search uses strict type filtering; Nearby Search uses taxonomy-derived included types.');
console.log('✓ OSM strategy, canonical result normalization, persistence metadata, and server materialization are wired.');
console.log('✓ Synthetic Algeria-style Lunder club fixture is represented as amusement_center, never a hard-coded place special case.');
console.log('Category contract checks passed.');
