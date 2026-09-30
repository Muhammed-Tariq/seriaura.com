const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  for (const [engine, options] of [[chromium, {channel: 'msedge'}], [webkit, {}]]) {
    const browser = await engine.launch({headless: true, ...options});
    try {
      const page = await browser.newPage({reducedMotion: 'reduce'});
      // Exercise the retained SVG fallback and optional spacing renderer.
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          return type === 'webgl' ? null : getContext.call(this, type, ...args);
        };
      });
      const errors = [];
      await page.addInitScript(() => localStorage.setItem('seriaura-ribbon-design', 'classic'));
      page.on('pageerror', error => errors.push(error.message));
      for (const width of [1920, 1101, 768, 390]) {
        await page.setViewportSize({width, height: 1080});
        await page.goto('http://127.0.0.1:4173/');
        await page.evaluate(() => window.siteReady);
        await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
        assert.equal(await page.locator('.curve-lab').count(), 0, 'Curve picker has been removed');
        assert.equal(await page.locator('.text-ribbon').getAttribute('data-curve'), 'lean', 'Leaning wave overrides obsolete saved choices');
        const warped = await page.evaluate(() => {
          const svg = document.querySelector('.text-ribbon');
          const glyphs = [...svg.querySelectorAll('g text')];
          let min = Infinity, max = 0, shear = 0, minDet = Infinity, outside = 0;
          for (const glyph of glyphs) {
            const m = glyph.transform.baseVal.consolidate().matrix;
            min = Math.min(min, Math.hypot(m.c, m.d));
            max = Math.max(max, Math.hypot(m.c, m.d));
            shear = Math.max(shear, Math.abs(m.a * m.c + m.b * m.d));
            minDet = Math.min(minDet, m.a * m.d - m.b * m.c);
            if (innerWidth <= 1100) continue;
            const box = glyph.getBBox();
            for (const x of [box.x, box.x + box.width]) for (const y of [box.y, box.y + box.height]) {
              const point = new DOMPoint(x, y).matrixTransform(m);
              if (point.y < 0 || point.y > ribbonExtent) continue;
              // Even the full font box must leave at least 12 design pixels of
              // the layout's 22px clearance; actual letter outlines are smaller.
              if (Math.abs(point.x - ribbonX(point.y, innerWidth)) > ribbonHalfWidth(point.y, innerWidth, 10 * innerWidth / 1920)) outside++;
            }
          }
          return {min, max, shear, minDet, outside, extent: ribbonExtent, letters: glyphs.length,
            content: svg.querySelector('g').textContent,
            matrices: glyphs.map(glyph => {
              const m = glyph.transform.baseVal.consolidate().matrix;
              return [m.a, m.b, m.c, m.d, m.e, m.f];
            })};
        });
        assert.ok(warped.letters > 400, 'Full strip of lettering rendered');
        assert.ok(warped.min > .899 && warped.min < .91 && warped.max > 1.13 && warped.max <= 1.141, 'Letter height varies visibly but stays within 14% above natural height');
        assert.ok(warped.shear > .001, 'Glyphs retain subtle shear with the changing ribbon shape');
        assert.ok(warped.minDet > .1, 'No mirrored or collapsed glyphs');
        assert.equal(warped.outside, 0, 'Full glyph boxes retain clearance from the reading text');
        const spacing = await page.evaluate(() => {
          siteContent.ribbonStyle = 'spacing';
          layoutRibbon();
          return {paths: document.querySelectorAll('.text-ribbon textPath').length,
            transforms: document.querySelectorAll('.text-ribbon g text[transform]').length,
            markup: document.querySelector('.text-ribbon g').innerHTML};
        });
        assert.equal(spacing.paths, width > 1100 ? 10 : 5, 'Previous text-on-path renderer is preserved');
        assert.equal(spacing.transforms, 0, 'Spacing mode leaves glyph shapes untouched');
        await page.evaluate(() => {siteContent.ribbonStyle = 'warped'; layoutRibbon();});
        const restored = await page.locator('.text-ribbon g').evaluate(group => ({
          content: group.textContent, extent: ribbonExtent,
          matrices: [...group.querySelectorAll('text')].map(glyph => {
            const m = glyph.transform.baseVal.consolidate().matrix;
            return [m.a, m.b, m.c, m.d, m.e, m.f];
          })
        }));
        assert.equal(restored.content, warped.content, 'Switching back restores every letter');
        // SVG matrix values are browser floats; require far below a visible pixel.
        restored.matrices.forEach((matrix, i) => matrix.forEach((value, j) => {
          const tolerance = j < 4 ? .002 : .02;
          assert.ok(Math.abs(value - warped.matrices[i][j]) < tolerance, `Restored glyph ${i} matrix ${j}: ${value} vs ${warped.matrices[i][j]}, extent ${restored.extent} vs ${warped.extent}`);
        }));
        await page.evaluate(() => {siteContent.ribbonStyle = 'spacing'; layoutRibbon();});
        assert.ok(await page.locator('.text-ribbon g').innerHTML() === spacing.markup, 'Spacing style can be restored exactly');
        console.log(`${engine.name()} ${width}: glyph deformation, clearance and both style switches pass`);
      }
      assert.deepEqual(errors, []);
    } finally {await browser.close();}
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
