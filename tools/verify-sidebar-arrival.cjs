const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge'});
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.sidebarFrames = [];
      function sample() {
        const current = document.querySelector('[data-section][aria-current]');
        if (current) window.sidebarFrames.push({
          section:current.dataset.section,
          homeOpacity:getComputedStyle(document.querySelector('[data-section="home"] .flower')).opacity
        });
        if (!document.documentElement.classList.contains('entrance-complete')) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    // Reproduce the interval when the sidebar is visible but layout isn't ready.
    await context.route('**/assets/text-art.txt',async route => {
      await new Promise(resolve => setTimeout(resolve,650)); await route.continue();
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    const ready = () => page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
    for (const width of [1440,768,390]) {
      await page.setViewportSize({width,height:900});
      for (const section of ['musings','thousings','writings']) {
        await page.goto(base + 'writings/why-im-an-atheist/'); await ready();
        if(width<=1100)await page.locator('.menu-toggle').click();
        await page.locator(`.sidebar a[href$="#${section}"]`).click();
        await page.waitForURL(`**/index.html#${section}`); await ready();
        const frames = await page.evaluate(() => window.sidebarFrames);
        assert.ok(frames.length > 10,'Capture the loading interval, not just the final frame');
        assert.deepEqual([...new Set(frames.map(frame=>frame.section))],[section], 'Only the clicked destination may be selected during arrival');
        assert.ok(frames.every(frame=>Number(frame.homeOpacity)===0),'Home flower never flashes');
        assert.equal(await page.locator('html').getAttribute('data-initial-section'),null);
        const top = await page.locator('#'+section).evaluate(e=>e.getBoundingClientRect().top);
        assert.ok(top>=0 && top<900,`Destination lands in view (${width}px ${section}: top ${top})`);
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        await page.waitForFunction(()=>document.querySelector('[data-section="home"]').hasAttribute('aria-current'));
        console.log(`${width}px ${section}: no Home flash, correct arrival, normal scroll tracking restored`);
      }
    }
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
