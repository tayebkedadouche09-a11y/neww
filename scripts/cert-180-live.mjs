/**
 * CERT 180 — final live production browser gate (Phase 3).
 *
 * Drives a REAL Chrome against the deployed production URL the way a human
 * user would: grant location, wait for Explore, then run the full 17-query
 * Requirement-11 set with REALISTIC PACING (clear → type → wait for results →
 * hydration settle window → inspect cards → deep-dive representative cards →
 * pause before next query). Audits photos/identity/console/network, verifies
 * exact Google photo identity from the live DOM, compares Explore → Map →
 * Details, and repeats on a mobile viewport.
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

const CATEGORY_LABELS = ['Restaurant', 'Cafe', 'Games', 'Cinema', 'Park', 'Gym', 'Shopping', 'Nightlife', 'Family & Kids', 'Tourist', 'Arts & Culture', 'Outdoors', 'Wellness', 'Hotel', 'Library', 'Worship', 'Entertainment'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const photoPlaceId = url => {
  const m = /places\.googleapis\.com\/v1\/places\/([^/)+]+)\/photos\//.exec(url || '');
  return m ? decodeURIComponent(m[1]) : null;
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
});
const context = browser.defaultBrowserContext();

const report = { productionUrl: PRODUCTION_URL, startedAt: new Date().toISOString(), initialExplore: null, searches: [], deepDives: [], map: null, hydration: null, mobile: null, stability: null, consoleErrors: [], pageErrors: [], failedRequests: [], apiResponses: [], network: { googlePlacesRequests: 0, http429: 0, quotaErrors: 0 } };

try {
  await context.overridePermissions(new URL(PRODUCTION_URL).origin, ['geolocation']);
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => report.pageErrors.push(String(e?.message || e).slice(0, 300)));
  page.on('requestfailed', r => report.failedRequests.push(`${r.url().replace(/(key=|X-Goog-Api-Key=)[^&]+/g, '$1REDACTED').slice(0, 180)} :: ${r.failure()?.errorText || 'failed'}`));
  page.on('response', r => {
    const u = r.url();
    const s = r.status();
    if (/places\.googleapis\.com|maps\.googleapis\.com/.test(u)) {
      report.network.googlePlacesRequests += 1;
      if (s === 429) report.network.http429 += 1;
      if (s >= 400) {
        report.network.quotaErrors += 1;
        report.apiResponses.push(`HTTP ${s} ${u.replace(/(key=|X-Goog-Api-Key=)[^&]+/g, '$1REDACTED').slice(0, 180)}`);
      }
    } else if (u.includes('/api/')) {
      report.apiResponses.push(`${s} ${u.replace(PRODUCTION_URL, '').slice(0, 120)}`);
    } else if (s >= 400 && /supabase/i.test(u)) {
      report.apiResponses.push(`HTTP ${s} SUPABASE ${u.slice(0, 140)}`);
    }
  });
  await page.setGeolocation({ latitude: FIXED_LAT, longitude: FIXED_LNG, accuracy: 20 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('body', { timeout: 30000 });

  const readCards = async () => page.$$eval('[data-testid="place-card"]', els => els.map(el => {
    const spans = [...el.querySelectorAll('span')].map(s => (s.textContent || '').trim());
    const labels = ['Restaurant', 'Cafe', 'Games', 'Cinema', 'Park', 'Gym', 'Shopping', 'Nightlife', 'Family & Kids', 'Tourist', 'Arts & Culture', 'Outdoors', 'Wellness', 'Hotel', 'Library', 'Worship', 'Entertainment'];
    const category = spans.find(t => labels.some(c => c.toLowerCase() === t.toLowerCase())) || '';
    const img = [...el.querySelectorAll('img')].map(i => i.currentSrc || i.src || '').filter(Boolean);
    return {
      name: el.querySelector('h3')?.textContent?.trim() || '',
      category,
      googleVerified: spans.some(t => /google verified/i.test(t)),
      osm: spans.some(t => /openstreetmap/i.test(t)),
      hasImage: img.length > 0,
      images: img.slice(0, 3),
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    };
  }));

  const waitForCards = async (minWaitMs = 8000, maxWaitMs = 45000) => {
    const start = Date.now();
    await sleep(minWaitMs);
    for (;;) {
      const cards = await readCards();
      if (cards.length > 0) return cards;
      if (Date.now() - start > maxWaitMs) return cards;
      await sleep(2500);
    }
  };

  const search = async (query, settleMs = 8000) => {
    const t0 = Date.now();
    const input = await page.$('input[placeholder^="Search rooftops"]');
    if (!input) return { query, cards: [], note: 'search input not found' };
    await input.click({ clickCount: 3 }); // select previous query
    await input.type(query, { delay: 25 });
    await input.press('Tab'); // blur triggers discovery
    const cards = await waitForCards(8000, 45000);
    await sleep(settleMs); // hydration settle window — cards may gain photos here
    const settled = await readCards();
    const empty = await page.evaluate(() => (document.body.innerText || '').includes('No matches found') || (document.body.innerText || '').includes('Nothing nearby'));
    return {
      query,
      elapsedMs: Date.now() - t0,
      cardCount: settled.length,
      distinctNames: new Set(settled.map(c => c.name)).size,
      withImages: settled.filter(c => c.hasImage).length,
      googleVerified: settled.filter(c => c.googleVerified).length,
      empty,
      categories: [...new Set(settled.map(c => c.category).filter(Boolean))],
      cards: settled.slice(0, 6).map(c => ({ name: c.name, category: c.category, googleVerified: c.googleVerified, hasImage: c.hasImage, photoPlaceId: c.images.map(photoPlaceId).filter(Boolean)[0] || null })),
    };
  };

  // Deep-dive: open first card, extract the full identity/evidence panel,
  // the exact place id (from the "Open in Google Maps" href) and verify the
  // hero photo URL embeds the SAME place id (exact photo identity, Req 2).
  const deepDiveFirstCard = async () => {
    const handle = await page.$('[data-testid="place-card"]');
    if (!handle) return null;
    const cardName = await page.$eval('[data-testid="place-card"] h3', el => el.textContent?.trim() || '');
    await handle.click();
    const modal = await page.waitForSelector('[data-testid="place-detail-modal"]', { timeout: 12000 }).catch(() => null);
    if (!modal) return { cardName, note: 'modal did not open' };
    await sleep(2500); // allow lazy hydration inside modal
    const detail = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="place-detail-modal"]');
      const text = (root?.innerText || '').replace(/\s+/g, ' ').trim();
      const link = [...(root?.querySelectorAll('a') || [])].map(a => a.href).find(h => h.includes('place_id:'));
      const imgs = [...(root?.querySelectorAll('img') || [])].map(i => i.currentSrc || i.src || '').filter(Boolean);
      const grab = (marker, terminator) => {
        const i = text.indexOf(marker);
        if (i < 0) return '';
        const rest = text.slice(i + marker.length);
        const end = terminator ? rest.indexOf(terminator) : rest.length;
        return rest.slice(0, end < 0 ? 120 : end).trim();
      };
      return {
        evidencePanel: text.includes('Place identity & match evidence'),
        decisionBadge: /Relevant match/.test(text) ? 'ACCEPT' : (/Identity only/.test(text) ? 'IDENTITY-ONLY' : ''),
        primaryIdentity: grab('Primary identity:', 'Also offers'),
        alsoOffers: grab('Also offers:', 'provider types'),
        providerTypes: grab('provider types:', 'identity confidence'),
        confidence: grab('identity confidence:', '%').trim(),
        reasonsSample: text.slice(text.indexOf('identity confidence'), text.indexOf('identity confidence') + 260),
        placeIdHref: link || '',
        heroImage: imgs[0] || '',
        imageCount: imgs.length,
      };
    });
    const closeBtn = await page.$('[data-testid="place-detail-modal"] button[aria-label="Close place details"]');
    if (closeBtn) { await closeBtn.click(); await sleep(800); }
    const placeId = (detail.placeIdHref.match(/place_id:([^&\s]+)/) || [])[1] || '';
    const photoId = photoPlaceId(detail.heroImage);
    return {
      cardName,
      ...detail,
      placeId,
      heroPhotoPlaceId: photoId,
      // Exact photo identity (Req 2): a displayed Google photo must embed the
      // same place id as the place it is shown for. No photo available is NOT
      // a violation — only a photo whose id mismatches the place id is.
      exactPhotoIdentity: photoId ? photoId === placeId : null,
      crossPlaceViolation: Boolean(photoId && placeId && photoId !== placeId),
      photoStatus: photoId ? 'google-photo-shown' : (detail.heroImage ? 'non-provider-image' : 'no-photo-available'),
      nonProviderHeroImage: Boolean(detail.heroImage) && !photoId && !detail.heroImage.startsWith('data:'),
    };
  };

  // ---- 1. Initial Explore state -------------------------------------------
  const initialCards = await waitForCards(10000, 50000);
  report.initialExplore = {
    cardCount: initialCards.length,
    distinctNames: new Set(initialCards.map(c => c.name)).size,
    withImages: initialCards.filter(c => c.hasImage).length,
    sample: initialCards.slice(0, 6).map(c => ({ name: c.name, category: c.category, googleVerified: c.googleVerified, hasImage: c.hasImage })),
  };
  console.log(`[cert] initial Explore: ${initialCards.length} cards`);

  // ---- 2. The full 17-query Requirement-11 set, paced like a human ---------
  const queries = ['restaurant', 'cafe', 'hotel', 'games', 'gaming cafe', 'quiet cafe', 'romantic restaurant', 'cinema', 'park', 'gym', 'shopping', 'nightlife', 'tourist', 'museum', 'library', 'mosque', 'wellness'];
  const deepDiveSet = new Set(['cafe', 'hotel', 'gaming cafe', 'quiet cafe', 'romantic restaurant', 'mosque']);
  for (const q of queries) {
    const result = await search(q);
    report.searches.push(result);
    console.log(`[cert] "${q}" → ${result.cardCount} cards (${result.withImages} with photos, ${result.googleVerified} Google-verified)`);
    if (deepDiveSet.has(q) && result.cardCount > 0) {
      const dive = await deepDiveFirstCard();
      if (dive) { report.deepDives.push({ query: q, ...dive }); console.log(`[cert]   deep-dive: ${dive.cardName} identity=${dive.exactPhotoIdentity ?? 'n/a'}`); }
    }
    await sleep(4000); // human pacing between searches; lets the hydration gate drain
  }

  // ---- 3. Map consistency (same place across Explore → Map → Details) ------
  const mapCard = await page.$('[data-testid="place-card"]');
  if (mapCard) {
    const cardInfo = await page.$eval('[data-testid="place-card"]', el => {
      const img = el.querySelector('img');
      return {
        name: el.querySelector('h3')?.textContent?.trim() || '',
        image: img ? (img.currentSrc || img.src || '') : '',
      };
    });
    const buttons = await page.$$('[data-testid="place-card"] button');
    let openedMap = false;
    for (const b of buttons) {
      const label = await b.evaluate(el => el.textContent || '');
      if (label.trim() === 'Map') { await b.click(); openedMap = true; break; }
    }
    if (openedMap) {
      await sleep(8000); // map + markers render
      const mapState = await page.evaluate(() => {
        const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
        const idx = bodyText.indexOf('Open details');
        const previewText = idx >= 0 ? bodyText.slice(Math.max(0, idx - 500), idx + 60) : '';
        return { previewText, googleMapRendered: Boolean(document.querySelector('img[src*="googleapis"], .gm-style, canvas')) };
      });
      report.map = {
        requestedPlace: cardInfo.name,
        requestedImagePhotoPlaceId: photoPlaceId(cardInfo.image),
        previewMatchesName: mapState.previewText.includes(cardInfo.name),
        previewTextSample: mapState.previewText.slice(0, 300),
        googleMapRendered: mapState.googleMapRendered,
      };
      console.log(`[cert] map: preview matches "${cardInfo.name}" → ${report.map.previewMatchesName}`);
    }
  }

  // ---- 4. Hydration honesty audit ------------------------------------------
  report.hydration = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="place-card"]')];
    const googleCards = cards.filter(el => /google verified/i.test(el.innerText || ''));
    return {
      googleCards: googleCards.length,
      googleCardsWithImage: googleCards.filter(el => el.querySelector('img')).length,
      brokenImgElements: cards.filter(el => [...el.querySelectorAll('img')].some(i => i.complete && i.naturalWidth === 0 && Boolean(i.src))).length,
      note: 'cards without photos must show the canonical category fallback, never a fake provider photo',
    };
  });

  // ---- 5. Stability: search still usable after 17 searches ------------------
  report.stability = await search('restaurant', 6000);
  console.log(`[cert] stability search → ${report.stability.cardCount} cards`);

  // ---- 6. Mobile viewport pass ----------------------------------------------
  const mobilePage = await browser.newPage();
  mobilePage.setDefaultTimeout(25000);
  const mobileErrors = [];
  mobilePage.on('console', m => { if (m.type() === 'error') mobileErrors.push(m.text().slice(0, 200)); });
  mobilePage.on('pageerror', e => mobileErrors.push(String(e?.message || e).slice(0, 200)));
  await context.overridePermissions(new URL(PRODUCTION_URL).origin, ['geolocation']);
  await mobilePage.setGeolocation({ latitude: FIXED_LAT, longitude: FIXED_LNG, accuracy: 20 });
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  const mobileCards = await mobilePage.$$eval('[data-testid="place-card"]', els => els.length).catch(() => 0);
  const mobileBodyText = await mobilePage.evaluate(() => (document.body.innerText || '').slice(0, 500)).catch(() => '');
  report.mobile = { cardCount: mobileCards, bodySample: mobileBodyText.replace(/\s+/g, ' ').slice(0, 250), consoleErrors: mobileErrors };
  await mobilePage.close();

  // ---- audit summaries ------------------------------------------------------
  const relevantConsole = report.consoleErrors.filter(e => /place|google|photo|api|supabase|overpass|maps/i.test(e));
  report.summary = {
    totalSearchQueries: report.searches.length,
    queriesWithResults: report.searches.filter(s => s.cardCount > 0).length,
    queriesWithResultsList: report.searches.filter(s => s.cardCount === 0).map(s => s.query),
    deepDiveCount: report.deepDives.length,
    exactPhotoIdentityVerified: report.deepDives.filter(d => d.exactPhotoIdentity === true).length,
    crossPlacePhotoViolations: report.deepDives.filter(d => d.crossPlaceViolation === true).length,
    consoleErrorCount: report.consoleErrors.length,
    relevantConsoleErrors: [...new Set(relevantConsole)].slice(0, 12),
    pageErrorCount: report.pageErrors.length,
    failedRequestCount: report.failedRequests.length,
    network: report.network,
  };
  fs.writeFileSync('cert-live-run3.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
} finally {
  await browser.close();
}
