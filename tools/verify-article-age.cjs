const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createServer}=require('./serve.cjs');
require('./verify-layout-choices.cjs');
(async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.clock.install({time:new Date('2026-11-13T12:00:00Z')});
  for(const width of [320,390,700,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(base+'/writings/excellence-born-of-insecurity/');await page.locator('.article-age').waitFor();await page.evaluate(()=>document.fonts.ready);
   for(const style of ['byline','ledger','inset']){
    await page.evaluate(style=>ArticleAge.set({style,months:6}),style);
    const fit=await page.locator('.post-context').evaluate(el=>({height:el.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth,fonts:[...el.querySelectorAll('time,.reading-time,.age-days,b')].map(node=>getComputedStyle(node).fontFamily)}));
    assert(fit.height<=26&&!fit.overflow&&!fit.pageOverflow,JSON.stringify(fit));assert.equal(new Set(fit.fonts).size,1);
    const parts=await page.locator('.post-context').evaluate(el=>{const tile=el.querySelector('.age-day-tile').getBoundingClientRect(),date=el.querySelector('time').getBoundingClientRect(),reading=el.querySelector('.reading-time').getBoundingClientRect(),icon=el.querySelector('.post-flower').getBoundingClientRect();return {rectangular:tile.width>tile.height,heights:Math.abs(tile.height-date.height),ordered:date.right<=reading.left&&reading.right<=tile.left,square:Math.abs(icon.width-icon.height)};});
    assert(parts.rectangular&&parts.heights<1&&parts.ordered&&parts.square<1,JSON.stringify(parts));
    const clock=await page.locator('.article-age').evaluate(el=>{const digits=[...el.querySelectorAll('b')].map(node=>{const box=node.getBoundingClientRect();return box.top+box.height/2;}),border=getComputedStyle(el.querySelector('.age-day-tile'),'::after');return {offset:Math.max(...digits)-Math.min(...digits),edges:[border.top,border.right,border.bottom,border.left]};});
    assert(clock.offset<.5,JSON.stringify(clock));assert.equal(new Set(clock.edges).size,1,'All four rectangle edges have the same inset');
   }
   await page.goto(base+'/home');await page.locator('.writing-instrument').first().waitFor();
   for(const style of ['byline','ledger','inset']){
    await page.evaluate(style=>ArticleAge.set({style,months:6}),style);
    const fits=await page.locator('.writing-instrument').evaluateAll(nodes=>nodes.every(el=>{const tile=el.querySelector('.age-day-tile').getBoundingClientRect(),date=el.querySelector('time').getBoundingClientRect(),flower=el.querySelector('.post-importance').getBoundingClientRect();return el.getBoundingClientRect().height<=24&&el.scrollWidth<=el.clientWidth&&tile.width>tile.height&&Math.abs(tile.height-date.height)<1&&date.right<=tile.left&&Math.abs(flower.width-flower.height)<1;}));assert(fits);
   }
  }
  assert.deepEqual(errors,[]);console.log('Passed article and Writings geometry, uniform type and all three saved designs.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
