const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const [name,engine,options] of [['chromium',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const visit=async route=>{await page.goto(base+route);await page.locator('html.entrance-complete').waitFor();await page.evaluate(()=>document.fonts.ready);};
   const geometry=()=>page.locator('h1').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,font:s.fontSize,weight:s.fontWeight,margin:s.marginBottom}});
   const photos=()=>page.locator('.scatter-photo, .vibes-photo').evaluateAll(items=>items.map(el=>({src:el.querySelector('img').getAttribute('src'),angle:el.style.getPropertyValue('--photo-angle'),left:el.style.left,top:el.style.top})));
   for(const width of [320,390,768,1100,1440]){
    await page.setViewportSize({width,height:1000});await visit('/counting/');const expected=await geometry();
    for(const route of ['/brand-guidelines/','/vibes/']){
     await visit(route);assert.deepEqual(await geometry(),expected,route+' uses Countdowns heading geometry at '+width);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
     const collisions=await page.locator('.scatter-photo, .vibes-photo').evaluateAll(items=>items.filter(el=>{
      const b=el.getBoundingClientRect(),section=el.closest('section'),s=section.getBoundingClientRect(),text=section.querySelector('.reference-copy')?.getBoundingClientRect();
      return b.left<0||b.right>innerWidth||b.top<s.top||b.bottom>s.bottom||text&&b.left<text.right&&b.right>text.left&&b.top<text.bottom&&b.bottom>text.top;
     }).length);assert.equal(collisions,0,'Pictures stay within sections and clear of copy');
    }
   }
   // Use a fixture to test gallery behaviour independently of authored photos.
   await page.route('**/vibes/content.js',route=>route.fulfill({contentType:'text/javascript',body:`window.pageContent={images:Array.from({length:3},(_,i)=>({src:'../assets/photos/IMG_1808.webp',alt:'Example '+i,width:1200,height:1000}))}`}));
   await visit('/vibes/');
   const first=await photos();await page.reload();await page.locator('html.entrance-complete').waitFor();const second=await photos();assert.notDeepEqual(first,second,'Reload reshuffles positions and angles');
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(100);assert.deepEqual(await photos(),second,'Resize preserves random choices');
   await page.screenshot({path:`.preview-refresh/vibes-gallery-${name}.png`});
   await page.locator('.scatter-photo, .vibes-photo').first().scrollIntoViewIfNeeded();await page.screenshot({path:`.preview-refresh/vibes-scatter-${name}.png`});
   for(const image of await page.locator('.scatter-photo img, .vibes-photo img').all()){
    await image.scrollIntoViewIfNeeded();await image.click();await page.locator('dialog.image-preview[open]').waitFor();
    assert.equal(await page.locator('.image-preview-image').getAttribute('alt'),await image.getAttribute('alt'));
    await page.locator('.image-preview-close').click();await page.locator('dialog.image-preview[open]').waitFor({state:'hidden'});
   }
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`.preview-refresh/vibes-gallery-mobile-${name}.png`});
   // Inspect actual rendered pixels, not just computed mask transforms.
   await page.setViewportSize({width:1440,height:1000});
   await page.addStyleTag({content:'.social-hub{--social-size:160px!important}.site-footer .social-icon{width:120px!important;height:120px!important}'});
   const x=page.locator('[data-platform="x"]');await x.hover();
   await x.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.animationName).forEach(a=>{a.pause();a.currentTime=1600}));
   const normal=await x.screenshot({path:`.preview-refresh/x-dark-intersection-${name}.png`});
   await x.locator('.x-pierce').evaluate(el=>el.style.display='none');const without=await x.screenshot();
   const change=await page.evaluate(async({a,b})=>{
    const render=async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data};
    const actual=await render(a),unmasked=await render(b);let darker=0,lighter=0;
    for(let i=0;i<actual.length;i+=4){if(unmasked[i]-actual[i]>50)darker++;if(actual[i]-unmasked[i]>50)lighter++;}return {darker,lighter};
   },{a:normal.toString('base64'),b:without.toString('base64')});
   assert.ok(change.darker>100,'The bird contains a visibly dark spear intersection: '+JSON.stringify(change));assert.equal(change.lighter,0);
   assert.deepEqual(errors,[]);console.log(name+': page consistency, randomized photographs, responsive layout, image zoom and visible bird intersection passed');
  }finally{await browser.close();}
 }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
