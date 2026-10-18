const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:4173/';

(async () => {
  for (const [engine, options] of [[chromium, {channel: 'msedge'}], [webkit, {}]]) {
    const browser = await engine.launch({headless: true, ...options});
    try {
      const context = await browser.newContext({reducedMotion: 'reduce', viewport: {width: 1280, height: 900}});
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
        ? route.continue() : route.fulfill({contentType: 'text/html', body: 'External destination'}));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('.footnote-trigger').count(), 8);
      assert.equal(await page.locator('.footnote-popup a[href="https://80000hours.org/"]').count(), 1, 'Existing broken careers link is restored');
      const homeText = await page.locator('main .body-copy').allTextContents();
      const noteIds = await page.locator('.footnote-trigger').evaluateAll(notes => notes.map(note => note.id));
      for (const section of ['musings', 'thousings', 'home']) {
        await page.locator(`nav [data-section="${section}"]`).click();
        await page.waitForFunction(key => document.querySelector(`nav [data-section="${key}"]`).hasAttribute('aria-current'), section);
        assert.equal(await page.locator('.footnote-popup').count(), 8);
        assert.deepEqual(await page.locator('.footnote-trigger').evaluateAll(notes => notes.map(note => note.id)), noteIds);
      }
      assert.deepEqual(await page.locator('main .body-copy').allTextContents(), homeText, 'Section navigation preserves every word and note');
      await page.evaluate(() => {
        document.querySelector('#intro-copy').insertAdjacentHTML('afterbegin', `<p id="rich-test">Example<sup data-footnote><template>I'm using "quotes" and 'single quotes', <em>italics</em>, <strong>bold</strong>, <i>more italics</i>, <b>more bold</b>.<br><a href="https://example.com/footnote">External link</a> and <a href="#further">Local link</a></template></sup> <a id="after-note" href="#further" tabindex="0">Continue reading</a></p>`);
        document.dispatchEvent(new Event('collectionchange'));
        document.dispatchEvent(new Event('collectionchange'));
      });
      assert.equal(await page.locator('.footnote-trigger').count(), 9, 'Repeated rendering does not duplicate references');
      assert.equal(await page.locator('.footnote-popup').count(), 9);
      const trigger = page.locator('#rich-test .footnote-trigger');
      const popup = page.locator('.footnote-popup').first();
      await trigger.focus();
      await popup.waitFor({state: 'visible'});
      assert.match(await popup.innerText(), /I'm using "quotes" and 'single quotes'/);
      assert.equal(await popup.locator('em').evaluate(e => getComputedStyle(e).fontStyle), 'normal');
      assert.equal(await popup.locator('strong').evaluate(e => getComputedStyle(e).fontWeight), '700');
      assert.equal(await popup.locator('i').evaluate(e => getComputedStyle(e).fontStyle), 'normal');
      assert.equal(await popup.locator('b').evaluate(e => getComputedStyle(e).fontWeight), '700');
      await page.keyboard.press('Tab');
      assert.equal(await popup.locator('a').first().evaluate(e => e === document.activeElement), true, 'Tab enters the note');
      await page.waitForTimeout(250);
      assert.equal(await popup.isVisible(), true, 'Focused links keep the note open');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await popup.locator('a').last().evaluate(e => e === document.activeElement), true, `Second link should have focus: ${await page.evaluate(() => document.activeElement.outerHTML.slice(0, 500))}`);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#after-note').evaluate(e => e === document.activeElement), true, 'Tab resumes reading after the reference');
      await popup.waitFor({state: 'hidden'});
      await trigger.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
      await popup.waitFor({state: 'hidden'});
      assert.equal(await trigger.evaluate(e => e === document.activeElement), true, 'Escape returns focus to the number');
      await trigger.hover();
      await popup.hover();
      await page.waitForTimeout(250);
      const newPagePromise = context.waitForEvent('page');
      await popup.locator('a').first().click();
      const external = await newPagePromise;
      await external.waitForLoadState();
      assert.equal(external.url(), 'https://example.com/footnote');
      await external.close();
      await trigger.focus();
      await popup.locator('a').last().click();
      assert.equal(new URL(page.url()).hash, '#further');
      assert.equal(context.pages().length, 1, 'Local links remain in the current tab');
      await trigger.focus();
      await page.screenshot({path: `.preview-refresh/footnote-rich-${engine.name()}.png`});
      const touch = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce'});
      await touch.route('https://80000hours.org/**', route => route.fulfill({contentType: 'text/html', body: 'Careers'}));
      const mobile = await touch.newPage();
      await mobile.goto(base);
      await mobile.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      await mobile.locator('.footnote-trigger').last().tap();
      const mobilePopup = mobile.locator('.footnote-popup').last();
      await mobilePopup.waitFor({state: 'visible'});
      const mobileLinkPromise = touch.waitForEvent('page');
      await mobilePopup.locator('a').tap();
      const mobileLink = await mobileLinkPromise;
      await mobileLink.waitForLoadState();
      assert.equal(mobileLink.url(), 'https://80000hours.org/');
      await touch.close();
      const noScripts = await browser.newContext({javaScriptEnabled: false});
      const staticPage = await noScripts.newPage();
      await staticPage.goto(base);
      assert.match(await staticPage.locator('.continuation-copy').first().textContent(), /I'm currently on a/);
      assert.match(await staticPage.locator('.continuation-copy').last().textContent(), /Happiness feels more like my baseline/);
      assert.deepEqual(errors, []);
      console.log(`${engine.name()}: HTML writing, section navigation, rich notes, quotes, mouse/keyboard/touch links and repeated rendering passed.`);
    } finally { await browser.close(); }
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
