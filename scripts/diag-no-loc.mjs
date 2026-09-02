/**
 * diag-no-loc.mjs — reproduces the "Showing 0 spots / No real places found"
 * state by NOT providing any browser location (the real production symptom).
 */
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const redact = (s) => String(s).replace(/([?&]key=)[^&\s]+/gi, '$1REDACTED');

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  protocolTimeout: 120000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const logs = [];
page.on('console', (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[PAGEERROR] ${err.message}`));
page.on('requestfailed', (req) => {
  logs.push(`[REQFAIL] ${redact(req.url())} - ${req.failure()?.errorText ?? 'unknown'}`);
});

console.log(`Target: ${BASE_URL} (NO geolocation granted — simulating real production failure)\n`);
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
// Wait past the 10s geolocation timeout plus discovery attempts.
await sleep(30000);

const data = await page.evaluate(() => {
  const text = document.body.innerText || '';
  const showingMatch = text.match(/Showing \d+ spots tailored to your energy/);
  const noPlaces = text.includes('No real places found for your current filters.');
  const cards = document.querySelectorAll('[data-testid="place-card"]').length;
  const cta = Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim())
    .filter((t) => /locat/i.test(t));
  return {
    showing: showingMatch ? showingMatch[0] : null,
    noPlaces,
    cards,
    locationCtas: cta.slice(0, 5),
  };
});
console.log('========== SNAPSHOT: NO LOCATION ==========');
console.log(JSON.stringify(data, null, 2));

console.log('\n-- [discovery] logs --');
console.log(logs.filter((l) => l.includes('[discovery]')).join('\n') || '(none)');
console.log('\n-- Google Maps loader logs --');
console.log(logs.filter((l) => l.includes('[GoogleMapsLoader]') || l.includes('google')).slice(0, 10).join('\n'));
console.log('\n-- errors --');
console.log(logs.filter((l) => l.startsWith('[PAGEERROR]') || l.includes('[console:error]')).slice(0, 15).join('\n') || '(none)');

await browser.close();