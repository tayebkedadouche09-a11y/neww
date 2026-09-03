import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'api/materialize-google-place.ts',
  'supabase/migrations/0009_lock_google_materializer.sql',
  'vercel.json'
];

const failures = [];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(`Missing required security file: ${relative}`);
  }
}

const api = fs.readFileSync(path.join(root, 'api/materialize-google-place.ts'), 'utf8');
const vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/0009_lock_google_materializer.sql'), 'utf8');
const authModal = fs.readFileSync(path.join(root, 'src/components/auth/AuthModal.tsx'), 'utf8');
const authService = fs.readFileSync(path.join(root, 'src/services/authService.ts'), 'utf8');

const requiredApiPatterns = [
  ['method gate', /req\.method !== 'POST'/],
  ['bearer authentication', /authorization:\s*`Bearer \$\{token\}`/i],
  ['Supabase session verification', /\/auth\/v1\/user/],
  ['server-only Google key', /GOOGLE_PLACES_SERVER_API_KEY/],
  ['server-only Supabase service role', /SUPABASE_SERVICE_ROLE_KEY/],
  ['Google Place identity verification', /verifiedId !== placeId/],
  ['parameterized Place Details URL', /encodeURIComponent\(placeId\)/],
  ['request size/ID validation', /MAX_PLACE_ID_LENGTH/],
  ['rate limiting', /MAX_REQUESTS_PER_WINDOW/],
  ['no-store response', /Cache-Control/]
];
for (const [name, pattern] of requiredApiPatterns) {
  if (!pattern.test(api)) failures.push(`Google server endpoint missing ${name}.`);
}

if (!/revoke all on function public\.ensure_google_place\(jsonb\) from authenticated;/i.test(migration)) {
  failures.push('Legacy client-callable Google materializer is not revoked for authenticated users.');
}

const passwordPolicyChecks = [
  ['12 character minimum', /PASSWORD_MIN_LENGTH\s*=\s*12/],
  ['lowercase requirement', /\[a-z\]/],
  ['uppercase requirement', /\[A-Z\]/],
  ['numeric requirement', /\\d/],
  ['symbol requirement', /\[\^A-Za-z0-9\]/]
];
for (const [name, pattern] of passwordPolicyChecks) {
  if (!pattern.test(authModal) || !pattern.test(authService)) failures.push(`Password policy missing ${name}.`);
}

if (!/Strict-Transport-Security/.test(vercel) || !/X-Content-Type-Options/.test(vercel) || !/X-Frame-Options/.test(vercel)) {
  failures.push('Required baseline HTTP security headers are missing from vercel.json.');
}

if (failures.length) {
  console.error('Security invariants failed:');
  failures.forEach(f => console.error(`✗ ${f}`));
  process.exit(1);
}

console.log('✓ Security invariants passed.');
