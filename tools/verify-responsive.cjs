const {chromium,webkit} = require('playwright');
const assert = require('node:assert/strict');
const engines = process.argv.includes('--webkit') ? [['WebKit',webkit,{}]] : [['Chromium',chromium,{channel:'msedge'}]];
(async()=>{
  for (const [name,engine,options] of engines) {
    const browser=await engine.launch({headless:true,...options});
    try {
      const page=await browser.newPage({reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      for(const width of [1920,1440,1280,1024,820,768,601,390,320]) {
        await page.setViewportSize({width,height:1080});
        await page.goto('http://127.0.0.1:4173/index.html#home');
        await page.waitForFunction(()=>document.documentElement.classList.contains('site-ready'));
        await page.waitForFunction(()=>document.querySelectorAll('.substack-card').length===3);
        await page.waitForFunction(()=>document.documentElement.dataset.ribbonReady==='true');
        await page.evaluate(async()=>{await siteReady;await document.fonts.ready;stopHeadingCycle();await Promise.all([...document.images].map(i=>i.decode()));scrollTo({top:0,behavior:'instant'});});
        // Allow the feed's final layout notification to complete.
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const layout=await page.evaluate(()=>{
          const main=document.querySelector('main'), mainTop=main.getBoundingClientRect().top;
          const collisions=[];
          for(const el of document.querySelectorAll('.intro h1,.intro p,.intro li,.continuation h2,.continuation p')) {
            const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
            while(walker.nextNode()) {
              if(!walker.currentNode.textContent.trim()||walker.currentNode.parentElement.closest('.word-sizer')) continue;
              const range=document.createRange();range.selectNodeContents(walker.currentNode);
              for(const r of range.getClientRects()) {
                const y=r.top+r.height/2-mainTop,x=ribbonX(y,innerWidth),half=ribbonHalfWidth(y,innerWidth);
                const overlaps=innerWidth<=600 ? r.bottom-mainTop>ribbonPhoneY-45 && r.top-mainTop<ribbonPhoneY+45 : r.left<x+half && r.right>x-half;
                if(overlaps) collisions.push({text:walker.currentNode.textContent.slice(0,24),y:Math.round(y)});
              }
            }
          }
          const frames=[...document.querySelectorAll('.polaroid')];
          const area=e=>e.offsetWidth*e.offsetHeight;
          return {collisions,width:document.documentElement.scrollWidth,height:main.clientHeight,
            tiles:document.querySelectorAll('.ribbon-tile').length,
            photos:frames.every(f=>f.querySelector('img').naturalWidth>0),
            largest:area(document.querySelector('.polaroid-film'))>=Math.max(...frames.map(area)),
            sweep:Math.max(...Array.from({length:30},(_,i)=>ribbonX(ribbonOpeningHeight+1200+i*100,innerWidth)))-Math.min(...Array.from({length:30},(_,i)=>ribbonX(ribbonOpeningHeight+1200+i*100,innerWidth)))
          };
        });
        console.log(name,width,JSON.stringify(layout));
        assert.equal(layout.width,width,'No horizontal overflow');
        assert.deepEqual(layout.collisions,[],'Words must clear the ribbon');
        assert.equal(layout.photos,true,'Every supplied photo is ready');
        assert.equal(layout.largest,true,'The film has the largest Polaroid');
        if(width>600) {assert.ok(layout.sweep>width*.3,'Ribbon crosses the page');assert.ok(layout.tiles*512>=layout.height,'Artwork reaches the page bottom');}
        // Height-only changes (Safari toolbar) and scrolling must not rebuild artwork.
        const signature=await page.locator('.text-ribbon').innerHTML();
        await page.setViewportSize({width,height:900});
        await page.locator('.site-footer').scrollIntoViewIfNeeded();
        for(const icon of await page.locator('.social-link').all()) {
          await icon.hover();
          assert.ok(await icon.locator('svg').evaluate(svg=>svg.getBoundingClientRect().width>0 && getComputedStyle(svg).visibility==='visible'));
        }
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        assert.equal(await page.locator('.text-ribbon').innerHTML(),signature,'Scroll does not unload or regenerate artwork');
        if(width===820) {
          await page.locator('.polaroid-film button').click();
          assert.equal(await page.locator('.media-dialog video').count(),1);
          await page.locator('.close-dialog').click();
          await page.waitForFunction(()=>!document.querySelector('.media-dialog video'));
          assert.equal(await page.locator('video').count(),0,'No idle video decoder remains');
          await page.locator('[data-section="thousings"]').click();
          await page.waitForFunction(()=>document.querySelector('main').dataset.collection==='thousings');
          assert.equal(await page.locator('.text-ribbon').innerHTML(),signature,'Collection changes preserve artwork');
        }
      }
      assert.deepEqual(errors,[]);
    } finally {await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
