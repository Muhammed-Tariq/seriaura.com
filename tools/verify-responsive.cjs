const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('.preview-refresh', {recursive:true});
  for (const [engine, options] of [[chromium,{channel:'msedge'}], [webkit,{}]]) {
    const browser = await engine.launch({headless:true,...options});
    try {
      const page = await browser.newPage({hasTouch:engine===webkit});
      const errors=[]; page.on('pageerror', e => errors.push(e.message));
      for (const width of engine===webkit ? [1366,1024,768,390] : [2560,1920,1440,1400,1366,1280,1200,1101,1100,1024,900,820,768,601,600,390,320]) {
        await page.setViewportSize({width,height:900});
        await page.goto('http://127.0.0.1:4173/');
        await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
        await page.evaluate(async () => {
          stopHeadingCycle();
          await Promise.all([...document.querySelectorAll('.polaroid img')].map(img=>img.decode()));
          scrollTo({top:0,behavior:'instant'});
        });
        await page.waitForFunction(()=>document.querySelectorAll('.media-card').length===3);
        await page.evaluate(()=>Promise.all([...document.querySelectorAll('.media-card img')].map(img=>img.decode().catch(()=>{}))));
        const measurements = await page.evaluate(() => {
          const main=document.querySelector('main'), top=main.getBoundingClientRect().top;
          const collisions=[];
          for(const el of document.querySelectorAll('.intro h1,.intro p,.intro li,.continuation h2,.continuation-copy p')) {
            const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
            while(walker.nextNode()) {
              if(!walker.currentNode.textContent.trim() || walker.currentNode.parentElement.closest('.word-sizer')) continue;
              const range=document.createRange();range.selectNodeContents(walker.currentNode);
              for(const rect of range.getClientRects()) {
                const y=rect.top+rect.height/2-top;
                const half=ribbonHalfWidth(y,innerWidth);
                const overlaps=innerWidth<=1100 ? el.closest('.intro') && rect.bottom-top>ribbonPhoneY-45 && rect.top-top<ribbonPhoneY+45 : rect.left<ribbonX(y,innerWidth)+half && rect.right>ribbonX(y,innerWidth)-half;
                if(overlaps) collisions.push({text:walker.currentNode.textContent.slice(0,28),y:Math.round(y)});
              }
            }
          }
          return {width:document.documentElement.scrollWidth,collisions,
            glyphs:document.querySelector('.text-ribbon g').textContent.length,
            photos:[...document.querySelectorAll('.polaroid img')].every(img=>img.complete&&img.naturalWidth>0),
            opening:document.querySelector('.opening').offsetHeight,
            gallery:document.querySelector('.listening-polaroids').getBoundingClientRect().toJSON(),
            title:document.querySelector('#further-title').getBoundingClientRect().toJSON()};
        });
        console.log(engine.name(),width,JSON.stringify({overflow:measurements.width-width,collisions:measurements.collisions,glyphs:measurements.glyphs,photos:measurements.photos}));
        assert.equal(measurements.width,width,'No horizontal overflow');
        assert.equal(measurements.photos,true);
        assert.equal(measurements.collisions.length,0,'Reading text clears the ribbon');
        assert.equal(await page.locator('.polaroid').count(),15);
        assert.equal(await page.locator('.continuation-copy').allTextContents().then(x=>x.join('')),'');
        await page.screenshot({path:`.preview-refresh/check-${engine.name()}-${width}.png`});
        if ([1920,768,390].includes(width)) {
          await page.screenshot({path:`.preview-refresh/full-${engine.name()}-${width}.png`,fullPage:true});
          await page.locator('.site-footer').scrollIntoViewIfNeeded();
          await page.locator('.social-link').first().hover();
          assert.equal(await page.locator('.social-icon').first().evaluate(img=>img.complete&&img.naturalWidth>0),true);
          assert.equal(await page.locator('.social-icon').first().evaluate(img=>getComputedStyle(img).opacity),'1');
          await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
          assert.equal(await page.locator('.intro').isVisible(),true);
        }
      }
      assert.deepEqual(errors,[]);
      console.log(`${engine.name()} responsive checks passed.`);
    } finally {await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1});
