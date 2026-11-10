const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium,webkit}=require('playwright');const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{for(const [name,engine,options] of [['edge',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
   await page.goto(base+'/design-options/article-age.html');
   const frame=page.frameLocator('#article-preview');await frame.locator('.article-age').waitFor();
   assert.equal(await page.locator('.choice').count(),13);
   assert.equal(await page.locator('#refined-choices .choice').count(),3);
   assert.equal(await page.locator('#countdown-choices .choice').count(),4);
   assert.deepEqual(await page.evaluate(()=>[
    ArticleAge.ageMonths('2026-05-09T12:00:00Z',new Date('2026-11-09T11:59:59Z')),
    ArticleAge.ageMonths('2026-05-09T12:00:00Z',new Date('2026-11-09T12:00:00Z')),
    ArticleAge.ageMonths('2026-01-31T00:00:00Z',new Date('2026-02-28T00:00:00Z')),
    ArticleAge.ageMonths('2024-02-29T00:00:00Z',new Date('2025-02-28T00:00:00Z')),
    ArticleAge.ageMonths('invalid'),ArticleAge.ageMonths('2027-01-01T00:00:00Z'),ArticleAge.ageMonths(undefined)
   ]),[5,6,1,12,null,null,null]);
   assert.deepEqual(await page.evaluate(()=>[
    ArticleAge.elapsed('2026-11-08T10:57:56Z',Date.parse('2026-11-09T12:00:00Z')),
    ArticleAge.elapsed('2026-11-09T12:00:01Z',Date.parse('2026-11-09T12:00:00Z')),
    ArticleAge.elapsed('invalid')
   ]),[{days:1,hours:1,minutes:2,seconds:4},null,null]);
   for(const style of ['elapsed-line','elapsed-wash','elapsed-orbit']){
    await page.locator('[data-style="'+style+'"]').click();
    assert.equal(await frame.locator('.article-age').getAttribute('data-age-style'),style);
    assert.equal(await frame.locator('.age-summary').textContent(),'This article is 10 months old.');
    assert.equal(await frame.locator('[data-age-unit="days"]').textContent(),'306');
    assert.equal(await frame.locator('.age-compact-clock [data-age-unit="seconds"]').count(),1);
   }
   await page.locator('.original-studies>summary').click();
   for(const style of ['daymark','elapsed','ember','whisper']){
    await page.locator('[data-style="'+style+'"]').click();
    assert.equal(await frame.locator('.article-age').getAttribute('data-age-style'),style);
    assert.equal(await frame.locator('[data-age-unit="days"]').textContent(),'306');
    assert.equal(await frame.locator('.age-summary').textContent(),'This article is 10 months old.');
   }
   assert.deepEqual(await page.evaluate(()=>[1,12,24].map(months=>{
    const date=new Date();date.setUTCMonth(date.getUTCMonth()-months);date.setUTCDate(date.getUTCDate()-1);
    return ArticleAge.create('elapsed',months,date.toISOString()).querySelector('.age-summary').textContent;
   })),['This article is 1 month old.','This article is 1 year old.','This article is 2 years old.']);
   for(const style of ['silver','sage','blue','amber','paper','signal']){
    await page.locator('[data-style="'+style+'"]').click();
    assert.equal(await frame.locator('.article-age').getAttribute('data-age-style'),style);
   }
   assert.equal(await page.evaluate(()=>ArticleAge.get().style),'elapsed-orbit','Small orbit is the default; preview does not persist');
   await page.locator('#apply').click();await page.reload();await frame.locator('.article-age').waitFor();
   assert.equal(await frame.locator('.article-age').getAttribute('data-age-style'),'signal');
   await page.locator('#threshold').selectOption('12');assert.equal(await frame.locator('.article-age').count(),0);
   await page.locator('#threshold').selectOption('1');await page.locator('#article').selectOption('why-im-an-atheist');
   await frame.getByRole('heading',{name:"Why I'm an atheist",exact:true}).waitFor();await frame.locator('.article-age').waitFor();assert.match(await frame.locator('.article-age').textContent(),/3 months/);
   await page.locator('#threshold').selectOption('6');assert.equal(await frame.locator('.article-age').count(),0);
   await page.locator('#article').selectOption('excellence-born-of-insecurity');await frame.getByRole('heading',{name:'Excellence, born of insecurity',exact:true}).waitFor();await frame.locator('.article-age').waitFor();
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Selector fits '+width);
   }
   await page.setViewportSize({width:1440,height:1000});await page.locator('[data-style="elapsed-line"]').click();
   await page.locator('.original-studies>summary').click();await page.locator('#apply').click();
   await page.locator('#article-preview').scrollIntoViewIfNeeded();
   const before=await frame.locator('[data-age-unit="seconds"]').textContent();
   await page.clock.runFor(2000);
   assert.notEqual(await frame.locator('[data-age-unit="seconds"]').textContent(),before,'Live clock ticks');
   await fs.mkdir('.preview-refresh',{recursive:true});await page.screenshot({path:'.preview-refresh/article-age-studies-'+name+'.png',fullPage:true});
   await page.goto(base+'/writings/excellence-born-of-insecurity/');await page.locator('.article-age').waitFor();
   assert.equal(await page.locator('.article-age').getAttribute('data-age-style'),'elapsed-line','Saved refinement applies to normal articles');
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    assert(await page.locator('.article-age').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'Article notice fits '+width);
   }
   for(const style of ['elapsed-line','elapsed-wash','elapsed-orbit','daymark','elapsed','ember','whisper']){
    await page.setViewportSize({width:320,height:1000});await page.evaluate(style=>ArticleAge.preview({style,months:6}),style);
    assert(await page.locator('.article-age').evaluate(el=>el.scrollWidth<=el.clientWidth),'Counter fits small phone: '+style);
    if(await page.locator('.age-day-tile').count())assert.equal(await page.locator('.age-day-tile').evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
    if(style.startsWith('elapsed-')){
     assert(await page.locator('.article-age').evaluate(el=>el.getBoundingClientRect().height<95),'Refinement stays compact');
     await page.screenshot({path:'.preview-refresh/article-age-'+style+'-'+name+'.png'});
    }
   }
   await page.locator('.age-details summary').focus();assert(await page.locator('.age-exact').isVisible(),'Keyboard focus reveals precise time');
   await page.locator('.age-details summary').click();assert(await page.locator('.age-exact').isVisible(),'Tap pins precise time');
   await page.locator('.age-details summary').click();assert(!(await page.locator('.age-exact').isVisible()),'Second tap closes precise time');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(()=>ArticleAge.preview({style:'daymark',months:6}));
   assert.equal(await page.locator('.age-day-tile').evaluate(el=>getComputedStyle(el,'::before').animationName),'age-orbit');
   await page.locator('.blog-source').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.article-age').classList.contains('age-paused'));
   assert.equal(await page.locator('.age-day-tile').evaluate(el=>getComputedStyle(el,'::before').animationPlayState),'paused');
   await page.setViewportSize({width:390,height:1000});await page.evaluate(async()=>{ArticleAge.preview({style:'elapsed-orbit',months:6});await document.fonts.ready;window.scrollTo({top:0,behavior:'instant'});});await page.waitForTimeout(400);await page.screenshot({path:'.preview-refresh/article-age-mobile-'+name+'.png'});
   await page.goto(base+'/');await page.locator('html.entrance-complete').waitFor();
   const blog=page.locator('a[data-link-arrow="down"]');
   assert.equal(await blog.locator('svg path').getAttribute('d'),'M9 2v13M4 10l5 5 5-5');
   await page.emulateMedia({reducedMotion:'no-preference'});await blog.focus();
   assert.equal(await blog.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'down-arrow-nudge');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await blog.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'none');
   await blog.click();await page.waitForFunction(()=>Math.abs(document.querySelector('#writings').getBoundingClientRect().top)<250);
   assert.deepEqual(errors,[]);console.log(name+': thirteen styles, compact refinements, live clock, reveal interactions, motion preferences, persistence, age thresholds, responsive layouts and downward link passed.');
  }finally{await browser.close();}
 }}finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
