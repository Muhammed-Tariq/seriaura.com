const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  for (const [engine, options] of [[chromium, {channel: 'msedge'}], [webkit, {}]]) {
    const browser = await engine.launch({headless: true, ...options});
    try {
      const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('seriaura-ribbon-interaction', 'off');
        window.meshUploads = 0;
        const original = WebGLRenderingContext.prototype.bufferData;
        WebGLRenderingContext.prototype.bufferData = function(...args) {
          window.meshUploads++;
          return original.apply(this, args);
        };
      });
      await page.goto('http://127.0.0.1:4173/');
      await page.evaluate(() => siteReady);
      await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('.text-ribbon').getAttribute('data-renderer'), 'webgl');
      assert.equal(await page.locator('.ribbon-play').count(), 0, 'No experiment menu');
      // Freeze ordinary drift so pixel changes measure only the ripple.
      await page.evaluate(() => {
        stopRibbonMotion();
        window.readRibbon = () => {
          ribbonPainter(3);
          const gl = ribbonGraphics.gl;
          const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let hash = 0, ink = 0;
          for (let i = 3; i < pixels.length; i += 4) {hash = (hash * 31 + pixels[i]) | 0; ink += pixels[i] > 0;}
          return {hash, ink};
        };
        window.brushRibbon = (type = 'mouse') => {
          const y = 360;
          document.dispatchEvent(new PointerEvent('pointermove', {
            clientX: ribbonX(y, innerWidth), clientY: y + ribbonGraphics.documentTop - scrollY,
            pointerType: type, bubbles: true
          }));
        };
      });
      const uploads = await page.evaluate(() => meshUploads);
      const result = await page.evaluate(() => {
        const before = readRibbon(); brushRibbon(); const after = readRibbon();
        return {before, after};
      });
      assert.ok(result.after.ink > 1000, 'The lettering remains visible');
      assert.notEqual(result.before.hash, result.after.hash, 'Ripple changes actual pixels despite obsolete saved Off choice');
      await page.waitForTimeout(800);
      assert.equal(await page.evaluate(() => readRibbon().hash), result.before.hash, 'Ripple settles exactly');
      assert.equal(await page.evaluate(() => meshUploads), uploads, 'No mesh rebuilds');
      const touch = await page.evaluate(() => {brushRibbon('touch'); return readRibbon();});
      assert.deepEqual(touch, result.before, 'Touch leaves the ribbon untouched');
      const removal = await page.evaluate(() => {
        const controller = window.ribbonInteraction;
        delete window.ribbonInteraction;
        const before = readRibbon(); brushRibbon(); const after = readRibbon();
        window.ribbonInteraction = controller;
        return {before, after};
      });
      assert.deepEqual(removal.before, removal.after, 'Removing the controller disables the effect');
      await page.emulateMedia({reducedMotion: 'reduce'});
      await page.waitForFunction(() => reducedMotion.matches);
      assert.equal(await page.evaluate(() => {
        brushRibbon(); return window.ribbonInteraction.sample(ribbonGraphics).enabled;
      }), false, 'Reduced motion disables the ripple');
      assert.deepEqual(await page.evaluate(() => readRibbon()), removal.before, 'Reduced motion renders the original ribbon');
      await page.emulateMedia({reducedMotion: 'no-preference'});
      await page.waitForFunction(() => !reducedMotion.matches);
      for (const width of [1920, 768, 390]) {
        await page.setViewportSize({width, height: 900});
        await page.waitForFunction(width => ribbonGraphics.width === width, width);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      }
      await page.setViewportSize({width: 1440, height: 1000});
      await page.waitForFunction(() => ribbonGraphics.width === 1440);
      await page.mouse.move(500, 360);
      await page.mouse.move(320, 360, {steps: 10});
      await page.screenshot({path: `.preview-refresh/ribbon-interaction-${engine.name()}.png`});
      await page.evaluate(() => {ribbonGraphicsUnavailable = true; ribbonRenderKey = ''; layoutRibbon();});
      assert.equal(await page.locator('.text-ribbon').getAttribute('data-renderer'), 'static');
      assert.deepEqual(errors, []);
      console.log(`PASS ${engine.name()}: rendered ripple, settling, zero mesh uploads, removal, obsolete preferences ignored, reduced motion, touch, responsive layout and static fallback.`);
    } finally {await browser.close();}
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
