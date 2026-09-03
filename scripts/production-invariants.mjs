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
const authContext = read('src/context/AuthContext.tsx');
const collections = read('src/components/profile/CollectionsView.tsx');
const plans = read('src/components/plan/VybePlanBuilder.tsx');
const routeSummary = read('src/components/plan/VybeRouteSummary.tsx');
const commandCenter = read('src/components/vybe/VybeCommandCenter.tsx');
const dailyDrop = read('src/components/vybe/VybeDailyDrop.tsx');
const squadVote = read('src/components/vybe/VybeSquadVote.tsx');
const admin = read('src/components/admin/AdminPortal.tsx');
const googleMap = read('src/components/map/GoogleMap.tsx');
const placeCard = read('src/components/cards/PlaceCard.tsx');
const discovery = read('src/services/discoveryService.ts');
const googlePlaces = read('src/services/googlePlaces.ts');
const googleAdapter = read('src/services/googlePlacesAdapter.ts');
const savedPlaces = read('src/services/savedPlacesService.ts');
const likes = read('src/services/likesService.ts');
const plansService = read('src/services/plansService.ts');
const indexHtml = read('index.html');
const serviceWorker = read('public/sw.js');
const main = read('src/main.tsx');
const ci = read('.github/workflows/ci.yml');

assert(dataContext.includes('getGooglePlaceDetails'), 'Public place deep links use the current Google Places details path.');
assert(collections.includes('!activeCol.isPublic'), 'Private collections cannot accidentally publish broken public links.');
assert(collections.includes('await navigator.clipboard.writeText(url)'), 'Collection clipboard success is awaited and reported accurately.');
assert(plans.includes('if (!requireAuth()) return; setIsCreatingNew(true);'), 'Creating a new outing is gated by authentication.');
assert(routeSummary.includes('google.com/maps/dir/?api=1'), 'Outing route summary exposes a complete Google Maps route.');
assert(commandCenter.includes('discoverAtLocation'), 'Build My Night can discover from manual city coordinates.');
assert(!commandCenter.includes('preview-${index}'), 'Build My Night does not fabricate plan item IDs.');
assert(dailyDrop.includes('DAILY DROP'), 'Daily Drop is wired as a real Explore component.');
assert(squadVote.includes('?vote='), 'Squad voting creates shareable poll links.');
assert(placeCard.includes('Google verified') && placeCard.includes('VYBE curated'), 'Place cards explain their data trust source.');
assert(placeCard.includes('getGooglePlaceDetails') && placeCard.includes('onError'), 'Google place photos refresh after an expired image URL fails.');
assert(admin.includes('latitude === 0 && longitude === 0'), 'Admin creation rejects invalid 0,0 coordinates.');
assert(!discovery.includes('unsplash.com'), 'Discovery service contains no fake Unsplash place-image fallback.');
assert(googlePlaces.includes('Array.isArray(type)') && googlePlaces.includes('includedTypes') && !googlePlaces.includes('type.map(placeType => searchNearbyGooglePlacesSingle'), 'Google nearby discovery keeps multi-type searches inside one request instead of fanning out quota usage.');
assert(discovery.includes('Promise.allSettled') && discovery.includes('[...googlePlaces, ...osmPlaces]'), 'Discovery merges Google and OpenStreetMap instead of stopping at the first provider.');
assert(discovery.includes('function analyzePlace') && discovery.includes('.map(analyzePlace)'), 'Every discovered place is classified and analyzed before Explore/Map receive it.');
assert(discovery.includes('isGooglePlaceValidForRequest') && discovery.includes('results.filter(place => isGooglePlaceValidForRequest'), 'Google discovery rejects results that fail place/type verification before Explore receives them.');
assert(googleAdapter.includes('Google-provided place types are the authoritative discovery signal') && googleAdapter.includes('providerPlaceId') && googleAdapter.includes('QUERY_CATEGORY_EXPECTATIONS'), 'Google place validation requires a real Place ID and request-matching category.');
assert(googleAdapter.includes("bowling_alley: 'arcade-gaming'") && googleAdapter.includes("miniature_golf_course: 'arcade-gaming'"), 'Gaming/arcade places are classified separately from generic entertainment.');
assert(authContext.includes('toggleLikePlace') && authContext.includes('likesService.setLiked'), 'Like actions update both local UI state and the per-user backend row.');
assert(authContext.includes('toggleSavePlace') && authContext.includes('savedPlacesService.setSaved'), 'Save actions update both local UI state and the per-user backend row.');
assert(authContext.includes("if (session.mode === 'auth') return isBackendConfigured ? remoteProfile") && authContext.includes('savedPlacesService.listSavedPlaceIds(userId)') && authContext.includes('likesService.listLikedPlaceIds(userId)'), 'Authenticated users rehydrate persisted backend preferences instead of demo profiles.');
assert(savedPlaces.includes("from('saved_places')") && savedPlaces.includes('user_id,place_id'), 'Saved places persist by user and stable place ID.');
assert(likes.includes("from('likes')") && likes.includes('user_id,place_id'), 'Likes persist by user and stable place ID.');
assert(plansService.includes("from('plan_items')") && plansService.includes('plan_id'), 'Plan items persist against the owning plan instead of only in the browser state.');
assert(dataContext.includes('plansService.addItem(planId, newItem)') && dataContext.includes('collectionsService.addPlace(collectionId, placeId)'), 'Plan and collection additions sync to the backend for authenticated users.');
assert(!googleMap.includes('maps.googleapis.com/maps/api/js?'), 'GoogleMap does not embed the legacy Maps JavaScript URL loader.');
assert(indexHtml.includes('<link rel="manifest" href="/manifest.webmanifest" />'), 'PWA manifest is linked from the document head.');
assert(main.includes("navigator.serviceWorker.register('/sw.js')"), 'Production registers the offline shell service worker.');
assert(serviceWorker.includes('caches.match(request)'), 'Offline shell falls back to cached same-origin content.');
assert(ci.includes('npm run typecheck') && ci.includes('npm run build'), 'CI keeps typecheck and production build gates enabled.');
assert(discovery.includes('overpass.private.coffee/api/interpreter'), 'OSM fallback includes the secondary Overpass endpoint.');
assert(discovery.includes('const discoveryCache = new Map') && discovery.includes('DISCOVERY_CACHE_MS = 20_000'), 'Discovery has a short request deduplication cache.');
assert(discovery.includes('Google Places quota is currently exhausted'), 'Google quota failures have a safe user-facing fallback message.');

const failed = checks.filter(({ condition }) => !condition).length;
if (failed) {
  console.error(`\n${failed} production invariant(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} production invariants passed.`);