const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {createServer}=require('./serve.cjs');
(async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 for(const engine of ['chromium','webkit']){
 const browser=await (engine==='chromium'?chromium:webkit).launch(engine==='chromium'?{channel:'msedge'}:{executablePath:process.env.WEBKIT_EXECUTABLE_PATH});
 try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const ready=()=>page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});await page.goto(base);await ready();
   const baseline=await page.evaluate(()=>['musings','thousings','writings'].map(id=>document.getElementById(id).getBoundingClientRect().top));
   assert.equal(await page.locator('.text-art-background').count(),0);
   for(const word of ['personhood','Photoshop']){
    assert.equal(await page.evaluate(word=>headingWords.includes(word),word),true);
    const bounds=await page.locator('#page-title .word-value').evaluate((el,word)=>{el.textContent=word+'.';return el.getBoundingClientRect().toJSON()},word);
    assert.ok(bounds.right<=width,`${word} fits at ${width}px`);
   }
   for(const mode of ['marginalia','monument','afterglow','wordwall','loose-type','searchlight']){
    await page.goto(`${base}/?art=${mode}`);await ready();
    await page.locator('.text-art-background img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode()})));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    assert.deepEqual(await page.evaluate(()=>['musings','thousings','writings'].map(id=>document.getElementById(id).getBoundingClientRect().top)),baseline,'Art does not displace the page');
    assert.equal(await page.locator('.text-art-background').getAttribute('aria-hidden'),'true');
    assert.equal(await page.locator('.text-art-background').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    if(engine==='chromium'&&width!==320&&['wordwall','loose-type','searchlight'].includes(mode)){
     await page.screenshot({path:`.preview-refresh/art-${mode}-${width}.png`});
     if(width===1440){
      await page.locator('#musings').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-100,behavior:'instant'}));
      await page.screenshot({path:`.preview-refresh/art-${mode}-musings.png`});
     }
    }
   }
  }
  // Exercise the actual selection path across many bag refills.
  const sequence=await page.evaluate(()=>{const result=[document.querySelector('.glitch-word').dataset.word];for(let i=0;i<500;i++){siteHeading.replay();result.push(document.querySelector('.glitch-word').dataset.word);}return result;});
  assert.equal(new Set(sequence).size,6);
  sequence.forEach((word,i)=>{if(i>0)assert.notEqual(word,sequence[i-1]);if(i>1)assert.notEqual(word,sequence[i-2]);});
  // Reduced motion freezes pointer effects; ordinary motion reacts without intercepting clicks.
  await page.goto(base+'/?art=loose-type');await ready();
  await page.evaluate(()=>siteArt.stir());await page.waitForTimeout(80);
  assert.equal(await page.locator('.art-letter-0').evaluate(el=>el.style.getPropertyValue('--drift-x')),'');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>siteArt.stir());await page.waitForTimeout(80);
  assert.equal(await page.locator('.art-letter').evaluateAll(letters=>letters.some(el=>Math.abs(parseFloat(el.style.getPropertyValue('--drift-x')))>1)),true);
  await page.goto(base+'/?art=searchlight');await ready();await page.mouse.move(1240,300);await page.waitForTimeout(80);
  assert.equal(await page.locator('.text-art-background').evaluate(el=>el.style.getPropertyValue('--spot-x')),'1240px');
  await page.locator('body').dispatchEvent('pointerdown',{clientX:1200,clientY:420,pointerType:'touch',bubbles:true});await page.waitForTimeout(80);
  assert.equal(await page.locator('.text-art-background').evaluate(el=>el.style.getPropertyValue('--spot-y')),'420px');
  const titleBox=await page.locator('#page-title').boundingBox();
  for(const effect of ['decode','scanline','split','splice','scramble']){
   const prior=await page.locator('.glitch-word').getAttribute('data-word');
   await page.evaluate(effect=>siteHeading.setEffect(effect),effect);await page.waitForTimeout(85);
   assert.equal(await page.locator('.glitch-word').getAttribute('data-effect'),effect);
   assert.equal(await page.locator('.glitch-word').evaluate(el=>el.classList.contains('is-glitching')),true);
   if(effect!=='scramble')assert.ok(await page.locator('.glitch-word').evaluate(el=>el.getAnimations({subtree:true}).length)>0);
   if(engine==='chromium')await page.screenshot({path:`.preview-refresh/heading-${effect}.png`,clip:{x:titleBox.x-5,y:titleBox.y-8,width:titleBox.width+10,height:titleBox.height+16}});
   await page.waitForTimeout(550);
   const next=await page.locator('.glitch-word').getAttribute('data-word');assert.notEqual(next,prior);
   assert.equal(await page.locator('.word-value').first().textContent(),next);
   assert.deepEqual(await page.locator('#page-title').boundingBox(),titleBox,'No heading layout shift');
  }
  // Interrupt a transition, switch treatments, and ensure stale timers never restore old text.
  await page.evaluate(()=>siteHeading.setEffect('split'));await page.waitForTimeout(230);
  const interrupted=await page.locator('.glitch-word').getAttribute('data-word');
  await page.evaluate(()=>siteHeading.setEffect('decode'));await page.waitForTimeout(650);
  assert.notEqual(await page.locator('.word-value').first().textContent(),interrupted);
  assert.equal(await page.locator('.word-value').first().textContent(),await page.locator('.glitch-word').getAttribute('data-word'));
  await page.setViewportSize({width:1500,height:1100});await page.goto(base+'/design-options/');
  const iframe=page.frameLocator('iframe');await iframe.locator('html.entrance-complete').waitFor();
  await page.locator('[data-art="loose-type"]').click();await iframe.locator('html[data-art="loose-type"].entrance-complete').waitFor();
  await page.getByRole('button',{name:'Stir letters',exact:true}).focus();await page.keyboard.press('Enter');
  await page.locator('[data-glitch="splice"]').click();await iframe.locator('.glitch-word[data-effect="splice"]').waitFor();
  assert.ok((await page.locator('#open-full').getAttribute('href')).includes('glitch=splice'));
  await page.getByRole('button',{name:'Phone',exact:true}).click();assert.equal(Math.round((await page.locator('iframe').boundingBox()).width),390);
  await page.getByRole('button',{name:'No background',exact:true}).click();await iframe.locator('html.entrance-complete').waitFor();assert.equal(await iframe.locator('.text-art-background').count(),0);
  await page.locator('#earlier').selectOption('monument');await iframe.locator('html[data-art="monument"].entrance-complete').waitFor();
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  assert.deepEqual(errors,[]);
  console.log(`${engine}: art layout at 1440/390/320, 500 heading transitions, five effects, motion preferences, mouse/touch interaction and chooser controls passed.`);
 }finally{await browser.close();}
 }
 await new Promise(resolve=>server.close(resolve));
})().catch(error=>{console.error(error);process.exit(1)});


