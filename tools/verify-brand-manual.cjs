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
        assert.equal(await page.locator('.section-label, #phrase-style').count(), 0);
        assert.equal(await page.locator('#examples .space-bad, #examples .partner-unequal').count(),0,'Duplicate misuse examples are removed');
        assert.deepEqual(await page.locator('.chapter-nav a').allTextContents(), ['Preface', 'Primary Logotype', 'Naming']);
        assert.equal(await page.locator('#logotype > .guideline-subsection').count(), 4);
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({width, height: 1000});
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
          assert(await page.evaluate(() => getComputedStyle(document.querySelector('.preface-copy')).fontSize === getComputedStyle(document.querySelector('#logotype .manual-copy')).fontSize), 'Preface uses the body text size');
          for (const pair of await page.locator('.partner-equal .example-art, .clearspace-pair').all()) {
            const marks = await pair.locator('img').evaluateAll(images => images.map(image => {
              const rect = image.getBoundingClientRect(); return {height: rect.height, bottom: rect.bottom};
            }));
            assert(Math.abs(marks[0].height * 367 / 474 - marks[1].height) < 1, 'Partners match the lettering height, excluding hearts');
            assert(Math.abs(marks[0].bottom - marks[1].bottom) < 1, 'Wordmarks share a baseline');
          }
          for (const mark of await page.locator('.measured-mark, .protected-mark').all()) {
            const gaps=await mark.evaluate(element=>{
              const outer=element.getBoundingClientRect(),logo=element.querySelector('img').getBoundingClientRect();
              return {heart:logo.width*72/1886,sides:[logo.left-outer.left,logo.top-outer.top,outer.right-logo.right,outer.bottom-logo.bottom]};
            });
            assert(gaps.sides.every(gap=>Math.abs(gap-gaps.heart)<.2),'All four clearspace margins match one heart at '+width);
          }
          await page.locator('#preface').scrollIntoViewIfNeeded();
          await page.screenshot({path: `.preview-refresh/manual-preface-${name}-${width}.png`});
        }
        assert.equal(await page.locator('.interaction-hint, .specimen-label, #pronunciation-status').count(), 0, 'Extra captions and playback status are removed');
        const measureRatio = await page.locator('.measured-mark').evaluate(element => element.querySelector('.heart-width-rule').getBoundingClientRect().width / element.querySelector('img').getBoundingClientRect().width);
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
          await button.evaluate(element => element.scrollIntoView({block:'center',behavior:'instant'}));
          const point=await button.evaluate(element=>{const rect=element.getClientRects()[0];return {x:rect.left+3,y:rect.top+rect.height/2};});
          await page.mouse.move(point.x,point.y);
          assert.equal(await button.getAttribute('aria-pressed'),'true','Hover replaces wording immediately');
          assert(await button.locator('.swap-alternative').isVisible());
          assert(!(await button.locator('.swap-original').isVisible()));
          assert.equal(await button.locator('.swap-alternative').evaluate(element=>getComputedStyle(element).position),'static');
          await page.mouse.move(0,0);
          assert.equal(await button.getAttribute('aria-pressed'),'false','Leaving restores wording without a timeout');
          await page.keyboard.press('Tab'); await button.focus();
          assert.equal(await button.getAttribute('aria-pressed'),'true');
          await button.press('Escape');
          assert.equal(await button.getAttribute('aria-pressed'),'false');
          await button.evaluate(element=>element.blur());
        }
        assert.match(await page.locator('.pronunciation').first().evaluate(element=>getComputedStyle(element).fontFamily),/IBM Plex Mono/);
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
        await page.waitForFunction(() => document.querySelector('.pronunciation-audio').ended && !document.querySelector('.pronunciation.is-playing'));
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
        assert.equal(await page.locator('.warning-dismiss, .warning-register, .warning-kicker').count(), 0);
        assert.equal(await page.locator('.warning-tape').count(),0);
        assert.equal(await warning.evaluate(dialog=>getComputedStyle(dialog).backgroundColor),'rgba(0, 0, 0, 0)');
        assert.equal(await warning.evaluate(dialog=>getComputedStyle(dialog,'::backdrop').backgroundColor),'rgba(0, 0, 0, 0)');
        assert.equal(await warning.getAttribute('data-pulse'),'on','Reduced motion keeps the warning steady');
        assert.match(await page.locator('.warning-audio').getAttribute('src'), /missile-alert-original-light\.wav$/);
        assert(await page.locator('.warning-audio').evaluate(audio => audio.loop), 'The siren repeats until the warning is dismissed');
        await page.screenshot({path: `.preview-refresh/manual-warning-${name}.png`});
        await page.keyboard.press('Escape');
        assert(await page.locator('.warning-audio').evaluate(audio => audio.paused));
        assert(!(await warning.evaluate(dialog => dialog.open)));
        assert(await trigger.evaluate(link => document.activeElement === link));
        await trigger.click();
        await page.mouse.click(5,5);
        assert(!(await warning.evaluate(dialog => dialog.open)));
        await page.emulateMedia({reducedMotion: 'no-preference'});
        await trigger.click();
        await page.waitForFunction(()=>document.querySelector('#bard-warning').dataset.pulse==='off');
        await page.waitForFunction(()=>document.querySelector('#bard-warning').dataset.pulse==='on');
        assert.equal(await warning.evaluate(dialog=>getComputedStyle(dialog).animationName),'none','Warning follows the audio clock, not a CSS timer');
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>document.querySelector('#bard-warning').dataset.pulse==='on');
        await page.screenshot({path:`.preview-refresh/manual-warning-${name}.png`});
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.mouse.click(5,5);
        const animatedSwap = page.locator('.phrase-live:not(.phrase-ghost) .copy-swap').first();
        await page.keyboard.press('Tab'); await animatedSwap.focus();
        assert(await animatedSwap.evaluate(element=>element.closest('p').getAnimations({subtree:true}).length>0),'Crossfade animates');
        await animatedSwap.evaluate(element=>Promise.allSettled(element.closest('p').getAnimations({subtree:true}).map(animation=>animation.finished)));
        await page.screenshot({path:`.preview-refresh/manual-crossfade-${name}.png`});
        await animatedSwap.press('Escape'); await animatedSwap.evaluate(element=>element.blur());
        await page.waitForFunction(()=>!document.querySelector('.phrase-ghost'));
        await animatedSwap.hover();
        await animatedSwap.click();
        await page.mouse.move(0,0);
        assert.equal(await animatedSwap.getAttribute('aria-pressed'),'false','Mouse clicks cannot pin a hover reveal');
        await page.waitForFunction(()=>!document.querySelector('.phrase-ghost'));
        const downloadLink = page.locator('.logo-download');
        await downloadLink.hover();
        await page.waitForFunction(element=>getComputedStyle(element).color==='rgb(255, 191, 120)',await downloadLink.elementHandle());
        assert.equal(await downloadLink.locator('.download-arrow').evaluate(element=>getComputedStyle(element).animationName),'download-insert');
        assert.equal(await downloadLink.locator('.download-tray').evaluate(element=>getComputedStyle(element).animationName),'download-catch');
        assert.equal(await downloadLink.evaluate(element=>getComputedStyle(element).backgroundColor),'rgba(0, 0, 0, 0)','Text highlights never add a background box');
        const speaker = page.locator('.pronunciation').first();
        await page.evaluate(() => {
          window.speakerAnimation = null;
          document.querySelector('.pronunciation-audio').addEventListener('playing', () => {
            window.speakerAnimation = getComputedStyle(document.querySelector('.pronunciation .wave-near')).animationName;
          }, {once:true});
        });
        await speaker.click();
        await page.waitForFunction(() => window.speakerAnimation !== null);
        assert.equal(await page.evaluate(() => window.speakerAnimation), 'speaker-pulse');
        for (const id of ['clearspace', 'partners', 'examples', 'naming']) {
          await page.locator('#' + id).screenshot({path: `.preview-refresh/manual-${id}-${name}.png`});
        }
        const center=await page.locator('.clearspace-height-rule').evaluate(element=>{const rule=element.getBoundingClientRect(),outer=element.closest('.measured-mark').getBoundingClientRect();return Math.abs((rule.left+rule.right)/2-(outer.left+outer.right)/2);});
        assert(center<.1,'Central clearspace bar is centered');
        await trigger.hover();
        assert.equal(await trigger.locator('.copy-front').evaluate(element=>getComputedStyle(element).animationName),'copy-front-float');
        assert.equal(await trigger.locator('.copy-back').evaluate(element=>getComputedStyle(element).animationName),'copy-back-float');
        assert.equal(await trigger.locator('svg').evaluate(element=>getComputedStyle(element).transform),'none');
        assert.equal(await trigger.locator('svg').evaluate(element=>getComputedStyle(element).overflow),'visible');
        for(const specimen of await page.locator('.correctable,.correctable-name').all()){
          await specimen.hover();
          assert.equal(await specimen.getAttribute('aria-pressed'),'true','Incorrect example previews a correction');
          await specimen.evaluate(element=>Promise.allSettled(element.getAnimations({subtree:true}).map(animation=>animation.finished)));
          if(await specimen.evaluate(element=>element.classList.contains('correctable'))){
            assert.equal(await specimen.locator('.verdict').getAttribute('data-state'),'correct');
            assert(await specimen.locator('.misuse-after img').count()>0);
          }
          await page.mouse.move(0,0);
          assert.equal(await specimen.getAttribute('aria-pressed'),'false','Leaving restores the original example');
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
        assert(await swap.locator('.swap-alternative').evaluate(element => {
          const rect=element.getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth+.5;
        }), 'Reveal stays inside the mobile viewport');
        await swap.tap(); assert(!(await swap.locator('.swap-alternative').isVisible()));
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
