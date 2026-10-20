const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');

async function run() {
  const server = createServer();
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge'});
    const context = await browser.newContext({reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
    const page = await context.newPage(), errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await fs.mkdir('.preview-refresh',{recursive:true});
    for (const width of [320,390,600,601,768,1101,1440,1920]) {
      await page.setViewportSize({width,height:1000});
      await page.goto(base);
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      const pager = page.locator('.social-page'), grid = page.locator('.social-links');
      await pager.scrollIntoViewIfNeeded();
      const bounds = await grid.boundingBox();
      assert.ok(Math.abs(bounds.width-bounds.height)<1,'Grid stays square');
      assert.equal(await pager.textContent(),'1');
      assert.equal(await page.locator('.social-menu,.social-label').count(),0,'No menu or hover labels');
      const firstPage = await grid.locator('a,button').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')));
      assert.equal(firstPage.length,9);
      await pager.focus();
      await page.keyboard.press('Enter');
      assert.equal(await pager.textContent(),'2');
      assert.equal(await pager.evaluate(el=>el===document.activeElement),true,'Keyboard focus stays on the pager');
      assert.match(await page.locator('.social-page-status').textContent(),/page 2 of 2/);
      assert.equal(await grid.locator(':scope > :nth-child(5)').getAttribute('class'),'social-link social-page');
      assert.equal(await grid.locator(':scope > a').count(),7,'Second page contains all seven profile links');
      assert.equal(await grid.locator('.social-empty').count(),0,'Both pages are completely filled');
      assert.equal(await grid.locator('.social-empty').evaluateAll(els=>els.every(el=>el.tabIndex === -1 && el.getAttribute('aria-hidden')==='true')),true,'Empty cells are decorative and skipped by keyboard navigation');
      const secondBounds = await grid.boundingBox();
      for (const key of ['x','y','width','height']) assert.ok(Math.abs(bounds[key]-secondBounds[key])<.1,'Switching pages never shifts the grid');
      const goodreads = grid.getByRole('link',{name:'Goodreads',exact:true});
      assert.equal(await goodreads.getAttribute('href'),'https://www.goodreads.com/user/show/193354807-muhammed-tariq');
      assert.equal(await goodreads.getAttribute('target'),'_blank');
      for (const [name,href] of [
        ['YouTube','https://www.youtube.com/@seriaura'],
        ['Spotify','https://open.spotify.com/user/h32v6o66m76ypv7ztlzv1q0pc?si=60d42ea38a4e4dc0'],
        ['Letterboxd','https://letterboxd.com/Seriaura/'],
        ['Steam','https://steamcommunity.com/id/Seriaura/'],
        ['GitHub','https://github.com/Muhammed-Tariq'],
        ['osu!','https://osu.ppy.sh/users/18736758']
      ]) {
        const link=grid.getByRole('link',{name,exact:true});
        assert.equal(await link.getAttribute('href'),href);
        assert.equal(await link.getAttribute('target'),'_blank');
        assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
      }
      assert.equal(await grid.locator('svg.social-icon').count(),8,'Every platform has inline, independently animated artwork');
      if(width<=1100)assert.ok(bounds.width>=206,'Mobile social grid has larger cells');
      const snapchat=grid.getByRole('button',{name:'Copy Snapchat: seriaura',exact:true});
      await snapchat.click();
      await page.waitForFunction(()=>document.querySelector('.copy-status').textContent==='Snapchat copied: seriaura');
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'seriaura');
      const logo = await page.locator('.footer-brand').boundingBox();
      assert.ok(logo.x>=0 && logo.x+logo.width<=width,'Larger logo fits the screen');
      const numberFont = await pager.evaluate(el=>[getComputedStyle(el).fontFamily,getComputedStyle(el).fontWeight]);
      assert.match(numberFont[0],/Space Grotesk/);assert.equal(numberFont[1],'600');
      if([390,1440].includes(width)) {
        await page.locator('.footer-bottom small').click();await page.mouse.move(0,0);
        await page.locator('.site-footer').screenshot({path:`.preview-refresh/footer-page-2-${width}.png`});
      }
      await pager.focus();await page.keyboard.press('Space');
      assert.equal(await pager.textContent(),'1','Pager cycles back to the first page');
      assert.deepEqual(await grid.locator('a,button').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label'))),firstPage);
      for (const control of await grid.locator(':scope > .social-link').all()) {
        const before = await control.boundingBox();await control.hover();const after = await control.boundingBox();
        assert.ok(Math.abs(before.y-after.y)<.1,'Highlights stay inside their cells');
        assert.ok(await control.getAttribute('aria-label'));
        assert.notEqual(await control.evaluate(el=>getComputedStyle(el,'::before').maskImage),'none','Edge highlights retain their fade');
      }
      if([390,1440].includes(width)) {
        await page.locator('.footer-bottom small').click();await page.mouse.move(0,0);
        await page.locator('.site-footer').screenshot({path:`.preview-refresh/footer-page-1-${width}.png`});
      }
      for (const [name,value] of [['Email','hi@muhammedtariq.com'],['Discord','seriaura']]) {
        await page.getByRole('button',{name:`Copy ${name}: ${value}`,exact:true}).click();
        await page.waitForFunction(value=>document.querySelector('.copy-status').textContent.includes(`copied: ${value}`),value);
        assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),value);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      console.log(`${width}px: numbered pages, empty marks, stable layout, keyboard, clipboard, fades and overflow passed`);
    }
    await page.goto(base);
    await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
    await page.emulateMedia({reducedMotion:'no-preference'});
    const pager = page.locator('.social-page');
    await pager.click();
    assert.equal(await page.locator('.social-links').getAttribute('aria-busy'),'true');
    const animatedIcons = await page.locator('.social-links').evaluate(grid=>grid.getAnimations({subtree:true}).filter(animation=>animation.effect.target.matches('.social-icon,.empty-icon,.social-page-number') && animation.effect.getKeyframes().some(frame=>frame.opacity==='0')).length);
    assert.equal(animatedIcons,9,'Every icon, including the centre number, animates during the page change');
    await page.waitForFunction(()=>document.querySelector('.social-links').dataset.page==='2' && !document.querySelector('.social-links').hasAttribute('aria-busy'));
    assert.equal(await pager.evaluate(el=>el===document.activeElement),true,'Animated transition retains keyboard focus');
    await page.evaluate(()=>{const pager=document.querySelector('.social-page');pager.click();pager.click();pager.click()});
    await page.waitForFunction(()=>document.querySelector('.social-links').dataset.page==='1' && !document.querySelector('.social-links').hasAttribute('aria-busy'));
    const expected=[['envelope','mail-arrive'],['linkedin-in','linkedin-hop'],['globe',null],['substack','stack-sort'],['x','x-cross'],['instagram','camera-shutter'],['discord','discord-glance'],['strava','strava-climb'],['goodreads','goodreads-page'],['snapchat',null],['youtube','youtube-play'],['spotify','spotify-beat'],['letterboxd','letterboxd-bounce'],['steam','steam-cycle'],['github',null],['osu','osu-hit']];
    for(let group=0;group<2;group++){
      if(group){await pager.click();await page.waitForFunction(()=>!document.querySelector('.social-links').hasAttribute('aria-busy'));}
      for(const [platform,animation] of expected.slice(group*8,group*8+8)){
        await page.mouse.move(0,0);
        const cell=page.locator(`[data-platform="${platform}"]`),before=await cell.boundingBox();
        const beforePaths=await cell.locator('path').evaluateAll(paths=>paths.map(p=>p.getAttribute('d')));
        await cell.hover();await page.waitForTimeout(100);
        const names=await cell.evaluate(el=>el.getAnimations({subtree:true}).map(a=>a.animationName).filter(Boolean));
        if(animation)assert.ok(names.includes(animation),`${platform} animates its own icon elements (${names})`);
        else {
          const paths=await cell.locator('path').evaluateAll(paths=>paths.map(p=>p.getAttribute('d')));
          assert.notDeepEqual(paths,beforePaths,`${platform} animates its vector outline`);
          assert.ok(paths.every(d=>!d.includes('NaN')&&!d.includes('Infinity')),`${platform} retains valid geometry`);
        }
        assert.deepEqual(await cell.boundingBox(),before,'Custom motion never moves the cell');
        assert.equal(await cell.locator('.social-icon').evaluate(el=>getComputedStyle(el).transform),'none','The old whole-icon tilt is removed');
        await page.mouse.move(0,0);
        assert.ok(await cell.evaluate(el=>el.classList.contains('is-animating')),`${platform} finishes smoothly after the pointer leaves`);
        await page.waitForFunction(platform=>!document.querySelector(`[data-platform="${platform}"]`).classList.contains('is-animating'),platform);
        assert.equal(await cell.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.animationName).length),0,'Completed gestures stop all animation work');
      }
    }
    // Keyboard users get the same animation on the current page.
    await page.mouse.move(0,0);await page.locator('[data-platform="youtube"]').focus();await page.keyboard.press('Tab');
    assert.equal(await page.locator('[data-platform="spotify"]').evaluate(el=>el.matches(':focus-visible')),true);
    assert.ok(await page.locator('[data-platform="spotify"]').evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.animationName==='spotify-beat')));
    await pager.click();await page.waitForFunction(()=>document.querySelector('.social-links').dataset.page==='1'&&!document.querySelector('.social-links').hasAttribute('aria-busy'));
    await pager.click();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('.social-links').dataset.page==='2' && !document.querySelector('.social-links').hasAttribute('aria-busy'));
    assert.equal(await page.locator('.social-links').evaluate(grid=>grid.getAnimations({subtree:true}).length),0,'Reduced motion cancels the transition and settles on the requested page');
    console.log('All-icon page transitions, 16 custom hover motions, keyboard focus and reduced-motion switching passed');
    for(const route of ['payment/','brand-guidelines/','writings/excellence-born-of-insecurity/']) {
      await page.goto(base+route);await page.locator('.social-page').click();
      assert.equal(await page.locator('.social-page').textContent(),'2');
      assert.equal(await page.locator('.social-links').getByRole('link',{name:'Goodreads',exact:true}).isVisible(),true);
      assert.equal(await page.locator('.social-links').getByRole('link',{name:'GitHub',exact:true}).isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1920);
    }
    assert.deepEqual(errors,[]);
    console.log('Shared paginated footer passed on information and article pages');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1});
