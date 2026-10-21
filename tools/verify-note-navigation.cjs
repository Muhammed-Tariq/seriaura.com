const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const [name,engine,options] of [['chromium',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const width of [1920,1440,390]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/writings/why-im-an-atheist/');await page.locator('html.entrance-complete').waitFor();
    assert.equal(await page.locator('.blog-back').count(),0);
    const ref=page.locator('.footnote-trigger').nth(2),note=page.locator('.article-sidenote').nth(2);
    const popup=page.locator('#'+await ref.getAttribute('aria-controls'));
    if(width>=1600){
     await ref.hover();assert.ok(await note.evaluate(el=>el.classList.contains('is-reference-hovered')),'Reference highlights note');
     await note.hover();assert.ok(await ref.evaluate(el=>el.classList.contains('is-note-active')),'Note highlights reference');
     await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement.blur());assert.equal(await ref.evaluate(el=>el.classList.contains('is-note-active')),false);
     await ref.click();assert.equal(await note.locator('.sidenote-number').evaluate(el=>el===document.activeElement),true,'Reference click focuses note number');
     await note.locator('.sidenote-number').click();
    }else{
     await ref.click();await popup.waitFor({state:'visible'});
     assert.equal(await popup.locator('.popup-note-number').evaluate(el=>el===document.activeElement),true,'Reference click reaches popup note');
     assert.ok(await ref.evaluate(el=>el.classList.contains('is-note-active')));
     await popup.locator('.popup-note-number').click();await popup.waitFor({state:'hidden'});
    }
    assert.equal(await ref.evaluate(el=>el===document.activeElement),true,'Note number returns focus to reference');
    const b=await ref.boundingBox();assert.ok(b.y>0&&b.y<900,'Returned reference is visible');
    await page.keyboard.press('Enter');
    const target=width>=1600?note.locator('.sidenote-number'):popup.locator('.popup-note-number');
    assert.equal(await target.evaluate(el=>el===document.activeElement),true,'Keyboard follows the same pair');
    await page.keyboard.press('Enter');assert.equal(await ref.evaluate(el=>el===document.activeElement),true);
    await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'});});
    const header=await page.locator('.post-header').boundingBox(),nav=await page.locator('.sidebar').boundingBox();
    if(width<=1100)assert.ok(header.y>=nav.y+nav.height-2,'Article starts below mobile menu');
    await page.screenshot({path:`.preview-refresh/article-notes-${name}-${width}.png`});
   }
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/brand-guidelines/');await page.locator('html.entrance-complete').waitFor();
    assert.equal(await page.locator('.brand-specimen').count(),19);
    assert.equal(await page.locator('.brand-specimen img[data-image-preview]').count(),0,'Misuse diagrams are not replaced by clean images on click');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.ok(await page.locator('.brand-specimen img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)));
    if([390,1440].includes(width)){
     await page.screenshot({path:`.preview-refresh/brand-manual-${name}-${width}.png`});
     await page.locator('#misuse-title').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
     await page.screenshot({path:`.preview-refresh/brand-misuse-${name}-${width}.png`});
    }
   }
   assert.deepEqual(errors,[]);console.log(name+': reciprocal footnote highlights, two-way mouse/keyboard navigation, article spacing and responsive logo manual passed');
  }finally{await browser.close();}
 }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
