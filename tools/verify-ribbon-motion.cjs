const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  for (const [engine, options] of [[chromium,{channel:'msedge'}],[webkit,{}]]) {
    const browser = await engine.launch({headless:true,...options});
    try {
      // Chromium covers Retina; the Windows WebKit test port composites WebGL
      // Retina canvases in software, so measure its cadence at native density.
      const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:engine===chromium?2:1});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.ribbonUploads = 0;
        const upload = WebGLRenderingContext.prototype.bufferData;
        WebGLRenderingContext.prototype.bufferData = function(target, data, usage) {
          if (target === this.ARRAY_BUFFER && ArrayBuffer.isView(data)) {
            window.ribbonVertices = Array.from(data); window.ribbonUploads++;
          }
          return upload.call(this, target, data, usage);
        };
      });
      await page.goto('http://127.0.0.1:4173/');
      await page.evaluate(() => siteReady);
      await page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('.text-ribbon').getAttribute('data-renderer'), 'webgl');
      // Let shader compilation and the adaptive high-density budget settle.
      await page.waitForTimeout(3500);
      await page.evaluate(() => {stopHeadingCycle(); queueHeadingCycle();});
      const cadence = await page.evaluate(() => new Promise(resolve => {
        const frames = [], scrambles = []; let previous = performance.now();
        const start = previous, uploads = window.ribbonUploads;
        let mutations = 0;
        const observer = new MutationObserver(records => {mutations += records.length;});
        observer.observe(document.querySelector('.text-ribbon'), {attributes:true,childList:true,subtree:true});
        const words = new MutationObserver(() => {
          if (document.querySelector('.glitch-word').classList.contains('is-glitching') && (!scrambles.length || performance.now()-scrambles[0]<900)) scrambles.push(performance.now());
        });
        words.observe(document.querySelector('.word-value'), {childList:true});
        function frame(time) {
          if (time >= previous) frames.push(time - previous);
          previous = time;
          if (time - start < 6000) return requestAnimationFrame(frame);
          observer.disconnect(); words.disconnect(); frames.sort((a,b) => a-b);
          resolve({frames:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],
            slow:frames.filter(ms=>ms>50).length, mutations,uploads:window.ribbonUploads-uploads,
            scrambles:scrambles.length,glitchDuration:scrambles.at(-1)-scrambles[0],
            photos:[...document.querySelectorAll('.polaroid img')].every(img=>img.complete&&img.naturalWidth>0)});
        }
        requestAnimationFrame(frame);
      }));
      console.log(engine.name(), 'live cadence:', JSON.stringify(cadence));
      assert.ok(cadence.p95 < 35 && cadence.slow < 10, 'Real browser frames stay smooth while photos and heading are active');
      assert.ok(cadence.scrambles >= 9 && cadence.glitchDuration < 650, 'The 520ms heading scramble stays responsive');
      assert.ok(cadence.photos, 'All Polaroids load during animation');
      assert.equal(cadence.mutations, 0, 'No per-frame text DOM changes');
      assert.equal(cadence.uploads, 0, 'No per-frame mesh rebuilds');
      await page.emulateMedia({reducedMotion:'reduce'});
      for (const width of [1920,1101,768,390]) {
        await page.setViewportSize({width,height:900});
        await page.waitForFunction(w => ribbonGraphics.width === w && ribbonViewportHeight === 900, width);
        const geometry = await page.evaluate(() => {
          const vertices = window.ribbonVertices, speeds = new Map();
          for (let i=0;i<vertices.length;i+=6) speeds.set(vertices[i+4], vertices[i+5]);
          const gl = ribbonGraphics.gl;
          const pixels = seconds => {
            ribbonPainter(seconds);
            const data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
            gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);
            let ink=0, topInk=0, hash=0;
            for(let i=3;i<data.length;i+=4) { ink+=data[i]>0; hash=(hash*31+data[i])|0; }
            for(let i=data.length-gl.drawingBufferWidth*4;i<data.length;i+=4) topInk+=data[i+3]>0;
            return {ink,topInk,hash};
          };
          const before=pixels(0), after=pixels(.5), later=pixels(10000);
          ribbonPainter(ribbonMotionSeconds);
          return {speeds:[...speeds.values()],before,after,later,minY:ribbonGraphics.minY,
            finite:vertices.every(Number.isFinite), overflow:document.documentElement.scrollWidth-innerWidth,
            nodes:document.querySelectorAll('.text-ribbon text').length,
            bounded:gl.drawingBufferHeight <= (innerHeight+256)*2};
        });
        assert.ok(geometry.finite && geometry.bounded);
        assert.equal(geometry.nodes,0); assert.equal(geometry.overflow,0);
        geometry.speeds.forEach(speed => assert.ok(speed<0,'All rows move in the same direction by default'));
        const restored = await page.evaluate(() => {
          const before = document.querySelector('.text-ribbon defs').innerHTML;
          const phase = ribbonMotionSeconds;
          siteContent.ribbonMovement = 'alternating'; layoutRibbon();
          const speeds = new Map();
          for (let i=0;i<ribbonVertices.length;i+=6) speeds.set(ribbonVertices[i+4],ribbonVertices[i+5]);
          siteContent.ribbonMovement = 'together'; layoutRibbon();
          return {speeds:[...speeds.values()],sameCurve:before===document.querySelector('.text-ribbon defs').innerHTML,samePhase:phase===ribbonMotionSeconds};
        });
        restored.speeds.forEach((speed,row) => assert.ok(row%2 ? speed>0 : speed<0,'Alternating mode is easily restored'));
        assert.ok(restored.sameCurve && restored.samePhase,'Changing direction preserves shape and elapsed phase');
        assert.ok(geometry.before.ink > 1000 && geometry.later.ink > 1000, 'The texture stays populated through repeated cycles');
        assert.notEqual(geometry.before.hash,geometry.after.hash,'Rendered pixels actually move');
        if(width>1100) assert.ok(geometry.minY < -150*width/1920 && geometry.before.topInk > 0, 'Text runs through the top edge');
        const frozen=await page.evaluate(()=>ribbonMotionSeconds);
        await page.waitForTimeout(120);
        assert.equal(await page.evaluate(()=>ribbonMotionSeconds),frozen);
        await page.evaluate(()=>scrollTo({top:1300,behavior:'instant'}));
        await page.waitForTimeout(80);
        assert.ok(await page.evaluate(()=>Math.abs(ribbonGraphics.lastTop - Math.max(0,scrollY-ribbonGraphics.documentTop-128))<1 || ribbonGraphics.canvas.hidden));
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        console.log(`${engine.name()} ${width}: shared direction, alternating restore, visible ink, top bleed, resizing, scrolling and reduced motion pass`);
      }
      const hasContextLoss = await page.evaluate(() => {
        window.testContextLoss = ribbonGraphics.gl.getExtension('WEBGL_lose_context');
        window.testContextLoss?.loseContext();
        return !!window.testContextLoss;
      });
      if (hasContextLoss) {
        await page.waitForFunction(() => document.querySelector('.text-ribbon').dataset.renderer === 'static');
        assert.ok(await page.locator('.text-ribbon g text').count()>400);
        await page.evaluate(() => window.testContextLoss.restoreContext());
        await page.waitForFunction(() => document.querySelector('.text-ribbon').dataset.renderer === 'webgl');
        assert.equal(await page.locator('.ribbon-canvas').count(),1,'Recovery replaces the lost canvas');
      }
      await page.evaluate(()=>{ribbonGraphicsUnavailable=true;ribbonRenderKey='';layoutRibbon();});
      assert.ok(await page.locator('.text-ribbon g text').count()>400);
      assert.equal(await page.evaluate(()=>ribbonPainter),null);
      assert.deepEqual(errors,[]);
    } finally {await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
