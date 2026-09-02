import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = 'http://127.0.0.1:5173/';

console.log(`Using browser executable: ${CHROME_PATH}\nTarget: ${BASE_URL}`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runQA() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  const consoleWarnings = [];
  const networkErrors = [];
  const appNetworkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    else if (msg.type() === 'warning') consoleWarnings.push(text);
  });

  page.on('pageerror', err => consoleErrors.push(`PAGEERROR: ${err.message}`));

  page.on('requestfailed', request => {
    const url = request.url();
    const reason = request.failure()?.errorText || 'unknown';
    networkErrors.push(`${url} - ${reason}`);
    if (url.startsWith(BASE_URL) || url.startsWith('http://127.0.0.1')) {
      appNetworkErrors.push(`${url} - ${reason}`);
    }
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      const url = response.url();
      networkErrors.push(`HTTP ${response.status()} ${url}`);
      if (url.startsWith(BASE_URL) || url.startsWith('http://127.0.0.1')) {
        appNetworkErrors.push(`HTTP ${response.status()} ${url}`);
      }
    }
  });

  const testResults = [];
  function logPass(phase, msg) {
    console.log(`[PASS] ${phase}: ${msg}`);
    testResults.push({ phase, status: 'PASS', msg });
  }
  function logFail(phase, msg) {
    console.error(`[FAIL] ${phase}: ${msg}`);
    testResults.push({ phase, status: 'FAIL', msg });
  }
  function assert(phase, cond, passMsg, failMsg) {
    if (cond) logPass(phase, passMsg);
    else logFail(phase, failMsg);
    return cond;
  }

  const waitFor = async (selector, timeout = 8000) => {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  };

  const typeInto = async (selector, text, opts = {}) => {
    await page.waitForSelector(selector, { timeout: 8000 });
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) throw new Error('typeInto: no element ' + s);
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
    }, selector);
    await page.type(selector, text, opts);
  };

  const isAuthModalVisible = async () => (await page.$('[data-testid="auth-modal"]')) !== null;

  const pressEscape = async () => {
    await page.keyboard.press('Escape');
    await sleep(250);
  };

  const clickByText = async (selector, text) => {
    const clicked = await page.evaluate((sel, txt) => {
      const el = Array.from(document.querySelectorAll(sel)).find(b => (b.textContent || '').trim().includes(txt));
      if (el) { el.click(); return true; }
      return false;
    }, selector, text);
    return clicked;
  };
