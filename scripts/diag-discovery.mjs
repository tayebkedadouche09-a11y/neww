/**
 * diag-discovery.mjs — REAL discovery pipeline browser diagnostic.
 *
 * Drives real Chrome, grants browser geolocation (override to a real city
 * because headless has no GPS hardware), and captures the safe count logs
 * the app emits at every stage of the pipeline:
 *
 *   rawGoogleResultsCount → normalizedResultsCount → discoveryServiceResultCount
 *   → DataContext places.length → filteredPlaces (rendered) count
 *
 * API keys are NEVER printed. Any URL containing a key= parameter is redacted.
 */
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = process.env.DIAG_BASE_URL ?? 'http://localhost:5173/';

// REAL city for the headless geolocation override (Manhattan, NY). Google
// Places returns genuinely real businesses at these coordinates.
const TEST_LAT = 40.7549;
const TEST_LNG = -73.984;

const redact = (s) => String(s).replace(/([?&]key=)[^&\s]+/gi, '$1REDACTED');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['geolocation']);

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setGeolocationOverride', {
    latitude: TEST_LAT,
    longitude: TEST_LNG,
    accuracy: 30,
  });

  const logs = [];
  page.on('console', (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[PAGEERROR] ${err.message}`));
  page.on('requestfailed', (req) => {
    logs.push(`[REQFAIL] ${redact(req.url())} - ${req.failure()?.errorText ?? 'unknown'}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      logs.push(`[HTTP ${res.status()}] ${redact(res.url())}`);
    }
  });

  console.log(`Target: ${BASE_URL}`);
  console.log(`Geolocation override: (${TEST_LAT}, ${TEST_LNG}) Manhattan NYC\n`);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('Page loaded (domcontentloaded). Waiting for Google Maps + discovery...\n');
  await sleep(18000);

  const snapshot = async (label) => {
    const data = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const showingMatch = text.match(/Showing \d+ spots tailored to your energy/);
      const noPlaces = text.includes('No real places found for your current filters.');
      const cards = document.querySelectorAll('[data-testid="place-card"]').length;
      const cardTitles = Array.from(document.querySelectorAll('[data-testid="place-card"] h3'))
        .map((h) => (h.textContent || '').trim())
        .slice(0, 15);
      const mapTab = text.includes('Spots Active on Radar');
      const emptyStateMsg = (text.match(/PERMISSION_DENIED[^\n]{0,140}/) || [])[0] ?? null;
      return { showing: showingMatch ? showingMatch[0] : null, noPlaces, cards, cardTitles, mapTab, emptyStateMsg };
    });
    const discoveryLogs = logs.filter((l) => l.includes('[discovery]'));
    const errors = logs.filter((l) => l.startsWith('[PAGEERROR]') || l.includes('[console:error]'));
    const reqfails = logs.filter((l) => l.startsWith('[REQFAIL]'));
    console.log(`========== SNAPSHOT: ${label} ==========`);
    console.log(JSON.stringify(data, null, 2));
    if (discoveryLogs.length) {
      console.log('\n-- [discovery] logs --');
      discoveryLogs.forEach((l) => console.log(l));
    } else {
      console.log('\n-- NO [discovery] logs yet --');
    }
    if (errors.length) {
      console.log('\n-- page/console errors --');
      errors.slice(0, 20).forEach((l) => console.log(l));
    }
    if (reqfails.length) {
      console.log('\n-- failed requests (redacted) --');
      reqfails.slice(0, 20).forEach((l) => console.log(l));
    }
    console.log('');
  };

  await snapshot('INITIAL EXPLORE (no filters, location granted)');

  // Type "coffee" into the navbar search box (real-time Google text search).
  const typed = await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="Search"]');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'coffee');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  console.log(`Typed "coffee" into search input: ${typed}`);
  await sleep(9000);
  await snapshot('SEARCH "coffee"');

  // Open the Interactive Map tab and count real markers.
  const mapClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(
      (el) => (el.textContent || '').includes('View All on Interactive Map')
    );
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log(`Clicked "View All on Interactive Map": ${mapClicked}`);
  await sleep(9000);
  const mapState = await page.evaluate(() => {
    const markers = document.querySelectorAll('.custom-map-marker').length;
    const radarText = Array.from(document.querySelectorAll('span,div')).map((e) => e.textContent || '')
      .find((t) => /Spots Active on Radar/.test(t)) || null;
    return { markers, radarText };
  });
  console.log('\n========== SNAPSHOT: MAP TAB ==========');
  console.log(JSON.stringify(mapState, null, 2));

  // Go back to Explore tab, click the first real card, verify detail shows same real place.
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button, a, span')).find(
      (el) => el.textContent && el.textContent.trim() === 'Explore'
    );
    if (tab) tab.click();
  });
  await sleep(2500);
  const clickResult = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="place-card"]');
    if (!card) return { clicked: false };
    const title = (card.querySelector('h3')?.textContent || '').trim();
    card.click();
    return { clicked: true, cardTitle: title };
  });
  await sleep(3000);
  const detailState = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="place-detail-modal"]');
    if (!modal) return { opened: false };
    const text = (modal.textContent || '').replace(/\s+/g, ' ').trim();
    return { opened: true, title: (modal.querySelector('h2, h3')?.textContent || '').trim(), textHead: text.slice(0, 300) };
  });
  console.log('\n========== SNAPSHOT: PLACE DETAIL ==========');
  console.log('Clicked card:', JSON.stringify(clickResult));
  console.log(JSON.stringify(detailState, null, 2));

  console.log('\n========== FULL LOG (redacted) ==========');
  console.log(logs.join('\n'));

  await browser.close();
}

main().catch((err) => {
  console.error('DIAG FAILED:', err);
  process.exit(1);
});