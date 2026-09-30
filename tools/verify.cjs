const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  // SVG geometry/style assertions cover the static fallback; the accelerated
  // renderer, live frame cadence and heading timing have their own motion test.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type === 'webgl' ? null : getContext.call(this, type, ...args);
    };
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1920, 1440, 1400, 1280, 1024, 900, 768, 601, 390, 320]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1080 });
    await page.goto('http://127.0.0.1:4173');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => ribbonText.length > 1000 && document.querySelector('.text-ribbon g')?.textContent.length > 50);
    await page.waitForFunction(() => document.documentElement.classList.contains('site-ready'));
    await page.waitForTimeout(600);
    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
      const main = document.querySelector('main');
      const w = main.clientWidth;
      const mainTop = main.getBoundingClientRect().top;
      const collisions = [];
      for (const element of document.querySelectorAll('.intro h1,#intro-copy,.intro-likes,.continuation-copy,.continuation h2')) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while(walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          if (walker.currentNode.parentElement.closest('.word-sizer')) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          for (const rect of range.getClientRects()) {
            const y = rect.top + rect.height/2 - mainTop;
            const x = ribbonX(y, w);
            const half = ribbonHalfWidth(y, w);
            const overlaps = w <= 1100 ? rect.bottom-mainTop > ribbonPhoneY-45 && rect.top-mainTop < ribbonPhoneY+45 : rect.left < x+half && rect.right > x-half;
            if (overlaps) collisions.push({text: walker.currentNode.textContent.slice(0,25),y:Math.round(rect.y)});
          }
        }
      }
      return { width: document.documentElement.scrollWidth, viewport: innerWidth, sidebarRight:sidebar.right, collisions, textPaths:document.querySelectorAll('textPath').length, height:main.scrollHeight };
    });
    console.log(width, JSON.stringify(layout));
    assert.equal(layout.width, width, 'No horizontal overflow');
    assert.equal(layout.collisions.length, 0, 'Text must not overlap ribbon');
    if (width === 1920) { await page.screenshot({path:'preview-desktop.png'}); await page.screenshot({path:'preview-full.png',fullPage:true}); }
    if (width === 390) await page.screenshot({path:'preview-mobile.png'});
  }
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('.text-ribbon g')?.textContent.length > 100);
  assert.equal(await page.locator('[data-section="home"]').getAttribute('aria-current'), 'page');
  assert.equal(await page.locator('h1').evaluate(e => getComputedStyle(e).fontWeight), '500');
  assert.equal(await page.locator('h1 em').first().evaluate(e => getComputedStyle(e).fontWeight), '500');
  assert.match(await page.locator('.text-ribbon text').first().evaluate(e => getComputedStyle(e).fontFamily), /Source Code Pro/);
  assert.equal(await page.locator('.text-ribbon text').first().evaluate(e => getComputedStyle(e).fontWeight), '800');
  assert.equal(await page.evaluate(() => document.fonts.check('800 10px "Source Code Pro"')), true);
  assert.equal(await page.locator('.drop-cap').evaluate(e => getComputedStyle(e, '::first-letter').initialLetter), '2');
  const snapshotRibbon = () => page.locator('.text-ribbon').evaluate(svg => ({
    paths: svg.querySelector('defs').innerHTML,
    words: svg.querySelector('g').innerHTML,
    // Glyphs in the visible part must stay put, not just retain the same content.
    positions: [...svg.querySelectorAll('text')].filter(text => text.getNumberOfChars() > 0).map(text => {
      let low=0, high=text.getNumberOfChars()-1;
      while(low<high) {
        const mid=Math.floor((low+high)/2);
        if(text.getStartPositionOfChar(mid).y>500) low=mid+1; else high=mid;
      }
      const point=text.getStartPositionOfChar(low); return [point.x,point.y];
    })
  }));
  // The text now intentionally moves. Freeze its clock for heading/layout checks.
  await page.evaluate(() => stopRibbonMotion());
  const homeRibbon = await snapshotRibbon();
  const trackSpacing = await page.evaluate(() => {
    const paths=[...document.querySelectorAll('.text-ribbon path')].map(path=>path.getAttribute('d').slice(1).split(' L').map(point=>point.split(',').map(Number)));
    const distances=[];
    for(let row=1;row<paths.length;row++) for(let i=0;i<paths[row].length;i+=9) {
      const [x,y]=paths[row][i], [px,py]=paths[row-1][i];
      if(y>0 && y<4000) distances.push(Math.hypot(x-px,y-py));
    }
    const samples = paths[0].map(([x,y],i) => {
      const [lastX,lastY] = paths.at(-1)[i];
      return {y:(y+lastY)/2, width:Math.hypot(lastX-x,lastY-y)};
    }).filter(sample=>sample.y>=0 && sample.y<=ribbonExtent).reverse();
    const middle = samples.reduce((best,sample)=>Math.abs(sample.y-ribbonExtent/2)<Math.abs(best.y-ribbonExtent/2)?sample:best);
    const jumps = samples.slice(1).map((sample,i)=>Math.abs(sample.width-samples[i].width));
    return {min:Math.min(...distances),max:Math.max(...distances),start:samples[0].width,end:samples.at(-1).width,middle:middle.width,jump:Math.max(...jumps)};
  });
  assert.ok(trackSpacing.min>9.7 && trackSpacing.max<16.6, 'Rows stay compact throughout the taper');
  assert.ok(trackSpacing.middle>trackSpacing.start*1.65 && trackSpacing.middle<trackSpacing.start*1.70 && trackSpacing.middle<trackSpacing.end*1.70, 'Ribbon widens visibly, by about 69%, at the middle');
  assert.ok(trackSpacing.jump<.6, 'Ribbon width changes smoothly between neighbouring samples');
  assert.equal(await page.locator('.text-ribbon linearGradient').count(), 0, 'Ribbon has no darkening gradient');
  assert.equal(await page.locator('.text-ribbon g').getAttribute('fill'), '#f1f0ed', 'All ribbon text shares one brightness');
  const snapshotCenterline = () => page.locator('.text-ribbon').evaluate(svg => {
    const paths=[...svg.querySelectorAll('path')].map(path=>path.getAttribute('d').slice(1).split(' L').map(point=>point.split(',').map(Number)));
    const centres=paths[0].map(([x,y],i)=>[(x+paths.at(-1)[i][0])/2,(y+paths.at(-1)[i][1])/2]);
    return [200,500,1000,1600,2200,3000].map(y=>{
      const index=centres.findIndex(point=>point[1]<=y);
      const a=centres[index-1], b=centres[index];
      return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
    });
  });
  const homeCentre = await snapshotCenterline();
  const headingBefore=await page.locator('h1').boundingBox();
  await page.evaluate(() => {
    const value = document.querySelector('.word-value');
    const word = value.parentElement;
    const style = () => {
      const css = getComputedStyle(value);
      return [css.fontFamily, css.fontSize, css.fontWeight, css.fontStyle, css.color, css.letterSpacing];
    };
    window.scrambleCheck = { length: value.textContent.length, style: style(), frames: [] };
    const observer = new MutationObserver(() => {
      if (word.classList.contains('is-glitching')) window.scrambleCheck.frames.push({text:value.textContent,length:value.textContent.length,style:style()});
      else if (window.scrambleCheck.frames.length) observer.disconnect();
    });
    observer.observe(value, {childList:true,subtree:true,characterData:true});
  });
  await page.waitForFunction(()=>document.querySelector('.glitch-word').classList.contains('is-glitching'));
  await page.waitForFunction(()=>document.querySelector('.word-value').textContent!=='posterity.');
  assert.match(await page.locator('.word-value').innerText(), /[!?<>/{}\[\]#%&*+_░]/, 'Scramble uses the full glitch character set');
  await page.waitForFunction(()=>!document.querySelector('.glitch-word').classList.contains('is-glitching'));
  const changedWord=await page.locator('.word-value').innerText();
  const scrambleCheck = await page.evaluate(() => window.scrambleCheck);
  assert.ok(scrambleCheck.frames.length >= 10, 'Observe multiple random-character frames');
  assert.match(scrambleCheck.frames.map(frame => frame.text).join(''), /[!?<>/{}\[\]#%&*+_]/, 'Light-shade blocks are mixed with the other glitch symbols');
  for (const frame of scrambleCheck.frames) {
    assert.equal(frame.length, scrambleCheck.length, 'Scramble keeps the outgoing word length');
    assert.deepEqual(frame.style, scrambleCheck.style, 'Scramble keeps the same font, size, weight and colour');
  }
  assert.ok(['posterity.','blog posts.','PB&J.','white girl pop.','percussion.','progress.','Prague.'].includes(changedWord));
  await page.waitForFunction(()=>!document.querySelector('.glitch-word').classList.contains('is-glitching'));
  assert.equal((await page.locator('h1').boundingBox()).height,headingBefore.height,'Word changes must not shift the layout');
  assert.deepEqual(await snapshotRibbon(),homeRibbon,'Heading animation must not shift ribbon');
  for (const section of ['thousings','musings','tabsings','ramblings','vibesings','home']) {
    await page.locator(`[data-section="${section}"]`).click();
    await page.waitForFunction(key => document.querySelector(`[data-section="${key}"]`).getAttribute('aria-current') === 'page', section);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const centre = await snapshotCenterline();
    centre.forEach((value,index)=>assert.ok(Math.abs(value-homeCentre[index])<.1, `Ribbon centre curve stays fixed on ${section}`));
  }
  assert.equal(await page.locator('.scrapbook').isVisible(), true);
  await page.mouse.move(1200,100);
  await page.waitForTimeout(700);
  const stillFlower = await page.locator('[data-section="home"] .flower').evaluate(e => getComputedStyle(e).transform);
  const flowerAngle = await page.locator('[data-section="home"] .flower').evaluate(e => Number(e.dataset.angle || 0));
  await page.locator('[data-section="home"]').hover();
  // Sample the hover animation explicitly; a busy browser can otherwise finish
  // the entire 600ms spin between two automation calls.
  await page.locator('[data-section="home"] .flower').evaluate(e => {
    const animation = flowerAnimations.get(e);
    animation.pause();
    animation.currentTime = 150;
  });
  assert.equal(await page.locator('[data-section="home"] .flower').evaluate(e => Number(e.dataset.angle)), flowerAngle + 180);
  const rotatingFlower = await page.locator('[data-section="home"] .flower').evaluate(e => getComputedStyle(e).transform);
  await page.locator('[data-section="home"] .flower').evaluate(e => { flowerAnimations.get(e).currentTime = 450; });
  const rotatedFlower = await page.locator('[data-section="home"] .flower').evaluate(e => getComputedStyle(e).transform);
  assert.notEqual(stillFlower, rotatingFlower);
  assert.notEqual(rotatingFlower, rotatedFlower);
  await page.locator('[data-section="home"] .flower').evaluate(e => flowerAnimations.get(e).finish());
  const finishedFlower = await page.locator('[data-section="home"] .flower').evaluate(e=>getComputedStyle(e).transform);
  await page.mouse.move(1200,100);
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-section="home"] .flower').evaluate(e=>getComputedStyle(e).transform), finishedFlower, 'Leaving the flower must not start a reverse spin');
  assert.equal(await page.locator('[data-section="home"] .flower').evaluate(e=>e.getAnimations().length),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('[data-section="home"] .flower').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.sidebar .brand').hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .logo-orange')).opacity === '1');
  assert.equal(await page.locator('.sidebar .logo-orange').evaluate(e => getComputedStyle(e).opacity), '1');
  await page.locator('[data-section="musings"]').click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-section="musings"] .flower')).opacity === '1');
  assert.equal(await page.locator('[data-section="musings"]').getAttribute('aria-current'), 'page');
  assert.match(await page.locator('h1').innerText(), /wondering/);
  assert.equal(await page.locator('[data-section="musings"] .flower').evaluate(e => getComputedStyle(e).opacity), '1');
  await Promise.all([page.waitForEvent('load'), page.locator('.sidebar .brand').click()]);
  assert.ok(page.url().endsWith('#home'), 'Sidebar logo returns Home');
  await page.waitForFunction(() => document.documentElement.classList.contains('site-ready'));
  assert.match(await page.locator('h1').innerText(), /progeny/);
  const before = await page.locator('.sidebar').boundingBox();
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);
  const after = await page.locator('.sidebar').boundingBox();
  assert.equal(before.y, after.y);
  assert.equal(before.x, after.x);

  // The opening collage now contains photographs only.
  await page.locator('[data-section="home"]').click();
  assert.equal(await page.locator('.polaroid video').count(),0);
  assert.equal(await page.locator('.film-control').count(),0);
  assert.equal(await page.locator('[data-gallery="opening"] .polaroid img').count(),await page.evaluate(()=>siteContent.polaroids.length));
  await page.locator('[data-section="musings"]').click();
  await page.waitForFunction(()=>document.querySelector('.scrapbook').hidden);
  await page.locator('[data-section="home"]').click();
  await page.waitForFunction(()=>!document.querySelector('.scrapbook').hidden);
  assert.deepEqual(errors,[]);
  console.log('PASS: layout, typography, ribbon geometry, glitch, navigation, hover, photo-only collage and reduced motion.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