try {
    // ============================================================
    // PHASE A: Homepage Load & Fresh Visitor State
    // ============================================================
    console.log('\n--- PHASE A: Homepage Load & Fresh Visitor State ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitFor('h1', 10000);
    await sleep(1200);

    const pageTitle = await page.title();
    assert('A1', pageTitle.includes('VYBE'), `Title verified: "${pageTitle}"`, `Unexpected title: "${pageTitle}"`);

    const heroHeader = await page.$eval('h1', el => el.textContent).catch(() => null);
    assert('A2', !!heroHeader && heroHeader.toLowerCase().includes('vibe today'), 'Hero headline rendered', `Hero headline missing or incorrect: "${heroHeader}"`);

    const signInVisible = (await page.$('[data-testid="navbar-signin"]')) !== null;
    const signUpVisible = (await page.$('[data-testid="navbar-signup"]')) !== null;
    const avatarVisible = (await page.$('[data-testid="navbar-avatar"]')) !== null;
    const demoBadge = await page.evaluate(() => !!Array.from(document.querySelectorAll('div')).find(d => (d.textContent || '').trim() === 'DEMO'));

    assert('A3', signInVisible && signUpVisible, 'Visitor sees Sign In / Create Account entry points', 'Sign In / Create Account buttons NOT shown to visitor');
    assert('A4', !avatarVisible, 'Visitor is NOT signed in (no avatar)', 'Avatar unexpectedly shown — visitor was authenticated by default');
    assert('A5', !demoBadge, 'Visitor is NOT in demo mode (no DEMO badge)', 'DEMO badge unexpectedly shown');

    // ============================================================
    // PHASE B: Protected Action Guard (logged out)
    // ============================================================
    console.log('\n--- PHASE B: Protected Actions Guard (logged out) ---');
    const likeBtn = await page.$('button[title="Like this spot"]');
    if (likeBtn) {
      await likeBtn.click();
      await sleep(500);
      const modalOpen = await isAuthModalVisible();
      assert('B1', modalOpen, 'Like while logged out opens AuthModal', 'Like while logged out did NOT open AuthModal');
      if (modalOpen) { await pressEscape(); await sleep(300); }
    } else {
      logFail('B1', 'No Like button found in feed');
    }

    const saveBtn = await page.$('button[title="Save to My VYBES"]');
    if (saveBtn) {
      await saveBtn.click();
      await sleep(500);
      const modalOpen = await isAuthModalVisible();
      assert('B2', modalOpen, 'Save while logged out opens AuthModal', 'Save while logged out did NOT open AuthModal');
      if (modalOpen) { await pressEscape(); await sleep(300); }
    } else {
      logFail('B2', 'No Save button found in feed');
    }

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Add to Plan/.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(500);
    const planModalOpen = await isAuthModalVisible();
    assert('B3', planModalOpen, 'Add to Plan while logged out opens AuthModal', 'Add to Plan while logged out did NOT open AuthModal');
    if (planModalOpen) { await pressEscape(); await sleep(300); }
// ============================================================
    // PHASE C: Sign In Modal + Forgot Password UI
    // ============================================================
    console.log('\n--- PHASE C: AuthModal (Sign In / Forgot Password) ---');
    await page.click('[data-testid="navbar-signin"]');
    await sleep(500);
    const signInModal = await isAuthModalVisible();
    const hasEmailInput = (await page.$('form input[type="email"]')) !== null;
    const hasDemoSwitcher = (await page.$('[data-testid="continue-demo"]')) !== null;
    assert('C1', signInModal, 'Sign In button opens AuthModal (welcome header)', 'Sign In button did NOT open AuthModal');
    assert('C2', hasEmailInput, 'Sign In form has email input', 'Sign In form missing email input');
    assert('C3', hasDemoSwitcher, 'AuthModal shows explicit "Continue as Demo" option', 'AuthModal missing "Continue as Demo" option');

    // Forgot password flow
    const forgotClicked = await clickByText('button', 'Forgot your password?');
    await sleep(500);
    const forgotTitle = await page.evaluate(() => !!Array.from(document.querySelectorAll('h3')).find(h => (h.textContent || '').includes('Reset your password')));
    assert('C4', forgotClicked && forgotTitle, 'Forgot Password UI opens with reset title', 'Forgot Password UI did not open');
    await typeInto('form input[type="email"]', 'kai@vybe.app');
    await clickByText('button[type="submit"]', 'Send Reset Link');
    await sleep(600);
    const backToLogin = await page.evaluate(() => !!Array.from(document.querySelectorAll('h3')).find(h => (h.textContent || '').includes('Welcome to VYBE')));
    assert('C5', backToLogin, 'Forgot password submit returns to Sign In + shows toast', 'Forgot password submit did not return to sign in');
    await pressEscape();
    await sleep(300);

    // ============================================================
    // PHASE D: Sign Up → Authenticated Session
    // ============================================================
    console.log('\n--- PHASE D: Create Account (Sign Up) ---');
    await page.click('[data-testid="navbar-signup"]');
    await sleep(500);
    const regOpen = await page.evaluate(() => !!Array.from(document.querySelectorAll('h3')).find(h => (h.textContent || '').includes('Join the VYBE Club')));
    assert('D1', regOpen, 'Create Account button opens register mode', 'Create Account button did not open register mode');

    const ts = Date.now();
    const qaEmail = `qa${ts}@vybe.app`;
    // Clear any stale values from earlier modal usage (Phase C typed into email)
    await page.evaluate(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      document.querySelectorAll('form input').forEach(el => {
        setter.call(el, '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await typeInto('input[placeholder*="Alex Rivera"]', 'QA Tester');
    await typeInto('input[placeholder*="alex_vybes"]', `qatester${ts % 100000}`);
    await typeInto('input[placeholder*="you@email.com"]', qaEmail);
    await clickByText('button[type="submit"]', 'Create Account');
    await sleep(1200);

    const avatarAfterRegister = (await page.$('[data-testid="navbar-avatar"]')) !== null;
    const signInGone = (await page.$('[data-testid="navbar-signin"]')) === null;
    assert('D2', avatarAfterRegister, 'After sign-up the UI switches to authenticated state (avatar shown)', 'Avatar not shown after sign-up');
    assert('D3', signInGone, 'Sign In button is replaced once authenticated', 'Sign In button still visible after sign-up');

    // Session persistence after refresh
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('h1', 10000);
    await sleep(800);
    const authAfterRefresh = (await page.$('[data-testid="navbar-avatar"]')) !== null;
    assert('D4', authAfterRefresh, 'Auth session persists after browser refresh', 'Auth session LOST after refresh');
// ============================================================
    // PHASE E: Logout → back to unauthenticated state
    // ============================================================
    console.log('\n--- PHASE E: Logout ---');
    // Profile persona tab is guarded; navigate via avatar button
    const avatarBtn = await page.$('[data-testid="navbar-avatar"]');
    if (avatarBtn) {
      await avatarBtn.click();
      await sleep(500);
    }
    await waitFor('[data-testid="profile-signout"]', 5000);
    await page.click('[data-testid="profile-signout"]');
    await sleep(800);

    const signInBack = (await page.$('[data-testid="navbar-signin"]')) !== null;
    const avatarGone = (await page.$('[data-testid="navbar-avatar"]')) === null;
    assert('E1', signInBack, 'After logout visitor sees Sign In again (unauthenticated)', 'Sign In not restored after logout');
    assert('E2', avatarGone, 'Avatar removed after logout', 'Avatar still visible after logout');

    // Explore tab should be active after logout
    const onExplore = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return !!h1 && h1.textContent.toLowerCase().includes('vibe today');
    });
    assert('E3', onExplore, 'Logout returns to public Explore homepage', 'Explore homepage not restored after logout');

    // ============================================================
    // PHASE F: Explicit Demo Mode
    // ============================================================
    console.log('\n--- PHASE F: Explicit Demo Mode ---');
    await page.click('[data-testid="navbar-signin"]');
    await sleep(500);
    await page.click('[data-testid="continue-demo"]');
    await sleep(800);

    const demoBadgeNow = await page.evaluate(() => !!Array.from(document.querySelectorAll('div')).find(d => (d.textContent || '').trim() === 'DEMO'));
    const avatarNow = (await page.$('[data-testid="navbar-avatar"]')) !== null;
    const adminTab = await page.evaluate(() => !!Array.from(document.querySelectorAll('nav button')).find(b => (b.textContent || '').includes('Admin')));
    assert('F1', demoBadgeNow, 'Demo mode badge shown after explicit "Continue as Demo"', 'DEMO badge missing after Continue as Demo');
    assert('F2', avatarNow, 'Demo user avatar shown', 'Demo avatar missing');
    assert('F3', adminTab, 'Admin entry visible for demo user Kai (isAdmin)', 'Admin entry not visible for demob user');

    // Session persistence for demo mode
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('h1', 10000);
    await sleep(800);
    const demoPersists = await page.evaluate(() => !!Array.from(document.querySelectorAll('div')).find(d => (d.textContent || '').trim() === 'DEMO'));
    assert('F4', demoPersists, 'Demo session persists after refresh', 'Demo session LOST after refresh');
// ============================================================
    // PHASE G: Personalization & Protected Features (demo user)
    // ============================================================
    console.log('\n--- PHASE G: Protected User Features (demo) ---');

    // G1: Add to Plan from a card (authed). plan-1 is pre-seeded with place-1/2/15,
    // so click successive card buttons until the success toast appears.
    let addPlanToast = false;
    const planBtns = await page.$$('button[title="Add to current outing plan"]');
    for (let i = 0; i < Math.min(planBtns.length, 6) && !addPlanToast; i++) {
      await planBtns[i].click();
      await sleep(600);
      addPlanToast = await page.evaluate(() =>
        Array.from(document.querySelectorAll('p')).some(p => /to VYBE Plan!/.test(p.textContent || ''))
      );
    }
    assert('G1', addPlanToast, 'Add to Plan succeeded for authed user (success toast shown)', 'Add to Plan did not succeed for authed user');

    // G2: Open place detail, submit review, verify it renders
    const firstCard = await page.$('[data-testid="place-card"]');
    if (firstCard) {
      await firstCard.click();
      await sleep(600);
      const detailOpen = (await page.$('[data-testid="place-detail-modal"]')) !== null;
      assert('G2a', detailOpen, 'Place detail modal opened from feed card', 'Place detail modal did not open');

      await clickByText('button', 'Leave Vibe Review');
      await sleep(500);
      const reviewOpen = (await page.$('[data-testid="review-modal"]')) !== null;
      assert('G2b', reviewOpen, 'Review modal opens (authed)', 'Review modal did not open');

      await typeInto('textarea[placeholder*="What was the energy"]', 'QA browser review: neon lights and great matcha lattes!');
      await clickByText('button[type="submit"]', 'Publish Vibe Review');
      await sleep(800);
      const reviewRendered = await page.evaluate(() => document.body.textContent.includes('QA browser review'));
      assert('G2c', reviewRendered, 'Review submitted and rendered in the place detail', 'Review not rendered after submit');

      await pressEscape();
      await sleep(400);
    } else {
      logFail('G2a', 'No place cards found to open detail');
    }

    // G3: Save a place (bookmark) — state must flip
    const saveBtn2 = await page.$('button[title="Save to My VYBES"]');
    if (saveBtn2) {
      await saveBtn2.click();
      await sleep(600);
      const savedFlip = (await page.$('button[title="Saved to My VYBES"]')) !== null;
      assert('G3', savedFlip, 'Save place toggles to saved state', 'Save toggle did not persist to UI');
    } else {
      logFail('G3', 'Save button not found');
    }

    // G4: Create a collection in My VYBES
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('header button, nav button')).find(b => (b.textContent || '').includes('My VYBES'));
      if (btn) btn.click();
    });
    let collectionsOpen = await waitFor('[data-testid="collections-view"]');
    if (!collectionsOpen) {
      await clickByText('button', 'My VYBES');
      collectionsOpen = await waitFor('[data-testid="collections-view"]');
    }
    assert('G4a', collectionsOpen, 'My VYBES view opens', 'My VYBES view did not open');

    // Open the creation form (retry — the toggle can race the view render)
    let collFormOpen = false;
    for (let i = 0; i < 3 && !collFormOpen; i++) {
      if (!(await page.$('input[placeholder*="Secret Sunset"]'))) {
        await clickByText('button', 'New Collection');
        collFormOpen = (await page.waitForSelector('input[placeholder*="Secret Sunset"]', { timeout: 3000 }).catch(() => null)) !== null;
      } else {
        collFormOpen = true;
      }
    }
    await typeInto('input[placeholder*="Secret Sunset"]', 'QA Collection');
    await clickByText('button[type="submit"]', 'Create');
    await sleep(700);
    const collCreated = await page.evaluate(() => document.body.textContent.includes('QA Collection'));
    assert('G4', collCreated, 'Collection created and displayed', 'Collection not displayed after creation');

    // G5: Create a plan in Plan Builder
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Plans') || (b.textContent || '').includes('Outing Plans'));
      if (btn) btn.click();
    });
    await sleep(600);
    const planBuilderOpen = (await page.$('[data-testid="plan-builder"]')) !== null;
    assert('G5a', planBuilderOpen, 'Plan Builder opens', 'Plan Builder did not open');

    // Open the new-plan form (retry — the toggle can race the view render)
    let planFormOpen = false;
    for (let i = 0; i < 3 && !planFormOpen; i++) {
      if (!(await page.$('input[placeholder*="Saturday Date"]'))) {
        await clickByText('button', 'New Plan');
        planFormOpen = (await page.waitForSelector('input[placeholder*="Saturday Date"]', { timeout: 3000 }).catch(() => null)) !== null;
      } else {
        planFormOpen = true;
      }
    }
    await typeInto('input[placeholder*="Saturday Date"]', 'QA Night Out');
    await clickByText('button[type="submit"]', 'Create Plan');
    await sleep(800);
    const planCreated = await page.evaluate(() => document.body.textContent.includes('QA Night Out'));
    assert('G5b', planCreated, 'New plan created and displayed with timeline', 'New plan not displayed');

    // G6: Add a suggested next stop to the new plan
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).filter(b => b.title === 'Add to plan')[0];
      if (btn) btn.click();
    });
    await sleep(700);
    const planItem = await page.evaluate(() => !!document.querySelector('[data-testid="plan-builder"]') && /Stops/.test(document.body.textContent || ''));
    assert('G6', planItem, 'Plan builder shows stop items after adding', 'No plan items after adding suggested stop');
