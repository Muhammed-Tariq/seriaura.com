const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {createServer} = require('./serve.cjs');
(async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/';let browser;
  try{
    browser=await chromium.launch({channel:'msedge'});
    const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
    for(const width of [1920,1440,1101,768,390]){
      await page.setViewportSize({width,height:900});let reference;
      for(const route of ['index.html#home','writings/why-im-an-atheist/']){
        await page.goto(base+route);
        await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
        const original=await page.locator('.sidebar nav').boundingBox();
        if(width>1100) {
          const logo=await page.locator('.sidebar .brand-crop').boundingBox();
          assert.ok(Math.abs(original.x+original.width/2-logo.x-logo.width/2-18*width/1920)<1,'Navigation retains the rightward offset');
          for(const section of ['thousings','writings','musings','home']) {
            await page.evaluate(section=>{
              document.querySelectorAll('.sidebar nav a').forEach(link=>{
                if(link.getAttribute('href').endsWith('#'+section))link.setAttribute('aria-current','page');
                else link.removeAttribute('aria-current');
              });
            },section);
            const selected=await page.locator('.sidebar nav').boundingBox();
            for(const key of ['x','y','width','height'])assert.ok(Math.abs(selected[key]-original[key])<1,'Selecting even the longest label keeps the sidebar fixed');
            assert.equal(await page.locator('.sidebar nav a').evaluateAll(links=>links.every(link=>link.scrollWidth<=link.clientWidth+1)),true,'All labels fit without clipping');
          }
        }
        await page.locator('.sidebar .brand').hover();
        assert.equal(await page.locator('.sidebar .logo').evaluate(el=>getComputedStyle(el).filter),'contrast(1) brightness(1)','Hover reveals the original gradient image');
        assert.equal(await page.locator('.sidebar .brand img').count(),1,'There is no second white layer to leave an outline');
        await page.mouse.move(width-1,1);
        if(!reference)reference=original;
        for(const key of ['x','y','width','height'])assert.ok(Math.abs(original[key]-reference[key])<1,'Sidebar holds its place across pages');
        for(const bottom of [true,false,true,false]){
          await page.evaluate(bottom=>scrollTo({top:bottom?document.documentElement.scrollHeight:0,behavior:'instant'}),bottom);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const box=await page.locator('.sidebar nav').boundingBox();
          const atFooter=bottom&&width>1100;
          for(const key of ['x','width','height'])assert.ok(Math.abs(box[key]-original[key])<1,'Sidebar retains its horizontal position');
          if(atFooter)assert.ok(box.y>=24&&box.y<=73,'Sidebar parks at the top');
          else assert.ok(Math.abs(box.y-original.y)<1,'Sidebar returns to its original height');
          assert.equal(await page.locator('.sidebar .brand').evaluate(el=>getComputedStyle(el).opacity),atFooter?'0':'1');
          assert.equal(await page.locator('.sidebar .brand').evaluate(el=>el.inert),atFooter);
        }
      }
      console.log(width+'px: sidebar position, page navigation and logo visibility remain stable');
    }
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base);
    await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
    await page.locator('.sidebar .brand').hover();
    await page.screenshot({path:'.preview-refresh/sidebar-gradient-restored.png'});
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
