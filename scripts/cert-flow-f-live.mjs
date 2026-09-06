import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const PRODUCTION_URL = process.env.VYBE_PRODUCTION_URL || 'https://neww-dun-chi.vercel.app/';
const OUT = process.env.CERT_OUTPUT_DIR || 'cert-live-output';
const candidates = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  // Windows fallbacks for local verification runs (CI runners resolve the paths above).
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = candidates.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('No Chrome/Chromium executable found on runner.');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const result = {
  productionUrl: PRODUCTION_URL,
  startedAt: new Date().toISOString(),
  searchA: null,
  searchB: null,
  latestSearchWins: null,
  map: null,
  details: null,
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on('console', msg => { if (msg.type() === 'error') result.consoleErrors.push(msg.text().slice(0, 500)); });
  page.on('pageerror', error => result.pageErrors.push(String(error?.message || error).slice(0, 500)));
  page.on('requestfailed', req => result.failedRequests.push(`${req.url().slice(0, 220)} :: ${req.failure()?.errorText || 'failed'}`));

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('body', { timeout: 30000 });

  const getInput = async () => {
    const selector = 'input[placeholder^="Search rooftops"], input[placeholder*="Search"]';
    await page.waitForSelector(selector, { timeout: 20000 });
    return page.$(selector);
  };

  const readState = async query => page.evaluate(q => ({
    query: q,
    cards: [...document.querySelectorAll('[data-testid="place-card"]')].map(el => ({
      name: el.querySelector('h3')?.textContent?.trim() || '',
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    })),
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000),
  }), query);

  const submitSearch = async query => {
    const input = await getInput();
    await input.click({ clickCount: 3 });
    await input.press('Backspace');
    await input.type(query, { delay: 15 });
    await input.press('Tab');
  };

  const waitForDistinctResults = async (query, previousNames = new Set()) => {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const state = await readState(query);
      const names = state.cards.map(c => c.name).filter(Boolean);
      if (names.length && names.some(n => !previousNames.has(n))) return state;
      await sleep(1500);
    }
    return readState(query);
  };

  // Establish baseline A.
  const initial = await readState('initial');
  const initialNames = new Set(initial.cards.map(c => c.name));

  // Start A, then immediately start B before A has a normal settle window.
  const aStartedAt = Date.now();
  await submitSearch('restaurant');
  await sleep(150);
  const aIssuedAt = Date.now();
  const aSnapshotPromise = waitForDistinctResults('restaurant', initialNames);

  // Intentionally overlap B with A.
  const bStartedAt = Date.now();
  await submitSearch('hotel');
  const bIssuedAt = Date.now();
  const [aSnapshot, bSnapshot] = await Promise.all([
    aSnapshotPromise,
    waitForDistinctResults('hotel', initialNames),
  ]);

  await sleep(5000);
  const finalState = await readState('hotel');
  // Judge only rendered card names — body text contains UI chrome (category labels
  // like "Hotels"/"Restaurants") that produced false positives when no cards rendered.
  const finalNames = finalState.cards.map(c => c.name).filter(Boolean);
  const looksHotel = finalNames.some(name => /hotel|hôtel|hostel|resort|motel/i.test(name));
  const hasAArtifacts = finalNames.some(name => /restaurant|resto|pizza|burger/i.test(name));

  result.searchA = {
    query: 'restaurant',
    startedAtMs: aStartedAt,
    issuedAtMs: aIssuedAt,
    cardCount: aSnapshot.cards.length,
    sampleNames: aSnapshot.cards.slice(0, 5).map(c => c.name),
  };
  result.searchB = {
    query: 'hotel',
    startedAtMs: bStartedAt,
    issuedAtMs: bIssuedAt,
    cardCount: bSnapshot.cards.length,
    sampleNames: bSnapshot.cards.slice(0, 5).map(c => c.name),
  };
  result.latestSearchWins = {
    pass: bSnapshot.cards.length > 0 && finalState.cards.length > 0 && looksHotel && !hasAArtifacts,
    finalCardCount: finalState.cards.length,
    finalSampleNames: finalNames.slice(0, 8),
    finalLooksHotel: looksHotel,
    staleRestaurantArtifacts: hasAArtifacts,
    overlapMs: Math.max(0, bIssuedAt - aIssuedAt),
  };

  // Map navigation: use a visible card Map action if available.
  const mapButton = await page.$('[data-testid="place-card"] button');
  let mapOpened = false;
  if (mapButton) {
    const buttons = await page.$$('[data-testid="place-card"] button');
    for (const button of buttons) {
      const label = (await button.evaluate(el => el.textContent || '')).trim();
      if (label === 'Map') {
        await button.evaluate(el => el.click());
        mapOpened = true;
        break;
      }
    }
  }
  if (!mapOpened) {
    // Fall back to an app-level Map navigation control.
    const navCandidates = await page.$$('button, a');
    for (const el of navCandidates) {
      const label = (await el.evaluate(node => (node.textContent || '').trim())).replace(/\s+/g, ' ');
      if (label === 'Map') {
        await el.evaluate(node => node.click());
        mapOpened = true;
        break;
      }
    }
  }

  if (mapOpened) {
    await sleep(4000);
    const mapText = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 8000));
    result.map = {
      opened: true,
      rendered: Boolean(await page.$('.leaflet-container, .gm-style, canvas')),
      includesHotelContext: /hotel|hôtel|hostel|resort|motel/i.test(mapText),
    };

    // Back to Explore through a visible Explore button when available.
    const links = await page.$$('button, a');
    for (const el of links) {
      const label = (await el.evaluate(node => (node.textContent || '').trim())).replace(/\s+/g, ' ');
      if (/^Explore( filter)?$/i.test(label) || /^Back$/i.test(label)) {
        await el.evaluate(node => node.click());
        break;
      }
    }
    await sleep(1500);
  } else {
    result.map = { opened: false, note: 'No Map control was discoverable.' };
  }

  // Details must resolve to the currently authoritative B place, not A.
  const detailButtons = await page.$$('[data-testid="place-card"] button');
  let detailsOpened = false;
  for (const button of detailButtons) {
    const label = (await button.evaluate(el => el.textContent || '')).trim();
    if (label === 'Details' || label === 'Open details') {
      await button.evaluate(el => el.click());
      detailsOpened = true;
      break;
    }
  }
  if (detailsOpened) {
    const modal = await page.waitForSelector('[data-testid="place-detail-modal"]', { timeout: 15000 }).catch(() => null);
    if (modal) {
      await sleep(2000);
      const detailText = await page.$eval('[data-testid="place-detail-modal"]', el => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000));
      result.details = {
        opened: true,
        isHotelContext: /hotel|hôtel|hostel|resort|motel/i.test(detailText),
        containsRestaurantContext: /restaurant|resto|pizza|burger/i.test(detailText),
        textSample: detailText.slice(0, 800),
      };
    } else {
      result.details = { opened: true, modalRendered: false };
    }
  } else {
    result.details = { opened: false, note: 'Details control not discoverable after Map/Back.' };
  }

  // Make externally quota-blocked runs self-describing in the evidence artifact.
  if (
    result.latestSearchWins &&
    result.latestSearchWins.finalCardCount === 0 &&
    result.consoleErrors.some(e => /429/.test(e))
  ) {
    result.quotaBlocked = true;
  }

  result.completedAt = new Date().toISOString();
  fs.writeFileSync(`${OUT}/flow-f-result.json`, JSON.stringify(result, null, 2));
  await page.screenshot({ path: `${OUT}/flow-f-final.png`, fullPage: true });

  console.log(JSON.stringify(result, null, 2));
  if (result.pageErrors.length) process.exitCode = 1;
  if (result.latestSearchWins?.pass !== true) process.exitCode = 1;
} finally {
  await browser.close();
}
