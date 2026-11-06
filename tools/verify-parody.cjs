const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const [name,engine,options]of[['edge',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   await page.goto(base+'/brand-guidelines/');await page.evaluate(()=>document.fonts.ready);
   const parody=page.locator('.parody');
   assert.equal(await parody.locator('.example-art > *').count(),0,'Why stays empty');
   assert.equal(await parody.getAttribute('role'),null,'Empty example is not interactive');
   const seek=async(locator,time)=>locator.evaluate((e,time)=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=time;}),time);
   for(const kind of['missing-hearts','cut-aura']){
    const figure=page.locator('.'+kind);await figure.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
    assert.equal(await figure.locator('.rebuild-heart').count(),7);
    assert.equal(await figure.locator('.new-heart').count(),kind==='missing-hearts'?7:4);
    await figure.hover();await seek(figure,180);
    const hearts=await figure.locator('.new-heart').evaluateAll(parts=>parts.map(e=>parseFloat(getComputedStyle(e).opacity)));
    assert(hearts.some(value=>value>0)&&hearts.some(value=>value===0),'Hearts appear independently');
    assert.equal(await figure.locator('.rebuild-word').evaluate(e=>getComputedStyle(e).opacity),'1','Existing lettering never fades');
    if(kind==='cut-aura'){
     const letters=await figure.locator('.typed-glyph').evaluateAll(parts=>parts.map(e=>parseFloat(getComputedStyle(e).opacity)));
     assert(letters[0]>0&&letters[1]===0&&letters[2]===0,'Letters type in sequentially');
    }
    await figure.screenshot({path:`.preview-refresh/pop-${kind}-180-${name}.png`});
    await seek(figure,600);
    assert(await figure.locator('.rebuild-heart,.typed-glyph').evaluateAll(parts=>parts.every(e=>getComputedStyle(e).opacity==='1')));
    await figure.screenshot({path:`.preview-refresh/pop-${kind}-complete-${name}.png`});await page.mouse.move(0,0);
   }
   await page.emulateMedia({reducedMotion:'reduce'});
   for(const [width,height] of[[1440,1000],[390,844],[320,844],[1920,1080],[844,390]]){
    await page.setViewportSize({width,height});await page.locator('.bard-email').click();
    await page.waitForFunction(()=>document.querySelector('#bard-warning').dataset.pulse==='on');
    const panel=await page.locator('.warning-panel').boundingBox();
    assert(Math.abs(panel.width-width*.88)<.1,'Width follows only viewport width');
    assert(Math.abs(panel.height-Math.max(145,height*.33))<.1,'Height follows only viewport height');
    assert(panel.x>=0&&panel.x+panel.width<=width&&panel.y>=0&&panel.y+panel.height<=height);
    const heading=await page.locator('.warning-content h2').evaluate(e=>({size:parseFloat(getComputedStyle(e).fontSize),select:getComputedStyle(e).userSelect||getComputedStyle(e).webkitUserSelect}));
    assert(Math.abs(heading.size-Math.min(panel.width*(width<=650?.09:.06),panel.height*(width<=650?.15:.22)))<.2,'Type fits panel dimensions');assert.equal(heading.select,'none');
    await page.screenshot({path:`.preview-refresh/scaled-warning-${width}-${name}.png`});
    await page.waitForFunction(()=>{const a=document.querySelector('.warning-audio');return !a.paused&&a.currentTime>.03;});
    assert.match(await page.locator('.warning-audio').getAttribute('src'),/missile-alert-original-light\.wav$/);await page.mouse.click(5,5);
   }
   assert.deepEqual(errors,[]);console.log(name+': empty Why frame, staggered hearts/typing, taller warning dimensions and original audio passed');
  }finally{await browser.close();}
 }}finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
