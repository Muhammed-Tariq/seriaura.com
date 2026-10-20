const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {createServer}=require('./serve.cjs');
(async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../assets/text-art/quintessentially-seri.txt'),'utf8');
 assert.ok(!/\S\/|\/\S|\/\s*\//.test(source),'Each slash has surrounding spaces and no duplicate separator');
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const name of ['chromium','webkit']){
  const browser=await(name==='chromium'?chromium:webkit).launch(name==='chromium'?{channel:'msedge'}:{executablePath:process.env.WEBKIT_EXECUTABLE_PATH});
  try{
   const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    window.lyricDrawing={directText:0,bitmapText:0,unalignedCopies:0,missingGaps:0,wrongWeight:0,tiltedText:0};
    const fillText=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(...args){
     if(this.canvas.className==='lyric-rest'){
      lyricDrawing.directText++;
      if(!args[0].endsWith(' '))lyricDrawing.missingGaps++;
      if(!/^(?:700|bold) /.test(this.font))lyricDrawing.wrongWeight++;
      const transform=this.getTransform();
      if(transform.b||transform.c)lyricDrawing.tiltedText++;
     }
     return fillText.apply(this,args);
    };
    const drawImage=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
     if(this.canvas.className==='lyric-rest'&&(args[0]!==this.canvas||args.length!==9||args[3]!==args[7]||args[4]!==args[8]))lyricDrawing.bitmapText++;
     if(this.canvas.className==='lyric-lit'&&args[0]?.className==='lyric-word-mask')window.wordMaskCanvas=args[0];
     if(this.canvas.className==='lyric-lit'&&args.length===9&&args[0]?.className==='lyric-rest'){
      if(args[3]!==args[7]||args[4]!==args[8]||!Number.isInteger(args[1])||!Number.isInteger(args[2]))lyricDrawing.unalignedCopies++;
     }
     return drawImage.apply(this,args);
    };
    // Capture the actual ribbon-mask drawing, so its edge can be checked without
    // depending on where a particular letter happens to fall in the artwork.
    const clearRect=CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect=function(...args){
     if(this.canvas.className==='lyric-rest'){window.maskPath=null;window.maskOperations=[];}
     return clearRect.apply(this,args);
    };
    for(const method of ['stroke','fill']){
     const original=CanvasRenderingContext2D.prototype[method];
     CanvasRenderingContext2D.prototype[method]=function(path,...args){
      if(!this.canvas.dataset.maskProbe&&path instanceof Path2D&&this.globalCompositeOperation==='destination-out'){
       if(!window.maskPath)window.maskPath=path;
       if(window.maskPath===path)window.maskOperations.push({method,path,alpha:this.globalAlpha,width:this.lineWidth});
      }
      return original.call(this,path,...args);
     };
    }
   });
   await page.goto(base);await page.waitForFunction(()=>document.documentElement.dataset.lyricReady==='true'&&document.documentElement.classList.contains('entrance-complete'));
   await page.evaluate(()=>stopHeadingCycle());
   await page.evaluate(()=>siteTextBackground.show());await page.waitForFunction(()=>!siteTextBackground.diagnostics().pending);
   assert.ok(await page.evaluate(()=>{
    const box=document.querySelector('#intro-copy').getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();
    const pixels=wordMaskCanvas.getContext('2d').getImageData(Math.floor(box.left-main.left),Math.floor(box.top-main.top),Math.floor(box.width),100).data;
    return pixels.some((v,i)=>i%4===3&&v===255);
   }),'The initial page entrance does not leave the word halo empty until resize');
   assert.equal(await page.locator('.lyric-field canvas').count(),2);
   assert.equal(await page.locator('.lyric-field').getAttribute('aria-hidden'),'true');
   assert.equal(await page.locator('.lyric-field').evaluate(el=>getComputedStyle(el).maskImage),'none');
   let priorSize=Infinity;
   for(const width of [1920,1440,1100,768,390,320]){
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(800);
    const d=await page.evaluate(()=>siteTextBackground.diagnostics());
    assert.ok(d.fontSize<priorSize,`Font shrinks continuously at ${width}px`);priorSize=d.fontSize;
    assert.equal(d.ratio,await page.evaluate(()=>devicePixelRatio),'Draw at native display density without a resolution cap');
    assert.ok(await page.locator('.lyric-rest').evaluate(el=>Math.abs(el.width/parseFloat(el.style.width)-devicePixelRatio)<.001),'No browser enlargement of the text canvas');
    assert.ok(d.canvasPixels<18000000,'All retained bitmaps are bounded');
    assert.ok(Math.abs(d.radius/width-.22)<.0001,'Glow radius keeps the same viewport proportion');
    if(width>1100){
     const centerError=await page.evaluate(()=>{
      const top=document.querySelector('#page-title').getBoundingClientRect().top;
      const bottom=document.querySelector('#intro-copy p:last-child').getBoundingClientRect().bottom;
      return Math.abs((top+bottom)/2-document.querySelector('main').getBoundingClientRect().top-(ribbonDesign.turn-18)*innerWidth/1920);
     });
     assert.ok(centerError<1,'The full introduction sits slightly above the curve turn');
    }else{
     assert.equal(await page.locator('.opening').evaluate(el=>parseFloat(getComputedStyle(el).paddingTop)),width<=600?26:44,'Mobile introduction spacing stays unchanged');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    assert.equal(await page.locator('.lyric-rest').evaluate(canvas=>{const ctx=canvas.getContext('2d');return ctx.getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)}),true,'Text pixels are present on the content side');
    const clearSide=await page.evaluate(()=>{
     const canvas=document.querySelector('.lyric-rest'),ctx=canvas.getContext('2d'),d=siteTextBackground.diagnostics(),w=innerWidth;
     for(let y=0;y<Math.min(1000,d.stripHeight);y+=30){
      for(let x=0;x<w;x+=30){
       const cleared=w<=1100?y<ribbonPhoneFrame(x,w).y-60:x<ribbonX(y,w)-150;
       if(cleared&&ctx.getImageData(Math.floor(x*d.ratio),Math.floor((y-d.stripTop)*d.ratio),1,1).data[3])return false;
      }
     }
     return true;
    });
    assert.ok(clearSide,'The full navigation side is clear, following the ribbon curve');
    const before=await page.evaluate(()=>siteTextBackground.diagnostics());
    await page.evaluate(()=>siteTextBackground.show());await page.waitForFunction(()=>!siteTextBackground.diagnostics().pending);
    const after=await page.evaluate(()=>siteTextBackground.diagnostics());
    assert.equal(after.textBuilds,before.textBuilds,'Hover never lays out text');
    assert.equal(after.stripBuilds,before.stripBuilds,'Hover never rebuilds the background or mask at '+width);
    assert.ok(after.glowDraws>before.glowDraws);
    const drawing=await page.evaluate(()=>lyricDrawing);
    assert.ok(drawing.directText>0,'Rasterize the font directly into final screen pixels');
    assert.equal(drawing.bitmapText,0,'Only reuse native pixels from the same canvas; never scale a text bitmap');
    assert.equal(drawing.unalignedCopies,0,'The glow copies whole native pixels without scaling');
    assert.equal(drawing.missingGaps,0,'Repeated rows retain a separating space');
    assert.equal(drawing.wrongWeight,0,'Background text uses true Bold');
    assert.equal(drawing.tiltedText,0,'Background lines are horizontal');
    assert.ok(await page.locator('.lyric-lit').evaluate(canvas=>Math.abs(parseFloat(canvas.style.width)/innerWidth-.44)<.005),'Glow diameter is proportional at every width');
    // Hover an open margin; the smaller mobile aura can sit entirely behind copy.
    await page.mouse.move(width-2,450);await page.waitForFunction(()=>!siteTextBackground.diagnostics().pending);
    assert.equal(await page.locator('.lyric-lit').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)),true,'Hover contains colored text in open areas');
    const backgroundRestored=await page.evaluate(()=>{
     const canvas=document.querySelector('.lyric-rest'),ctx=canvas.getContext('2d'),d=siteTextBackground.diagnostics(),main=document.querySelector('main').getBoundingClientRect();
     const rect=document.querySelector('#intro-copy').getBoundingClientRect();
     const x=Math.round((rect.left-main.left)*d.ratio),y=Math.max(0,Math.round((rect.top-main.top-d.stripTop)*d.ratio));
     const w=Math.floor(rect.width*d.ratio),h=Math.min(300,canvas.height-y);
     return ctx.getImageData(x,y,w,h).data.some((v,i)=>i%4===3&&v>0);
    });
    assert.ok(backgroundRestored,'The quiet background stays visible beneath page text');
    const idle=await page.evaluate(()=>siteTextBackground.diagnostics());await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(()=>siteTextBackground.diagnostics()),idle,'No background work when stationary');
    if([1440,390].includes(width)){
     const edge=await page.evaluate(()=>{
      const w=innerWidth,phone=w<=1100,probe=document.createElement('canvas').getContext('2d');
      probe.font=`800 ${phone?7:9.5*w/1920}px "Source Code Pro"`;
      const descent=probe.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?').actualBoundingBoxDescent;
      const t=phone?w/2:500*w/1920,frame=phone?ribbonPhoneFrame(t,w):{y:t,slope:ribbonSlope(t,w)};
      const x=phone?t:ribbonX(t,w),y=frame.y,length=Math.hypot(1,frame.slope);
      const nx=phone?-frame.slope/length:1/length,ny=phone?1/length:-frame.slope/length;
      const progress=phone?t/w:t/ribbonExtent;
      const high=(phone?22:67.5*w/1920)*ribbonTrackScale(progress)+descent*ribbonGlyphScale(progress);
      const bx=x+nx*high,by=y+ny*high;
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;canvas.dataset.maskProbe='true';
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,256,256);
      ctx.translate(128-bx,128-by);ctx.globalCompositeOperation='destination-out';ctx.strokeStyle=ctx.fillStyle='#000';ctx.lineJoin='round';
      for(const op of maskOperations){ctx.globalAlpha=op.alpha;ctx.lineWidth=op.width;ctx[op.method](op.path);}
      const sample=d=>ctx.getImageData(Math.round(128+nx*d),Math.round(128+ny*d),1,1).data[3];
      return {inside:sample(-4),near:sample(4),farther:sample(14),outside:sample(90)};
     });
     assert.equal(edge.inside,0,'The ribbon itself clears the background');
     assert.ok(edge.near>0,'Text is already partially visible just 4px outside the rendered ribbon');
     assert.ok(edge.farther>edge.near&&edge.farther<255,'Opacity rises gently outwards');
     assert.equal(edge.outside,255);
    }
    if(name==='chromium'&&[1440,390].includes(width))await page.screenshot({path:`.preview-refresh/text-background-optimized-${width}.png`});
   }
   await page.evaluate(()=>siteTextBackground.hide());await page.waitForTimeout(350);
   await page.locator('body').dispatchEvent('pointerdown',{clientX:275,clientY:350,pointerType:'touch',bubbles:true});await page.waitForTimeout(350);
   assert.equal(await page.locator('.lyric-lit').evaluate(el=>getComputedStyle(el).opacity),'0.85');
   await page.waitForTimeout(1700);assert.equal(await page.locator('.lyric-lit').evaluate(el=>getComputedStyle(el).opacity),'0');
   const textBuilds=await page.evaluate(()=>siteTextBackground.diagnostics().textBuilds);
   for(const fraction of [.25,.65,.95,0]){
    await page.evaluate(f=>scrollTo({top:(document.querySelector('main').clientHeight-innerHeight)*f,behavior:'instant'}),fraction);await page.waitForTimeout(200);
    const d=await page.evaluate(()=>siteTextBackground.diagnostics());
    assert.equal(d.textBuilds,textBuilds,'Scrolling never retypes the source');
    assert.ok(d.canvasPixels<13000000);
    const covered=await page.evaluate(()=>{const box=document.querySelector('.lyric-rest').getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();return box.top<=Math.max(0,main.top)&&box.bottom>=Math.min(innerHeight,main.bottom)});
    assert.equal(covered,true,'Cached strip covers the visible page after a deep scroll');
   }
   // Moving the cached strip both ways must match a fresh native-resolution draw.
   await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(500);
   for(const y of [500,650,450]){
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(150);
    await page.evaluate(()=>{
     window.readVisibleBackground=()=>{
      const canvas=document.querySelector('.lyric-rest'),d=siteTextBackground.diagnostics(),box=canvas.getBoundingClientRect();
      return canvas.getContext('2d').getImageData(0,Math.round(-box.top*d.ratio),Math.floor(innerWidth*d.ratio),Math.floor(innerHeight*d.ratio)).data;
     };
     window.beforeRefresh=readVisibleBackground();dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(150);
    const changed=await page.evaluate(()=>{
     const after=readVisibleBackground();let difference=0;
     for(let i=0;i<after.length;i++)if(Math.abs(after[i]-beforeRefresh[i])>1)difference++;
     return difference/after.length;
    });
    assert.ok(changed<.0005,'Scrolling reuses sharp pixels without seams, stale masks or ghost text');
   }
   // A large O proves the halo follows ink rather than word/line/container boxes.
   await page.evaluate(()=>{
    scrollTo({top:0,behavior:'instant'});
    const fixture=document.createElement('h2');fixture.id='word-halo-fixture';fixture.textContent='O';
    fixture.style.cssText='position:absolute;left:80%;top:500px;width:240px;margin:0;font:400 120px/1 Sentient;';
    document.querySelector('main').append(fixture);dispatchEvent(new Event('resize'));
   });
   await page.waitForTimeout(200);await page.mouse.move(1200,550);await page.waitForFunction(()=>!siteTextBackground.diagnostics().pending);
   const halo=await page.evaluate(()=>{
    const fixture=document.querySelector('#word-halo-fixture'),range=document.createRange();range.selectNodeContents(fixture);
    const rect=range.getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();
    const top=Math.floor(siteTextBackground.diagnostics().stripTop),ctx=wordMaskCanvas.getContext('2d');
    const x=rect.left-main.left,y=rect.top-main.top-top;
    const alpha=(x,y)=>ctx.getImageData(Math.round(x),Math.round(y),1,1).data[3];
    const data=ctx.getImageData(Math.floor(x-12),Math.floor(y-12),Math.ceil(rect.width+24),Math.ceil(rect.height+24)).data;
    return {center:alpha(x+rect.width/2,y+rect.height/2),unused:alpha(x+rect.width+45,y+rect.height/2),solid:data.some((v,i)=>i%4===3&&v===255),feather:data.some((v,i)=>i%4===3&&v>10&&v<230)};
   });
   assert.equal(halo.center,0,'The open center of a letter is not a rectangular no-glow area');
   assert.equal(halo.unused,0,'Unused space in the heading field can still glow');
   assert.ok(halo.solid,'Glyphs and their immediate surroundings fully suppress glow');
   assert.ok(halo.feather,'Suppression fades gradually away from the glyphs');
   await page.evaluate(()=>{document.querySelector('#word-halo-fixture').remove();dispatchEvent(new Event('resize'));});
   const flower=page.locator('.post-flower').first();await flower.scrollIntoViewIfNeeded();
   await page.mouse.move(0,0);await page.waitForTimeout(750);
   const flowerBox=await flower.boundingBox();await page.mouse.move(flowerBox.x+flowerBox.width/2,flowerBox.y+flowerBox.height/2);
   await page.waitForTimeout(150);
   const flowerHalo=await flower.evaluate(svg=>{
    const main=document.querySelector('main').getBoundingClientRect(),top=Math.floor(siteTextBackground.diagnostics().stripTop),ctx=wordMaskCanvas.getContext('2d');
    for(const path of svg.querySelectorAll('path[fill="currentColor"]')){
     const box=path.getBBox(),matrix=path.getScreenCTM();
     for(let y=box.y+1;y<box.y+box.height;y+=2)for(let x=box.x+1;x<box.x+box.width;x+=2){
      if(!path.isPointInFill(new DOMPoint(x,y)))continue;
      const p=new DOMPoint(x,y).matrixTransform(matrix);
      if(ctx.getImageData(Math.round(p.x-main.left),Math.round(p.y-main.top-top),1,1).data[3]>240)return true;
     }
    }
    return false;
   });
   assert.ok(flowerHalo,'Writings flower shapes have a glow-suppression halo');
   await page.locator('.social-links').scrollIntoViewIfNeeded();
   await page.locator('.social-page').hover();await page.waitForTimeout(30);
   assert.equal(await page.locator('.lyric-lit').evaluate(el=>getComputedStyle(el).opacity),'0','Hovering the footer immediately disables the background glow');
   assert.equal(await page.evaluate(()=>siteTextBackground.diagnostics().pending),false);
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.mouse.move(1400,100);await page.waitForTimeout(200);
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>siteTextBackground.show());await page.waitForTimeout(80);
   const still=await page.evaluate(()=>siteTextBackground.diagnostics());await page.waitForTimeout(100);
   assert.deepEqual(await page.evaluate(()=>siteTextBackground.diagnostics()),still);
   await page.goto(base+'/design-options/text-glow.html');await page.frameLocator('iframe').locator('html[data-lyric-ready="true"]').waitFor();
   assert.equal(await page.frameLocator('iframe').locator('.lyric-field').count(),1);
   await page.goto(base+'/?background=none');await page.locator('html.entrance-complete').waitFor();assert.equal(await page.locator('.lyric-field').count(),0);
   assert.deepEqual(errors,[]);console.log(`${name}: responsive sizing, visible text/glow, bounded memory, no hover rebuilds, idle pausing, deep scrolls, touch, reduced motion and preview passed.`);
  }finally{await browser.close();}
 }}finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1)});


