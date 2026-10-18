const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge'});
    const context = await browser.newContext({reducedMotion:'reduce'});
    // Use a local fixture for remote article images so the check works offline.
    const fixture = await fs.readFile('assets/photos/IMG_1922.webp');
    await context.route('**/*', route => {
      if (route.request().url().startsWith(base)) return route.continue();
      if (route.request().resourceType() === 'image') return route.fulfill({body:fixture,contentType:'image/webp'});
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = () => page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
    const dialog = page.locator('dialog.image-preview');
    const closed = () => page.waitForFunction(() => !document.querySelector('dialog.image-preview')?.open);
    await fs.mkdir('.preview-refresh', {recursive:true});
    for (const width of [1440,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${base}/writings/excellence-born-of-insecurity/`);
      await ready();
      const image = page.locator('.post-body img').first();
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
      const url = page.url();
      const scroll = await page.evaluate(() => scrollY);
      await image.click();
      await dialog.waitFor({state:'visible'});
      await page.locator('.image-preview-image').evaluate(image => image.decode());
      assert.equal(page.url(), url);
      assert.equal(context.pages().length, 1, 'Click never opens another tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'image-preview-close');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true, 'Focus stays in preview');
      const rect = await page.locator('.image-preview-image').boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      const captionBox = await page.locator('.image-preview-caption').boundingBox();
      assert.ok(rect.y >= 76 && rect.y + rect.height <= 868);
      assert.ok(Math.abs(captionBox.y - rect.y - rect.height - 12) < 1, 'Caption sits directly below the image');
      await page.screenshot({path:`.preview-refresh/image-preview-${width}.png`});
      await page.keyboard.press('Escape');
      await closed();
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('image-preview-open')), false);
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - scroll) <= 1, 'Reading position restored');
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-image-preview-trigger')), true);
      await image.click();
      await page.locator('.image-preview-close').click();
      await closed();
      await image.click();
      await page.mouse.click(4,450);
      await closed();
    }
    await page.setViewportSize({width:1440,height:900});
    await page.goto(`${base}/`);
    await ready();
    const photo = page.locator('.polaroid img').first();
    await photo.scrollIntoViewIfNeeded();
    await photo.focus();
    await page.keyboard.press('Enter');
    await dialog.waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await closed();
    await page.keyboard.press('Space');
    await dialog.waitFor({state:'visible'});
    await page.locator('.image-preview-image').click();
    await closed();
    assert.equal(await page.locator('.site-footer img[data-image-preview]').count(), 0, 'Brand links remain normal links');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await photo.focus();
    await page.keyboard.press('Enter');
    await dialog.waitFor({state:'visible'});
    assert.ok(await page.locator('.image-preview-frame').evaluate(frame => frame.getAnimations().length) > 0, 'Opening animates');
    await page.keyboard.press('Escape');
    await closed();
    await page.keyboard.press('Enter');
    await page.setViewportSize({width:390,height:700});
    await page.waitForFunction(() => document.querySelector('.image-preview-image').getBoundingClientRect().right <= innerWidth);
    await page.keyboard.press('Escape');
    await closed();
    // Newly inserted images also get keyboard and preview behaviour.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(() => {
      const figure = document.createElement('figure');
      figure.className = 'polaroid';
      figure.innerHTML = '<img src="/missing-preview-test.jpg" alt="Unavailable photo">';
      document.body.append(figure);
    });
    const broken = page.getByRole('button', {name:'Enlarge Unavailable photo'});
    await broken.focus();
    await page.keyboard.press('Enter');
    await page.locator('.image-preview-error').waitFor({state:'visible'});
    assert.equal(await page.locator('.image-preview-image').isVisible(), false);
    await page.keyboard.press('Escape');
    await closed();
    assert.deepEqual(errors, []);
    console.log('Image previews passed: desktop/mobile, links, keyboard, focus, scroll, animation, resizing, dynamic images and load errors.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