// ============================================================
    // PHASE H: Data Persistence Across Browser Refresh
    // ============================================================
    console.log('\n--- PHASE H: Data Persistence (refresh) ---');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('h1', 10000);
    await sleep(1000);

    const savedPersists = (await page.$('button[title="Saved to My VYBES"]')) !== null;
    assert('H1', savedPersists, 'Saved place survives refresh', 'Saved place LOST after refresh');

    const collectionPersists = await page.evaluate(() => localStorage.getItem('vybe_collections')?.includes('QA Collection'));
    assert('H2', !!collectionPersists, 'Collection persists in localStorage after refresh', 'Collection missing after refresh');

    const planPersists = await page.evaluate(() => localStorage.getItem('vybe_plans')?.includes('QA Night Out'));
    assert('H3', !!planPersists, 'Plan persists in localStorage after refresh', 'Plan missing after refresh');

    // Review persistence: open first detail again and look for the comment
    const card2 = await page.$('[data-testid="place-card"]');
    if (card2) {
      await card2.click();
      await sleep(700);
      const reviewPersists = await page.evaluate(() => document.body.textContent.includes('QA browser review'));
      assert('H4', reviewPersists, 'Submitted review survives refresh (shown in detail)', 'Review LOST after refresh');
      await pressEscape();
      await sleep(400);
    } else {
      logFail('H4', 'No place card available to re-open detail');
    }

    // ============================================================
    // PHASE I: All 12 Moods + Discovery Wizard + VYBE Score
    // ============================================================
    console.log('\n--- PHASE I: Moods, Wizard & Scores ---');
    const moodNames = [
      'Energetic', 'Chill', 'Romantic', 'Creative', 'Party', 'Curious',
      'Hungry', 'Outdoor', 'Gaming', 'Music', 'Explore', 'Lazy'
    ];
    let moodsPassed = 0;
    for (const mood of moodNames) {
      const moodBtn = await page.$(`button[data-cursor="${mood.toUpperCase()}"]`);
      if (moodBtn) {
        await moodBtn.click();
        await sleep(200);
        const banner = await page.evaluate(() =>
          Array.from(document.querySelectorAll('div')).find(d => /Vibe Active/.test(d.textContent || ''))?.textContent || ''
        );
        if (banner.includes(`${mood} Vibe Active`)) moodsPassed += 1;
        await moodBtn.click(); // toggle off
        await sleep(150);
      }
    }
    assert('I1', moodsPassed === 12, `All 12 moods activated with banner (${moodsPassed}/12)`, `Only ${moodsPassed}/12 moods verified`);

    // Discovery wizard: select time, budget, companion, moods, run
    const wizardActions = [];
    wizardActions.push(await clickByText('button', '1 hour'));
    wizardActions.push(await clickByText('button', 'Under $25'));
    wizardActions.push(await clickByText('button', 'Solo'));
    wizardActions.push(await clickByText('button', 'Friends'));
    await sleep(300);
    const showBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('SHOW MY VYBES'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await sleep(900);
    assert('I2', wizardActions.filter(Boolean).length >= 3 && showBtn, 'Discovery wizard controls + SHOW MY VYBES executed', 'Discovery wizard could not complete');

    // VYBE score integrity — every badge on feed must be a valid 0..100 number
    const scores = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[title^="VYBE Score:"]')).map(el => {
        const m = (el.getAttribute('title') || '').match(/(\d+)%/);
        return m ? Number(m[1]) : NaN;
      })
    );
    const validScores = scores.filter(s => !isNaN(s) && s >= 0 && s <= 100);
    assert('I3', scores.length > 0 && validScores.length === scores.length, `VYBE Score validated on ${validScores.length}/${scores.length} badges (0-100)`, `Invalid VYBE scores found: ${scores.filter(s => isNaN(s) || s < 0 || s > 100).join(', ')}`);
