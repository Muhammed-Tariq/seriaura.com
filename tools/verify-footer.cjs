const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  const context = await browser.newContext({viewport:{width:1920,height:1080},permissions:['clipboard-read','clipboard-write']});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>ribbonText.length>1000 && document.querySelector('textPath'));
  for(const width of [1920,1440,1280,768]) {
    await page.setViewportSize({width,height:1080});
    await page.waitForTimeout(180);
    assert.ok(await page.locator('.site-footer').evaluate(e => {
      const css = getComputedStyle(e);
      return Math.abs(parseFloat(css.paddingLeft) - parseFloat(css.paddingRight)) < 1;
    }), 'Footer uses equal horizontal margins');
    const clearance=await page.evaluate(()=>{
      const points=[...document.querySelectorAll('.text-ribbon path')].flatMap(p=>p.getAttribute('d').slice(1).split(' L').map(pair=>pair.split(',').map(Number)));
      return Math.min(...points.filter(p=>p[1]>=0 && p[1]<document.querySelector('main').offsetHeight).map(p=>p[0]))-ribbonSidebarEdge;
    });
    assert.ok(clearance>35,`Sidebar clearance at ${width}: ${clearance}`);
    const originalNavTop = (await page.locator('.sidebar nav').boundingBox()).y;
    await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .brand')).opacity === '0');
    await page.waitForTimeout(550);
    const footerNav = await page.locator('.sidebar nav').boundingBox();
    assert.ok(Math.abs(footerNav.y - footerNav.x) < 1, 'Footer navigation has equal top and left margins');
    assert.equal(await page.locator('.sidebar .brand').evaluate(e => e.inert), true, 'Hidden logo leaves keyboard navigation');
    if (width === 1920) await page.screenshot({path:'preview-bottom.png'});
    await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .brand')).opacity === '1');
    await page.waitForTimeout(550);
    assert.ok(Math.abs((await page.locator('.sidebar nav').boundingBox()).y - originalNavTop) < 1, 'Scrolling back restores the centered sidebar');
    assert.equal(await page.locator('.sidebar .brand').evaluate(e => e.inert), false);
  }
  await page.setViewportSize({width:1920,height:1080});
  await page.locator('[data-section="musings"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-section="musings"] .flower').dataset.angle==='180');
  await page.waitForFunction(()=>document.querySelector('[data-section="musings"] .flower').getAnimations().length===0);
  await page.mouse.move(1200,100);
  await page.locator('[data-section="musings"]').hover();
  await page.waitForFunction(()=>document.querySelector('[data-section="musings"] .flower').dataset.angle==='360');
  await page.waitForFunction(()=>document.querySelector('[data-section="musings"] .flower').getAnimations().length===0);
  await page.mouse.move(1200,100);
  assert.equal(await page.locator('[data-section="musings"] .flower').evaluate(e=>e.getAnimations().length),0);
  await page.locator('[data-section="home"]').click();
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.locator('.footer-brand').hover();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.footer-brand .logo-orange')).opacity==='1');
  assert.ok((await page.locator('.footer-brand .brand-crop').boundingBox()).width>(await page.locator('.sidebar .brand-crop').boundingBox()).width);
  assert.equal(await page.locator('.social-link').count(),9);
  assert.match(await page.locator('.footer-bottom small').innerText(), /^© \d{4} Seriaura\. All rights reserved\.$/);
  assert.equal(await page.getByRole('link',{name:'Letterboxd',exact:true}).count(),0);
  const expectedLinks={LinkedIn:'https://www.linkedin.com/in/muhammed5371/','Personal website':'https://www.muhammedtariq.com/',Substack:'https://substack.com/@seriaura',X:'https://x.com/Seriaura_',Instagram:'https://www.instagram.com/_muhammedtariq/',Strava:'https://www.strava.com/athletes/160737412',Goodreads:'https://www.goodreads.com/user/show/193354807-muhammed-tariq'};
  for(const [name,url] of Object.entries(expectedLinks)) assert.equal(await page.getByRole('link',{name,exact:true}).getAttribute('href'),url);
  for(const [name,value] of [['Email','hi@muhammedtariq.com'],['Discord','seriaura']]) {
    await page.getByRole('button',{name:`Copy ${name}: ${value}`,exact:true}).click();
    await page.waitForFunction(text=>document.querySelector('.copy-status').textContent.includes(`copied: ${text}`),value);
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),value);
  }
  const iconUrls=await page.locator('.social-icon').evaluateAll(icons=>icons.map(icon=>icon.style.getPropertyValue('--icon').match(/url\("(.+)"\)/)[1]));
  for(const url of iconUrls) { const result=await page.request.get(url);assert.equal(result.status(),200);assert.match(await result.text(),/<svg/); }
  await page.locator('.site-footer').screenshot({path:'preview-footer-desktop.png'});
  for(const width of [768,390,320]) {
    await page.setViewportSize({width,height:844});
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    if (width <= 600) {
      assert.equal(await page.locator('.sidebar').evaluate(e => e.classList.contains('at-footer')), false, 'Phone menu retains its sticky layout');
      assert.ok((await page.locator('.sidebar nav').boundingBox()).y >= 0);
    }
    if(width===390) await page.locator('.site-footer').screenshot({path:'preview-footer-mobile.png'});
  }
  for(const [path,title] of [['brand-guidelines','Brand guidelines.'],['payment','Payment.'],['contact','Say hello.']]) {
    await page.goto(`http://127.0.0.1:4173/${path}/`);
    await page.waitForFunction(() => document.documentElement.classList.contains('site-ready'));
    assert.equal(await page.locator('h1').innerText(),title);
    assert.equal(await page.locator('.footer-links a').count(),3);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
    assert.equal(await page.evaluate(() => Math.round(document.querySelector('.site-footer').getBoundingClientRect().bottom + scrollY)), await page.evaluate(() => document.documentElement.scrollHeight), 'Short-page footer reaches the bottom');
  }
  await page.getByRole('button',{name:'Copy email',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.copy-status').textContent.includes('Email copied'));
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'hi@muhammedtariq.com');
  await page.locator('.footer-brand').click();
  await page.waitForURL('**/index.html#home');
  await page.waitForFunction(() => document.querySelector('[data-section="home"]')?.getAttribute('aria-current') === 'page' && document.documentElement.classList.contains('site-ready'));
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.locator('.footer-brand').click();
  await page.waitForFunction(() => scrollY === 0);
  assert.deepEqual(errors,[]);
  console.log('PASS: sidebar clearance, 180° selection/hover, footer logo hover, nine icons, all profile URLs, clipboard copies, responsive footer, three standalone pages.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
