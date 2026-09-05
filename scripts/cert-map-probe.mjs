/** Focused CERT probe: initial Explore → card → Map consistency → detail evidence. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const PRODUCTION_URL = 'https://neww-dun-chi.vercel.app/';
const EXECUTABLE_CANDIDATES = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const executablePath = EXECUTABLE_CANDIDATES.find(p => fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const report = {};
try {
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(new URL(PRODUCTION_URL).origin, ['geolocation']);
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);
  const net429 = [];
  page.on('response', r => { if (r.status() === 429) net429.push(r.url().slice(0, 90)); });
  await page.setGeolocation({ latitude: 36.7538, longitude: 3.0588, accuracy: 20 });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for initial Explore cards
  let cards = [];
  for (let i = 0; i < 12; i++) {
    await sleep(4000);
    cards = await page.$$eval('[data-testid="place-card"]', els => els.map(el => ({
      name: el.querySelector('h3')?.textContent?.trim() || '',
      text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 150),
      image: el.querySelector('img') ? (el.querySelector('img').currentSrc || el.querySelector('img').src) : '',
    }))).catch(() => []);
    if (cards.length) break;
  }
  report.exploreCards = cards.length;
  report.exploreSample = cards.slice(0, 4);
  if (!cards.length) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

  // ---- Detail evidence from Explore card 1 ----
  const first = await page.$('[data-testid="place-card"]');
  const cardName = await page.$eval('[data-testid="place-card"] h3', el => el.textContent?.trim() || '');
  await first.click();
  const modal = await page.waitForSelector('[data-testid="place-detail-modal"]', { timeout: 12000 }).catch(() => null);
  if (modal) {
    await sleep(2500);
    report.detail = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="place-detail-modal"]');
      const text = (root?.innerText || '').replace(/\s+/g, ' ').trim();
      const imgs = [...(root?.querySelectorAll('img') || [])].map(i => i.currentSrc || i.src || '').filter(Boolean);
      const links = [...(root?.querySelectorAll('a') || [])].map(a => a.href);
      return {
        name: root?.querySelector('h2')?.textContent?.trim() || '',
        text: text.slice(0, 700),
        images: imgs.slice(0, 4),
        links: links.filter(h => /google|place/i.test(h)).slice(0, 4),
        hasEvidencePanel: /Place identity|Primary identity|identity confidence/i.test(text),
      };
    });
    const closeBtn = await page.$('[data-testid="place-detail-modal"] button[aria-label="Close place details"]');
    if (closeBtn) { await closeBtn.click(); await sleep(800); }
  }

  // ---- Map consistency: click "Map" on card, verify preview shows same place ----
  const buttons = await page.$$('[data-testid="place-card"] button');
  let openedMap = false;
  for (const b of buttons) {
    const label = await b.evaluate(el => el.textContent || '');
    if (label.trim() === 'Map') { await b.click(); openedMap = true; break; }
  }
  report.mapButtonFound = openedMap;
  if (openedMap) {
    await sleep(9000);
    const mapState = await page.evaluate(() => {
      const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
      const idx = bodyText.indexOf('Open details');
      return {
        previewText: idx >= 0 ? bodyText.slice(Math.max(0, idx - 400), idx + 40) : '',
        mapRendered: Boolean(document.querySelector('.gm-style, canvas')),
        imgs: [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src || '').filter(u => u.includes('google')).slice(0, 6),
      };
    });
    report.map = {
      requestedCard: cardName,
      previewMatchesName: mapState.previewText.includes(cardName),
      previewText: mapState.previewText.slice(0, 250),
      mapRendered: mapState.mapRendered,
    };
    // Open details from the map preview
    const openDetails = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(x => (x.textContent || '').includes('Open details'));
      if (b) { b.click(); return true; } return false;
    });
    if (openDetails) {
      const modal2 = await page.waitForSelector('[data-testid="place-detail-modal"]', { timeout: 12000 }).catch(() => null);
      if (modal2) {
        await sleep(2000);
        report.mapDetail = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="place-detail-modal"]');
          return { name: root?.querySelector('h2')?.textContent?.trim() || '', text: (root?.innerText || '').replace(/\s+/g, ' ').slice(0, 300) };
        });
        const cb = await page.$('[data-testid="place-detail-modal"] button[aria-label="Close place details"]');
        if (cb) { await cb.click(); await sleep(600); }
      }
    }
  }
  report.http429Count = net429.length;
  fs.writeFileSync('cert-map-probe.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
