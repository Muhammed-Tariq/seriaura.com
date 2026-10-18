const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');
const posts = require('../writings/posts.json');
(async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/';let browser;
  try {
    browser=await chromium.launch({channel:'msedge'});
    const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const ready=()=>page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
    for(const width of [1920,1440,1101,768,390,320]) {
      await page.setViewportSize({width,height:900});await page.goto(base);await ready();
      assert.equal(await page.locator('.home-writings .post-importance>span').count(),0,'Overview has icons without descriptors');
      assert.deepEqual(await page.locator('.home-writings [data-growth]').evaluateAll(els=>els.map(el=>el.dataset.growth)),['evergreen','budding','seedling','seedling']);
      assert.equal(await page.locator('#thousings').evaluate(el=>getComputedStyle(el).textAlign),width>1100?'right':'start');
      const geometry=await page.evaluate(()=>{
        const logo=document.querySelector('.sidebar .brand-crop').getBoundingClientRect(),nav=document.querySelector('.sidebar nav').getBoundingClientRect();
        return {logo:logo.toJSON(),nav:nav.toJSON(),sidebar:document.querySelector('.sidebar').getBoundingClientRect().toJSON()};
      });
      if(width>1100) {
        assert.ok(Math.abs(geometry.logo.width/geometry.sidebar.width-1.16)<.01,'Sidebar logo uses the smaller desktop size');
        assert.ok(Math.abs(geometry.nav.x+geometry.nav.width/2-geometry.logo.x-geometry.logo.width/2-18*width/1920)<1,'Navigation is shifted right beneath the logo');
        for(const section of ['musings','thousings','home']) {
          await page.locator('[data-section="'+section+'"]').click();
          await page.waitForFunction(section=>document.querySelector('[data-section="'+section+'"]').hasAttribute('aria-current'),section);
          assert.ok(Math.abs((await page.locator('.sidebar nav').boundingBox()).x-geometry.nav.x)<1,'Changing active labels does not shift the menu');
        }
      }
      await page.locator('.footer-brand').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.querySelector('.sidebar').classList.contains('at-footer'));
      assert.equal(await page.locator('.sidebar .brand').evaluate(el=>el.inert),true);
      const footerLogo=await page.locator('.footer-brand .brand-crop').boundingBox();
      assert.ok(footerLogo.x>=0 && footerLogo.x+footerLogo.width<=width,'Footer logo stays inside the viewport');
      if(width>1100) {
        await page.waitForFunction(()=>document.querySelector('.sidebar').classList.contains('at-footer'));
        assert.equal(await page.locator('.sidebar .brand').evaluate(el=>getComputedStyle(el).opacity),'0');
        assert.equal(await page.locator('.sidebar .brand').evaluate(el=>el.inert),true);
        const top=(await page.locator('.sidebar nav').boundingBox()).y;
        assert.ok(top>=24&&top<=73,'Navigation parks at the top while the footer logo is visible');
      }
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>!document.querySelector('.sidebar').classList.contains('at-footer'));
      assert.equal(await page.locator('.sidebar .brand').evaluate(el=>getComputedStyle(el).opacity),'1');
      await page.goto(base+'writings/why-im-an-atheist/');await ready();
      assert.equal(await page.locator('.post-header .post-importance>span').innerText(),'Considerable');
      assert.equal(await page.locator('.post-header .post-pin').count(),0);
      const readingSize=await page.locator('.post-body').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      assert.ok(Math.abs(readingSize-(width>1100?22.99:17))<.02,'Mobile article type avoids the desktop enlargement');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      const ref=page.locator('.footnote-trigger').nth(2),note=page.locator('.article-sidenote').nth(2);
      if(width>=1600) {
        assert.equal(await note.isVisible(),true);
        assert.equal(await ref.getAttribute('aria-expanded'),null);
        assert.equal(await note.locator('.sidenote-content p').count(),2);
        await ref.click();
        assert.equal(await page.locator('.footnote-popup:visible').count(),0);
        const rects=await page.locator('.article-sidenote').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
        for(let i=1;i<rects.length;i++)assert.ok(rects[i].top>=rects[i-1].bottom+15,'Margin notes never overlap');
      } else {
        assert.equal(await note.isVisible(),false);
        await ref.click();
        const popup=page.locator('#'+await ref.getAttribute('aria-controls'));
        assert.equal(await popup.isVisible(),true);
        assert.equal(await popup.getAttribute('class'),'footnote-popup');
        const box=await popup.boundingBox();assert.ok(box.x>=11&&box.x+box.width<=width-11);
        await page.keyboard.press('Escape');assert.equal(await popup.isVisible(),false);
      }
      if([1440,390].includes(width))await page.screenshot({path:'.preview-refresh/reading-layout-'+width+'.png'});
      console.log(width+'px: sidebar size, rightward alignment, footer state, metadata, reading size and footnotes passed');
    }
    // Pinch zoom must allow reading and keep the shared popups within the visual viewport.
    await page.setViewportSize({width:1920,height:900});await page.goto(base+'writings/why-im-an-atheist/');await ready();
    const session=await page.context().newCDPSession(page);
    await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
    await page.waitForFunction(()=>!document.body.classList.contains('article-margin-notes'));
    assert.equal(await page.evaluate(()=>visualViewport.scale),2);
    await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.waitForFunction(()=>document.body.classList.contains('article-margin-notes'));
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');
    assert.equal(await page.locator('.post-body').evaluate(el=>getComputedStyle(el).fontSize),'38px','Article text respects enlarged default text size');
    await page.evaluate(()=>document.documentElement.style.fontSize='');
    for(const post of posts) {
      await page.goto(base+'writings/'+post.slug+'/');await ready();
      for(const width of [1440,390,1440]) {
        await page.setViewportSize({width,height:900});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        assert.equal(await page.locator('[data-footnote]').evaluateAll(refs=>refs.every(ref=>{
          const clean=s=>s.replace(/\s+/g,' ').trim();
          const button=ref.querySelector('button'),note=document.getElementById(button.getAttribute('aria-controls'));
          return clean(ref.querySelector('template').content.textContent)===clean((note.querySelector('.sidenote-content')||note).textContent);
        })),true,'Responsive note changes preserve all text');
      }
    }
    assert.deepEqual(errors,[]);
    console.log('Pinch zoom, enlarged text, all article note content and breakpoint changes passed');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