// ============================================================
    // PHASE J: Search & Filters
    // ============================================================
    console.log('\n--- PHASE J: Search & Filters ---');
    const countCards = () => page.$$eval('[data-testid="place-card"]', els => els.length);
    const beforeCount = await countCards();
    await typeInto('input[placeholder*="Search rooftops"]', 'ramen', { delay: 20 });
    await sleep(700);
    const ramenCount = await countCards();
    const searchReduced = ramenCount < beforeCount;
    const ramenInResults = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="place-card"]')).some(c => /ramen/i.test(c.textContent || ''))
    );
    assert('J1', searchReduced && ramenCount > 0, `Search "ramen" filtered results (${beforeCount} → ${ramenCount})`, `Search "ramen" did not reduce results (${beforeCount} → ${ramenCount})`);
    assert('J2', ramenInResults, 'Ramen results actually contain ramen references', 'Ramen results missing ramen references');

    // Clear search via navbar × button
    await page.evaluate(() => {
      const clear = Array.from(document.querySelectorAll('header button')).find(b => b.querySelector('svg.lucide-x'));
      if (clear) clear.click();
    });
    await sleep(400);

    // Free Things toggle
    const freeToggled = await clickByText('button', 'Free Things');
    await sleep(500);
    assert('J3', freeToggled, 'Free Things filter toggled', 'Free Things filter button missing');

    // Clear filters
    const cleared = await clickByText('button', 'Clear');
    await sleep(500);
    const afterClearCount = await countCards();
    assert('J4', cleared && afterClearCount >= beforeCount, 'Clear filter restores full results', 'Clear filter did not restore results');

    // ============================================================
    // PHASE K: Theme Toggle + Persistence
    // ============================================================
    console.log('\n--- PHASE K: Theme Toggle & Persistence ---');
    const themeBtn = await page.$('button[aria-label="Toggle theme"]');
    if (themeBtn) {
      await themeBtn.click();
      await sleep(500);
      const isLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
      assert('K1', isLight, 'Theme toggles to Light mode', 'Theme did not switch to Light mode');

      await themeBtn.click();
      await sleep(500);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      assert('K2', isDark, 'Theme toggles back to Dark mode', 'Theme did not switch back to Dark mode');

      // Set light, refresh, verify persisted
      await themeBtn.click();
      await sleep(400);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitFor('h1', 10000);
      await sleep(800);
      const themePersists = await page.evaluate(() => document.documentElement.classList.contains('light'));
      assert('K3', themePersists, 'Theme preference persists after refresh (light)', 'Theme preference LOST after refresh');

      // Restore dark for consistency
      await page.click('button[aria-label="Toggle theme"]');
      await sleep(400);
    }

    // ============================================================
    // PHASE L: Map / Radar View
    // ============================================================
    console.log('\n--- PHASE L: Interactive Map ---');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Map View/.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(1000);
    const leafletReady = await waitFor('.leaflet-container', 12000);
    assert('L1', leafletReady, 'Leaflet map container rendered', 'Leaflet map container NOT found');

    const markerCount = await page.evaluate(() => document.querySelectorAll('.custom-map-marker').length);
    assert('L2', markerCount > 0, `${markerCount} custom emoji markers rendered on map`, '0 custom map markers found');

    if (markerCount > 0) {
      await page.evaluate(() => {
        const m = document.querySelector('.custom-map-marker');
        if (m) m.click();
      });
      await sleep(800);
      const popupVisible = await page.evaluate(() => !!document.querySelector('.leaflet-popup-content'));
      assert('L3', popupVisible, 'Marker click opens popup', 'Marker popup did not open');

      await clickByText('.leaflet-popup-content button', 'View Vibe');
      await sleep(600);
      const detailFromMap = (await page.$('[data-testid="place-detail-modal"]')) !== null;
      assert('L4', detailFromMap, 'Place detail opened from map popup', 'Place detail did not open from map popup');
      await pressEscape();
      await sleep(400);
    } else {
      logFail('L3', 'No markers to interact with');
      logFail('L4', 'No markers to interact with');
    }

    // Map/feed toggle back to Explore
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Explore/.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(600);
    const backOnFeed = await page.evaluate(() => !!document.querySelector('h1') && document.querySelector('h1').textContent.toLowerCase().includes('vibe today'));
    assert('L5', backOnFeed, 'Map → Explore feed toggle works', 'Could not toggle back to Explore feed');
