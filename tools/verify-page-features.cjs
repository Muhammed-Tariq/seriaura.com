const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'http://127.0.0.1:4173/';

async function checkFootnoteScroll(page) {
  const measure = () => page.evaluate(() => {
    const button = document.querySelector('.footnote-trigger[aria-expanded="true"]');
    const popup = document.querySelector('.footnote-popup:not([hidden])');
    const reference = button.getBoundingClientRect();
    const box = popup.getBoundingClientRect();
    return {x: box.left - reference.left, y: box.top - reference.top, referenceY: reference.top + scrollY, scroll: scrollY};
  });
  const initial = await measure();
  // Cross the old flip/clamp threshold, scroll the reference offscreen, then return.
  for (const top of [initial.referenceY - 40, initial.referenceY + 120, initial.referenceY + 600, initial.scroll]) {
    await page.evaluate(async top => {
      scrollTo({top, behavior: 'instant'});
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, top);
    const current = await measure();
    assert.ok(Math.abs(current.x - initial.x) < 1 && Math.abs(current.y - initial.y) < 1, 'Selected footnote keeps its offset from the reference throughout scrolling');
  }
}

(async () => {
  fs.mkdirSync('.preview-refresh', {recursive: true});
  for (const [engine, options] of [[chromium, {channel: 'msedge'}], [webkit, {}]]) {
    const browser = await engine.launch({headless: true, ...options});
    try {
      const page = await browser.newPage({reducedMotion: 'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const open = async path => {
        await page.goto(base + path);
        await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      };
      const widths = process.argv.includes('--features-only') ? [] : [1920, 1440, 1101, 1024, 900, 768, 390, 320];
      for (const width of widths) {
        await page.setViewportSize({width, height: 900});
        let homeFooter;
        for (const path of ['', 'brand-guidelines/', 'payment/', 'contact/', 'josh-isms/']) {
          await open(path);
          const geometry = await page.evaluate(() => {
            const footer = document.querySelector('.site-footer').getBoundingClientRect();
            const selectors = ['.footer-brand', '.footer-connect', '.footer-links', '.social-links', '.footer-bottom'];
            const parts = selectors.flatMap(selector => {
              const rect = document.querySelector(selector).getBoundingClientRect();
              return [rect.x - footer.x, rect.y - footer.y, rect.width, rect.height];
            });
            const logo = document.querySelector('.footer-brand .brand-crop').getBoundingClientRect();
            const divider = document.querySelector(innerWidth <= 900 ? '.footer-connect' : '.footer-bottom').getBoundingClientRect().top;
            return {
              parts, height: footer.height,
              centered: Math.abs(logo.top + logo.height / 2 - (footer.top + 1 + divider) / 2),
              overflow: document.documentElement.scrollWidth - innerWidth
            };
          });
          assert.equal(geometry.overflow, 0, `${path} at ${width} has no overflow`);
          assert.ok(geometry.centered < .6, `${path} at ${width}: logo centered between rules (${geometry.centered})`);
          if (!homeFooter) homeFooter = geometry;
          geometry.parts.forEach((value, index) => assert.ok(Math.abs(value - homeFooter.parts[index]) < .1, `${path} footer part ${index} matches Home at ${width}`));
          assert.ok(Math.abs(geometry.height - homeFooter.height) < .1, 'Footer height matches Home');
        }
        console.log(`${engine.name()} ${width}: all five footers match; logos centered; no overflow`);
      }

      await page.setViewportSize({width: 1920, height: 1080});
      await open('');
      const curve = await page.evaluate(() => {
        let inflections = 0, lastSign = 0, maxCurvature = 0, slopeError = 0;
        for (let y = 600; y <= 2200; y++) {
          const slope = ribbonSlope(y, 1920);
          const second = (ribbonSlope(y + .01, 1920) - ribbonSlope(y - .01, 1920)) / .02;
          const sign = Math.sign(second);
          if (lastSign && sign !== lastSign) inflections++;
          lastSign = sign;
          maxCurvature = Math.max(maxCurvature, Math.abs(second) / (1 + slope * slope) ** 1.5);
          slopeError = Math.max(slopeError, Math.abs(slope - (ribbonX(y + .01, 1920) - ribbonX(y - .01, 1920)) / .02));
          if (slope < -1e-10) throw new Error('Curve reverses direction inside a sweep');
        }
        const crop = document.querySelector('.sidebar .brand-crop').getBoundingClientRect();
        const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
        return {inflections, maxCurvature, slopeError, logoCenter: Math.abs(crop.x + crop.width / 2 - sidebar.x - sidebar.width / 2), logoRatio: crop.width / sidebar.width};
      });
      assert.equal(curve.inflections, 1, 'One natural inflection per sweep');
      assert.ok(curve.maxCurvature * 67.5 < 1, 'Offset tracks cannot form cusps or reverse');
      assert.ok(curve.slopeError < 1e-7, 'Analytic slope agrees with the curve');
      assert.ok(curve.logoCenter < .1 && Math.abs(curve.logoRatio - 1.04) < .001, 'Sidebar logo is centered and 4% larger');
      assert.equal(await page.locator('.sidebar .logo-neutral').evaluate(e => getComputedStyle(e).filter), 'brightness(0) invert(1)');
      await page.locator('.sidebar .brand').hover();
      assert.equal(await page.locator('.sidebar .logo-orange').evaluate(e => getComputedStyle(e).filter), 'none');
      assert.equal(await page.locator('.sidebar .logo-orange').evaluate(e => getComputedStyle(e).opacity), '1');

      const trigger = page.locator('.footnote-trigger').first();
      const popup = page.locator('.footnote-popup').first();
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      assert.equal(await page.locator('.page-footnotes').count(), 0, 'No bottom footnotes section');
      await trigger.hover();
      await popup.waitFor({state: 'visible'});
      assert.match(await popup.innerText(), /Occasionally shortened to Seri/);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), pageHeight, 'Opening a note does not move the layout');
      assert.equal(new URL(page.url()).hash, '', 'Hover does not navigate');
      await popup.hover();
      await page.waitForTimeout(250);
      assert.equal(await popup.isVisible(), true, 'Moving onto the box keeps it open');
      await page.screenshot({path: `.preview-refresh/footnote-hover-${engine.name()}.png`});
      await page.mouse.move(10, 10);
      await popup.waitFor({state: 'hidden'});
      await trigger.focus();
      await popup.waitFor({state: 'visible'});
      await page.keyboard.press('Escape');
      await popup.waitFor({state: 'hidden'});
      assert.equal(await page.evaluate(() => document.activeElement.id), 'footnote-ref-home-1', 'Escape leaves keyboard focus on the reference');
      await page.keyboard.press('Enter');
      await popup.waitFor({state: 'visible'});
      await page.keyboard.press('Tab');
      await popup.waitFor({state: 'hidden'});
      await trigger.click();
      await popup.waitFor({state: 'visible'});
      await checkFootnoteScroll(page);
      await page.keyboard.press('Escape');
      await popup.waitFor({state: 'hidden'});
      await trigger.hover();
      await page.locator('[data-section="musings"]').click();
      await page.waitForFunction(() => document.querySelector('[data-section="musings"]').hasAttribute('aria-current'));
      assert.equal(await page.locator('.footnote-popup').count(), 0, 'Changing collections removes previous notes');
      await page.evaluate(() => {
        siteContent.collections.musings.continuationCopy = ['<p>Example<sup data-footnote="A second collection note."></sup>.</p>', ''];
        setCollection();
      });
      assert.equal(await page.locator('.footnote-trigger').innerText(), '1', 'Each collection starts numbering at one');
      await page.locator('.footnote-trigger').hover();
      await page.locator('.footnote-popup').waitFor({state: 'visible'});
      assert.match(await page.locator('.footnote-popup').innerText(), /A second collection note/);
      await page.goto('about:blank');
      await open('#footnote-home-1');
      assert.equal(await page.locator('[data-section="home"]').getAttribute('aria-current'), 'page');
      assert.ok(await page.locator('#footnote-home-1').evaluate(e => e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().bottom <= innerHeight), 'Old note URLs lead to the reference in the text');
      await page.getByRole('link', {name: 'Josh-isms', exact: true}).click();
      await page.waitForURL('**/josh-isms/');
      await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('h1').innerText(), 'Josh-isms.');
      await page.evaluate(() => {
        const paragraph = document.createElement('p');
        paragraph.innerHTML = 'Standalone example<sup data-footnote="Plain &lt;b&gt;text&lt;/b&gt; &amp; a second note."></sup> and another<sup data-footnote="Another explanation."></sup>.';
        document.querySelector('main').append(paragraph);
        document.dispatchEvent(new Event('collectionchange'));
      });
      assert.deepEqual(await page.locator('.footnote-trigger').allTextContents(), ['1', '2']);
      assert.equal(await page.locator('.footnote-popup b').count(), 0, 'Note content stays plain text');
      await page.locator('.footnote-trigger').nth(1).hover();
      await page.locator('.footnote-popup').nth(1).waitFor({state: 'visible'});
      assert.equal(await page.locator('.footnote-popup:not([hidden])').count(), 1);

      const touchPage = await browser.newPage({viewport: {width: 320, height: 700}, hasTouch: true, reducedMotion: 'reduce'});
      await touchPage.goto(base);
      await touchPage.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      const touchTrigger = touchPage.locator('.footnote-trigger');
      const touchPopup = touchPage.locator('.footnote-popup');
      await touchTrigger.tap();
      await touchPopup.waitFor({state: 'visible'});
      const box = await touchPopup.boundingBox();
      assert.ok(box.x >= 12 && box.x + box.width <= 308 && box.y >= 12 && box.y + box.height <= 688, 'Popup stays inside a narrow viewport');
      await touchPage.screenshot({path: `.preview-refresh/footnote-touch-${engine.name()}.png`});
      await checkFootnoteScroll(touchPage);
      await touchTrigger.tap();
      await touchPopup.waitFor({state: 'hidden'});
      await touchTrigger.tap();
      await touchPopup.waitFor({state: 'visible'});
      await touchPage.locator('#intro-copy p').first().tap({position: {x: 5, y: 5}});
      await touchPopup.waitFor({state: 'hidden'});
      assert.equal(await touchPage.locator('.page-footnotes').count(), 0);
      await touchPage.close();
      await open('');
      await page.evaluate(async () => {
        stopHeadingCycle();
        await Promise.all([...document.querySelectorAll('.polaroid img')].map(image => image.decode()));
      });
      await page.screenshot({path: `.preview-refresh/updated-${engine.name()}-desktop.png`, fullPage: true});
      await page.locator('.site-footer').screenshot({path: `.preview-refresh/updated-${engine.name()}-footer.png`});
      await page.setViewportSize({width: 390, height: 844});
      await open('');
      await page.locator('.site-footer').screenshot({path: `.preview-refresh/updated-${engine.name()}-footer-mobile.png`});
      assert.deepEqual(errors, []);
      console.log(`${engine.name()}: smooth curve, sidebar logo, footnote hover, keyboard, touch, existing links and Josh-isms pass`);
    } finally { await browser.close(); }
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
