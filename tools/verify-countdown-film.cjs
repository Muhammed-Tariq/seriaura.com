const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium, webkit} = require('playwright');
const {createServer} = require('./serve.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [engine, options] of [[chromium, {channel:'msedge'}], [webkit, {executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]) {
      const browser = await engine.launch({headless:true, ...options});
      try {
        const page = await browser.newPage({viewport:{width:1440,height:1100}});
        const errors=[]; page.on('pageerror', e=>errors.push(e.message));
        await page.clock.install({time:new Date('2026-11-10T12:00:00Z')});
        await page.goto(base+'/counting/?from=old#main');
        await page.waitForURL('**/countdowns/?from=old#main');
        await page.locator('.is-next').waitFor();
        await page.evaluate(()=>document.fonts.ready);
        assert.equal(await page.locator('.is-next').getAttribute('data-event'),'bath');
        assert.equal(await page.locator('.next-event-title').innerText(),'Next event');
        assert.equal(await page.locator('.event-film-credit').count(),0);
        assert.equal(await page.locator('.event-film-toggle').innerText(),'');
        for (const width of [320,390,768,1001,1101,1440,1920]) {
          await page.setViewportSize({width,height:1100});
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const geometry = await page.evaluate(()=>{
            const hero=document.querySelector('.is-next'), box=hero.getBoundingClientRect();
            const center=el=>{const r=el.getBoundingClientRect();return r.x+r.width/2;};
            const logo=hero.querySelector('.event-logo img'), clock=hero.querySelector('.countdown-values');
            return {overflow:document.documentElement.scrollWidth>innerWidth, logo:center(logo)-(box.x+box.width/2),clock:center(clock)-(box.x+box.width/2),fits:clock.getBoundingClientRect().width<=box.width,
              cards:[...document.querySelectorAll('.time-notes>.countdown-events>.countdown-event:not(.is-next)')].every(row=>Math.abs(center(row.querySelector('img'))-center(row.querySelector('.countdown-square')))<1)};
          });
          assert.ok(!geometry.overflow && geometry.fits && geometry.cards && Math.abs(geometry.logo)<1 && Math.abs(geometry.clock)<1, `${engine.name()} ${width}: ${JSON.stringify(geometry)}`);
          const hitAreas=await page.locator('.countdown-event:not(.is-next) .event-logo').evaluateAll(links=>links.map(link=>{
            const a=link.getBoundingClientRect(),b=link.querySelector('img').getBoundingClientRect();
            return {id:link.closest('li').dataset.event,width:a.width-b.width,height:a.height-b.height,visible:b.width>0&&b.height>0};
          }));
          assert.ok(hitAreas.every(a=>a.visible&&Math.abs(a.width)<1&&Math.abs(a.height)<1),`Logo hit areas at ${width}: ${JSON.stringify(hitAreas)}`);
          if(width===390||width===1440) await page.screenshot({path:`.preview-refresh/countdowns-${engine.name()}-${width}.png`,fullPage:true});
        }
        const video=page.locator('.event-film');
        await video.scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2&&!v.paused;});
        assert.match(await video.getAttribute('src'),/bath-half-loop-1080\.mp4$/,'Desktop selects the full-HD asset');
        if (engine===chromium) assert.equal(await video.evaluate(v=>v.videoWidth),1920,'Decoded desktop video is 1080p');
        assert.ok(await page.locator('.is-next .countdown-number').evaluate(el=>getComputedStyle(el).textShadow!=='none'));
        assert.equal(await page.locator('.is-next .countdown-square').evaluate(el=>getComputedStyle(el).boxShadow),'none');
        // All three separators share one clock phase, with a trough at each digit change.
        await page.clock.pauseAt(new Date('2026-11-10T12:01:00Z'));
        for (const elapsed of [16,484,500]) {
          await page.clock.runFor(elapsed);
          const sample=await page.locator('.is-next .countdown-clock').evaluate(clock=>({
            phase:Date.now()%1000,seconds:clock.querySelector('[data-seconds]').textContent,
            opacity:[...clock.querySelectorAll('.countdown-colon')].map(el=>Number(getComputedStyle(el).opacity))
          }));
          assert.ok(sample.opacity.every(value=>Math.abs(value-sample.opacity[0])<.001),'Colons stay in phase');
          assert.ok(sample.phase===500 ? sample.opacity[0]>.98 : sample.opacity[0]<.02,JSON.stringify(sample));
        }
        await page.clock.resume();
        assert.deepEqual(await video.evaluate(v=>[v.muted,v.loop,v.playsInline]),[true,true,true]);
        await page.getByRole('button',{name:'Pause video'}).click();
        assert.equal(await video.evaluate(v=>v.paused),true);
        await page.getByRole('button',{name:'Play video'}).click();
        await page.waitForFunction(()=>!document.querySelector('video').paused);
        await video.evaluate(v=>v.currentTime=v.duration-.2);
        await page.waitForFunction(()=>document.querySelector('video').currentTime<2);
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>document.querySelector('video').paused && document.querySelector('.event-film-toggle').hidden, null, {polling:100}).catch(async error=>{
          console.log(await page.evaluate(()=>({motion:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:document.querySelector('video').paused,hidden:document.querySelector('.event-film-toggle').hidden,time:Date.now()})));throw error;
        });
        assert.equal(await page.locator('.event-film-toggle').isVisible(),false);
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.setViewportSize({width:390,height:400});
        await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
        await page.waitForFunction(()=>document.querySelector('video').paused);
        await page.locator('.is-next').scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>!document.querySelector('.time-notes').classList.contains('is-paused'));
        await page.waitForFunction(()=>document.querySelector('video').src.endsWith('/bath-half-loop.mp4'));
        await page.clock.setSystemTime(new Date('2027-03-15T12:00:00Z'));
        await page.clock.runFor(1100);
        assert.equal(await page.locator('.is-next').getAttribute('data-event'),'brighton');
        assert.equal(await page.locator('video').count(),0,'Bath footage is never reused for another event');
        assert.equal(await page.locator('.completed-events [data-event="bath"]').count(),1);
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.clock.setSystemTime(new Date('2026-11-10T12:00:00Z'));
        await page.reload();
        await page.locator('.event-film').waitFor();
        assert.equal(await page.locator('video').getAttribute('src'),null,'Reduced motion does not download video');
        assert.deepEqual(errors,[]);
        console.log(`${engine.name()}: centered layouts, redirect, video playback/loop/pause, reduced motion and event rollover passed`);
      } finally {await browser.close();}
    }
  } finally {await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
