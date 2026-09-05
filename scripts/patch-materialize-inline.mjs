/**
 * Patches the two Vercel serverless functions that crash at module load
 * (FUNCTION_INVOCATION_FAILED) because api/_shared/* imports are not bundled
 * at runtime. Inlines the classifier block verbatim from api/_shared/classify.ts.
 * Run: node scripts/patch-materialize-inline.mjs
 */
import fs from 'node:fs';

const SRC = 'api/_shared/classify.ts';
const TARGETS = ['api/materialize-google-place.ts', 'api/materialize-osm-place.ts'];
const IMPORT_LINE = `import { classifyProviderPlace } from './_shared/classify';`;

const src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf('export type CategoryType');
const end = src.indexOf('export function placeMatchesCanonicalCategory');
if (start < 0 || end < 0) throw new Error('classify.ts extraction markers not found');
let block = src.slice(start, end).trimEnd();
// strip export keywords (block becomes module-local)
block = block.replace(/^export /gm, '');
// sanity: the block must still contain the dollar-ampersand regex untouched
if (!block.includes("'\\\\$&'")) throw new Error('block integrity check failed: $& regex replacement missing');
if (block.includes(IMPORT_LINE)) throw new Error('block must not contain the import line');

const header = "// Inlined verbatim from api/_shared/classify.ts — the Vercel runtime fails to bundle api/_shared imports (FUNCTION_INVOCATION_FAILED). Keep in sync with that file.";
const inlineBlock = header + '\n' + block + '\n';

for (const f of TARGETS) {
  let out = fs.readFileSync(f, 'utf8');
  if (!out.includes(IMPORT_LINE)) throw new Error(`import line not found in ${f}`);
  // replacement FUNCTION: a string replacement would interpret '$&' inside the
  // block as "the matched text" and corrupt the inlined regex code
  out = out.replace(IMPORT_LINE, () => inlineBlock);
  if (!out.includes("'\\\\$&'")) throw new Error(`post-patch integrity check failed for ${f}`);
  fs.writeFileSync(f, out);
  console.log('patched', f);
}
console.log('OK');
