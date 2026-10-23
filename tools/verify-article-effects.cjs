const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require('playwright'),{createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const [name,engine,options] of [['chromium',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
  const browser=await engine.launch(options);
  try{
   const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/sidebar.js',async route=>{await new Promise(r=>setTimeout(r,600));await route.continue();});
   await page.addInitScript(()=>{
    window.menuFlashes=0;
    function sample(){
     const sidebar=document.querySelector('.sidebar'),nav=sidebar?.querySelector('nav');
     if(nav&&innerWidth<1600&&document.body.classList.contains('blog-layout')){
      const s=getComputedStyle(sidebar),n=getComputedStyle(nav);
      if(s.opacity>.01&&s.visibility==='visible'&&n.opacity>.01&&n.visibility==='visible'&&sidebar.dataset.menuOpen!=='true')menuFlashes++;
     }
     if(!document.documentElement.classList.contains('entrance-complete'))requestAnimationFrame(sample);
    }requestAnimationFrame(sample);
   });
   const visit=async slug=>{await page.goto(base+'/writings/'+slug+'/');await page.waitForFunction(()=>window.articleArcArt);await page.locator('html.entrance-complete').waitFor();};
   for(const [slug,label] of [['excellence-born-of-insecurity','Salient'],['why-im-an-atheist','Considerable'],['daylight-spendings','Tangential']]){
    await visit(slug);assert.equal(await page.evaluate(()=>menuFlashes),0,'No unenhanced menu flash with delayed navigation script');
    const badge=page.locator('.post-header .post-importance'),card=page.locator('.article-class-card');
    await badge.hover();await page.waitForFunction(()=>document.querySelector('.article-class-card').classList.contains('is-open'));
    assert.equal(await card.locator('.class-heading').innerText(),label);
    assert.ok((await card.locator('.class-description').innerText()).length>140);
    const b=await card.boundingBox();assert.ok(b.x>=15&&b.x+b.width<=1440-15);
    await page.keyboard.press('Escape');assert.equal(await card.evaluate(e=>e.classList.contains('is-open')),false);
    await badge.focus();await page.waitForFunction(()=>document.querySelector('.post-header .post-importance').getAttribute('aria-expanded')==='true');await page.keyboard.press('Escape');
    await page.mouse.move(0,800);
    let state=await page.evaluate(()=>articleArcArt.diagnostics()),glow=state.arcs[0].glow;
    if(state.arcs[0].renderer==='webgl'){
     assert.equal(glow.first,label==='Tangential'?0:1);assert.equal(glow.second,label==='Salient'?1:0);
     if(label==='Salient'){
      await page.waitForFunction(()=>articleArcArt.diagnostics().seconds>3);
      glow=(await page.evaluate(()=>articleArcArt.diagnostics())).arcs[0].glow;
      assert.ok(glow.centers[0]<glow.centers[2],'Both lights approach the middle');
      await page.waitForFunction(()=>articleArcArt.diagnostics().seconds>5.5);
      glow=(await page.evaluate(()=>articleArcArt.diagnostics())).arcs[0].glow;
      assert.ok(glow.centers[0]>glow.centers[2],'Both lights pass through to opposite ends');
     }else if(label==='Considerable'){
      await page.waitForFunction(()=>articleArcArt.diagnostics().seconds>10.3);
      glow=(await page.evaluate(()=>articleArcArt.diagnostics())).arcs[0].glow;
      assert.ok(glow.centers[0]>1440,'Next single light starts from the opposite end');assert.equal(glow.second,0);
     }
     await page.emulateMedia({reducedMotion:'reduce'});
     await page.waitForFunction(()=>!articleArcArt.diagnostics().running&&articleArcArt.diagnostics().arcs[0].glow.first===0);
     assert.equal((await page.evaluate(()=>articleArcArt.diagnostics())).arcs[0].glow.first,0);
     await page.emulateMedia({reducedMotion:'no-preference'});
    }
   }
   await page.setViewportSize({width:390,height:844});await visit('why-im-an-atheist');
   const badge=page.locator('.post-header .post-importance');await badge.click();
   const bounds=await page.locator('.article-class-card').boundingBox();assert.ok(bounds.x>=15&&bounds.x+bounds.width<=375);
   await page.mouse.click(8,600);assert.equal(await page.locator('.article-class-card').evaluate(e=>e.classList.contains('is-open')),false);
   assert.equal(await page.evaluate(()=>menuFlashes),0);
   await page.goto(base+'/index.html#writings');await page.locator('html.entrance-complete').waitFor();
   const link=page.locator('.post-link').first();await link.focus();await page.waitForFunction(()=>document.querySelector('.article-class-card').classList.contains('is-open'));
   assert.equal(await page.locator('.article-class-card .class-heading').innerText(),'Salient');
   await page.keyboard.press('Escape');await page.keyboard.press('Enter');await page.waitForURL('**/writings/excellence-born-of-insecurity/');
   assert.deepEqual(errors,[]);console.log(name+': no reload flash; all class descriptions, touch/keyboard dismissal, class-specific glow travel and reduced motion passed');
  }finally{await browser.close();}
 }}finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
