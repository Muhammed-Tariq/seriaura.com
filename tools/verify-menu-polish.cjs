const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require('playwright');const {createServer}=require('./serve.cjs');
(async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{for(const [name,engine,opts] of [['edge',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
 const browser=await engine.launch(opts);try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/?showOptions=1');await page.evaluate(()=>window.siteReady);await page.locator('html.entrance-complete').waitFor();
 const panel=page.locator('#site-options'),settle=()=>panel.evaluate(el=>Promise.allSettled(el.getAnimations().map(a=>a.finished)));
 await settle();assert.match(await panel.evaluate(el=>getComputedStyle(el).fontFamily),/Sentient/);
 assert.match(await panel.locator('output').first().evaluate(el=>getComputedStyle(el).fontFamily),/Space Grotesk/);
 await panel.screenshot({path:'.preview-refresh/options-sentient-'+name+'.png'});
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
  await page.locator('.options-maximize').click();assert(await panel.evaluate(el=>el.getAnimations().length>0));await settle();
  let b=await panel.boundingBox();assert(Math.abs((width>1100?b.width:b.height)-(width>1100?width/2-12:438))<2,JSON.stringify(b));assert(b.x>=0&&b.y>=0&&b.x+b.width<=width);
  await panel.screenshot({path:'.preview-refresh/options-half-'+name+'-'+width+'.png'});
  await page.locator('.options-minimize').click();await panel.waitFor({state:'hidden'});assert(await page.locator('.options-dock').isVisible());
  const dock=await page.locator('.options-dock').boundingBox();assert(dock.height<45&&Math.abs(dock.y+dock.height-900)<1);
  await page.locator('.options-dock').click();await settle();assert(await panel.isVisible());assert(!(await page.locator('.options-dock').isVisible()));
  b=await panel.boundingBox();assert(Math.abs((width>1100?b.width:b.height)-(width>1100?width/2-12:438))<2);
  await page.locator('.options-maximize').click();await settle();assert(!(await panel.evaluate(el=>el.classList.contains('is-maximized'))));
 }
 await page.locator('.options-minimize').click();await page.waitForTimeout(80);await page.locator('.options-dock').click();await settle();assert(await panel.isVisible());
 await page.locator('.options-close').click();await panel.waitFor({state:'hidden'});assert(!(await page.locator('.options-dock').isVisible()));
 // Hands stay still on hover and wind only when the date changes.
 const trigger=page.locator('.history-trigger');await trigger.scrollIntoViewIfNeeded();assert.equal(await page.locator('.history-second').count(),0);
 const resting=await page.locator('.history-minute').evaluate(el=>el.style.transform);await trigger.hover();await page.waitForTimeout(1150);assert.equal(await page.locator('.history-minute').evaluate(el=>el.style.transform),resting);assert.equal(await page.locator('.history-minute').evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length),0);
 await trigger.click();await page.locator('.history-version').first().waitFor();assert.match(await page.locator('.history-menu').evaluate(el=>getComputedStyle(el).fontFamily),/Sentient/);
 await page.screenshot({path:'.preview-refresh/history-sentient-'+name+'.png'});
 await page.locator('.history-version[data-month="2026-10"]').click();assert(await page.locator('.history-hour').evaluate(el=>el.getAnimations().some(a=>a.effect.getTiming().duration===650)));
 await page.waitForFunction(()=>document.querySelector('#now-copy').textContent.includes('Hammersmith Apollo'));
 assert(await page.locator('.history-menu').isVisible());await page.waitForTimeout(350);
 await page.mouse.click(10,400);assert(await page.locator('.history-menu').isVisible());
 const beforeClose=await page.locator('.history-menu').boundingBox();
 await trigger.evaluate(el=>{el.click();const menu=document.querySelector('.history-reveal'),fade=menu.getAnimations()[0];fade.pause();fade.currentTime=150;});
 const closing=await page.locator('.history-reveal').evaluate(el=>({transform:getComputedStyle(el).transform,position:getComputedStyle(el).maskPosition,clip:getComputedStyle(el).maskClip,frames:el.getAnimations()[0].effect.getKeyframes()}));
 assert.equal(closing.transform,'none');assert.notEqual(closing.position,closing.frames[0].maskPosition);assert.notEqual(closing.position,closing.frames.at(-1).maskPosition);
 assert(parseFloat(closing.frames.at(-1).maskPosition)<parseFloat(closing.frames[0].maskPosition));assert.deepEqual(await page.locator('.history-menu').boundingBox(),beforeClose);
 await page.screenshot({path:'.preview-refresh/history-horizontal-close-'+name+'.png'});
 await page.locator('.history-reveal').evaluate(el=>el.getAnimations()[0].play());await page.locator('.history-menu').waitFor({state:'hidden'});
 const link=page.locator('#intro-copy a[href="writings/why-im-an-atheist/"]');assert.equal(await link.locator('svg path').getAttribute('d'),'M2.5 13.5 12 4M4 4h8v8');
 await page.locator('.site-footer').scrollIntoViewIfNeeded();
 for(let i=0;i<3;i++){const colours=await page.locator('.social-links .social-link').evaluateAll(els=>els.map(el=>getComputedStyle(el).color));assert(colours.every(c=>c==='rgb(201, 198, 193)'),colours.join(','));await page.locator('.social-page').click();await page.waitForTimeout(600);}
 await page.goto(base+'/brand-guidelines/');await page.evaluate(()=>document.fonts.ready);
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(550);
 const sizes=await page.locator('.section-heading :is(h1,h2)').evaluateAll(els=>els.map(el=>getComputedStyle(el).fontSize));assert.equal(new Set(sizes).size,1);
 assert.match(await page.locator('.logo-download').evaluate(el=>getComputedStyle(el).fontFamily),/Sentient/);
 if(width>1100){const rail=await page.locator('.manual-rail').boundingBox();assert(Math.abs(rail.y+rail.height/2-500)<3,JSON.stringify(rail));}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'.preview-refresh/brand-restored-'+name+'-'+width+'.png'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>SiteOptions.open());await settle();await page.locator('.options-minimize').click();await panel.waitFor({state:'hidden'});await page.locator('.options-dock').click();await settle();await page.locator('.options-close').click();await panel.waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);console.log(name+': Sentient menus, animated half-screen/minimised/closed states, two clock hands, diagonal arrows, neutral social pages and restored brand sidebar passed');
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
