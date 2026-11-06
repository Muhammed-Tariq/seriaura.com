const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const {createServer}=require('./serve.cjs');

(async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    for(const [name,engine,options] of [['edge',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
      const browser=await engine.launch(options);
      try{
        const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
        await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
        const page=await context.newPage(),errors=[],fonts=[];
        page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/\.(ttf|otf)/.test(request.url()))fonts.push(request.url());});
        await page.goto(base+'/?showOptions=1');await page.waitForFunction(()=>window.SiteOptions?.open&&window.NowArchive);
        await page.evaluate(()=>window.siteReady);await page.locator('html.entrance-complete').waitFor();
        const panel=page.locator('#site-options');
        assert.equal(await page.locator('#options-design,.options-design').count(),0);
        assert.equal(await panel.getAttribute('data-design'),'window');
        await page.getByRole('tab',{name:'Background',exact:true}).click();
        assert(await page.locator('#settings-background').isVisible());assert(!(await page.locator('#settings-glow').isVisible()));
        await page.keyboard.press('ArrowRight');assert(await page.locator('#settings-motion').isVisible());
        await page.keyboard.press('Home');assert(await page.locator('#settings-glow').isVisible());
        await page.locator('#option-strength').fill('37');await page.locator('#option-strength').dispatchEvent('input');
        assert.equal(await page.evaluate(()=>SiteOptions.get().strength),37);
        const initial=await panel.boundingBox();
        await page.locator('.options-maximize').click();assert(Math.abs((await panel.boundingBox()).width-708)<2);
        await page.locator('.options-maximize').click();assert.equal(Math.round((await panel.boundingBox()).width),Math.round(initial.width));
        await page.locator('.options-header').focus();await page.keyboard.press('ArrowLeft');assert((await panel.boundingBox()).x<initial.x);
        for(const width of [320,390,1440]){
          await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
          const box=await panel.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'window fits '+width);
          assert.equal(await panel.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
          await panel.screenshot({path:'.preview-refresh/options-window-v2-'+name+'-'+width+'.png'});
        }
        await page.locator('.options-minimize').click();await panel.waitFor({state:'hidden'});
        await page.locator('.options-dock').click();await panel.waitFor({state:'visible'});
        await page.locator('.gradient-editor summary').click();await page.locator('#glow-picker').click();
        assert(await page.locator('#custom-color-picker').isVisible());await page.keyboard.press('Escape');
        assert(!(await page.locator('#custom-color-picker').isVisible()));assert(await panel.isVisible());
        await page.reload();await page.waitForFunction(()=>window.SiteOptions?.open);
        assert.equal(await panel.getAttribute('data-design'),'window');assert.equal(await page.evaluate(()=>SiteOptions.get().strength),37);
        await page.evaluate(()=>SiteOptions.close());await panel.waitFor({state:'hidden'});
        {
          const trigger=page.locator('#now-archive-entry button');await trigger.click();
          await page.locator('.history-version').first().waitFor();
          await page.locator('[data-month="2026-10"]').click();
          await page.waitForFunction(()=>document.querySelector('#now-copy').textContent.includes('Hammersmith Apollo'));
          assert(await page.locator('.history-menu').isVisible());
          await page.locator('.history-version[data-month="2026-11"]').click();
          await page.waitForFunction(()=>document.querySelector('#now-copy').textContent.includes('constitutional classifiers'));
          assert(await page.locator('.history-menu').isVisible());
          await page.locator('.history-menu').screenshot({path:`.preview-refresh/archive-brace-${name}.png`});
          await page.keyboard.press('Escape');await page.locator('.history-menu').waitFor({state:'hidden'});
          assert(await trigger.evaluate(el=>el===document.activeElement));
        }
        for(const width of [320,390,1440]){
          await page.setViewportSize({width,height:1000});const trigger=page.locator('#now-archive-entry button');await trigger.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
          const copy=await page.locator('#now-copy').boundingBox(),button=await trigger.boundingBox(),brace=await page.locator('.history-brace').boundingBox();
          if(width<=1100){assert(button.y>=copy.y+copy.height-1);assert(button.height>=44);}else{assert(button.x>=copy.x+copy.width-1);assert(Math.abs(brace.height-copy.height)<2);}assert(button.x+button.width<=width);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          await page.screenshot({path:'.preview-refresh/history-context-'+name+'-'+width+'.png'});
        }
        // Stationary hover and reduced motion are covered by verify-history-refinements.
        await page.goto(base+'/brand-guidelines/');await page.evaluate(()=>document.fonts.ready);
        assert.equal(await page.locator('.lyric-field,script[src*="text-background"]').count(),0);
        assert.match(await page.locator('.pronunciation').first().evaluate(el=>getComputedStyle(el).fontFamily),/IBM Plex Mono/);
        await page.screenshot({path:'.preview-refresh/brand-plain-'+name+'.png'});
        assert.equal(await page.locator('.brand-intro,.brand-hero').count(),0);assert.equal(await page.locator('main h1').textContent(),'Preface');
        await page.goto(base+'/counting/');await page.locator('.countdown-event').first().waitFor();
        assert.equal(await page.locator('[data-event=redemption],[data-event=absolution],[data-event=tallinn]').count(),0);
        assert.equal(await page.locator('[data-event=ironman]').count(),1);
        await page.goto(base+'/writings/why-im-an-atheist/');await page.locator('.footnote-trigger').first().waitFor();
        assert.equal(await page.locator('.footnote-trigger').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 139, 25)');
        await page.locator('.footnote-trigger').first().click();assert(await page.locator('.popup-note-number:visible').count()>0);
        assert.equal(await page.locator('.popup-note-number:visible').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 139, 25)');
        await page.goto(base+'/');await page.evaluate(()=>window.siteReady);await page.locator('html.entrance-complete').waitFor();
        await page.emulateMedia({reducedMotion:'no-preference'});
        const photo=page.locator('.polaroid img[data-image-preview]').first();await photo.scrollIntoViewIfNeeded();await photo.evaluate(el=>el.decode());
        const immediate=await photo.evaluate(el=>{
          const original=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=()=>new Promise(()=>{});
          el.click();const preview=document.querySelector('.image-preview'),animation=preview?.querySelector('.image-preview-frame').getAnimations()[0];
          HTMLImageElement.prototype.decode=original;return {open:preview?.open,running:animation?.playState};
        });
        assert.deepEqual(immediate,{open:true,running:'running'},'zoom starts synchronously even if decode would hang');
        await page.keyboard.press('Escape');await page.locator('.image-preview').waitFor({state:'hidden'});
        await page.goto(base+'/design-options/interface.html');
        await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.SiteOptions?.open);
        assert.equal(await page.locator('[data-opening]').count(),30);
        await page.locator('[data-design=window]').click();
        const preview=page.frameLocator('#study-frame');assert.equal(await preview.locator('#site-options').getAttribute('data-design'),'window');
        await page.locator('[data-study=opening]').click();await page.locator('[data-opening="0"]').click();
        assert.equal(await preview.locator('#opening-sentence').textContent(),'There are things about me I’d rather put into words than leave to inference.');
        await page.locator('#original-opening').click();assert.equal(await preview.locator('#opening-sentence').textContent(),"Talking about myself is something I've always found difficult.");
        await page.locator('[data-study=archive]').click();await page.locator('[data-entry=brace]').click();
        await page.locator('#open-archive').click();await preview.locator('.history-version').first().waitFor();
        assert(await preview.locator('.history-brace').isVisible());
        await page.setViewportSize({width:390,height:844});await page.locator('[data-size=phone]').click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.screenshot({path:`.preview-refresh/interface-study-${name}-phone.png`,fullPage:true});
        await page.setViewportSize({width:1440,height:1000});await page.locator('[data-size=desktop]').click();await page.locator('[data-study=options]').click();
        await page.screenshot({path:`.preview-refresh/interface-study-${name}.png`});
        assert(fonts.length>0);assert(fonts.some(url=>url.includes('SourceCodePro')));assert(fonts.some(url=>url.includes('IBMPlexMono')));assert(!fonts.some(url=>/reddit/i.test(url)));
        assert.deepEqual(errors,[]);
        console.log(name+': restored fonts, window chrome/tabs, history brace/focus, orange notes, plain brand page and immediate zoom passed');
      }finally{await browser.close();}
    }
    const entries=JSON.parse(fs.readFileSync('now-archive.json','utf8'));
    assert.deepEqual(entries.map(item=>item.month),['2026-11','2026-10']);
  }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
