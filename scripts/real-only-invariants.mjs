import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const forbidden = [
  ['VITE_DEMO_MODE', 'Demo-mode environment switch'],
  ['enterDemoMode', 'Demo authentication entry point'],
  ['DEMO_PROFILES', 'Bundled demo profiles'],
  ['Kai Morgan', 'Hard-coded demo identity'],
  ['u-1', 'Hard-coded demo user id'],
  ['DEMO_MAP_ID', 'Synthetic Google Maps demo id'],
  ['initialPlaces', 'Legacy bundled place dataset'],
  ['LOCAL_STORAGE_KEYS.session', 'Local session persistence'],
  ['LOCAL_STORAGE_KEYS.profiles', 'Local profile persistence'],
  ['LOCAL_STORAGE_KEYS.places', 'Local place persistence'],
  ['LOCAL_STORAGE_KEYS.collections', 'Local collection persistence'],
  ['LOCAL_STORAGE_KEYS.plans', 'Local plan persistence'],
];

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
}
walk(srcRoot);

const failures = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const [needle, description] of forbidden) {
    if (content.includes(needle)) failures.push(`${path.relative(root, file)}: ${description} (${needle})`);
  }
}

if (failures.length) {
  console.error('Real-only invariant failed:');
  failures.forEach(f => console.error(`✗ ${f}`));
  process.exit(1);
}

console.log(`✓ Real-only runtime invariant passed across ${files.length} source files.`);
