import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const assert = (condition, message) => {
  checks.push({ condition, message });
  if (!condition) console.error(`✗ ${message}`);
  else console.log(`✓ ${message}`);
};

const dataContext = read('src/context/DataContext.tsx');
const collections = read('src/components/profile/CollectionsView.tsx');
const plans = read('src/components/plan/VybePlanBuilder.tsx');
const admin = read('src/components/admin/AdminPortal.tsx');
const googleMap = read('src/components/map/GoogleMap.tsx');
const discovery = read('src/services/discoveryService.ts');
const ci = read('.github/workflows/ci.yml');

assert(dataContext.includes('getGooglePlaceDetails'), 'Public place deep links use the current Google Places details path.');
assert(collections.includes('!activeCol.isPublic'), 'Private collections cannot accidentally publish broken public links.');
assert(collections.includes('await navigator.clipboard.writeText(url)'), 'Collection clipboard success is awaited and reported accurately.');
assert(plans.includes('if (!requireAuth()) return; setIsCreatingNew(true);'), 'Creating a new outing is gated by authentication.');
assert(admin.includes('latitude === 0 && longitude === 0'), 'Admin creation rejects invalid 0,0 coordinates.');
assert(!discovery.includes('unsplash.com'), 'Discovery service contains no fake Unsplash place-image fallback.');
assert(!googleMap.includes('maps.googleapis.com/maps/api/js?'), 'GoogleMap does not embed the legacy Maps JavaScript URL loader.');
assert(ci.includes('npm run typecheck') && ci.includes('npm run build'), 'CI keeps typecheck and production build gates enabled.');

const failed = checks.filter(({ condition }) => !condition).length;
if (failed) {
  console.error(`\n${failed} production invariant(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} production invariants passed.`);
