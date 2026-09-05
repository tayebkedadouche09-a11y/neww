/** Final CERT search probe: fresh session, one query, full evidence capture. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const EXECUTABLE_CANDIDATES = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const executablePath = EXECUTABLE_CANDIDATES.find(p => fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const query = process.argv[2] || 'cafe';
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox','--disable-dev-shm-usage'] });
try {
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://neww-dun-chi.vercel.app', ['geolocation']);
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const http429 = [], consoleErrors = [];
  page.on('response', r => { if (r.status() === 429) http429.push(r.url().slice(0, 80)); if (r.status() === 404 || r.status() === 503 || r.status() === 500) consoleErrors.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`); });
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 150)); });
  await page.setGeolocation({ latitude: 36.7538, longitude: 3.0588, accuracy: 20 });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://neww-dun-chi.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let i = 0; i < 12; i++) { await sleep(4000); const n = await page.$$eval('[data-testid="place-card"]', els => els.length).catch(() => 0); if (n > 0) break; }
  const input = await page.$('input[placeholder^="Search rooftops"]');
  if (!input) { console.log(JSON.stringify({ query, error: 'NO_SEARCH_INPUT' })); process.exit(1); }
  await input.click({ clickCount: 3 });
  await input.type(query, { delay: 40 });
  await input.press('Tab');
  await sleep(20000);
  const cards = await page.$$eval('[data-testid="place-card"]', els => els.map(el => {
    const text = (el.innerText || '').replace(/\s+/g, ' ');
    const cat = (text.match(/(FOOD & DRINK|NIGHTLIFE|ARTS & CULTURE|OUTDOORS & NATURE|ENTERTAINMENT|ARCADE & GAMING|SHOPPING & VINTAGE|CHILL SPOT|HIDDEN GEM)/i) || [])[1] || '';
    return { name: el.querySelector('h3')?.textContent?.trim() || '', categoryChip: cat, googleVerified: /google verified/i.test(text), image: (el.querySelector('img') ? (el.querySelector('img').currentSrc || el.querySelector('img').src || '') : '') };
  }));
  const bodyText = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300));
  console.log(JSON.stringify({ query, cardCount: cards.length, http429: http429.length, consoleErrors: consoleErrors.slice(0, 5), emptyState: /No matches found|Nothing nearby/.test(bodyText), cards: cards.slice(0, 10) }, null, 1));
} finally { await browser.close(); }
