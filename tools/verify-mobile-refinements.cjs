const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.browser-test');
const {chromium, webkit} = require('playwright');
const {createServer} = require('./serve.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [name, engine] of Object.entries({chromium, webkit})) {
      const browser = await engine.launch(name === 'chromium' ? {channel:'msedge'} : {executablePath:process.env.WEBKIT_EXECUTABLE_PATH});
      try {
        const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
        const fixture = await fs.readFile('assets/photos/IMG_1922.webp');
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() :
          route.request().resourceType() === 'image' ? route.fulfill({body:fixture,contentType:'image/webp'}) : route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const ready = () => page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
        await page.goto(base); await ready();
        const toggle = page.locator('.menu-toggle');
        const nav = page.locator('.sidebar nav');
        await toggle.tap();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar nav')).opacity === '1');
        assert.equal(await nav.evaluate(el => getComputedStyle(el.querySelector('[aria-current]'),'::after').content), '"↲"');
        await toggle.tap();
        const fade = await nav.evaluate(el => {
          const animations = el.getAnimations();
          const opacity = animations.find(animation => animation.transitionProperty === 'opacity');
          opacity?.pause();
          if (opacity) opacity.currentTime = 80;
          return {animates:!!opacity,opacity:Number(getComputedStyle(el).opacity),inert:el.inert};
        });
        assert.ok(fade.animates && fade.opacity > 0 && fade.opacity < 1, 'Closing menu fades through intermediate opacity');
        assert.equal(fade.inert,true,'Closing menu cannot receive focus or taps');
        await nav.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
        for (const id of ['mountains','loch','liquicity-tent']) {
          const image = page.locator(`[data-photo="${id}"] img`);
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(image => image.decode());
          const expected = await image.evaluate(image => ({
            tilt:parseFloat(getComputedStyle(image.closest('.polaroid')).getPropertyValue('--rotation')),
            orientation:Number(image.dataset.previewRotation) || 0,
            ratio:image.naturalWidth / image.naturalHeight
          }));
          // Pause on the opening frame to inspect both the starting tilt and the final orientation.
          const opening = await image.evaluate(image => {
            image.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
            const frame = document.querySelector('.image-preview-frame');
            const animation = frame.getAnimations()[0];
            animation.pause(); animation.currentTime = 0;
            return animation.effect.getKeyframes()[0].transform;
          });
          const angle = Number(opening.match(/rotate\(([-\d.]+)deg\)/)[1]);
          assert.ok(Math.abs(angle - expected.tilt) < .01, `${id} starts at its original tilt`);
          assert.equal(await page.locator('.image-preview-close').evaluate(el => getComputedStyle(el).outlineStyle),'none','Touch opening does not draw a focus ring');
          await page.locator('.image-preview-frame').evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
          const result = await page.locator('.image-preview-image').evaluate(image => {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
            const box = image.getBoundingClientRect();
            const caption = document.querySelector('.image-preview-caption').getBoundingClientRect();
            return {angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI,ratio:box.width/box.height,gap:caption.top-box.bottom,right:box.right,bottom:caption.bottom};
          });
          assert.ok(Math.abs(result.angle - expected.orientation) < .01, `${id} retains the photograph's orientation correction`);
          assert.ok(Math.abs(result.ratio - (expected.orientation ? 1/expected.ratio : expected.ratio)) < .01);
          // Caption reveal may still be translating by up to 5px.
          assert.ok(result.gap >= 11 && result.gap <= 18);
          assert.ok(result.right <= 390.1 && result.bottom <= 844);
          if (id === 'liquicity-tent') {
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.image-preview-caption')).opacity === '1');
            await page.screenshot({path:`.preview-refresh/mobile-photo-${name}.png`});
          }
          await page.keyboard.press('Tab');
          assert.equal(await page.locator('dialog').evaluate(el => el.classList.contains('opened-with-pointer')),false,'Keyboard interaction restores focus indicators');
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.querySelector('dialog').open);
        }
        await page.emulateMedia({reducedMotion:'reduce'});
        for (const width of [320,390,600,768,900,1100]) {
          await page.setViewportSize({width,height:844});
          await page.locator('.footer-brand').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .brand')).opacity === '0');
          const footer = await page.locator('.footer-brand .brand-crop').boundingBox();
          assert.ok(footer.x >= 0 && footer.x+footer.width <= width+.1, 'Footer logo fits');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
          if (width === 390) await page.screenshot({path:`.preview-refresh/mobile-footer-${name}.png`});
          await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
          await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .brand')).opacity === '1');
        }
        await page.setViewportSize({width:390,height:844});
        await page.goto(base+'/writings/why-im-an-atheist/'); await ready();
        assert.equal(await page.locator('.post-body').evaluate(el => getComputedStyle(el).fontSize),'19px');
        assert.equal(await page.locator('.post-header .post-importance>span').innerText(),'Considerable');
        await page.screenshot({path:`.preview-refresh/mobile-article-${name}.png`});
        const note = page.locator('.footnote-trigger').first();
        await note.scrollIntoViewIfNeeded();
        const hitbox = await note.evaluate(el => {
          const box = el.getBoundingClientRect();
          const target = getComputedStyle(el,'::after');
          return {x:box.x+box.width/2,y:box.y+box.height/2+14,width:parseFloat(target.width),height:parseFloat(target.height)};
        });
        assert.ok(hitbox.width >= 32 && hitbox.height >= 36);
        await page.touchscreen.tap(hitbox.x,hitbox.y);
        await page.locator('.footnote-popup:visible').waitFor();
        assert.deepEqual(errors,[]);
        console.log(`${name}: menu fade-out, photo tilt/orientation, touch focus, captions, footer bounds/handoff and footnote tap area passed`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
