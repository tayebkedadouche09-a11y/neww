/**
 * Parity check: the classifier inlined into api/materialize-*.ts must behave
 * identically to the canonical api/_shared/classify.ts.
 * Run: node scripts/check-inline-parity.mjs
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const shared = await import(pathToFileURL('api/_shared/classify.ts').href);

const src = fs.readFileSync('api/materialize-google-place.ts', 'utf8');
const start = src.indexOf('type CategoryType');
const end = src.indexOf('type ApiRequest');
if (start < 0 || end < 0 || end <= start) throw new Error('extraction markers not found');
const block = src.slice(start, end);
fs.writeFileSync('api/_shared/_parity-temp.mts', block);
try {
  const inlined = await import(pathToFileURL('api/_shared/_parity-temp.mts').href);
  const cases = [
    [['hotel', 'buffet_restaurant', 'lodging', 'event_venue', 'restaurant'], 'hotel', 'Hôtel RALF'],
    [['cafe'], 'cafe', 'Café de la Presse'],
    [['coffee_shop', 'cafe', 'food_store', 'store'], 'coffee_shop', 'Café'],
    [['restaurant', 'bar'], undefined, 'Le Jardin'],
    [['lodging'], 'lodging', 'Hotel El Djazair'],
    [['video_arcade', 'amusement_center'], 'video_arcade', 'Game Zone'],
    [['hospital'], 'hospital', 'CHU Mustapha'],
    [[], 'movie_theater', 'Cinéma Atlas'],
    [['park'], 'park', 'Jardin d\'Essai'],
    [['mosque'], 'mosque', 'Mosquée Ketchaoua'],
  ];
  let ok = true;
  for (const [types, primary, name] of cases) {
    const a = shared.classifyProviderPlace(types, primary, name);
    const b = inlined.classifyProviderPlace(types, primary, name);
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) { ok = false; console.log('DIFF', name, JSON.stringify(a), JSON.stringify(b)); }
    else console.log('MATCH', name, '->', a.canonicalCategory, a.confidence, JSON.stringify(a.secondaryCategories));
  }
  const photoA = shared.isGooglePhotoIdentityExact('ChIJabc_123', 'places/ChIJabc_123/photos/xyzref');
  const photoB = inlined.isGooglePhotoIdentityExact('ChIJabc_123', 'places/ChIJabc_123/photos/xyzref');
  const photoBad = inlined.isGooglePhotoIdentityExact('ChIJother', 'places/ChIJabc_123/photos/xyzref');
  if (typeof inlined.isGooglePhotoIdentityExact !== 'function' || photoA !== photoB || photoA !== true || photoBad !== false) ok = false;
  console.log('photo identity: inlined=true-case ok:', photoA === photoB && photoA === true, '| cross-place rejected:', photoBad === false);
  console.log(ok ? 'PARITY_OK' : 'PARITY_FAIL');
  if (!ok) process.exit(1);
} finally {
  fs.unlinkSync('api/_shared/_parity-temp.mts');
}
