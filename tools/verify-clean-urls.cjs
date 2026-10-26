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
      ['Edge', chromium, {channel: 'msedge'}],
      ['WebKit', webkit, {executablePath: path.resolve('.browser-test/webkit-2336/Playwright.exe')}]
    ]) {
      const browser = await engine.launch(options);
      try {
        const context = await browser.newContext({reducedMotion: 'reduce'});
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const ready = () => page.locator('html.entrance-complete').waitFor();
        const positioned = id => page.waitForFunction(id => {
          if (id === 'home') return scrollY < 2;
          const rect = document.getElementById(id).getBoundingClientRect();
          const bottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
          return rect.top >= 0 && (rect.top < 220 || (id === 'writings' && bottom && rect.bottom < innerHeight));
        }, id);
        for (const width of [390, 1440]) {
          await page.setViewportSize({width, height: 900});
          for (const section of ['home', 'musings', 'thousings', 'writings']) {
            await page.goto(`${base}/${section}?preview=1`);
            await ready();
            assert.equal(page.url(), `${base}/${section}?preview=1`);
            await positioned(section);
            await page.reload(); await ready(); await positioned(section);
            assert.equal(page.url(), `${base}/${section}?preview=1`);
          }
          await page.goto(base + '/index.html#musings'); await ready(); await positioned('musings');
          assert.equal(page.url(), base + '/musings');
          await page.evaluate(() => { window.originalIntro = document.querySelector('#intro-copy'); });
          for (const section of ['thousings', 'writings', 'home']) {
            const toggle = page.locator('.menu-toggle');
            if (await toggle.isVisible()) await toggle.click();
            await page.locator(`[data-section="${section}"]`).click();
            await positioned(section);
            assert.equal(page.url(), `${base}/${section}`);
            assert(await page.evaluate(() => originalIntro === document.querySelector('#intro-copy')));
          }
          await page.goBack(); await positioned('writings');
          await page.goForward(); await positioned('home');
          await page.locator('.intro-likes a[href="writings"]').click(); await positioned('writings');
          await page.locator('.footer-brand').click(); await positioned('home');
          assert.equal(page.url(), base + '/home');
          console.log(`${name} ${width}px: direct links, reloads and section history passed`);
        }
        await page.goto(base + '/writings/why-im-an-atheist/'); await ready();
        if (await page.locator('.menu-toggle').isVisible()) await page.locator('.menu-toggle').click();
        await page.locator('.sidebar nav a[href="../../musings"]').click(); await ready(); await positioned('musings');
        assert.equal(page.url(), base + '/musings');
        await page.goto(base + '/home#footnote-ref-home-8'); await ready();
        assert.equal(new URL(page.url()).hash, '#footnote-ref-home-8');
        const note = await page.locator('#footnote-ref-home-8').boundingBox();
        assert(note.y > 0 && note.y < 900);
        assert(await page.locator('.sidebar-logo').evaluate(image => image.complete && image.naturalWidth > 0));
        assert.deepEqual(errors, []);
        const noJS = await browser.newContext({javaScriptEnabled: false});
        const staticPage = await noJS.newPage();
        await staticPage.goto(base + '/musings');
        await staticPage.waitForURL('**/index.html#musings');
        assert(await staticPage.locator('#musings').isVisible());
        await noJS.close();
        console.log(`${name}: clean URLs, reloads, legacy links, history, in-page navigation, article links, notes and no-JavaScript fallback passed`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
