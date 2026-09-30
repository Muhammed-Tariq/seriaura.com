const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  for (const [engine, options] of [[chromium, {channel: 'msedge'}], [webkit, {}]]) {
    const browser = await engine.launch({headless: true, ...options});
    try {
      const page = await browser.newPage();
      let reference;
      for (const width of [1920, 2560, 1600, 1440, 1366, 1200, 1101, 1024, 768, 390, 320]) {
        await page.setViewportSize({width, height: Math.round(width * 1080 / 1920)});
        await page.goto('http://127.0.0.1:4173/');
        await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
        await page.evaluate(() => stopHeadingCycle());
        const layout = await page.evaluate(() => {
          const scale = innerWidth / 1920;
          const selectors = ['.sidebar', '.sidebar nav', '.sidebar nav a', '.intro', '.scrapbook .polaroids', '.site-footer', '.footer-brand'];
          const proportions = selectors.flatMap(selector => {
            const element = document.querySelector(selector);
            const rect = element.getBoundingClientRect();
            return [rect.x, rect.width, rect.height].map(value => value / scale);
          });
          for (const selector of ['.sidebar nav a', '#page-title', '.body-copy', '.footer-links', '.footer-bottom small']) {
            proportions.push(parseFloat(getComputedStyle(document.querySelector(selector)).fontSize) / scale);
          }
          const curve = Array.from({length: 61}, (_, index) => ribbonX(index * 60 * scale, innerWidth) / scale);
          const widths = Array.from({length: 61}, (_, index) => ribbonHalfWidth(index * 60 * scale, innerWidth) / scale);
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            proportions, curve, widths, extent: ribbonExtent / scale, fonts: document.fonts.status
          };
        });
        assert.equal(layout.overflow, 0, 'No horizontal overflow');
        if (width > 1100) {
          if (!reference) reference = layout;
          layout.curve.forEach((value, index) => assert.ok(Math.abs(value - reference.curve[index]) < .001, `Same desktop curve at ${width}`));
          layout.widths.forEach((value, index) => assert.ok(Math.abs(value - reference.widths[index]) < 1, `Same proportional taper at ${width}: ${value} vs ${reference.widths[index]}, extent ${layout.extent} vs ${reference.extent}, fonts ${layout.fonts}`));
          layout.proportions.forEach((value, index) => assert.ok(Math.abs(value - reference.proportions[index]) < 4, `Proportion ${index} at ${width}: ${value} vs ${reference.proportions[index]}`));
        }
        console.log(`${engine.name()} ${width}: no overflow and consistent desktop proportions`);
      }
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
