const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium,webkit} = require('playwright');
const {createServer} = require('./serve.cjs');

(async()=>{
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    for(const [name,engine,options] of [['edge',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
      const browser=await engine.launch(options);
      try{
        const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
        for(const width of [1920,1440,1101,390]){
          await page.setViewportSize({width,height:1000});
          await page.goto(base+'/');
          await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Homepage fits viewport');
          if(width>1100){
            const sizes=await page.locator('#page-title,.continuation h2,.home-writings h3').evaluateAll(elements=>elements.map(element=>[element.tagName,parseFloat(getComputedStyle(element).fontSize)/(innerWidth/1920)]));
            for(const [level,size] of sizes) assert(Math.abs(size-({H1:36,H2:41.28,H3:24}[level]))<.02,`${level} scales with the homepage at ${width}`);
          }
          if(width===1440||width===390)await page.screenshot({path:`.preview-refresh/home-title-${name}-${width}.png`});
        }
        await page.setViewportSize({width:1440,height:1000});
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.locator('.site-footer').scrollIntoViewIfNeeded();
        for(let number=0;number<2;number++){
          for(const icon of await page.locator('.social-links>.social-link').all()){
            await icon.hover();
            assert.equal(await icon.evaluate(element=>getComputedStyle(element).color),'rgb(201, 198, 193)','Footer icons stay neutral');
            assert.equal(await icon.evaluate(element=>getComputedStyle(element).transform),'none','Footer cells never lift');
            for(const svg of await icon.locator('svg.social-icon').all())assert.equal(await svg.evaluate(element=>getComputedStyle(element).transform),'none','Only the custom icon parts animate');
          }
          await page.locator('.social-page').click();
          await page.waitForFunction(()=>!document.querySelector('.social-links').hasAttribute('aria-busy'));
        }
        await page.mouse.move(0,0);
        await page.locator('.site-footer').screenshot({path:`.preview-refresh/footer-neutral-${name}.png`});
        await page.goto(base+'/brand-guidelines/');
        await page.evaluate(()=>document.fonts.ready);
        await page.locator('.manual-content img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
        await page.locator('.bard-email').scrollIntoViewIfNeeded();
        const before=await page.locator('.manual-content').boundingBox();
        await page.locator('.bard-email').click();
        const after=await page.locator('.manual-content').boundingBox();
        for(const key of ['x','y','width','height'])assert(Math.abs(before[key]-after[key])<1,`Opening the alert leaves ${key} unchanged: ${before[key]} -> ${after[key]}`);
        await page.keyboard.press('Escape');
        await page.setViewportSize({width:390,height:844});
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.locator('.bard-email').click();
        const panel=await page.locator('.warning-panel').boundingBox();
        assert(panel.x>=0&&panel.x+panel.width<=390,'Warning fits mobile');
        await page.screenshot({path:`.preview-refresh/warning-mobile-${name}.png`});
        await page.keyboard.press('Escape');
        assert.deepEqual(errors,[]);
        console.log(`${name}: proportional homepage headings, both neutral footer pages, stationary icon frames, unchanged page under warning and mobile warning passed`);
      }finally{await browser.close();}
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
