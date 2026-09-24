const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto('http://127.0.0.1:4173/index.html#home');
  await page.waitForFunction(() => document.documentElement.classList.contains('site-ready'));
  await page.waitForTimeout(700);
  await page.mouse.move(130,200);
  const angleBefore = await page.locator('[data-section="home"] .flower').getAttribute('data-angle');
  const record = target => page.evaluate(async target => {
    const nav = document.querySelector('.sidebar nav');
    const brand = document.querySelector('.sidebar .brand');
    const footerY = document.querySelector('.site-footer').getBoundingClientRect().top + scrollY;
    const frames = [{top:nav.getBoundingClientRect().top,opacity:+getComputedStyle(brand).opacity}];
    scrollTo({top:target === 'footer' ? footerY-innerHeight+110 : 0,behavior:'instant'});
    const start = performance.now();
    while (performance.now()-start < 850) {
      await new Promise(requestAnimationFrame);
      frames.push({top:nav.getBoundingClientRect().top,opacity:+getComputedStyle(brand).opacity});
    }
    return frames;
  }, target);
  const entering = await record('footer');
  for (let i=1;i<entering.length;i++) assert.ok(entering[i].top <= entering[i-1].top+.5, 'Menu moves upward without reversing');
  for (const frame of entering) {
    const remaining = (frame.top-entering.at(-1).top)/(entering[0].top-entering.at(-1).top);
    assert.ok(frame.opacity<=remaining+.03, 'Logo fades faster than the upward movement');
  }
  assert.equal(entering.at(-1).opacity,0);
  assert.equal(await page.locator('[data-section="home"] .flower').getAttribute('data-angle'),angleBefore,'Menu movement under a stationary pointer does not spin the flower');
  const left = (await page.locator('.sidebar nav').boundingBox()).x;
  assert.ok(Math.abs(entering.at(-1).top-left)<1);
  // Small scroll reversals at the original boundary must not bounce the menu.
  for (const visible of [78,82,77,83,79,81]) {
    await page.evaluate(visible => scrollTo({top:document.querySelector('.site-footer').getBoundingClientRect().top+scrollY-innerHeight+visible,behavior:'instant'}),visible);
    await page.waitForTimeout(45);
    assert.equal(await page.locator('.sidebar').evaluate(e=>e.classList.contains('at-footer')),true);
    assert.equal(await page.locator('.sidebar').evaluate(e=>e.getAnimations().filter(a=>a.transitionProperty==='transform').length),0);
  }
  const leaving = await record('top');
  for (let i=1;i<leaving.length;i++) assert.ok(leaving[i].top >= leaving[i-1].top-.5, 'Menu returns without reversing');
  assert.ok(Math.abs(leaving.at(-1).top-entering[0].top)<1);
  assert.equal(leaving.at(-1).opacity,1);
  for (const frame of leaving) {
    const progress = (frame.top-leaving[0].top)/(leaving.at(-1).top-leaving[0].top);
    assert.ok(Math.abs(frame.opacity-progress)<.03, 'Logo reappears in sync with the return movement');
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.sidebar').classList.contains('at-footer'));
  assert.equal(await page.locator('.sidebar').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  console.log('PASS: coordinated fade and movement, monotonic return, no boundary bounce or accidental flower spin, reduced motion.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
