/**
 * CERT quota watcher — waits for the Google Places daily quota reset
 * (midnight Pacific = 07:00 UTC), then immediately runs the two remaining
 * live gates with the existing CERT scripts:
 *   Gate 1: scripts/cert-flow-f-live.mjs  (Search A -> B -> Map -> Back -> Details)
 *   Gate 2: scripts/cert-map-probe.mjs    (rendered photo chain + place identity)
 *
 * Scratch orchestrator only — contains no application code and is not tracked.
 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PROD = 'https://neww-dun-chi.vercel.app/';
const LOG = '.freebuff/quota-watcher.log';
const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = candidates.find(p => fs.existsSync(p));
const append = line => fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${line}\n`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

/** Minimal probe: load prod once (fires the app's own single searchNearby) and report whether Google discovery succeeded. */
async function quotaProbe() {
  const page = await browser.newPage();
  try {
    let googleBlocked = false;
    page.on('console', msg => {
      const t = msg.text();
      if (/RESOURCE_EXHAUSTED|rate limit|429/.test(t)) googleBlocked = true;
    });
    page.on('response', r => { if (r.status() === 429) googleBlocked = true; });
    await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for the app's initial discovery to resolve (cards appear OR blocked signal seen).
    for (let i = 0; i < 14; i++) {
      await sleep(4000);
      const cards = await page.$$eval('[data-testid="place-card"]', els => els.length).catch(() => 0);
      if (cards > 0 && !googleBlocked) return { blocked: false, cards };
      if (googleBlocked && i > 8) break;
    }
    return { blocked: googleBlocked, cards: 0 };
  } catch (e) {
    return { blocked: true, error: String(e?.message || e).slice(0, 120) };
  } finally {
    await page.close().catch(() => {});
  }
}

function runScript(cmd, args, outLog) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { shell: true, env: { ...process.env, CERT_OUTPUT_DIR: '.freebuff/flow-f-final' } });
    const out = fs.openSync(outLog, 'a');
    child.stdout.on('data', d => fs.writeSync(out, d));
    child.stderr.on('data', d => fs.writeSync(out, d));
    child.on('close', code => { fs.closeSync(out); resolve(code); });
  });
}

try {
  append(`watcher started (reset expected 07:00 UTC; hard deadline 07:45 UTC)`);
  const deadline = Date.now() + 7.5 * 3600 * 1000; // absolute safety cap
  const resetMs = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 7, 5, 0);
  let detected = null;
  while (Date.now() < deadline) {
    const now = Date.now();
    const waitMs = now < resetMs - 25 * 60 * 1000 ? 15 * 60 * 1000 : 4 * 60 * 1000; // tight cadence near reset
    if (now < resetMs - waitMs / 2) {
      await sleep(Math.min(waitMs, resetMs - now));
      continue;
    }
    const r = await quotaProbe();
    append(`probe: ${JSON.stringify(r)}`);
    if (!r.blocked && r.cards > 0) { detected = { at: new Date().toISOString(), ...r }; break; }
    await sleep(4 * 60 * 1000);
  }
  if (!detected) {
    append('RESULT: quota never recovered before deadline — gates remain BLOCKED-EXTERNAL');
    fs.writeFileSync('.freebuff/quota-status.json', JSON.stringify({ resetDetected: false, at: new Date().toISOString() }, null, 2));
    process.exit(0);
  }
  append(`RESULT: quota reset detected at ${detected.at} (cards=${detected.cards}) — running gates`);
  fs.writeFileSync('.freebuff/quota-status.json', JSON.stringify({ resetDetected: true, ...detected }, null, 2));

  // Gate 1: Flow F live
  append('running Gate 1: cert-flow-f-live.mjs');
  const code1 = await runScript('node', ['scripts/cert-flow-f-live.mjs'], '.freebuff/gate1-flow-f.log');
  append(`Gate 1 exit code: ${code1}`);

  // Small cooldown so the two gates do not collide inside Google's per-minute limits.
  await sleep(90 * 1000);

  // Gate 2: rendered photo chain + identity
  append('running Gate 2: cert-map-probe.mjs');
  const code2 = await runScript('node', ['scripts/cert-map-probe.mjs'], '.freebuff/gate2-photo.log');
  append(`Gate 2 exit code: ${code2}`);

  append('ALL GATES COMPLETE');
} catch (e) {
  append(`watcher crashed: ${String(e?.stack || e).slice(0, 400)}`);
} finally {
  await browser.close().catch(() => {});
}