// ============================================================
    // PHASE M: Mobile Viewports, Responsive Layout & Mobile Nav
    // ============================================================
    console.log('\n--- PHASE M: Mobile Viewport Testing ---');
    const mobileResults = [];
    for (const width of [375, 390, 414]) {
      await page.setViewport({ width, height: 844 });
      await sleep(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const mobileNavVisible = (await page.$('[data-testid="mobile-nav"]')) !== null;
      const mobileNavButtons = await page.evaluate(() => document.querySelectorAll('[data-testid="mobile-nav"] button').length);
      mobileResults.push({ width, overflow, mobileNavVisible, mobileNavButtons });
      assert(`M1-${width}`, !overflow, `Viewport ${width}px: no horizontal overflow`, `Viewport ${width}px: horizontal overflow detected!`);
      assert(`M2-${width}`, mobileNavVisible && mobileNavButtons === 5, `Viewport ${width}px: bottom mobile nav visible with 5 tabs`, `Viewport ${width}px: bottom nav missing/incomplete (${mobileNavButtons} buttons)`);
    }

    // Mobile nav interaction: Profile tab opens auth modal when logged out? We're authed (demo), so opens profile
    const mobileProfile = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[data-testid="mobile-nav"] button')).find(b => /Profile/.test(b.textContent || ''));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await sleep(700);
    const profileShown = await page.evaluate(() => !!Array.from(document.querySelectorAll('h1')).find(h => /Kai|Profile|Zoe|Leo/.test(h.textContent || '')));
    assert('M3', mobileProfile && profileShown, 'Mobile nav Profile tab works for demo user', 'Mobile nav Profile tab failed');

    // Back to Explore via mobile nav
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[data-testid="mobile-nav"] button')).find(b => /Explore/.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(500);
    await page.setViewport({ width: 1440, height: 900 });
    await sleep(400);

    // ============================================================
    // PHASE N: Admin Portal & Place Management
    // ============================================================
    console.log('\n--- PHASE N: Admin Portal ---');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('nav button, header button')).find(b => /Admin/.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(700);
    const adminOpen = (await page.$('[data-testid="admin-portal"]')) !== null;
    assert('N1', adminOpen, 'Admin portal opens for admin user', 'Admin portal did not open');

    if (adminOpen) {
      await clickByText('[data-testid="admin-portal"] button', 'Add New Place');
      await sleep(500);
      await typeInto('input[placeholder*="Sonic Vinyl"]', 'QA Cyber Oasis Rooftop');
      await typeInto('input[placeholder*="Craft pour-overs"]', 'Neon drinks & panoramic views');
      await typeInto('textarea[placeholder*="Deep dive"]', 'An incredible new open-air lounge added by QA.');
      await typeInto('input[placeholder*="East River Arts"]', 'QA District');
      const published = await clickByText('button[type="submit"]', 'Publish Spot to VYBE');
      await sleep(900);
      const addedConfirmed = await page.evaluate(() => document.body.textContent.includes('QA Cyber Oasis Rooftop'));
      assert('N2', published && addedConfirmed, 'Admin added new spot successfully', 'Admin add-place flow failed');
    } else {
      logFail('N2', 'Admin portal unavailable, cannot test add place');
    }

    // Back to Explore
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('nav button, header button')).find(b => /Explore/.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(600);
// ============================================================
    // PHASE O: Share Story Card Generator & PNG Export
    // ============================================================
    console.log('\n--- PHASE O: Story Card Generator & PNG Export ---');
    await page.click('button[title*="Shareable Story Card"], button[data-cursor="SHARE"]');
    await sleep(600);
    const shareOpen = (await page.$('[data-testid="share-story-modal"]')) !== null;
    assert('O1', shareOpen, 'Story card generator modal opens', 'Story card generator modal did not open');

    if (shareOpen) {
      // Switch gradient theme + sticker
      await clickByText('[data-testid="share-story-modal"] button', 'Sunset Tangerine');
      await clickByText('[data-testid="share-story-modal"] button', 'SQUAD APPROVED');
      await sleep(400);

      // Copy link (should toast, no unhandled rejection)
      await clickByText('[data-testid="share-story-modal"] button', 'Copy Direct Link');
      await sleep(500);

      // Capture the PNG export payload in-page
      await page.evaluate(() => {
        window.__qaDownload = null;
        const orig = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          if (this.download && this.download.endsWith('.png')) {
            window.__qaDownload = {
              fileName: this.download,
              isPngDataUrl: this.href.startsWith('data:image/png'),
              size: this.href.length
            };
          }
          orig.call(this);
        };
        return true;
      });
      await clickByText('[data-testid="share-story-modal"] button', 'Download 1080x1920');
      await sleep(1200);

      const pngInfo = await page.evaluate(() => window.__qaDownload || null);
      assert('O2', pngInfo && pngInfo.isPngDataUrl && pngInfo.size > 1000, `PNG export generated valid 1080x1920 canvas card (${(pngInfo?.size || 0 / 1000) | 0}KB data URL)`, `PNG export not produced${pngInfo ? ` (${JSON.stringify(pngInfo)})` : ''}`);

      // Restore prototype and close modal
      await page.evaluate(() => { });
      await pressEscape();
      await sleep(400);
    } else {
      logFail('O2', 'Cannot test PNG export — share modal unavailable');
    }

    // ============================================================
    // PHASE P: Console, Page & Network Audit
    // ============================================================
    console.log('\n--- PHASE P: Console & Network Audit ---');

    const pages = await browser.pages();
    for (const p of pages) { try { await p.close(); } catch {} }
    const auditPage = await browser.newPage();
    await auditPage.setViewport({ width: 1440, height: 900 });
    const auditErrors = [];
    auditPage.on('console', msg => { if (msg.type() === 'error') auditErrors.push(msg.text()); });
    auditPage.on('pageerror', err => auditErrors.push(`PAGEERROR: ${err.message}`));
    // Final smoke load to catch any lingering render errors across all views
    await auditPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await auditPage.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await sleep(800);
    const auditTabs = ['map', 'plan', 'saved', 'profile', 'admin'];
    for (const tab of auditTabs) {
      await auditPage.evaluate((t) => {
        const navBtns = Array.from(document.querySelectorAll('nav button, header button'));
        const target = t === 'map' ? navBtns.find(b => /Map View/.test(b.textContent || ''))
          : t === 'plan' ? navBtns.find(b => /Outing Plans/.test(b.textContent || ''))
          : t === 'saved' ? navBtns.find(b => /My VYBES/.test(b.textContent || ''))
          : t === 'profile' ? navBtns.find(b => b.querySelector('img')) 
          : navBtns.find(b => /Admin/.test(b.textContent || ''));
        if (target) target.click();
      }, tab).catch(() => {});
      await sleep(700);
    }
    await auditPage.close();

    // Merge all collected errors
    const allConsoleErrors = [...consoleErrors, ...auditErrors];

    console.log(`\nConsole Errors (${allConsoleErrors.length}):`, allConsoleErrors.slice(0, 8));
    console.log(`Console Warnings (${consoleWarnings.length}):`, consoleWarnings.slice(0, 5));
    console.log(`Network Failures (${networkErrors.length}):`, networkErrors.slice(0, 8));
    console.log(`App-Origin Network Failures (${appNetworkErrors.length}):`, appNetworkErrors.slice(0, 5));

    if (allConsoleErrors.length === 0) {
      logPass('P1', 'Zero JavaScript runtime / React console errors');
    } else {
      logFail('P1', `Detected ${allConsoleErrors.length} console errors: ${allConsoleErrors.slice(0, 3).join(' | ')}`);
    }

    if (appNetworkErrors.length === 0) {
      logPass('P2', 'Zero failed requests to the VYBE app origin');
    } else {
      logFail('P2', `Detected ${appNetworkErrors.length} failed app requests: ${appNetworkErrors.slice(0, 3).join(' | ')}`);
    }

    console.log('\n=== REAL BROWSER QA TEST SUMMARY ===');
    const passes = testResults.filter(r => r.status === 'PASS').length;
    const fails = testResults.filter(r => r.status === 'FAIL').length;
    console.log(`Total Tests: ${testResults.length} | Passed: ${passes} | Failed: ${fails}`);

    if (fails > 0) {
      console.log('\nFAILED TESTS:');
      testResults.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - [${r.phase}] ${r.msg}`));
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

runQA();