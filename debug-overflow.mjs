import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=375,844', '--disable-dev-shm-usage']
});

const page = await browser.newPage();
await page.setViewport({ width: 375, height: 844 });

// Navigate to homepage
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));

const overflow = await page.evaluate(() => {
  const scrollWidth = document.documentElement.scrollWidth;
  const clientWidth = window.innerWidth;
  const overflowAmount = scrollWidth - clientWidth;
  
  const offenders = [];
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const rect = el.getBoundingClientRect();
    const rightEdge = rect.right;
    const leftEdge = rect.left;
    
    if (rightEdge > clientWidth + 1) {
      const tag = el.tagName;
      const cls = el.className;
      const id = el.id;
      offenders.push({
        tag,
        class: cls,
        id,
        rightEdge: Math.round(rightEdge),
        leftEdge: Math.round(leftEdge),
        width: Math.round(rect.width),
        overflowBy: Math.round(rightEdge - clientWidth),
        computedPosition: el.style.position || 'static',
        isFixed: getComputedStyle(el).position === 'fixed',
        isAbsolute: getComputedStyle(el).position === 'absolute',
      });
    }
  }
  
  return {
    scrollWidth,
    clientWidth,
    overflowAmount,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 15)
  };
});

console.log('=== OVERFLOW DEBUG (375px homepage, unauthenticated) ===');
console.log(JSON.stringify(overflow, null, 2));

await browser.close();
console.log('Done');
