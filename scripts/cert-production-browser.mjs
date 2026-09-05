import puppeteer from 'puppeteer-core';

const url=process.env.VYBE_PRODUCTION_URL||'https://neww-dun-chi.vercel.app/';
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const fs=await import('node:fs');const executablePath=chromeCandidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on CI runner.');
const browser=await puppeteer.launch({headless:'new',executablePath,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage();page.setDefaultTimeout(20000);const consoleErrors=[];const runtimeErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});page.on('pageerror',e=>runtimeErrors.push(String(e?.message||e)));const failedRequests=[];page.on('requestfailed',r=>failedRequests.push(`${r.url()} :: ${r.failure()?.errorText||'failed'}`));await page.goto(url,{waitUntil:'networkidle2',timeout:60000});await page.waitForSelector('body');
const shell=await page.evaluate(()=>({title:document.title,url:location.href,text:(document.body?.innerText||'').slice(0,5000),inputs:[...document.querySelectorAll('input,textarea')].map((e:any)=>({placeholder:e.placeholder||'',aria:e.getAttribute('aria-label')||''})),cards:document.querySelectorAll('[data-testid="place-card"]').length}));
if(!shell.text.trim())throw new Error('Production page rendered no text.');
const queries=['restaurant','cafe','games','entertainment','hotel'];
const queryResults=[];
for(const q of queries){const input=await page.$('input[placeholder],textarea[placeholder],input[aria-label],textarea[aria-label]');if(!input){queryResults.push({query:q,cards:await page.$$eval('[data-testid="place-card"]',els=>els.length),mode:'no-search-input'});continue;}await input.click({clickCount:3});await input.type(q);await input.press('Enter');await new Promise(r=>setTimeout(r,4000));const result=await page.evaluate((query)=>({query,cards:[...document.querySelectorAll('[data-testid="place-card"]')].map((el:any)=>({name:el.querySelector('h3')?.textContent?.trim()||'',verified:el.innerText.includes('Google verified'),images:[...el.querySelectorAll('img')].map((i:any)=>i.currentSrc||i.src).filter(Boolean)})),body:(document.body?.innerText||'').slice(0,4000)}),q);queryResults.push(result);}
const cards=await page.$$('[data-testid="place-card"]');const googleVerified=await page.$$eval('[data-testid="place-card"]',els=>els.filter((el:any)=>el.innerText.includes('Google verified')).length);
console.log(JSON.stringify({productionUrl:url,title:shell.title,initialCardCount:shell.cards,queryResults,googleVerifiedCardCount:googleVerified,consoleErrors,runtimeErrors,failedRequests},null,2));
if(runtimeErrors.length)throw new Error(`Browser page errors: ${runtimeErrors.join(' | ')}`);if(consoleErrors.some(e=>/place|maps|google|photo|api/i.test(e)))throw new Error(`Relevant console errors detected: ${consoleErrors.join(' | ')}`);if(failedRequests.some(e=>/googleapis|places.googleapis|supabase/i.test(e)))throw new Error(`Relevant request failures detected: ${failedRequests.join(' | ')}`);if(!cards.length&&shell.cards===0)throw new Error('No place cards rendered in production browser.');
}finally{await browser.close();}
