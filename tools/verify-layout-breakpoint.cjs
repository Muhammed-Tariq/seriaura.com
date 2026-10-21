const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const {createServer}=require('./serve.cjs');

(async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/`;
 try{for(const [name,engine,options]of [
  ['chromium',chromium,{channel:'msedge'}],
  ['webkit',webkit,{executablePath:process.env.WEBKIT_EXECUTABLE_PATH||path.resolve('.browser-test/webkit-2336/Playwright.exe')}]
 ]){
  const browser=await engine.launch(options);
  try{
   const page=await browser.newPage({viewport:{width:1102,height:1230},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base);await page.locator('html.entrance-complete').waitFor();
   await page.addStyleTag({content:'html{scrollbar-gutter:stable}'});
   const inspect=async context=>{
    await context.waitForFunction(()=>document.documentElement.dataset.lyricReady==='true');
    await context.waitForTimeout(300);
    return context.evaluate(()=>{
     const main=document.querySelector('main'),width=main.clientWidth,top=main.getBoundingClientRect().top;
     const mobile=matchMedia('(max-width:1100px)').matches;
     const copy=document.querySelector('#intro-copy'),range=document.createRange();range.selectNodeContents(copy);
     const collisions=[...range.getClientRects()].filter(r=>r.width&&r.height).filter(rect=>{
      if(mobile)return rect.top-top<ribbonPhoneY+42;
      const y=rect.top+rect.height/2-top,half=ribbonHalfWidth(y,width);
      return rect.left<ribbonX(y,width)+half&&rect.right>ribbonX(y,width)-half;
     }).length;
     let leftAlpha=0;
     if(!mobile){const canvas=document.querySelector('.lyric-rest'),ctx=canvas.getContext('2d');
      for(let y=100;y<Math.min(canvas.height,600);y+=30)leftAlpha+=ctx.getImageData(20,y,1,1).data[3];}
     return {viewport:innerWidth,width,mobile,tracks:document.querySelectorAll('.text-ribbon defs path').length,
      sidebar:getComputedStyle(document.querySelector('.sidebar')).position,
      menu:getComputedStyle(document.querySelector('.menu-toggle')).display!=='none',
      collisions,leftAlpha,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      introTop:main.querySelector('.opening').style.getPropertyValue('--intro-top')};
    });
   };
   const check=state=>{
    assert.equal(state.tracks,state.mobile?5:10,JSON.stringify(state));
    assert.equal(state.sidebar,state.mobile?'sticky':'fixed');
    assert.equal(state.menu,state.mobile);
    assert.equal(state.collisions,0,'Introduction must clear the matching ribbon');
    assert.equal(state.leftAlpha,0,'Desktop navigation side stays clear of background text');
    assert.equal(state.overflow,false,'No horizontal overflow');
    assert.equal(Boolean(state.introTop),!state.mobile);
   };
   // Resize across the threshold in both directions with scrollbar space reserved.
   for(const width of [1102,1100,1101,1115,1116,1120,1440,390,1099,1102]){
    await page.setViewportSize({width,height:1230});const state=await inspect(page);check(state);
    if(name==='chromium'&&width===1102)await page.screenshot({path:'.preview-refresh/breakpoint-after.png'});
   }
   // Browser zoom/embedded previews can give CSS a fractional viewport width.
   await page.setViewportSize({width:1440,height:1230});
   await page.evaluate(url=>{const frame=document.createElement('iframe');frame.id='fractional-layout';frame.style.cssText='position:fixed;inset:0;width:1100.5px;height:1000px;border:0;z-index:100';frame.src=url;document.body.append(frame);},base);
   const frame=await (await page.$('#fractional-layout')).contentFrame();
   await frame.locator('html.entrance-complete').waitFor();await frame.addStyleTag({content:'html{scrollbar-gutter:stable}'});
   const fractional=await inspect(frame);assert.equal(fractional.mobile,false);check(fractional);
   assert.deepEqual(errors,[]);
   console.log(`${name}: scrollbar widths, resize transitions, fractional breakpoint, ribbon clearance and background side passed`);
  }finally{await browser.close();}
 }}finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
