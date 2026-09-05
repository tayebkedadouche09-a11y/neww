/**
 * VYBE CERT 180° — FINAL PRODUCTION BROWSER CERTIFICATION
 *
 * REAL browser (Chrome) → REAL production app (Vercel) → REAL Google data →
 * ACTUAL UI verification (Explore / Map / Search / Photo / Interactions / Console).
 *
 * Temporary verification workflow (explicitly authorized for CERT 180).
 * Credentials are NEVER printed — QA account email is masked in all output.
 *
 * Usage:
 *   VYBE_QA_EMAIL=... VYBE_QA_PASSWORD=... node scripts/cert-180-final.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const PROD = process.env.VYBE_PRODUCTION_URL || 'https://neww-dun-chi.vercel.app/';
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const EXECUTABLE = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!EXECUTABLE) { console.error('FATAL: no Chrome/Edge executable found'); process.exit(2); }

const OUT_DIR = path.resolve('cert-evidence');
fs.mkdirSync(OUT_DIR, { recursive: true });

const EPOCH = Date.now();
const QA_EMAIL = process.env.VYBE_QA_EMAIL || `qa-cert-${EPOCH}@vybeqa.dev`;
const QA_PASSWORD = process.env.VYBE_QA_PASSWORD || `Qa!x${Math.random().toString(36).slice(2, 12)}A1!`;
const QA_USERNAME = `qa_cert_${String(EPOCH).slice(-7)}`;
const maskedEmail = QA_EMAIL.replace(/^(.{2}).*(@.*)$/, '$1***$2');

const GEO = { latitude: 36.7538, longitude: 3.0588, accuracy: 40 }; // Algiers center

const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { meta: {}, gates: {}, console: {}, network: {}, coverage: {}, interactions: {}, verdict: 'UNKNOWN' };
const gate = (name, pass, evidence) => { report.gates[name] = { pass: Boolean(pass), evidence }; console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${evidence ? ' — ' + JSON.stringify(evidence).slice(0, 400) : ''}`); return Boolean(pass); };

const consoleMessages = [];   // {type, text}
const pageErrors = [];        // uncaught exceptions
const failedRequests = [];    // {url, error}
const badResponses = [];      // {status, url}
const googleSearches = [];    // {phase, kind, count, ids}
const mediaResponses = [];    // {status, url} for photo media
const allRequests400plus = [];
let currentPhase = 'init';
let inflightSearches = 0;

const redact = s => String(s)
  .replace(/([?&])key=[^&]+/g, '$1key=<REDACTED>')
  .replace(/([?&])token=[^&]+/g, '$1token=<REDACTED>');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=en-US', '--window-size=1500,950', '--disable-infobars', '--hide-scrollbars'],
});
report.meta.browser = (await browser.version());
report.meta.userAgent = await browser.userAgent();

try {
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(new URL(PROD).origin, ['geolocation']);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.setDefaultTimeout(45000);

  page.on('console', m => {
    const type = m.type(); const text = m.text();
    if (['error', 'warning'].includes(type)) consoleMessages.push({ type, text: redact(text).slice(0, 500) });
  });
  page.on('pageerror', e => pageErrors.push(redact(String(e?.message || e)).slice(0, 500)));
  page.on('requestfailed', r => {
    const u = redact(r.url()); const err = r.failure()?.errorText || 'failed';
    if (/places\.googleapis\.com.*\/photos\//.test(u) && /ERR_ABORTED/.test(err)) return; // aborted img loads are benign
    failedRequests.push({ url: u.slice(0, 300), error: err });
  });
  page.on('response', async r => {
    const u = redact(r.url()); const status = r.status();
    if (status >= 400) { badResponses.push({ status, url: u.slice(0, 300), phase: currentPhase }); allRequests400plus.push({ status, url: u.slice(0, 300), phase: currentPhase }); }
    if (/places\.googleapis\.com\/v1\/places:(searchNearby|searchText)/.test(u)) {
      inflightSearches--;
      try {
        const body = await r.json();
        const places = body.places || [];
        googleSearches.push({ phase: currentPhase, kind: u.includes('searchNearby') ? 'nearby' : 'text', status, count: places.length, ids: places.map(p => p.id).slice(0, 40) });
      } catch { googleSearches.push({ phase: currentPhase, kind: 'unknown', status, count: 0, parseError: true }); }
    }
    if (/places\.googleapis\.com.*\/photos\/|maps\.googleapis\.com\/maps\/api\/place\/js\/PhotoService/.test(u)) mediaResponses.push({ status, url: u.slice(0, 220) });
  });
  page.on('request', r => { if (/places\.googleapis\.com\/v1\/places:(searchNearby|searchText)/.test(r.url())) inflightSearches++; });

  const shot = async name => { const p = path.join(OUT_DIR, name); await page.screenshot({ path: p }); return p; };

  // ---------- helpers ----------
  const harvestPlaces = (scopeSelector = 'body') => page.evaluate((scope) => {
    const root = document.querySelector(scope) || document.body;
    const out = new Map();
    const push = pl => { if (pl && pl.id && pl.name) out.set(pl.id, { id: pl.id, provider: pl.provider, providerPlaceId: pl.providerPlaceId, name: pl.name, category: pl.category, canonicalCategory: pl.canonicalCategory, providerTypes: pl.providerTypes, providerPrimaryType: pl.providerPrimaryType, images: (pl.images || []).slice(0, 3), relevance: pl.relevance ? { decision: pl.relevance.decision, reasons: pl.relevance.reasons, canonicalCategory: pl.relevance.canonicalCategory, intentMatch: pl.relevance.intentMatch, categoryMatch: pl.relevance.categoryMatch } : null, secondaryCategories: pl.secondaryCategories || null, confidence: pl.providerIdentityConfidence ?? null, rating: pl.rating, priceLevel: pl.priceLevel, distanceKm: pl.distanceKm }); };
    const els = root.querySelectorAll('*');
    for (const el of els) {
      for (const k of Object.keys(el)) {
        if (!k.startsWith('__reactFiber$')) continue;
        let f = el[k], hops = 0;
        while (f && hops < 60) {
          const p = f.memoizedProps;
          if (p) { if (p.place) push(p.place); if (p.selectedPlace) push(p.selectedPlace); }
          f = f.return; hops++;
        }
      }
    }
    return [...out.values()];
  }, scopeSelector);

  const cardDom = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="place-card"]')].map(el => ({
    name: el.querySelector('h3')?.textContent?.trim() || '',
    categoryChip: [...el.querySelectorAll('span')].map(s => s.textContent.trim()).find(t => /Food & Drink|Nightlife|Arcade|Entertainment|Chill|Shopping|Outdoors|Arts|Hidden/.test(t)) || '',
    trust: el.innerText.includes('Google verified') ? 'Google verified' : el.innerText.includes('OpenStreetMap') ? 'OpenStreetMap' : 'other',
    img: el.querySelector('img[alt]')?.getAttribute('src')?.slice(0, 260) || null,
    imgLoaded: (() => { const im = el.querySelector('img[alt]'); return im ? Boolean(im.complete && im.naturalWidth > 4) : false; })(),
  })));

  async function waitDiscoverySettled(timeoutMs = 60000) {
    const t0 = Date.now();
    await sleep(2500);
    while (Date.now() - t0 < timeoutMs) {
      if (inflightSearches <= 0) { await sleep(2500); if (inflightSearches <= 0) return true; }
      await sleep(700);
    }
    return false;
  }
  async function waitCards(min = 1, timeoutMs = 50000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const n = await page.$$eval('[data-testid="place-card"]', els => els.length).catch(() => 0);
      if (n >= min) { await sleep(1200); return n; }
      await sleep(800);
    }
    return 0;
  }
  async function clickChip(label) {
    return page.evaluate(lbl => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(lbl));
      if (!btn) return false; btn.click(); return true;
    }, label);
  }
  async function clickNav(label) {
    return page.evaluate(lbl => {
      const btn = [...document.querySelectorAll('nav button, header button')].find(b => b.textContent.trim().includes(lbl));
      if (!btn) return false; btn.click(); return true;
    }, label);
  }
  async function navbarSearch(query) {
    const input = await page.$('input[placeholder^="Search rooftops"]');
    if (!input) throw new Error('navbar search input not found');
    await input.click({ clickCount: 3 });
    await page.keyboard.type(query, { delay: 25 });
    await page.keyboard.press('Tab'); // blur triggers discover(filters)
    await sleep(800);
    await waitDiscoverySettled();
    await waitCards(1, 40000);
  }
  const findPlace = (places, pred) => places.find(pred);

  // =========================================================
  // GATE: API VERIFICATION (unauthenticated materialize endpoints)
  // =========================================================
  console.log('== GATE 0: API endpoint health ==');
  const apiHealth = [];
  for (const ep of ['materialize-google-place', 'materialize-osm-place']) {
    try {
      const r = await fetch(new URL(`api/${ep}`, PROD), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const bodyText = (await r.text()).slice(0, 200);
      apiHealth.push({ endpoint: ep, status: r.status, body: bodyText });
    } catch (e) { apiHealth.push({ endpoint: ep, error: String(e) }); }
  }
  report.network.apiHealth = apiHealth;
  const apiOk = apiHealth.every(h => h.status === 401 || h.status === 403);
  gate('J-api-health', apiOk, apiHealth.map(h => `${h.endpoint}:${h.status}`));

  // =========================================================
  // LOAD PRODUCTION
  // =========================================================
  console.log('== Loading production ==');
  await page.setGeolocation(GEO);
  currentPhase = 'load';
  await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('body', { timeout: 30000 });
  await sleep(2500);
  const shell = await page.evaluate(() => ({ title: document.title, h1: document.querySelector('h1')?.textContent?.trim() || '', hasExplore: document.body.innerText.includes('Find your'), url: location.href }));
  gate('A-load', Boolean(shell.title && shell.h1), shell);

  // =========================================================
  // GATE A: AUTH (real Supabase sign-up through the real UI)
  // =========================================================
  console.log('== GATE A: AUTH ==');
  currentPhase = 'auth';
  await page.click('[data-testid="navbar-signup"]');
  await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 10000 });
  await sleep(600);
  const modalInputs = await page.$$eval('[data-testid="auth-modal"] input', els => els.map(i => i.placeholder));
  const fillByPlaceholder = async (ph, val) => {
    const handle = await page.evaluateHandle(ph2 => [...document.querySelectorAll('[data-testid="auth-modal"] input')].find(i => i.placeholder === ph2), ph);
    const el = handle.asElement();
    if (!el) throw new Error(`input ${ph} not found`);
    await el.click({ clickCount: 3 }); await el.type(val, { delay: 5 });
  };
  if (modalInputs.includes('e.g. Alex Rivera')) await fillByPlaceholder('e.g. Alex Rivera', 'CERT QA Bot');
  if (modalInputs.includes('e.g. alex_vybes')) await fillByPlaceholder('e.g. alex_vybes', QA_USERNAME);
  await fillByPlaceholder('you@email.com', QA_EMAIL);
  await page.type('[data-testid="auth-password"]', QA_PASSWORD, { delay: 5 });
  await page.evaluate(() => { const b = [...document.querySelectorAll('[data-testid="auth-modal"] button')].find(x => x.textContent.includes('Create Account')); if (b) b.click(); });
  // wait for session (avatar) or failure toast
  let authOk = false, authNote = '';
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    authOk = Boolean(await page.$('[data-testid="navbar-avatar"]'));
    if (authOk) break;
    const modalGone = !(await page.$('[data-testid="auth-modal"]'));
    if (modalGone) { await sleep(1500); authOk = Boolean(await page.$('[data-testid="navbar-avatar"]')); if (authOk) break; }
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (/check your email to confirm/i.test(bodyText)) { authNote = 'sign-up requires email confirmation — no session'; break; }
    if (/already registered|sign up failed|unable/i.test(bodyText)) { authNote = 'sign-up rejected'; break; }
  }
  if (!authOk) {
    // fall back to provided credentials sign-in (QA account may already exist)
    console.log('  sign-up did not yield a session; attempting sign-in fallback');
    try {
      await page.click('[data-testid="navbar-signin"]');
      await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 8000 });
      await fillByPlaceholder('you@email.com', QA_EMAIL);
      await page.type('[data-testid="auth-password"]', QA_PASSWORD, { delay: 5 });
      await page.evaluate(() => { const b = [...document.querySelectorAll('[data-testid="auth-modal"] button')].find(x => x.textContent.includes('Sign In')); if (b) b.click(); });
      for (let i = 0; i < 15; i++) { await sleep(1000); if (await page.$('[data-testid="navbar-avatar"]')) { authOk = true; break; } }
    } catch (e) { authNote += ' | signin fallback failed: ' + e.message; }
  }
  report.gates['A-auth'] = { pass: authOk, evidence: { email: maskedEmail, note: authNote } };
  console.log(`  [${authOk ? 'PASS' : 'WARN'}] A-auth (${maskedEmail}) ${authNote}`);
  await shot('01-authenticated-home.png');

  // =========================================================
  // INITIAL DISCOVERY (auto after geolocation)
  // =========================================================
  console.log('== Initial discovery (geolocation → Algiers) ==');
  currentPhase = 'initial-discovery';
  const settled0 = await waitDiscoverySettled(60000);
  const n0 = await waitCards(1, 30000);
  const initialPlaces = await harvestPlaces('[data-testid="place-card"]');
  const initialDom = await cardDom();
  report.coverage.initial = { settled: settled0, displayedCards: n0, harvested: initialPlaces.length, searches: googleSearches.filter(s => s.phase === 'initial-discovery') };
  gate('B-initial-discovery', n0 > 0, { displayed: n0, harvested: initialPlaces.length, googleSearchRequests: googleSearches.filter(s => s.phase === 'initial-discovery').length });

  // =========================================================
  // GATE B+E: EXPLORE CATEGORY SWEEPS (restaurant / cafe / games / entertainment / hotel)
  // =========================================================
  console.log('== GATE B/E: Explore category sweeps ==');
  currentPhase = 'explore-sweeps';
  const sweeps = {};
  const chipTargets = [
    { chip: 'Restaurants', key: 'restaurant', expect: 'restaurant' },
    { chip: 'Cafés', key: 'cafe', expect: 'cafe' },
    { chip: 'Arcades', key: 'games', expect: 'games' },
    { chip: 'Cinema', key: 'entertainment', expect: 'cinema' },
    { chip: 'Hotels', key: 'hotel', expect: 'hotel' },
  ];
  for (const t of chipTargets) {
    const beforeSearches = googleSearches.length;
    const clicked = await clickChip(t.chip);
    await sleep(600);
    await waitDiscoverySettled(60000);
    const n = await waitCards(0, 20000);
    await sleep(1200);
    const places = await harvestPlaces('[data-testid="place-card"]');
    const dom = await cardDom();
    const searches = googleSearches.slice(beforeSearches);
    const rawProviderResults = searches.reduce((a, s) => a + s.count, 0);
    const googleVerified = dom.filter(d => d.trust === 'Google verified').length;
    const categoryOk = places.filter(p => p.canonicalCategory === t.expect).length;
    const mismatched = places.filter(p => p.canonicalCategory !== t.expect);
    sweeps[t.key] = { chip: t.chip, clicked, displayed: n, harvested: places.length, rawProviderResults, googleSearchRequests: searches.length, googleVerified, canonicalMatch: categoryOk, mismatched: mismatched.map(p => ({ name: p.name, canonical: p.canonicalCategory, primary: p.providerPrimaryType })) };
    console.log(`  ${t.key}: displayed=${n} harvested=${places.length} raw=${rawProviderResults} googleVerified=${googleVerified} canonicalMatch=${categoryOk}`);
    if (t.key === 'hotel' || t.key === 'cafe') await shot(`02-explore-${t.key}.png`);
  }
  report.exploreSweeps = sweeps;
  gate('E-explore-categories',
    ['restaurant', 'cafe', 'hotel'].every(k => sweeps[k]?.displayed > 0) &&
    (sweeps.games?.displayed > 0 || sweeps.entertainment?.displayed > 0),
    { restaurant: sweeps.restaurant?.displayed, cafe: sweeps.cafe?.displayed, games: sweeps.games?.displayed, entertainment: sweeps.entertainment?.displayed, hotel: sweeps.hotel?.displayed });

  // =========================================================
  // GATE D: PHOTO IDENTITY CHAIN (mandatory)
  // =========================================================
  console.log('== GATE D: Photo identity chain ==');
  currentPhase = 'photo';
  // re-run cafe sweep to have fresh cards
  await clickChip('Cafés'); await sleep(600); await waitDiscoverySettled(60000); await waitCards(1, 40000); await sleep(1500);
  const photoPlaces = await harvestPlaces('[data-testid="place-card"]');
  const photoDom = await cardDom();
  const target = photoPlaces.find(p => p.provider === 'google' && p.providerPlaceId) || photoPlaces[0];
  const targetDom = photoDom.find(d => d.name === target.name);
  const photoCheck = { placeName: target.name, providerPlaceId: target.providerPlaceId, providerPrimaryType: target.providerPrimaryType, providerTypes: target.providerTypes, dom: targetDom };

  // (1) displayed <img> loaded + host check
  const imgInfo = await page.evaluate(name => {
    const card = [...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === name);
    if (!card) return null;
    const img = card.querySelector('img[alt]');
    if (!img) return { hasImg: false };
    return { hasImg: true, src: img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, complete: img.complete, host: new URL(img.src, location.href).host, pathContainsPlacePhotos: /places\/[A-Za-z0-9_-]+\/photos\//.test(img.src) };
  }, target.name);
  photoCheck.img = imgInfo;

  // (2) INDEPENDENT Google Places cross-check: photo resources of the EXACT place id
  let googleCross = null;
  try {
    googleCross = await page.evaluate(async (pid) => {
      if (!window.google?.maps?.importLibrary) return { error: 'maps library not loaded' };
      const { Place } = await window.google.maps.importLibrary('places');
      const p = new Place({ id: pid });
      await p.fetchFields({ fields: ['photos', 'displayName', 'primaryType', 'types', 'location'] });
      return {
        fetchedName: p.displayName ?? null,
        fetchedPrimaryType: p.primaryType ?? null,
        fetchedTypes: p.types ?? null,
        photoNames: (p.photos || []).map(x => x.name).slice(0, 6), // "places/<id>/photos/<ref>"
        lat: p.location ? p.location.lat() : null, lng: p.location ? p.location.lng() : null,
      };
    }, target.providerPlaceId);
  } catch (e) { googleCross = { error: String(e?.message || e) }; }
  photoCheck.googleCrossCheck = googleCross;

  // identity chain: displayed src contains a photo ref that belongs to places/<sameId>/photos/*
  let chain = null;
  if (imgInfo?.src && googleCross?.photoNames?.length) {
    const refs = googleCross.photoNames.map(n => n.split('/').pop());
    const srcContainsKnownRef = refs.some(ref => ref.length > 8 && imgInfo.src.includes(ref));
    const srcPlaceIds = [...imgInfo.src.matchAll(/places\/([A-Za-z0-9_-]+)\/photos\//g)].map(m => m[1]);
    const srcPlaceId = srcPlaceIds[0] || null;
    chain = {
      displayedPhotoBelongsToSamePlaceViaRef: srcContainsKnownRef,
      srcEmbedsPlaceId: srcPlaceId,
      srcPlaceIdMatchesProviderPlaceId: srcPlaceId ? srcPlaceId === target.providerPlaceId : null,
      googlePhotoResourcesForPlace: googleCross.photoNames,
    };
  }
  photoCheck.identityChain = chain;

  // (3) network status of photo media responses
  photoCheck.mediaResponses = mediaResponses.slice(0, 10);

  // negative checks: no OSM/generic categories on this card (google-verified card with real img)
  photoCheck.negatives = {
    cardIsGoogleVerified: targetDom?.trust === 'Google verified',
    imgHostIsGoogle: /googleapis\.com|ggpht\.com|googleusercontent\.com/.test(imgInfo?.host || ''),
  };
  gate('D-photo-identity', Boolean(
    imgInfo?.hasImg && imgInfo.naturalWidth > 4 &&
    photoCheck.negatives.cardIsGoogleVerified && photoCheck.negatives.imgHostIsGoogle &&
    chain && (chain.displayedPhotoBelongsToSamePlaceViaRef || chain.srcPlaceIdMatchesProviderPlaceId)
  ), photoCheck);
  // closeup screenshot of the card
  const cardEl = await page.evaluateHandle(name => [...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === name), target.name);
  try { await cardEl.asElement().screenshot({ path: path.join(OUT_DIR, '03-photo-card-closeup.png') }); } catch { await shot('03-photo-card-closeup.png'); }
  report.photoVerification = photoCheck;

  // =========================================================
  // GATE C: PLACE IDENTITY (provider wins over name)
  // =========================================================
  console.log('== GATE C: Place identity ==');
  currentPhase = 'identity';
  await clickChip('Hotels'); await sleep(600); await waitDiscoverySettled(60000); await waitCards(1, 40000); await sleep(1200);
  let hotelPlaces = await harvestPlaces('[data-testid="place-card"]');
  const mixed = hotelPlaces.filter(p => {
    const ts = (p.providerTypes || []).map(x => String(x));
    const lodging = ts.some(x => ['lodging', 'hotel', 'motel', 'guest_house', 'hostel', 'resort', 'bed_and_breakfast', 'extended_stay_hotel'].includes(x));
    const food = ts.some(x => ['restaurant', 'bar', 'cafe', 'food', 'coffee_shop'].includes(x));
    return lodging && food;
  });
  let identityEvidence = { mixedCandidatesFound: mixed.length, mixed: mixed.slice(0, 3).map(p => ({ name: p.name, primaryType: p.providerPrimaryType, types: p.providerTypes, canonical: p.canonicalCategory, secondary: p.secondaryCategories, confidence: p.confidence })) };
  // misleading-name scan across everything harvested so far: name suggests one category, provider says another
  const allSeen = [...photoPlaces, ...hotelPlaces];
  const nameSuggests = (p, re) => re.test(p.name || '');
  const misleading = allSeen.filter(p => p.providerPrimaryType && (
    (nameSuggests(p, /restaurant|مطعم/i) && p.canonicalCategory !== 'restaurant' && ['hotel', 'cafe', 'bar'].includes(p.canonicalCategory)) ||
    (nameSuggests(p, /hotel|hôtel|فندق/i) && p.canonicalCategory !== 'hotel' && ['restaurant', 'cafe', 'bar'].includes(p.canonicalCategory)) ||
    (nameSuggests(p, /café|cafe|مقهى/i) && p.canonicalCategory !== 'cafe' && ['restaurant', 'hotel'].includes(p.canonicalCategory))
  ));
  identityEvidence.misleadingNamesHonoringProvider = misleading.slice(0, 4).map(p => ({ name: p.name, primaryType: p.providerPrimaryType, canonical: p.canonicalCategory }));
  if (!mixed.length) {
    // try text search for mixed hotel+restaurant via navbar search
    await navbarSearch('hotel restaurant');
    hotelPlaces = await harvestPlaces('[data-testid="place-card"]');
    identityEvidence.hotelRestaurantTextSearch = hotelPlaces.slice(0, 8).map(p => ({ name: p.name, primaryType: p.providerPrimaryType, types: p.providerTypes, canonical: p.canonicalCategory }));
  }
  const mixedVerified = mixed.length ? mixed.every(p => p.canonicalCategory === 'hotel') : (identityEvidence.hotelRestaurantTextSearch || []).length > 0;
  gate('C-place-identity', mixedVerified && (misleading.length > 0 || (identityEvidence.hotelRestaurantTextSearch || []).length > 0), identityEvidence);
  report.identityVerification = identityEvidence;
  if (mixed.length) {
    const el = await page.evaluateHandle(name => [...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === name), mixed[0].name);
    try { await el.asElement().screenshot({ path: path.join(OUT_DIR, '04-identity-edge-case.png') }); } catch { /* best effort */ }
  }

  // =========================================================
  // GATE F: MAP CONSISTENCY
  // =========================================================
  console.log('== GATE F: Map consistency ==');
  currentPhase = 'map';
  const exploreSnapshot = await harvestPlaces('[data-testid="place-card"]');
  const mapTarget = exploreSnapshot.find(p => p.provider === 'google' && p.providerPlaceId) || exploreSnapshot[0];
  await clickNav('Map View');
  await page.waitForSelector('.leaflet-container', { timeout: 20000 }).catch(() => {});
  await sleep(3500);
  const markerCount = await page.$$eval('.custom-map-marker', els => els.length).catch(() => 0);
  // click the first marker to open the PlacePreview
  const markerHandle = await page.$('.custom-map-marker');
  if (markerHandle) { await markerHandle.click().catch(() => {}); await sleep(1500); }
  const mapPlaces = await harvestPlaces('main');
  const mapMatch = mapPlaces.find(p => p.id === mapTarget.id);
  const consistency = mapMatch ? {
    sameProviderPlaceId: mapMatch.providerPlaceId === mapTarget.providerPlaceId,
    sameCanonicalCategory: mapMatch.canonicalCategory === mapTarget.canonicalCategory,
    samePrimaryType: mapMatch.providerPrimaryType === mapTarget.providerPrimaryType,
    exploreCanonical: mapTarget.canonicalCategory, mapCanonical: mapMatch.canonicalCategory,
    providerPlaceId: mapMatch.providerPlaceId,
  } : { found: false, harvestedOnMap: mapPlaces.length, markerCount };
  await shot('05-map-view.png');
  gate('F-map-consistency', Boolean(markerCount > 0 && mapMatch && consistency.sameProviderPlaceId && consistency.sameCanonicalCategory), { markerCount, ...consistency });
  report.mapConsistency = { markerCount, target: { name: mapTarget.name, id: mapTarget.id, canonical: mapTarget.canonicalCategory, placeId: mapTarget.providerPlaceId }, consistency };

  // =========================================================
  // GATE G: SEARCH INTENT (navbar free-text)
  // =========================================================
  console.log('== GATE G: Search intent ==');
  currentPhase = 'search';
  const searchResults = {};
  for (const q of ['gaming cafe', 'quiet cafe', 'romantic restaurant']) {
    await navbarSearch(q);
    await sleep(1200);
    const places = await harvestPlaces('[data-testid="place-card"]');
    const dom = await cardDom();
    const hotels = places.filter(p => ['hotel'].includes(p.canonicalCategory) || ['lodging', 'hotel'].includes(p.providerPrimaryType));
    const gamesMisclassified = places.filter(p => p.canonicalCategory === 'games' && !(p.providerTypes || []).some(t => /arcade|game|bowling|esports|gaming|amusement/i.test(String(t))));
    searchResults[q] = {
      count: places.length,
      canonicalBreakdown: places.reduce((a, p) => { a[p.canonicalCategory] = (a[p.canonicalCategory] || 0) + 1; return a; }, {}),
      sample: places.slice(0, 5).map(p => ({ name: p.name, primaryType: p.providerPrimaryType, types: p.providerTypes, canonical: p.canonicalCategory, intent: p.relevance?.intentMatch, reasons: p.relevance?.reasons })),
      hotelsLeaked: hotels.map(p => p.name),
      gamesWithoutGamesIdentity: gamesMisclassified.map(p => p.name),
    };
    console.log(`  "${q}": ${places.length} results, canonical=${JSON.stringify(searchResults[q].canonicalBreakdown)}`);
    await shot(`06-search-${q.replace(/\s+/g, '-')}.png`);
  }
  report.searchIntent = searchResults;
  const gOK = ['gaming cafe', 'quiet cafe'].every(q => searchResults[q]?.count > 0) && searchResults['romantic restaurant']?.count > 0;
  const noHotelLeak = Object.values(searchResults).every(r => r.hotelsLeaked.length === 0);
  const noFalseGames = Object.values(searchResults).every(r => r.gamesWithoutGamesIdentity.length === 0);
  gate('G-search-intent', gOK && noHotelLeak && noFalseGames, { gOK, noHotelLeak, noFalseGames });

  // =========================================================
  // GATE H: RESULT COVERAGE (raw provider results vs displayed)
  // =========================================================
  console.log('== GATE H: Result coverage ==');
  currentPhase = 'coverage';
  await navbarSearch('cafe');
  await sleep(1500);
  const cafePlaces = await harvestPlaces('[data-testid="place-card"]');
  const cafeSearches = googleSearches.filter(s => ['coverage', 'explore-sweeps'].includes(s.phase) && s.count > 0);
  const totalRaw = cafeSearches.reduce((a, s) => a + s.count, 0);
  const discoveredHeader = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s*discovered/i); return m ? Number(m[1]) : null;
  });
  report.coverage.cafe = { rawProviderResultsInSessionWindow: cafeSearches.length ? totalRaw : null, googleSearchRequests: cafeSearches.length, displayedCards: cafePlaces.length, discoveredHeader, sampleRawIds: cafeSearches.flatMap(s => s.ids).slice(0, 30) };
  const coverageOK = cafePlaces.length >= 3 && (totalRaw === 0 ? false : cafePlaces.length <= totalRaw);
  gate('H-coverage', coverageOK, report.coverage.cafe);

  // =========================================================
  // GATE I: INTERACTIONS + PERSISTENCE
  // =========================================================
  console.log('== GATE I: Interactions + persistence ==');
  currentPhase = 'interactions';
  const interactions = { authWasAvailable: authOk };
  if (authOk) {
    // ensure a plan exists
    await clickNav('Outing Plans');
    await sleep(1500);
    let planCreated = false;
    const newPlanBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes('New Plan')));
    if (newPlanBtn.asElement()) { await newPlanBtn.asElement().click(); await sleep(800); }
    const titleInput = await page.$('input[placeholder^="Plan Title"]');
    if (titleInput) {
      await titleInput.type('CERT 180 QA Plan', { delay: 10 });
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Create Plan'); if (b) b.click(); });
      await sleep(2000); planCreated = true;
    }
    interactions.planCreated = planCreated;

    // back to explore, pick first google place card
    await clickNav('Explore');
    await sleep(1500);
    const iPlaces = await harvestPlaces('[data-testid="place-card"]');
    const iTarget = iPlaces.find(p => p.provider === 'google' && p.providerPlaceId) || iPlaces[0];
    interactions.target = { name: iTarget.name, providerPlaceId: iTarget.providerPlaceId };
    const cardSel = name => ([...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === name));
    const clickOnCard = async (name, ariaOrText) => {
      return page.evaluate((nm, sel) => {
        const card = [...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === nm);
        if (!card) return false;
        const btn = card.querySelector(`button[aria-label*="${sel}"]`) || [...card.querySelectorAll('button')].find(b => b.textContent.trim().includes(sel));
        if (!btn) return false; btn.click(); return true;
      }, name, ariaOrText);
    };
    interactions.likeClicked = await clickOnCard(iTarget.name, 'Like');
    await sleep(1200);
    interactions.saveClicked = await clickOnCard(iTarget.name, 'Save');
    await sleep(1200);
    interactions.addToPlanClicked = await clickOnCard(iTarget.name, 'Add to Plan');
    await sleep(1500);
    // share
    interactions.shareClicked = await page.evaluate(nm => {
      const card = [...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === nm);
      const btn = card?.querySelector(`button[aria-label^="Share"]`);
      if (!btn) return false; btn.click(); return true;
    }, iTarget.name);
    await sleep(1500);
    interactions.shareModalOpened = Boolean(await page.evaluate(() => document.body.innerText.match(/share/i) && document.querySelector('.fixed.inset-0.z-50')));
    await page.mouse.click(15, 450); // close share modal via backdrop
    await sleep(1200);
    // details modal
    await page.evaluate(nm => { const card = [...document.querySelectorAll('[data-testid="place-card"]')].find(c => c.querySelector('h3')?.textContent?.trim() === nm); const h = card?.querySelector('h3'); if (h) h.click(); }, iTarget.name);
    await sleep(1800);
    interactions.detailModal = await page.evaluate(() => {
      const m = document.querySelector('[data-testid="place-detail-modal"]');
      if (!m) return null;
      const liked = [...m.querySelectorAll('button')].some(b => b.textContent.trim() === 'Liked');
      const saved = [...m.querySelectorAll('button')].some(b => b.textContent.trim() === 'Saved');
      return { name: m.querySelector('h2, h3')?.textContent?.trim()?.slice(0, 80) || m.innerText.slice(0, 80), showsLiked: liked, showsSaved: saved, hasGoogleLink: m.innerHTML.includes('place_id:') || m.innerText.includes('Google') };
    });
    await shot('07-detail-modal.png');
    await page.mouse.click(15, 450); await sleep(1000);
    // map button on card
    interactions.mapButtonClicked = await clickOnCard(iTarget.name, 'Map');
    await sleep(2500);
    interactions.mapTabActive = await page.evaluate(() => location.href && document.body.innerText.includes('Map View') && Boolean(document.querySelector('.leaflet-container')));
    await sleep(1000);

    // ---- RELOAD → persistence ----
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(3000);
    let avatar = Boolean(await page.$('[data-testid="navbar-avatar"]'));
    for (let i = 0; i < 10 && !avatar; i++) { await sleep(1000); avatar = Boolean(await page.$('[data-testid="navbar-avatar"]')); }
    interactions.sessionPersistedAfterReload = avatar;
    await page.evaluate(() => { const b = [...document.querySelectorAll('header button, nav button')].find(x => x.textContent.trim().includes('@')); if (b) b.click(); });
    await sleep(2000);
    const profileStats = await page.evaluate(() => {
      const t = document.body.innerText;
      const saved = t.match(/SAVED SPOTS\s*\n?\s*(\d+)/i) || t.match(/Saved Places \((\d+)\)/i);
      const liked = t.match(/LIKED VIBES\s*\n?\s*(\d+)/i) || t.match(/Liked Places \((\d+)\)/i);
      return { saved: saved ? Number(saved[1]) : null, liked: liked ? Number(liked[1]) : null };
    });
    interactions.persistenceCounters = profileStats;
    // open Liked Places sub-tab and verify the target place is listed
    const likedTabClicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Liked Places')); if (b) { b.click(); return true; } return false; });
    await sleep(2000);
    const likedList = await harvestPlaces('[data-testid="place-card"]');
    interactions.likedContainsTarget = likedList.some(p => p.id === interactions.target?.id || p.providerPlaceId === interactions.target?.providerPlaceId);
    interactions.likedTabClicked = likedTabClicked;
    // plans persisted
    await clickNav('Outing Plans');
    await sleep(2000);
    interactions.planPersistedAfterReload = await page.evaluate(() => document.body.innerText.includes('CERT 180 QA Plan') && document.body.innerText.length > 0);
    await shot('08-persistence-profile.png');
    gate('I-interactions-persistence',
      Boolean(interactions.likeClicked && interactions.saveClicked && interactions.addToPlanClicked && interactions.detailModal && avatar && profileStats.liked >= 1 && profileStats.saved >= 1 && interactions.likedContainsTarget),
      interactions);
  } else {
    gate('I-interactions-persistence', false, { blocked: 'no authenticated session — cannot verify Like/Save/Plan persistence', authNote });
  }
  report.interactions = interactions;

  // =========================================================
  // GATE J: CONSOLE / NETWORK CLASSIFICATION
  // =========================================================
  console.log('== GATE J: Console / network ==');
  const appErrorPatterns = /vybe|place|materiali|supabase|photo|react|uncaught|cannot read|is not a function|undefined is not/i;
  const googleNoisePatterns = /Google Maps JavaScript API (deprecation|warning)|GM_|As of .*February|mapsjs|Spinner removed/i;
  const appConsoleErrors = consoleMessages.filter(m => m.type === 'error' && appErrorPatterns.test(m.text) && !googleNoisePatterns.test(m.text));
  const googleConsoleErrors = consoleMessages.filter(m => m.type === 'error' && /google|maps|places/i.test(m.text) && !googleNoisePatterns.test(m.text));
  const unexpected4xx5xx = allRequests400plus.filter(r =>
    !(r.status === 401 && /materialize/.test(r.url)) &&          // expected: our unauth probes are from Node, but keep browser-side 401s visible
    !(r.status === 429 && /fonts|gstatic/.test(r.url)) &&
    !(r.status === 404 && /favicon|\.map$|\/photo/.test(r.url))
  );
  report.console = {
    consoleErrorCount: consoleMessages.filter(m => m.type === 'error').length,
    consoleWarningCount: consoleMessages.filter(m => m.type === 'warning').length,
    pageErrors, appConsoleErrors, googleConsoleErrors,
    allConsoleErrors: consoleMessages.filter(m => m.type === 'error').slice(0, 30),
    allConsoleWarnings: consoleMessages.filter(m => m.type === 'warning').slice(0, 20),
  };
  report.network = {
    ...report.network,
    failedRequests: failedRequests.slice(0, 20),
    badResponses: allRequests400plus.slice(0, 30),
    unexpected4xx5xx: unexpected4xx5xx.slice(0, 20),
    googleSearchRequestCount: googleSearches.length,
    photoMediaResponses: mediaResponses.length,
  };
  const consoleClean = pageErrors.length === 0 && appConsoleErrors.length === 0 && unexpected4xx5xx.length === 0;
  gate('J-console-network', consoleClean, { pageErrors: pageErrors.length, appConsoleErrors: appConsoleErrors.length, unexpected4xx5xx: unexpected4xx5xx.length, googleConsoleErrors: googleConsoleErrors.length, failedRequests: failedRequests.length });

  // =========================================================
  // FINAL VERDICT
  // =========================================================
  const gateResults = report.gates;
  const failed = Object.entries(gateResults).filter(([, v]) => !v.pass).map(([k]) => k);
  report.verdict = failed.length === 0 ? 'PASS' : 'NOT_PASS';
  report.meta = { ...report.meta, productionUrl: PROD, testedAt: new Date().toISOString(), qaEmailMasked: maskedEmail };
  fs.writeFileSync(path.join(OUT_DIR, 'cert-180-result.json'), JSON.stringify(report, null, 2));
  console.log('\n================ CERT 180 RESULT ================');
  console.log(JSON.stringify({ verdict: report.verdict, failedGates: failed, gates: Object.fromEntries(Object.entries(gateResults).map(([k, v]) => [k, v.pass])) }, null, 2));
  console.log('Evidence dir: ' + OUT_DIR);
} finally {
  await browser.close().catch(() => {});
}
