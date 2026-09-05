/**
 * CERT 180 — final live production browser gate (Phase 3).
 *
 * Drives a REAL Chrome against the deployed production URL the way a human
 * user would: grant location, wait for Explore, type real queries, open
 * details, compare the same place across Explore → Map → Details, audit
 * photos/identity/console/network, and repeat on a mobile viewport.
 *
 * Run:  node scripts/cert-180-live.mjs
 * Env:  VYBE_PRODUCTION_URL (default https://neww-dun-chi.vercel.app/)
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const PRODUCTION_URL = process.env.VYBE_PRODUCTION_URL || 'https://neww-dun-chi.vercel.app/';
const EXECUTABLE_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const executablePath = EXECUTABLE_CANDIDATES.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('No Chrome/Chromium executable found.');
// Algiers city center — the product market (Algeria).
const FIXED_LAT = 36.7538;
const FIXED_LNG = 3.0588;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
});
const context = browser.defaultBrowserContext();

const report = { productionUrl: PRODUCTION_URL, startedAt: new Date().toISOString(), searches: [], surfaces: [], consoleErrors: [], pageErrors: [], failedRequests: [], apiResponses: [] };

try {
  await context.overridePermissions(new URL(PRODUCTION_URL).origin, ['geolocation']);
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('pageerror', e => report.pageErrors.push(String(e?.message || e)));
  page.on('requestfailed', r => report.failedRequests.push(`${r.url()} :: ${r.failure()?.errorText || 'failed'}`));
  page.on('response', r => {
    const u = r.url();
    if (u.includes('/api/')) report.apiResponses.push(`${r.status()} ${u.replace(PRODUCTION_URL, '')}`);
  });
  await page.setGeolocation({ latitude: FIXED_LAT, longitude: FIXED_LNG, accuracy: 20 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('body', { timeout: 30000 });

  const readCards = async () => page.$$eval('[data-testid="place-card"]', els => els.map(el => {
    const img = [...el.querySelectorAll('img')].map(i => i.currentSrc || i.src || '').filter(Boolean);
    return {
      name: el.querySelector('h3')?.textContent?.trim() || '',
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      images: img,
    };
  }));

  const waitForCards = async (minWaitMs = 9000, maxWaitMs = 45000) => {
    const start = Date.now();
    await sleep(minWaitMs);
    for (;;) {
      const cards = await readCards();
      if (cards.length > 0) return cards;
      if (Date.now() - start > maxWaitMs) return cards;
      await sleep(2500);
    }
  };

  const search = async (query, waitMs = 12000) => {
    const input = await page.$('input[placeholder^="Search rooftops"]');
    if (!input) return { query, cards: [], note: 'search input not found' };
    await input.click({ clickCount: 3 });
    await input.type(query, { delay: 25 });
    await input.press('Tab'); // blur triggers discovery
    const start = Date.now();
    await sleep(waitMs);
    const cards = await readCards();
    const empty = await page.evaluate(() => (document.body.innerText || '').includes('No matches found') || (document.body.innerText || '').includes('Nothing nearby'));
    return { query, elapsedMs: Date.now() - start, cardCount: cards.length, empty, cards: cards.slice(0, 8), totalDistinct: new Set(cards.map(c => c.name)).size };
  };

  const openFirstCard = async () => {
    const handle = await page.$('[data-testid="place-card"]');
    if (!handle) return null;
    const name = await page.$eval('[data-testid="place-card"] h3', el => el.textContent?.trim() || '');
    await handle.click();
    await sleep(2500);
    const visible = await page.$('[data-testid="place-detail-modal"]');
    if (!visible) return null;
    const detail = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="place-detail-modal"]');
      const text = (root?.innerText || '').replace(/\s+/g, ' ').trim();
      const imgs = [...(root?.querySelectorAll('img') || [])].map(i => i.currentSrc || i.src || '').filter(Boolean);
      const hero = root?.querySelector('.h-80 img, .h-96 img, .sm\\:h-96 img');
      return {
        text: text.slice(0, 900),
        imageCount: imgs.length,
        images: imgs.slice(0, 6),
        heroImage: (hero && (hero.currentSrc || hero.src)) || imgs[0] || '',
        hasIdentityEvidence: text.includes('Place identity & match evidence'),
        hasPrimaryIdentity: text.includes('Primary identity:'),
        hasRelevance: text.includes('identity confidence:'),
      };
    });
    return { name, detail };
  };

  const closeModal = async () => {
    const closeBtn = await page.$('[data-testid="place-detail-modal"] button[aria-label="Close place details"]');
    if (closeBtn) { await closeBtn.click(); await sleep(800); }
  };

  // ---- 1. Initial Explore state -------------------------------------------
  const initialCards = await waitForCards(10000, 50000);
  report.initialExplore = {
    cardCount: initialCards.length,
    sample: initialCards.slice(0, 6).map(c => ({ name: c.name, images: c.images.length })),
  };

  // ---- 2. Typed real-world queries (Requirement 11 set) -------------------
  const queries = ['cafe', 'hotel', 'gaming cafe', 'quiet cafe', 'romantic restaurant', 'museum', 'mosque', 'gym', 'restaurant'];
  for (const q of queries) {
    report.searches.push(await search(q, 10000));
  }

  // ---- 3. Open a result, inspect details -----------------------------------
  const detailProbe = await openFirstCard();
  if (detailProbe) {
    report.surfaces.push({ surface: 'explore-details', ...detailProbe });
    await closeModal();
  }

  // ---- 4. Map consistency for the same place -------------------------------
  // Pick the first card of the most recent useful search (or initial list).
  const card = await page.$('[data-testid="place-card"]');
  if (card) {
    const cardInfo = await page.$eval('[data-testid="place-card"]', el => {
      const img = el.querySelector('img');
      return {
        name: el.querySelector('h3')?.textContent?.trim() || '',
        image: img ? (img.currentSrc || img.src || '') : '',
        text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      };
    });
    // Card -> Map button
    const mapButton = await page.$('[data-testid="place-card"] button');
    const buttons = await page.$$('[data-testid="place-card"] button');
    let openedMap = false;
    for (const b of buttons) {
      const label = await b.evaluate(el => el.textContent || '');
      if (label.trim() === 'Map') { await b.click(); openedMap = true; break; }
    }
    if (openedMap) {
      await sleep(6000); // map + markers render
      const mapState = await page.evaluate(() => {
        const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
        const preview = bodyText.includes('Open details');
        const text = bodyText.slice(0, 1200);
        const imgs = [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src || '').filter(Boolean);
        return { hasPreview: preview, text, images: imgs.slice(0, 10) };
      });
      const markerInfo = await page.evaluate(() => {
        const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
        const idx = bodyText.indexOf('Open details');
        const previewText = idx >= 0 ? bodyText.slice(Math.max(0, idx - 500), idx + 60) : '';
        return { previewText };
      });
      report.surfaces.push({
        surface: 'map',
        requestedPlace: cardInfo.name,
        requestedImage: cardInfo.image,
        mapTextSample: mapState.text.slice(0, 500),
        previewMatchesName: markerInfo.previewText.includes(cardInfo.name),
        previewTextSample: markerInfo.previewText,
        googleMapRendered: mapState.images.length > 0,
      });
      // Open details from map preview and compare with Explore identity panel
      await sleep(500);
      const detailFromMap = await openFirstCard();
      if (detailFromMap) report.surfaces.push({ surface: 'map-details', ...detailFromMap });
      await closeModal();
    }
  }

  // ---- 5. Hydration check: a Google card with no image should gain one -----
  const hydration = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="place-card"]')];
    const googleCards = cards.filter(el => (el.innerText || '').includes('Google verified'));
    return googleCards.map(el => ({
      name: el.querySelector('h3')?.textContent?.trim() || '',
      hasImage: Boolean(el.querySelector('img') && el.querySelector('img').src),
    }));
  });
  report.hydration = { googleCards: hydration };

  // ---- 6. Mobile viewport pass ---------------------------------------------
  const mobilePage = await browser.newPage();
  mobilePage.setDefaultTimeout(25000);
  const mobileErrors = [];
  mobilePage.on('console', m => { if (m.type() === 'error') mobileErrors.push(m.text()); });
  mobilePage.on('pageerror', e => mobileErrors.push(String(e?.message || e)));
  await context.overridePermissions(new URL(PRODUCTION_URL).origin, ['geolocation']);
  await mobilePage.setGeolocation({ latitude: FIXED_LAT, longitude: FIXED_LNG, accuracy: 20 });
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  const mobileCards = await mobilePage.$$eval('[data-testid="place-card"]', els => els.length).catch(() => 0);
  const mobileBodyText = await mobilePage.evaluate(() => (document.body.innerText || '').slice(0, 600)).catch(() => '');
  report.mobile = { cardCount: mobileCards, bodySample: mobileBodyText.replace(/\s+/g, ' ').slice(0, 300), consoleErrors: mobileErrors };
  await mobilePage.close();

  // ---- audit summaries ------------------------------------------------------
  const relevantConsole = report.consoleErrors.filter(e => /place|google|photo|api|supabase|overpass|maps/i.test(e));
  const relevantFailed = report.failedRequests.filter(e => /googleapis|places\.google|supabase|overpass/i.test(e));
  report.summary = {
    totalSearchQueries: report.searches.length,
    consoleErrorCount: report.consoleErrors.length,
    relevantConsoleErrors: relevantConsole,
    pageErrorCount: report.pageErrors.length,
    failedRequestCount: report.failedRequests.length,
    relevantFailedRequests: relevantFailed,
    apiResponses: report.apiResponses,
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
