const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1920,height:1400}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = async () => {
    await page.waitForFunction(() => document.documentElement.classList.contains('site-ready'));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('main')).opacity === '1');
  };
  // Hold fonts briefly to verify that the first visible frame has its final layout.
  await page.route('**/assets/fonts/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.goto('http://127.0.0.1:4173/', {waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('main').evaluate(e => getComputedStyle(e).opacity), '0');
  await ready();
  assert.equal(await page.locator('main').evaluate(e => getComputedStyle(e).opacity), '1');
  assert.ok(await page.evaluate(() => document.fonts.status === 'loaded' && ribbonText.length > 1000));
  await page.unroute('**/assets/fonts/**');
  const headingGap = await page.locator('h1').evaluate(e => {
    const range = document.createRange(); range.selectNodeContents(e.firstChild);
    const rect = range.getBoundingClientRect();
    const y = rect.top + rect.height/2 - document.querySelector('main').getBoundingClientRect().top;
    return rect.left - ribbonX(y, innerWidth) - ribbonHalfWidth(y, innerWidth);
  });
  assert.ok(headingGap >= 30, `Heading clearance: ${headingGap}`);
  assert.equal(await page.locator('h1').evaluate(e => e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft)), await page.locator('#intro-copy').evaluate(e => e.getBoundingClientRect().left), 'Heading aligns with the paragraphs');
  await page.locator('.body-copy a').first().evaluate(link => {
    window.hoverColours = [];
    link.addEventListener('pointerenter', () => {
      const start = performance.now();
      const sample = () => {
        window.hoverColours.push(getComputedStyle(link).color);
        if (performance.now() - start < 400) requestAnimationFrame(sample);
      };
      sample();
    }, {once:true});
  });
  await page.locator('.body-copy a').first().hover();
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => new Set(window.hoverColours).size > 2), 'Link colour fades through intermediate shades');
  for (const width of [1280,768,390,320]) {
    await page.setViewportSize({width,height:844});
    await page.waitForTimeout(700);
    if (width > 600) {
      assert.ok(await page.locator('textPath').count() >= 5);

    } else {
      for (const section of ['home','ramblings','vibesings']) {
        await page.locator(`[data-section="${section}"]`).click();
        await page.waitForTimeout(700);
        const menu = await page.locator(`[data-section="${section}"]`).evaluate(link => {
          const flower = link.querySelector('.flower').getBoundingClientRect();
          const label = link.querySelector('span:last-child').getBoundingClientRect();
          const cell = link.getBoundingClientRect();
          return {gap:label.left-flower.right,flower:flower.width,height:cell.height,left:cell.left,right:cell.right};
        });
        assert.ok(menu.gap >= 5 && menu.gap <= 9, 'Flower stays next to the phone label');
        assert.ok(menu.flower >= 17 && menu.height >= 44 && menu.left >= 0 && menu.right <= width);
      }
      await page.locator('[data-section="home"]').click();
    }
  }
  for (const viewport of [{width:1920,height:1400},{width:1280,height:1000},{width:390,height:1000}]) {
    await page.setViewportSize(viewport);
    for (const name of ['contact','payment','brand-guidelines']) {
      await page.goto(`http://127.0.0.1:4173/${name}/`);
      await ready();
      const geometry = await page.evaluate(() => ({bottom:document.querySelector('.site-footer').getBoundingClientRect().bottom+scrollY,height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth}));
      assert.ok(Math.abs(geometry.bottom - geometry.height) <= 1, 'Footer reaches page bottom');
      assert.ok(geometry.bottom >= viewport.height && geometry.width === viewport.width);
      if (name === 'contact' && viewport.width === 1920) await page.screenshot({path:'preview-contact.png'});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/');
  await ready();
  assert.equal(await page.locator('main').evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.deepEqual(errors, []);
  console.log('PASS: entrance waits for fonts/layout, heading clearance, full sweeping ribbons, phone menu spacing and touch targets, flush short-page footers, reduced motion.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
