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
        const context = await browser.newContext({reducedMotion: 'reduce'});
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/brand-guidelines/');
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('.copy-swap').count(), 6);
        assert.equal(await page.locator('.section-label').count(), 0);
        assert.deepEqual(await page.locator('.chapter-nav a').allTextContents(), ['Preface', 'Primary Logotype', 'Naming']);
        assert.equal(await page.locator('#logotype > .guideline-subsection').count(), 4);
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({width, height: 1000});
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
          assert(await page.evaluate(() => getComputedStyle(document.querySelector('.preface-copy')).fontSize === getComputedStyle(document.querySelector('#logotype .manual-copy')).fontSize), 'Preface uses the body text size');
          for (const pair of await page.locator('.partner-equal .example-art').all()) {
            const heights = await pair.locator('img').evaluateAll(images => images.map(image => image.getBoundingClientRect().height));
            assert(Math.abs(heights[0] - heights[1]) < 1, 'Partner logos have equal visible heights');
          }
          await page.locator('#preface').scrollIntoViewIfNeeded();
          await page.screenshot({path: `.preview-refresh/manual-preface-${name}-${width}.png`});
        }
        assert.equal(await page.locator('.interaction-hint, .specimen-label, #pronunciation-status').count(), 0, 'Extra captions and playback status are removed');
        const measureRatio = await page.locator('.measured-mark').evaluate(element => element.querySelector('.heart-measure').getBoundingClientRect().width / element.querySelector('img').getBoundingClientRect().width);
        assert(Math.abs(measureRatio - 72 / 1886) < .0001, 'The dimension line spans the full heart width');
        assert(await page.locator('.example-art, .primary-specimen, .clearspace-demonstration, .size-specimen').evaluateAll(elements => elements.every(element => {
          const style = getComputedStyle(element);
          return style.borderTopWidth === '1px' && style.borderTopStyle === 'solid' && parseFloat(style.borderRadius) > 0;
        })), 'Every image panel has a thin solid border and rounded corners');
        await page.setViewportSize({width: 1440, height: 1000});
        const primary = page.locator('.primary-specimen');
        await primary.hover();
        assert.equal(await primary.locator('.primary-orange').evaluate(element => getComputedStyle(element).opacity), '1');
        await primary.screenshot({path: `.preview-refresh/manual-primary-orange-${name}.png`});
        await page.mouse.move(0, 0);
        assert.equal(await primary.locator('.primary-orange').evaluate(element => getComputedStyle(element).opacity), '0');
        await primary.focus();
        assert.equal(await primary.locator('.primary-orange').evaluate(element => getComputedStyle(element).opacity), '1', 'Keyboard focus reveals the orange logo too');
        const downloading = page.waitForEvent('download');
        await page.locator('.logo-download').click();
        const download = await downloading;
        assert.equal(download.suggestedFilename(), 'seriaura-logotypes.zip');
        assert((await require('node:fs/promises').stat(await download.path())).size > 1000);
        for (const button of await page.locator('.copy-swap').all()) {
          await button.evaluate(element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
          const point = await button.evaluate(element => {
            const rect = element.getClientRects()[0];
            return {x: rect.left + 3, y: rect.top + rect.height / 2};
          });
          await page.mouse.move(point.x, point.y);
          assert(await button.locator('.swap-alternative').isVisible(), 'Hover reveals ' + await button.locator('.swap-original').textContent());
          await page.mouse.move(0, 0);
          assert(await button.locator('.swap-original').isVisible());
          await page.keyboard.press('Tab');
          await button.focus();
          assert(await button.locator('.swap-alternative').isVisible());
          await button.press('Escape');
          assert(await button.locator('.swap-original').isVisible());
        }
        const clips = [];
        for (const link of await page.locator('.pronunciation').all()) {
          await link.click();
          await page.waitForFunction(() => {
            const audio = document.querySelector('.pronunciation-audio');
            return !audio.paused && audio.currentTime > .03;
          });
          clips.push(await page.locator('.pronunciation-audio').getAttribute('src'));
          assert(await link.evaluate(element => element.classList.contains('is-playing')), 'The playing speaker is indicated on its icon');
        }
        await page.waitForFunction(() => document.querySelector('.pronunciation-audio').ended);
        assert.equal(await page.locator('.pronunciation.is-playing').count(), 0, 'Speaker animation stops when the clip finishes');
        assert.equal(new Set(clips).size, 4, 'Every pronunciation control plays a distinct local clip');
        const trigger = page.locator('.bard-email'), warning = page.locator('#bard-warning');
        assert.equal(await trigger.getAttribute('href'), '#bard-warning');
        await trigger.click();
        await page.waitForFunction(() => {
          const audio = document.querySelector('.warning-audio');
          return !audio.paused && audio.currentTime > .03;
        });
        assert(await warning.evaluate(dialog => dialog.open));
        assert.equal(await warning.evaluate(dialog => getComputedStyle(dialog).animationName), 'none');
        assert.equal(await trigger.evaluate(link => {
          const style = getComputedStyle(link); return style.userSelect || style.webkitUserSelect;
        }), 'none');
        assert(await trigger.evaluate(link => {
          const event = new Event('copy', {bubbles: true, cancelable: true});
          link.dispatchEvent(event); return event.defaultPrevented;
        }));
        assert.equal(await page.locator('.warning-mute, #warning-description').count(), 0);
        assert.equal(await page.locator('.warning-dismiss').textContent(), 'Stand down');
        assert.equal(await page.locator('.warning-tape').allTextContents().then(labels => labels.join('')), '');
        assert.match(await page.locator('.warning-audio').getAttribute('src'), /air-raid-siren\.mp3$/);
        assert(await page.locator('.warning-audio').evaluate(audio => audio.loop), 'The siren repeats until the warning is dismissed');
        await page.screenshot({path: `.preview-refresh/manual-warning-${name}.png`});
        await page.keyboard.press('Escape');
        assert(await page.locator('.warning-audio').evaluate(audio => audio.paused));
        assert(!(await warning.evaluate(dialog => dialog.open)));
        assert(await trigger.evaluate(link => document.activeElement === link));
        await trigger.click();
        await page.locator('.warning-dismiss').click();
        assert(!(await warning.evaluate(dialog => dialog.open)));
        await page.emulateMedia({reducedMotion: 'no-preference'});
        await trigger.click();
        assert.equal(await warning.evaluate(dialog => getComputedStyle(dialog).animationDuration), '1s');
        assert.equal(await warning.evaluate(dialog => getComputedStyle(dialog).animationIterationCount), 'infinite', 'Warning keeps flashing beyond the old four-second cutoff');
        assert.equal(await page.locator('.warning-tape').first().evaluate(element => getComputedStyle(element).animationName), 'warning-march');
        assert.match(await page.locator('#warning-title').evaluate(element => getComputedStyle(element).fontFamily), /Comic Sans/);
        await page.locator('.warning-dismiss').click();
        const animatedSwap = page.locator('.copy-swap').first();
        await page.keyboard.press('Tab');
        await animatedSwap.focus();
        assert.equal(await animatedSwap.locator('.swap-alternative').evaluate(element => getComputedStyle(element).animationName), 'phrase-reveal');
        await animatedSwap.press('Escape');
        const speaker = page.locator('.pronunciation').first();
        await speaker.click();
        await page.waitForFunction(() => document.querySelector('.pronunciation').classList.contains('is-playing'));
        assert.equal(await speaker.locator('.wave-near').evaluate(element => getComputedStyle(element).animationName), 'speaker-pulse');
        for (const id of ['clearspace', 'partners', 'examples', 'naming']) {
          await page.locator('#' + id).screenshot({path: `.preview-refresh/manual-${id}-${name}.png`});
        }
        // Decode every authored specimen, including lazy-loaded examples.
        assert(await page.locator('.manual-content img').evaluateAll(async images => {
          await Promise.all(images.map(image => image.decode()));
          return images.every(image => image.naturalWidth > 0);
        }));
        const touch = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce'});
        const mobile = await touch.newPage();
        await mobile.goto(base + '/brand-guidelines/');
        const swap = mobile.locator('.copy-swap').first();
        await swap.tap(); assert(await swap.locator('.swap-alternative').isVisible());
        await swap.tap(); assert(await swap.locator('.swap-original').isVisible());
        await mobile.locator('#naming').scrollIntoViewIfNeeded();
        await mobile.screenshot({path: `.preview-refresh/manual-naming-mobile-${name}.png`});
        await mobile.locator('.menu-toggle').click();
        await mobile.locator('.chapter-nav a[href="#logotype"]').click();
        assert.equal(new URL(mobile.url()).hash, '#logotype');
        await mobile.goto(base + '/brand-guidelines/#clearspace');
        await mobile.waitForFunction(() => document.querySelector('.chapter-nav a[href="#logotype"]').hasAttribute('aria-current'));
        await touch.close();
        assert.deepEqual(errors, []);
        console.log(`${name}: responsive specimens, text swaps, pronunciation wiring, warning, copy prevention, touch and navigation passed`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
