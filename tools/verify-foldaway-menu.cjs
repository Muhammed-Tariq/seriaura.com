const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{
  browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
  const toggle=page.locator('.menu-toggle'),nav=page.locator('.sidebar nav');
  for(const width of [320,390,768,1100]){
   await page.setViewportSize({width,height:900});await page.goto(base);await ready();
   assert.equal(await toggle.isVisible(),true);assert.equal(await nav.isVisible(),false);
   assert.equal(await toggle.locator('strong').innerText(),'Home');
   const before=await page.evaluate(()=>({height:document.querySelector('main').offsetHeight,top:document.querySelector('main').getBoundingClientRect().top+scrollY,key:ribbonRenderKey}));
   await toggle.click();assert.equal(await nav.isVisible(),true);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.deepEqual(await page.evaluate(()=>({height:document.querySelector('main').offsetHeight,top:document.querySelector('main').getBoundingClientRect().top+scrollY,key:ribbonRenderKey})),before,'Opening the overlay does not move content or rebuild the ribbon');
   await page.keyboard.press('Escape');assert.equal(await nav.isVisible(),false);
   assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
   await toggle.press('ArrowDown');assert.equal(await nav.isVisible(),true);
   assert.equal(await page.locator('.sidebar nav a[aria-current]').evaluate(el=>el===document.activeElement),true);
   await page.keyboard.press('Escape');
   for(const section of ['thousings','musings','writings','home']){
    await toggle.click();await page.locator('[data-section='+section+']').click();
    await page.waitForFunction(section=>document.querySelector('[data-section='+section+']').hasAttribute('aria-current'),section,{timeout:5000}).catch(async error=>{console.log(await page.evaluate(section=>({section,hash:location.hash,y:scrollY,bar:document.querySelector('.sidebar').getBoundingClientRect().toJSON(),head:document.getElementById(section).getBoundingClientRect().toJSON(),current:document.querySelector('[data-section][aria-current]')?.dataset.section,clearance:getComputedStyle(document.documentElement).scrollPaddingTop}),section));throw error;});
    assert.equal(await nav.isVisible(),false);
    assert.equal((await toggle.locator('strong').innerText()).toLowerCase(),section);
    const alignment=await page.evaluate(section=>({heading:document.getElementById(section).getBoundingClientRect().top,bar:document.querySelector('.sidebar').getBoundingClientRect().bottom,main:document.querySelector('main').scrollTop}),section);
    assert.equal(alignment.main,0);if(section!=='home')assert.ok(alignment.heading>=alignment.bar,'Heading lands below the folded bar');
   }
   await toggle.click();const openBox=await nav.boundingBox();await page.mouse.click(width-4,openBox.y+openBox.height+12);assert.equal(await nav.isVisible(),false,'Outside click dismisses the menu');
   await page.goto(base+'writings/why-im-an-atheist/');await ready();
   assert.equal(await toggle.locator('strong').innerText(),'Writings');
   await toggle.click();await nav.locator('a').filter({hasText:'Musings'}).click();await ready();
   await page.waitForURL('**/index.html#musings');
   await page.waitForFunction(()=>document.querySelector('.menu-current').textContent==='Musings');
   assert.equal(await nav.isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   if(width===390){const midScroll=await page.evaluate(()=>scrollY);await page.screenshot({path:'.preview-refresh/foldaway-menu-closed.png'});const box=await toggle.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-midScroll)<1,'Opening the menu mid-page preserves scroll position');await page.screenshot({path:'.preview-refresh/foldaway-menu-open.png'});await page.keyboard.press('Escape');}
   console.log(width+'px: foldaway overlay, keyboard, outside click, section labels, ribbon stability and article navigation passed');
  }
  await toggle.click();await page.setViewportSize({width:1440,height:900});
  assert.equal(await toggle.isVisible(),false);assert.equal(await nav.isVisible(),true,'Desktop navigation remains visible');
  await page.setViewportSize({width:390,height:320});
  assert.equal(await nav.isVisible(),false,'Returning to phone size starts folded');
  await toggle.click();await nav.locator('a').last().scrollIntoViewIfNeeded();
  const menuBox=await nav.boundingBox();assert.ok(menuBox.y+menuBox.height<=320,'Menu fits short landscape screens');
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const fallback=await noJS.newPage();await fallback.goto(base);assert.equal(await fallback.locator('.sidebar nav').isVisible(),true,'Links remain available without JavaScript');await noJS.close();
  assert.deepEqual(errors,[]);
  console.log('Desktop, resize, landscape and no-JavaScript fallback passed');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
