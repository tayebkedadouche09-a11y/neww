import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const assert = (condition, message) => {
  checks.push({ condition, message });
  if (!condition) console.error(`✗ ${message}`); else console.log(`✓ ${message}`);
};

const app = read('src/vybe-next/App.tsx');
const engine = read('src/vybe-next/engine.ts');
const main = read('src/main.tsx');
const indexHtml = read('index.html');
const serviceWorker = read('public/sw.js');
const ci = read('.github/workflows/ci.yml');

assert(app.includes("import { discoverEverything"), 'The new shell uses the unified VYBE discovery engine.');
assert(app.includes("tab === 'explore'") && app.includes("tab === 'map'") && app.includes("tab === 'plan'"), 'Explore, Map and Plan are first-class views in the new shell.');
assert(app.includes('filtered.map(place => <Marker'), 'The Map renders every filtered discovery result, not only a featured subset.');
assert(app.includes("setPlaces(result)"), 'Discovery results enter one shared state before Explore and Map consume them.');
assert(app.includes('selectedForPlan') && app.includes('savePlan') && app.includes('sharePlan'), 'Planning, local persistence and share flows are wired in the new shell.');
assert(engine.includes('SEARCH_LIMIT = 1000'), 'Discovery supports a large result set for dense cities.');
assert(engine.includes('CATEGORY_QUERIES') && engine.includes("gaming:"), 'Discovery has dedicated provider queries for place categories including gaming.');
assert(engine.includes('Promise.all') || engine.includes('endpoints ='), 'The engine has provider fallback rather than depending on one request path.');
assert(engine.includes('analyzePlace') && engine.includes('analysis: VybeAnalysis'), 'Every discovered place is analyzed before it becomes a VYBE place.');
assert(engine.includes('deduplic') || engine.includes('new Map<string, VybePlace>()'), 'Provider data is deduplicated by source identity.');
assert(engine.includes('Béjaïa') && engine.includes('36.7525') && engine.includes('5.0556'), 'Béjaïa is a first-class discovery target.');
assert(app.includes('navigator.geolocation') && app.includes('Choose a city instead'), 'The app has browser-location fallback plus manual city discovery.');
assert(app.includes('await navigator.clipboard.writeText(url)') && app.includes('window.prompt'), 'Share works with clipboard and a fallback prompt.');
assert(app.includes('localStorage.setItem') && app.includes('localStorage.getItem'), 'Saved places, plans and profile data persist locally.');
assert(main.includes("navigator.serviceWorker.register('/sw.js')"), 'Production keeps the offline shell registration.');
assert(serviceWorker.includes('caches.match(request)'), 'Offline shell can fall back to cached same-origin content.');
assert(indexHtml.includes('<link rel="manifest" href="/manifest.webmanifest" />'), 'PWA manifest remains linked.');
assert(ci.includes('npm run typecheck') && ci.includes('npm run build'), 'CI keeps typecheck and production build gates enabled.');

const failed = checks.filter(({ condition }) => !condition).length;
if (failed) {
  console.error(`\n${failed} production invariant(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} production invariants passed.`);
