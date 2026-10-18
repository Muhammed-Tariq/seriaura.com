const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{
  browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
  for(const width of [1440,1101,768,600,390,320]){
   await page.setViewportSize({width,height:900});await page.goto(base);await ready();
   const original=await page.evaluate(()=>({paths:[...document.querySelectorAll('.text-ribbon path')].map(p=>p.getAttribute('d')),height:document.querySelector('main').offsetHeight}));
   for(const section of ['thousings','home','musings','thousings','home']){
    await page.locator('[data-section='+section+']').click();
    await page.waitForFunction(section=>document.querySelector('[data-section='+section+']').hasAttribute('aria-current'),section);
    await page.waitForFunction(()=>Math.abs(scrollY-(window.previousScrollY??-100))<.1?(window.stableScroll=(window.stableScroll||0)+1)>5:(window.previousScrollY=scrollY,window.stableScroll=0,false));
    const after=await page.evaluate(()=>({paths:[...document.querySelectorAll('.text-ribbon path')].map(p=>p.getAttribute('d')),height:document.querySelector('main').offsetHeight,top:document.querySelector('main').scrollTop,left:document.querySelector('main').scrollLeft}));
    assert.deepEqual(after.paths,original.paths,'Navigation never changes ribbon geometry');
    assert.equal(after.height,original.height,'Navigation never changes page layout');
    assert.equal(after.top,0,'The inner main container cannot scroll');assert.equal(after.left,0);
   }
   assert.equal(await page.locator('.home-writings .post-arrow').count(),0);
   assert.equal(await page.locator('.post-pin').evaluate(el=>getComputedStyle(el).color),'rgb(201, 198, 193)');
   const pinOffset=await page.locator('.home-writings h3').first().evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el.firstChild);
    const line=[...range.getClientRects()].at(-1),pin=el.querySelector('.post-pin').getBoundingClientRect();
    return Math.abs(line.y+line.height/2-pin.y-pin.height/2);
   });assert.ok(pinOffset<4,'Pin is centred vertically with its title line: '+pinOffset);
   await page.locator('.post-link').first().hover();
   assert.ok(await page.locator('.post-link .post-flower').first().evaluate(el=>el.getAnimations().some(a=>a.animationName==='growth-ruffle')),'Hover ruffles the growth icon');
   await page.locator('.footer-brand').scrollIntoViewIfNeeded();
   const footer=await page.evaluate(()=>{
    const box=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
    const before=box('.site-footer');const style=document.createElement('style');style.textContent='.footer-brand .brand-crop{transform:none!important}';document.head.append(style);const after=box('.site-footer');style.remove();
    return{before,after,logo:box('.footer-brand .brand-crop'),grid:box('.social-links'),copyright:box('.footer-bottom small')};
   });assert.equal(footer.before.height,footer.after.height,'Larger footer artwork does not change footer height');
   if(width<=900){
    for(const key of ['logo','grid','copyright'])assert.ok(Math.abs(footer[key].x+footer[key].width/2-width/2)<1,'Mobile footer '+key+' is centred');
    assert.ok(footer.logo.x>=0&&footer.logo.x+footer.logo.width<=width,'Larger logo fits the screen');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   if([1440,390].includes(width))await page.screenshot({path:'.preview-refresh/refined-footer-'+width+'.png'});
   console.log(width+'px: document-only navigation, stable ribbon, centred pin, ruffle and footer alignment passed');
  }
  await page.goto(base+'writings/excellence-born-of-insecurity/');await ready();
  assert.ok(Math.abs(await page.locator('.post-body').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))-20.9)<.01,'Article defaults to 110% of its previous reading size');
  await page.setViewportSize({width:1200,height:950});
  await page.goto(base+'.preview-refresh/mobile-navigation-options.html');
  for(const option of ['a','b','c','d']){
   await page.locator('[data-option='+option+']').click();
   const frame=page.frameLocator('#preview');
   await frame.locator('body[data-preview='+option+']').waitFor();
   await frame.locator('body').evaluate(()=>document.fonts.ready);
   for(const width of [320,390,768]){
    await page.locator('#width').selectOption(String(width));
    assert.equal(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Menu option fits at '+width);
   }
   await page.locator('#width').selectOption('390');
   if(option==='d')await frame.locator('.menu-toggle').click();
   if(option==='a'||option==='b'){const rows=await frame.locator('nav a').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));assert.ok(Math.max(...rows)-Math.min(...rows)<1,'Row and segmented alternatives stay on one line');}
   await frame.locator('nav a').filter({hasText:'Thousings'}).click();
   assert.equal(await frame.locator('nav a[aria-current]').innerText(),'Thousings');
   if(option==='d')assert.equal(await frame.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  }
  await page.locator('[data-option=a]').click();
  await page.screenshot({path:'.preview-refresh/mobile-navigation-options.png'});
  assert.deepEqual(errors,[]);
  console.log('110% article type and all four interactive menu previews passed');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
