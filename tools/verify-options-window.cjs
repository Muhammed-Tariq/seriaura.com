const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {createServer}=require('./serve.cjs');
(async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{for(const name of ['chromium','webkit']){
 const browser=await(name==='chromium'?chromium:webkit).launch(name==='chromium'?{channel:'msedge'}:{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')});
 try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('seriaura-options-v1'))localStorage.setItem('seriaura-options-v1',JSON.stringify({version:1,values:{backgroundOpacity:40}}));});
 await page.goto(base+'/');await page.waitForFunction(()=>window.siteTextBackground&&document.documentElement.dataset.lyricReady==='true');
 assert.equal(await page.evaluate(()=>SiteOptions.get().backgroundOpacity),2);assert.equal(await page.locator('.lyric-rest').evaluate(el=>getComputedStyle(el).opacity),'0.4');
 const brightness=()=>page.locator('.lyric-rest').evaluate(el=>{const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let r=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>240)r=Math.max(r,d[i]);return r;});
 await page.evaluate(()=>SiteOptions.reset());await page.waitForTimeout(100);const baseInk=await brightness();assert(baseInk>=35&&baseInk<=40);
 await page.evaluate(()=>SiteOptions.set({backgroundOpacity:100,ribbonSpeed:10,headingSpeed:10}));await page.waitForTimeout(100);assert((await brightness())>230);assert.equal(await page.evaluate(()=>SiteOptions.get().ribbonSpeed),10);assert.equal(await page.evaluate(()=>SiteOptions.get().headingSpeed),10);
 await page.locator('.footer-options').click();await page.waitForTimeout(450);const panel=page.locator('#site-options'),bar=page.locator('.options-header');assert.equal(await panel.evaluate(el=>el.matches(':modal')),false);
 assert(!(await panel.textContent()).includes('Make yourself at home'));assert(!(await panel.textContent()).includes('reduced-motion'));assert.equal(await page.locator('label[for=option-headingSpeed]').textContent(),'Prognosis speed');assert((await panel.evaluate(el=>getComputedStyle(el).fontFamily)).includes('Sentient'));await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('500 14px "Space Grotesk"')));
 await page.mouse.click(30,30);assert(await panel.isVisible());const initial=await panel.boundingBox(),handle=await bar.boundingBox();await page.mouse.move(handle.x+70,handle.y+25);await page.mouse.down();await page.mouse.move(handle.x-210,handle.y-55,{steps:10});await page.mouse.up();const moved=await panel.boundingBox();assert(moved.x<initial.x-200&&moved.y<initial.y-30);await page.evaluate(()=>scrollTo(0,0));assert.deepEqual(await panel.boundingBox(),moved);
 await bar.focus();await page.keyboard.press('ArrowLeft');const keyboard=await panel.boundingBox();assert.equal(Math.round(keyboard.x),Math.round(moved.x-10));
 await page.locator('.gradient-editor summary').click();await page.locator('.gradient-editor').scrollIntoViewIfNeeded();await panel.screenshot({path:'.preview-refresh/options-window-'+name+'-desktop.png'});
 await page.locator('.options-close').evaluate(el=>el.click());assert(await panel.evaluate(el=>el.open&&el.getAnimations().some(a=>a.playState==='running')));await panel.waitFor({state:'hidden'});await page.locator('.footer-options').click();await page.waitForTimeout(450);assert.equal(Math.round((await panel.boundingBox()).x),Math.round(keyboard.x));
 await page.locator('.footer-options').evaluate(el=>el.click());await panel.waitFor({state:'hidden'});await page.reload();await page.locator('html.entrance-complete').waitFor();assert.equal(await page.evaluate(()=>SiteOptions.get().backgroundOpacity),100);await page.locator('.footer-options').click();await page.waitForTimeout(450);assert.equal(Math.round((await panel.boundingBox()).x),Math.round(keyboard.x));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(120);const b=await panel.boundingBox();assert(b.x>=7&&b.y>=7&&b.x+b.width<=width-7&&b.y+b.height<=837,JSON.stringify(b));
  assert.equal(await panel.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  await page.locator('.options-close').click();await panel.waitFor({state:'hidden'});await page.locator('.footer-bottom').scrollIntoViewIfNeeded();
  const footerLayout=await page.locator('.footer-bottom').evaluate(el=>{
   const copyright=el.querySelector('small').getBoundingClientRect(),options=el.querySelector('.footer-options').getBoundingClientRect(),credits=el.querySelector('.footer-credits').getBoundingClientRect();
   const grid=document.querySelector('.social-links'),box=grid.getBoundingClientRect(),band=document.querySelector('.footer-connect').getBoundingClientRect(),fade=parseFloat(getComputedStyle(grid).getPropertyValue('--social-size'))*.45;
   return {aligned:Math.abs(options.top+options.height/2-credits.top-credits.height/2)<1.5,stacked:copyright.top-options.bottom>=10,desktopAligned:Math.abs(copyright.top+copyright.height/2-options.top-options.height/2)<1.5,topClearance:box.top-fade-band.top,bottomClearance:el.getBoundingClientRect().top-box.bottom-fade};
  });
  assert(footerLayout.aligned,JSON.stringify(footerLayout));
  if(width<=900)assert(footerLayout.stacked&&footerLayout.topClearance>=20&&footerLayout.bottomClearance>=20&&Math.abs(footerLayout.topClearance-footerLayout.bottomClearance)<1.5,JSON.stringify(footerLayout));
  else assert(footerLayout.desktopAligned,JSON.stringify(footerLayout));
  await page.locator('.footer-options').click();await page.waitForTimeout(450);
  if(width===390){await page.locator('.options-body').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'.preview-refresh/options-window-'+name+'-mobile.png'});}
 }
 await page.locator('.options-close').click();await panel.waitFor({state:'hidden'});await page.locator('.closing-signature').scrollIntoViewIfNeeded();await page.locator('.closing-signature').screenshot({path:'.preview-refresh/signature-solid-'+name+'.png'});assert((await page.locator('.closing-signature img').boundingBox()).width<=98);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.footer-options').click();await page.waitForTimeout(50);await page.locator('.options-close').click();await panel.waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);console.log(name+': floating window, drag/keyboard/resize, no backdrop or outside dismissal, fade, font, expanded ranges, full-brightness ink, preference migration, footer alignment and signature passed');
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exit(1)});
