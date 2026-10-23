const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {createServer}=require('./serve.cjs');
(async()=>{const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;try{for(const name of ['chromium','webkit']){
const browser=await(name==='chromium'?chromium:webkit).launch(name==='chromium'?{channel:'msedge'}:{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const fill=CanvasRenderingContext2D.prototype.fillText;window.textTiming={time:0,calls:0,fractional:0};CanvasRenderingContext2D.prototype.fillText=function(...args){const start=performance.now(),out=fill.apply(this,args);if(this.canvas.className==='lyric-rest'){textTiming.time+=performance.now()-start;textTiming.calls++;if(args[1]!==Math.round(args[1]))textTiming.fractional++;}return out;};});
await page.goto(base+'/');await page.waitForFunction(()=>window.siteTextBackground&&document.documentElement.classList.contains('entrance-complete'));await page.evaluate(()=>stopHeadingCycle());
const before=await page.evaluate(()=>({at:performance.now(),...siteTextBackground.diagnostics()}));await page.waitForTimeout(2500);const after=await page.evaluate(()=>({at:performance.now(),...siteTextBackground.diagnostics(),timing:textTiming}));
assert.equal(after.stripBuilds,before.stripBuilds);assert.equal(after.pending,false);console.log(name+': background remains stationary');
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!siteTextBackground.diagnostics().pending);
await page.goto(base+'/credits/');await page.locator('html.entrance-complete').waitFor();
assert.equal(await page.locator('.credits-songs').getAttribute('open'),null);assert.equal(await page.locator('.credits-songs li').count(),19);
const link=page.locator('.reference-copy a').first();await link.hover();await page.waitForTimeout(300);assert.equal(await link.evaluate(el=>getComputedStyle(el).color),'rgb(255, 191, 120)');
await page.screenshot({path:'.preview-refresh/credits-polished-'+name+'.png',fullPage:true});
await page.locator('.credits-songs summary').click();assert(await page.locator('.credits-songs ol').isVisible());
await page.locator('.credits-songs summary').focus();await page.keyboard.press('Enter');assert(!(await page.locator('.credits-songs ol').isVisible()));
for(const width of [320,390,768,901,1100,1440,1920]){
await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
const changed=await page.locator('.site-footer').evaluate(el=>({height:el.offsetHeight,logo:el.querySelector('.brand-crop').getBoundingClientRect().toJSON()}));
const original=await page.addStyleTag({content:'.footer-brand .brand-crop{transform:translateZ(0) scale(1.18)!important}@media(max-width:900px){.footer-brand .brand-crop{transform:translateZ(0) scale(1.06)!important}}'});
const old=await page.locator('.site-footer').evaluate(el=>({height:el.offsetHeight,logo:el.querySelector('.brand-crop').getBoundingClientRect().width}));await original.evaluate(el=>el.remove());
assert.equal(changed.height,old.height);assert(changed.logo.width>old.logo);assert(changed.logo.left>=0&&changed.logo.right<=width);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.locator('.credits-songs summary').click();await page.screenshot({path:'.preview-refresh/credits-polished-mobile-'+name+'.png',fullPage:true});
assert.deepEqual(errors,[]);console.log(name+': Credits disclosure/hover/mobile, footer size, stationary background and reduced motion passed');await browser.close();
}}finally{await new Promise(resolve=>server.close(resolve));}})().catch(e=>{console.error(e);process.exit(1)});
