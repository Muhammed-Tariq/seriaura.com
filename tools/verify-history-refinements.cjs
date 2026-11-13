const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require('playwright');const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{for(const [name,engine,options] of [['edge',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){if(this.classList.contains('lyric-word-mask'))window.testWordMask=this;return get.apply(this,args);};});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/');await page.evaluate(()=>window.siteReady);await page.locator('html.entrance-complete').waitFor();
   const trigger=page.locator('.history-trigger'),menu=page.locator('#now-archive');
   assert.equal(await page.locator('#opening-sentence').textContent(),"There's an inevitable gap between who I am and how I describe myself.");
   assert.equal(await page.evaluate(()=>NowArchive.selected()),'2026-11');
   assert((await page.locator('#now-copy').textContent()).includes("slept over at Cambridge in a place I definitely wasn't allowed to"));
   assert((await page.locator('#now-copy').textContent()).includes('constitutional classifiers for the Impact First residency.'));
   for(const width of [320,390,768,1440,1920]){
    await page.setViewportSize({width,height:1000});await trigger.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
    const geometry=await page.evaluate(()=>{const copy=document.querySelector('#now-copy').getBoundingClientRect(),parent=document.querySelector('#intro-copy').getBoundingClientRect(),brace=document.querySelector('.history-brace').getBoundingClientRect(),clock=document.querySelector('.history-clock').getBoundingClientRect();return {fullWidth:Math.abs(copy.width-parent.width)<1,braceOutside:brace.left>=copy.right,clockOutside:clock.left>=copy.right,clockFits:clock.right<=innerWidth,braceFits:Math.abs(brace.height-copy.height)<2,overflow:document.documentElement.scrollWidth>innerWidth};});
    if(width<=1100)assert(geometry.fullWidth&&geometry.clockFits&&!geometry.overflow);else assert.deepEqual(geometry,{fullWidth:true,braceOutside:true,clockOutside:true,clockFits:true,braceFits:true,overflow:false},'margin geometry '+width);
    assert.equal(await trigger.evaluate(el=>getComputedStyle(el).color),'rgb(241, 240, 237)');
    await trigger.click();await page.getByRole('menuitemradio',{name:/October 2026/}).waitFor();
    const buttonBox=await trigger.boundingBox(),menuBox=await menu.boundingBox();
    assert((width<=1100||menuBox.width<=240)&&menuBox.height<250&&menuBox.x>=0&&menuBox.x+menuBox.width<=width);
    if(width>=1440)assert(menuBox.x>buttonBox.x+buttonBox.width,'picker opens to the right');
    assert.equal(await page.locator('dialog:modal').count(),0);
    assert.deepEqual(await page.locator('.history-version').evaluateAll(els=>els.map(el=>el.dataset.month)),['2026-11','2026-10']);
    const grid=await menu.evaluate(el=>({rule:getComputedStyle(el,'::before').backgroundColor,shade:getComputedStyle(el,'::after').maskImage,rowRule:getComputedStyle(el.querySelector('.history-version'),'::after').backgroundImage,hover:getComputedStyle(el.querySelector('.history-version'),'::before').transitionProperty}));
    assert(grid.rule==='rgb(101, 97, 90)'&&grid.shade.includes('linear-gradient')&&grid.rowRule.includes('linear-gradient')&&grid.hover==='none');
    if([390,1440].includes(width))await page.screenshot({path:'.preview-refresh/history-picker-'+name+'-'+width+'.png'});
    await page.getByRole('menuitemradio',{name:/October 2026/}).click();assert(await menu.isVisible());
    await page.waitForFunction(()=>document.querySelector('#now-copy').textContent.includes('Hammersmith Apollo'));
    assert.equal(await trigger.getAttribute('aria-expanded'),'true');
    await page.mouse.click(10,400);assert(await menu.isVisible(),'outside click keeps the archive open');
    assert.equal(await page.getByRole('menuitemradio',{name:/October 2026/}).getAttribute('aria-checked'),'true');
    await page.getByRole('menuitemradio',{name:/November 2026/}).click();assert(await menu.isVisible());
    await page.waitForFunction(()=>document.querySelector('#now-copy').textContent.includes('constitutional classifiers'));
    await trigger.click();await menu.waitFor({state:'hidden'});
   }
   await page.setViewportSize({width:1440,height:1000});await trigger.scrollIntoViewIfNeeded();
   await trigger.click();await menu.waitFor({state:'visible'});await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert(await menu.isVisible());
   assert.equal(await page.evaluate(()=>NowArchive.selected()),'2026-10');
   await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert(await trigger.evaluate(el=>el===document.activeElement));
   await page.mouse.click(10,400);await page.mouse.move(0,0);await page.emulateMedia({reducedMotion:'no-preference'});
   await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-06T12:00:01Z'));await trigger.hover();
   const resting=()=>page.locator('.history-minute').evaluate(el=>getComputedStyle(el).transform);const first=await resting();
   await page.clock.runFor(2500);assert.equal(await resting(),first);
   assert.equal(await page.locator('.history-clock').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
   await page.mouse.move(0,0);await page.clock.runFor(2000);assert.equal(await resting(),first);
   await page.emulateMedia({reducedMotion:'reduce'});await trigger.hover();await page.clock.runFor(2000);assert.equal(await resting(),first);
   // The bracket's stroke is included in the same canvas mask as the prose.
   await page.evaluate(()=>{siteTextBackground.show();dispatchEvent(new Event('readingartchange'));});await page.clock.runFor(100);
   const halo=await page.evaluate(()=>{const path=document.querySelector('.history-brace path'),p=path.getPointAtLength(30),screen=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM()),main=document.querySelector('main').getBoundingClientRect(),d=siteTextBackground.diagnostics();return testWordMask.getContext('2d').getImageData(Math.round(screen.x-main.left),Math.round(screen.y-main.top-Math.floor(d.stripTop)),1,1).data[3];});
   assert(halo>220,'brace has the text-art ink protection mask');
   const inline=page.locator('#intro-copy a[href="writings/why-im-an-atheist/"]');
   assert.equal(await inline.getAttribute('data-link-kind'),'hyperlink');assert.equal(await inline.locator('.subpage-indicator').count(),1);
   assert.equal(await inline.evaluate(el=>getComputedStyle(el).color),'rgb(255, 139, 25)');
   assert.equal(await page.locator('.sidebar nav a .subpage-indicator').count(),0);
   assert.notEqual(await page.locator('.sidebar nav a').last().evaluate(el=>getComputedStyle(el).color),'rgb(255, 139, 25)');
   assert.equal(await page.locator('#intro-copy a[href^="https:"] .subpage-indicator').count(),0);
   await page.emulateMedia({reducedMotion:'no-preference'});await inline.hover();assert.equal(await inline.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'subpage-arrow-nudge');
   await page.emulateMedia({reducedMotion:'reduce'});
   for(const width of [390,768,1440,1920]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/brand-guidelines/');await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(100);
    assert.equal(await page.locator('.lyric-field,.brand-intro').count(),0);
    const layout=await page.evaluate(()=>{const h=document.querySelector('#preface h1').getBoundingClientRect(),rail=document.querySelector('.manual-rail').getBoundingClientRect(),copy=document.querySelector('.preface-copy').getBoundingClientRect();return {headingTop:h.top,aligned:Math.abs(rail.top+rail.height/2-innerHeight/2)<12,noOverlap:rail.right<copy.left,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert(layout.headingTop<240&&!layout.overflow,JSON.stringify(layout));if(width>1100)assert(layout.aligned&&layout.noOverlap,JSON.stringify(layout));
    if(width<=1100){await page.locator('.manual-rail .menu-toggle').click();await page.locator('#guideline-navigation a[href="#naming"]').click();await page.clock.runFor(800);assert.equal(await page.locator('#guideline-navigation a[href="#naming"]').getAttribute('aria-current'),'location');}
    await page.goto(base+'/brand-guidelines/');await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(100);
    await page.screenshot({path:'.preview-refresh/brand-layout-'+name+'-'+width+'.png'});
   }
   assert.deepEqual(errors,[]);console.log(name+': full-width history, anchored month picker, stationary hover, glow protection, link hierarchy/arrows and brand layout passed');
  }finally{await browser.close();}
 }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
