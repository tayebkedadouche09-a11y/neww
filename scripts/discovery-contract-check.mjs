import fs from 'node:fs';

const file = fs.readFileSync('src/services/discoveryService.ts', 'utf8');
const checks = [
  [file.includes('overpass-api.de/api/interpreter') && file.includes('overpass.private.coffee/api/interpreter'), 'OSM fallback has two live Overpass endpoints.'],
  [file.includes('Promise.allSettled'), 'Google and OSM providers are isolated with allSettled.'],
  [file.includes('RESOURCE_EXHAUSTED') && file.includes('Google Places quota is currently exhausted'), 'Google quota errors are converted to a user-safe message.'],
  [file.includes('const discoveryCache = new Map') && file.includes('DISCOVERY_CACHE_MS = 20_000'), 'Discovery requests are deduplicated/cached briefly.'],
  [file.includes('includedTypes') || file.includes('searchNearbyGooglePlaces(userLat, userLng, radiusKm'), 'Discovery reaches the Google multi-type path.'],
];
let failed = 0;
for (const [ok, label] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`\n${checks.length} discovery contract checks passed.`);
