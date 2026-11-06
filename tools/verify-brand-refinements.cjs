const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium, webkit} = require('playwright');
const {createServer} = require('./serve.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [name, engine, options] of [
      ['edge', chromium, {channel: 'msedge'}],
      ['webkit', webkit, {executablePath: path.resolve('.browser-test/webkit-2336/Playwright.exe')}]
    ]) {
      const browser = await engine.launch(options);
      try {
        const page = await browser.newPage({viewport: {width:1440,height:1000}});
        await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
        await page.goto(base + '/brand-guidelines/');
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.manual-content img').evaluateAll(images => Promise.all(images.map(image => {image.loading='eager';return image.decode();})));
        const finish = locator => locator.evaluate(element => Promise.allSettled(element.getAnimations({subtree:true}).map(animation => animation.finished)));
        const snapshot = locator => locator.evaluate(figure => {
          const before = figure.querySelector('.misuse-before');
          const images = [...before.querySelectorAll('img')].map(image => {
            const r=image.getBoundingClientRect(),s=getComputedStyle(image);
            return {x:r.x,y:r.y,width:r.width,height:r.height,cssWidth:parseFloat(s.width),filter:s.filter};
          });
          const caption=figure.querySelector('figcaption'), range=document.createRange();
          range.selectNodeContents(caption.lastChild);
          const r=range.getBoundingClientRect();
          return {images,opacity:getComputedStyle(before).opacity,caption:{x:r.x,y:r.y,width:r.width,height:r.height}};
        });
        for (const kind of ['recolouring','rotated','partner-unequal','space-bad']) {
          const figure=page.locator('.example.'+kind);
          await figure.scrollIntoViewIfNeeded();
          await page.mouse.move(0,0); await finish(figure);
          const before=await snapshot(figure);
          await figure.hover();
          const motion=await figure.evaluate(element => {
            const animations=element.getAnimations({subtree:true});
            for(const animation of animations){animation.pause();animation.currentTime=300;}
            return animations.length;
          });
          assert(motion>0,kind+' animates');
          const halfway=await snapshot(figure);
          await page.screenshot({path:`.preview-refresh/refinement-${kind}-half-${name}.png`});
          await figure.evaluate(element => element.getAnimations({subtree:true}).forEach(animation => animation.finish()));
          const after=await snapshot(figure);
          assert.equal(halfway.opacity,'1',kind+' transforms its original artwork without fading');
          assert.deepEqual(after.caption,before.caption,kind+' caption never shifts');
          if(kind==='recolouring'){
            assert.equal(before.images[0].filter,'hue-rotate(180deg)');
            assert.equal(halfway.images[0].filter,'hue-rotate(180deg)','Blue never rotates through other hues');
            assert.equal(after.images[0].filter,'hue-rotate(180deg)');
            assert.equal(await figure.locator('.misuse-after').evaluate(element=>getComputedStyle(element).opacity),'1');
            assert.match(await figure.locator('.misuse-after img').getAttribute('src'),/logo-orange/);
          }
          if(kind==='rotated')assert(Math.abs(before.images[0].cssWidth-after.images[0].cssWidth)<.1,'Rotation preserves image size');
          if(kind==='partner-unequal'){
            assert(halfway.images[0].width>before.images[0].width&&halfway.images[0].width<after.images[0].width,'Unequal logo grows continuously');
            assert(halfway.images[1].width<before.images[1].width&&halfway.images[1].width>after.images[1].width,'Dominant logo shrinks continuously');
            assert(Math.abs(after.images[0].height*367/474-after.images[1].height)<.2,'Corrected partner lettering heights match');
            assert(Math.abs(after.images[0].y+after.images[0].height-after.images[1].y-after.images[1].height)<.2,'Corrected partner baselines match');
          }
          if(kind==='space-bad'){
            const gap=s=>s.images[1].x-s.images[0].x-s.images[0].width;
            assert(gap(halfway)>gap(before)&&gap(halfway)<gap(after),'Crowded logos move apart continuously');
          }
          assert.equal(await figure.locator('.verdict-tick').evaluate(element=>getComputedStyle(element).opacity),'1');
          assert.equal(await figure.locator('.verdict-cross').evaluate(element=>getComputedStyle(element).opacity),'0');
          await figure.screenshot({path:`.preview-refresh/refinement-${kind}-correct-${name}.png`});
          await page.mouse.move(0,0); await finish(figure);
        }
        await page.emulateMedia({reducedMotion:'reduce'});
        for(const width of [1440,390,320]){
          await page.setViewportSize({width,height:844});
          await page.locator('.bard-email').scrollIntoViewIfNeeded();
          const state=()=>page.evaluate(()=>({scroll:scrollY,width:document.documentElement.clientWidth,style:document.documentElement.getAttribute('style'),body:document.body.getBoundingClientRect().toJSON()}));
          const before=await state();
          await page.locator('.bard-email').click();
          assert.deepEqual(await state(),before,'Opening warning changes no page dimensions, styles or scroll position');
          await page.locator('.warning-content h2').click();
          assert(await page.locator('#bard-warning').evaluate(dialog=>dialog.open),'Inside click keeps warning open');
          await page.mouse.wheel(0,300);
          assert.deepEqual(await state(),before,'Warning prevents page scrolling without changing layout');
          const panel=await page.locator('.warning-panel').boundingBox();
          await page.mouse.click(panel.x+3,panel.y+3);
          assert(!(await page.locator('#bard-warning').evaluate(dialog=>dialog.open)),'Empty corner outside rhombus silhouette dismisses');
          assert.deepEqual(await state(),before,'Dismissal preserves page position');
          assert(await page.locator('.warning-audio').evaluate(audio=>audio.paused&&audio.volume===.6));
        }
        console.log(`${name}: continuous logo corrections, stable captions, rhombus hit area and unchanged desktop/mobile warning layout passed`);
      } finally {await browser.close();}
    }
  } finally {await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error);process.exitCode=1;});
