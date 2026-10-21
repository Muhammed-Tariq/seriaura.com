const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {createServer}=require('../tools/serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const [name,engine,options] of [['chromium',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('html.entrance-complete[data-lyric-ready="true"]').waitFor();
   await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));
   if(name==='chromium'){
    const cdp=await page.context().newCDPSession(page),before=await page.evaluate(()=>scrollY);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:260,y:620}]});
    for(const y of [580,520,450,390]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:220,y}]});await page.waitForTimeout(35);}
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>scrollY)>before+50,'A native drag still scrolls while lighting the text');
    assert.equal(await page.locator('.lyric-field').evaluate(el=>el.classList.contains('is-lit')),true);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(550);
   }
   await page.evaluate(()=>{
    window.testTouch=(type,x,y)=>{
     const target=document.querySelector('main'),touch={identifier:7,target,clientX:x,clientY:y,pageX:x,pageY:y+scrollY};
     const event=new Event(type,{bubbles:true,cancelable:true});
     Object.defineProperties(event,{touches:{value:type==='touchend'?[]:[touch]},changedTouches:{value:[touch]}});
     target.dispatchEvent(event);return event.defaultPrevented;
    };
    testTouch('touchstart',150,400);testTouch('touchmove',270,500);
   });
   await page.waitForTimeout(80);
   const centre=await page.locator('.lyric-lit').evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});
   assert.ok(Math.abs(centre.x-270)<2&&Math.abs(centre.y-500)<2,'Glow follows the finger directly');
   assert.equal(await page.evaluate(()=>testTouch('touchend',270,500)),false,'Touch does not block native scrolling');
   const anchored=await page.locator('.lyric-lit').evaluate(el=>el.getBoundingClientRect().top+scrollY);
   await page.evaluate(()=>scrollBy({top:80,behavior:'instant'}));await page.waitForTimeout(40);
   assert.ok(Math.abs(await page.locator('.lyric-lit').evaluate(el=>el.getBoundingClientRect().top+scrollY)-anchored)<2,'Released glow stays attached to the document during scrolling');
   await page.waitForTimeout(500);assert.equal(await page.locator('.lyric-field').evaluate(el=>el.classList.contains('is-lit')),false);
   await page.locator('.home-writings').scrollIntoViewIfNeeded();
   await page.evaluate(()=>scrollBy({top:document.querySelector('.home-writings').getBoundingClientRect().top-150,behavior:'instant'}));await page.waitForTimeout(250);
   assert.equal(await page.locator('.writings-boundary').count(),0,'Mobile article fields have no curve');
   assert.ok(await page.locator('.home-writings .post-title-row').evaluateAll(rows=>rows.every(row=>parseFloat(getComputedStyle(row).marginLeft)===0)));
   await page.screenshot({path:`.preview-refresh/mobile-writings-${name}.png`});
   // Every rendered content picture, including dynamically cloned homepage notes.
   const uncovered=await page.locator('main img,.footnote-popup img,.article-sidenote img').evaluateAll(images=>images.filter(img=>!img.closest('.brand,button,[data-no-image-preview]')&&!img.hasAttribute('data-image-preview')).map(img=>img.src));
   assert.deepEqual(uncovered,[]);
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   const note=page.locator('.footnote-popup').filter({has:page.locator('img')}).first();
   if(await note.count()){
    const id=await note.getAttribute('id');await page.locator(`[aria-controls="${id}"]`).tap();
    const image=note.locator('img').first();await image.tap();await page.locator('dialog.image-preview[open]').waitFor();
    await page.locator('.image-preview-close').click();await page.locator('dialog.image-preview[open]').waitFor({state:'hidden'});
   }
   await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
   assert.equal(await page.locator('.writings-boundary').count(),1,'Desktop keeps its curved boundary after resizing');
   const blocked=[];
   for(const image of await page.locator('.polaroid img').all()){
    await image.locator('..').scrollIntoViewIfNeeded();
    const hit=await image.evaluate(img=>{const b=(img.closest('.media-slot')||img).getBoundingClientRect(),target=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {id:img.closest('.polaroid').dataset.photo,ok:target===img||img.contains(target),target:target?.className}});
    if(!hit.ok)blocked.push(hit);
    if(hit.ok){
     await image.locator('..').click();await page.locator('dialog.image-preview[open]').waitFor();
     assert.equal(await page.locator('.image-preview-image').getAttribute('alt'),await image.getAttribute('alt'));
     await page.locator('.image-preview-close').click();await page.locator('dialog.image-preview[open]').waitFor({state:'hidden'});
    }
   }
   console.log(name+' photo hit checks: '+JSON.stringify(blocked));
   assert.deepEqual(blocked,[],'All photographs receive clicks at their visible centres');
   await page.locator('[data-platform="x"]').hover();
   const x=page.locator('[data-platform="x"]');
   await x.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.animationName).forEach(a=>{a.pause();a.currentTime=1600}));
   const tilt=await x.locator('.x-bird .x-bird-shape').evaluate(el=>getComputedStyle(el).transform);
   assert.notEqual(tilt,'none');assert.notEqual(tilt,'matrix(1, 0, 0, 1, 0, 0)');
   assert.equal(await x.locator('mask .x-bird-shape').evaluate(el=>getComputedStyle(el).transform),tilt,'The dark intersection follows the tilted bird');
   assert.deepEqual(errors,[]);console.log(name+': touch glow, mobile contour, image coverage and bird tilt passed');
  }finally{await browser.close();}
 }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
