const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = 'http://127.0.0.1:4173/';
(async () => {
  const browser = await chromium.launch({channel: 'msedge'});
  try {
    const context = await browser.newContext({reducedMotion: 'reduce'});
    await context.route('https://muhammedtariq.substack.com/**', route => route.fulfill({body: 'Substack'}));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const ready = () => page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
    const selectSection = async section => {
      const toggle=page.locator('.menu-toggle');
      if(await toggle.isVisible() && await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
      await page.locator('[data-section="'+section+'"]').click();
    };
    const positioned = id => page.waitForFunction(id => {
      const heading = document.getElementById(id), rect = heading.getBoundingClientRect();
      const navBottom = innerWidth <= 1100 ? document.querySelector('.sidebar').getBoundingClientRect().bottom : 0;
      const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
      return rect.top >= navBottom && (rect.top < Math.max(200,navBottom + 80) || (id === 'writings' && atBottom && rect.bottom < innerHeight)) && document.querySelector(`[data-section="${id}"]`).hasAttribute('aria-current');
    }, id);
    for (const width of [1920, 1101, 768, 390, 320]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(base); await ready();
      assert.deepEqual(await page.locator('.sidebar nav a').allTextContents(), ['Home', 'Musings', 'Thousings', 'Writings']);
      const ids = await page.locator('.footnote-trigger').evaluateAll(notes => notes.map(note => note.id));
      await page.evaluate(() => { stopHeadingCycle(); window.originalIntroNode = document.querySelector('#intro-copy'); });
      for (const id of ['musings', 'thousings']) {
        await selectSection(id); await positioned(id);
        assert.equal(await page.evaluate(() => window.originalIntroNode === document.querySelector('#intro-copy')), true);
        assert.equal(await page.locator('.polaroids .polaroid').count(), 17);
        assert.deepEqual(await page.locator('.footnote-trigger').evaluateAll(notes => notes.map(note => note.id)), ids);
      }
      await page.goBack(); await positioned('musings');
      await page.goForward(); await positioned('thousings');
      await selectSection('home');
      await page.waitForFunction(() => scrollY < 2 && document.querySelector('[data-section="home"]').hasAttribute('aria-current'));
      for (const id of ['musings', 'thousings', 'writings']) {
        await page.goto(base + '#' + id); await ready(); await positioned(id);
        assert.equal(await page.locator('.footnote-trigger').first().getAttribute('id'), 'footnote-ref-home-1');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      console.log(width + 'px: section clicks, direct links, history, stable notes, and overflow passed');
    }
    await selectSection('writings');
    await page.waitForURL('**/#writings'); await positioned('writings');
    assert.equal(await page.locator('.post-link').count(), require('../writings/posts.json').length);
    assert.equal(context.pages().length, 1, 'Writings opens locally in the same tab');
    assert.equal((await context.request.get(base + 'vibes/')).status(), 404, 'Vibes subpage is removed');
    await page.goto(base + '#footnote-ref-home-8'); await ready();
    assert.equal(await page.locator('#footnote-ref-home-8').count(), 1);
    const noteTop = await page.locator('#footnote-ref-home-8').evaluate(e => e.getBoundingClientRect().top);
    assert.ok(noteTop > 0 && noteTop < 900);
    // Scroll without clicking navigation: animate once per newly active section.
    const animated = await context.newPage();
    await animated.emulateMedia({reducedMotion: 'no-preference'});
    await animated.setViewportSize({width: 1440, height: 900});
    animated.on('pageerror', error => errors.push(error.message));
    await animated.goto(base);
    await animated.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
    const logo = animated.locator('.sidebar-logo:not(.sidebar-logo-color)');
    assert.equal(await logo.evaluate(img => img.complete && img.naturalWidth === 2000), true);
    assert.equal(await logo.evaluate(img => getComputedStyle(img).opacity),'1','The original image draws the logo');
    await animated.locator('.sidebar .brand').hover();
    await animated.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .logo')).filter === 'contrast(1) brightness(1)');
    assert.equal(await animated.locator('.sidebar-logo-color').count(),0,'No overlapping white image can fringe the orange logo');
    await animated.mouse.move(1400, 10);
    for (const section of ['musings', 'thousings', 'musings', 'home']) {
      const flower = animated.locator(`[data-section="${section}"] .flower`);
      const before = Number(await flower.getAttribute('data-angle') || 0);
      await animated.evaluate(section => {
        const top = section === 'home' ? 0 : document.getElementById(section).getBoundingClientRect().top + scrollY - 80;
        scrollTo({top, behavior: 'instant'});
      }, section);
      await animated.waitForFunction(({section, before}) => Number(document.querySelector(`[data-section="${section}"] .flower`).dataset.angle) === before + 180, {section, before});
      await flower.evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
      await animated.evaluate(() => { scrollBy({top: 4, behavior: 'instant'}); });
      await animated.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(Number(await flower.getAttribute('data-angle')), before + 180, 'Scrolling within the same section does not restart the flower');
    }
    await animated.screenshot({path: '.preview-refresh/sidebar-logo-desktop.png'});
    await animated.setViewportSize({width: 390, height: 844});
    await animated.goto(base);
    await animated.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
    await animated.screenshot({path: '.preview-refresh/sidebar-logo-mobile.png'});
    await animated.emulateMedia({reducedMotion: 'reduce'});
    const beforeReduced = await animated.locator('[data-section="musings"] .flower').getAttribute('data-angle');
    await animated.evaluate(() => document.getElementById('musings').scrollIntoView({behavior: 'instant'}));
    await animated.waitForFunction(() => document.querySelector('[data-section="musings"]').hasAttribute('aria-current'));
    assert.equal(await animated.locator('[data-section="musings"] .flower').getAttribute('data-angle'), beforeReduced, 'Reduced motion skips automatic rotation');
    await animated.close();
    console.log('White logo, scroll-triggered flower rotation, no repeat within a section, and reduced motion passed');
    const staticContext = await browser.newContext({javaScriptEnabled: false});
    const staticPage = await staticContext.newPage(); await staticPage.goto(base);
    for (const id of ['home', 'musings', 'thousings']) assert.equal(await staticPage.locator('#' + id).count(), 1);
    await staticContext.close(); assert.deepEqual(errors, []);
    console.log('Local Writings, removed Vibes page, footnote deep link, and no-JavaScript anchors passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
