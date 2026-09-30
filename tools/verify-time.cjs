const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {gapPercent, ageInYears, remaining} = require('../time.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),context);
const config = context.window.siteContent.time;
const epoch = Date.parse;

assert.equal(gapPercent(epoch(config.gapStart)-1,config.gapStart,config.gapEnd),0);
assert.equal(gapPercent(epoch(config.gapStart),config.gapStart,config.gapEnd),0);
assert.equal(gapPercent(epoch(config.gapStart)+235*86400000,config.gapStart,config.gapEnd),50);
assert.ok(gapPercent(epoch('2027-09-30T12:00:00+01:00'),config.gapStart,config.gapEnd)<100);
assert.equal(gapPercent(epoch(config.gapEnd),config.gapStart,config.gapEnd),100);
assert.equal(gapPercent(epoch(config.gapEnd)+1,config.gapStart,config.gapEnd),100);
assert.equal(ageInYears(epoch(config.birth),config.birth),0);
assert.equal(ageInYears(epoch('2026-04-09T06:00:00Z'),config.birth),18);
assert.ok(ageInYears(epoch('2026-04-09T05:59:59.999Z'),config.birth)<18);
assert.equal(ageInYears(epoch('2027-10-09T06:00:00Z'),config.birth),19.5,'Leap birthday year has 366 days');
assert.equal(ageInYears(epoch('2028-04-09T06:00:00Z'),config.birth),20);
for (const [id,utc] of [['tmua','2026-10-12T12:00:00Z'],['bath','2027-03-14T10:30:00Z'],['brighton','2027-04-04T08:45:00Z']]) {
  const event = config.events.find(event=>event.id===id);
  assert.equal(epoch(event.at),epoch(utc),'UK daylight-saving offset');
  assert.deepEqual(remaining(epoch(utc)-90061000,event.at),{days:1,hours:1,minutes:1,seconds:1,started:false});
  assert.deepEqual(remaining(epoch(utc)-1,event.at),{days:0,hours:0,minutes:0,seconds:1,started:false});
  assert.deepEqual(remaining(epoch(utc),event.at),{days:0,hours:0,minutes:0,seconds:0,started:true});
  assert.deepEqual(remaining(epoch(utc)+1000,event.at),{days:0,hours:0,minutes:0,seconds:0,started:true});
}
console.log('Date boundaries, leap years, and UK offsets passed.');

const {chromium,webkit} = require('playwright');
(async()=>{
  fs.mkdirSync(path.join(__dirname,'../.preview-refresh'),{recursive:true});
  for (const [engine,options] of [[chromium,{channel:'msedge'}],[webkit,{}]]) {
    const browser = await engine.launch({headless:true,...options});
    try {
      const page = await browser.newPage({viewport:{width:1920,height:1080},timezoneId:'America/Los_Angeles'});
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      await page.clock.install({time:new Date('2026-09-30T12:00:00Z')});
      await page.goto('http://127.0.0.1:4173/');
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('.time-notes').count(),0,'Countdown sidebar removed from Home');
      assert.equal(await page.locator('script[src="time.js"],link[href="time.css"]').count(),0,'Home no longer loads the countdown code');
      const counting = page.locator('.small-things a[href="counting/"]');
      assert.equal(await counting.innerText(),'counting');
      assert.equal(await counting.locator('..').innerText(),'counting down to things;');
      await counting.click();
      await page.waitForURL('**/counting/');
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('h1').innerText(),'Countdowns');
      assert.equal(await page.locator('h1').evaluate(el=>getComputedStyle(el).textAlign),'left');
      assert.match(await page.locator('[data-event="tmua"] .event-logo').getAttribute('title'),/13:00 UK/);
      assert.equal(await page.locator('.countdown-date,.time-detail').count(),0,'Full dates are removed from the layout');
      await page.evaluate(()=>document.fonts.ready);
      assert.deepEqual(await page.locator('.countdown-square').first().evaluate(el=>[getComputedStyle(el).fontFamily.replaceAll('"',''),getComputedStyle(el).fontWeight]),['Space Grotesk, sans-serif','600']);
      assert.deepEqual(await page.locator('.time-label').first().evaluate(el=>[getComputedStyle(el).fontFamily.replaceAll('"',''),getComputedStyle(el).fontWeight]),['Reddit Sans, sans-serif','500']);
      assert.match(await page.locator('[data-exact-age]').innerText(),/^18\.\d{7}$/);
      assert.match(await page.locator('[data-gap-percent]').innerText(),/^\d+\.\d{7}$/);
      assert.equal(await page.locator('.time-notes h2').count(),0);
      assert.equal(await page.locator('.event-logo img').count(),5);
      await page.locator('.event-logo img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.match(await page.locator('[data-event="tmua"] img').getAttribute('src'),/assets\/events\/tmua\.svg$/);
      assert.equal(await page.locator('.countdown-colon:visible').count(),3);
      assert.equal(await page.locator('.countdown-colon').first().getAttribute('aria-hidden'),'true');
      assert.equal(await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).animationDuration),'1s');
      const colonOpacity=await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).opacity);
      await page.clock.runFor(250);
      assert.notEqual(await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).opacity),colonOpacity,'Colons fade smoothly');
      const withColons=await page.locator('.countdown-values').first().boundingBox();
      withColons.y+=await page.evaluate(()=>scrollY);
      await page.locator('[data-colon-toggle]').uncheck();
      assert.equal(await page.locator('.countdown-colon:visible').count(),0);
      const withoutColons=await page.locator('.countdown-values').first().boundingBox();
      withoutColons.y+=await page.evaluate(()=>scrollY);
      assert.deepEqual(withoutColons,withColons,'Toggle does not shift the countdown');
      assert.equal(await page.evaluate(()=>localStorage.getItem('countdown-colons')),'off');
      await page.locator('[data-colon-toggle]').check();
      for(const id of ['ironman','oxford']) {
        assert.equal(await page.locator(`[data-event="${id}"] [data-days]`).innerText(),'TBC');
        assert.equal(await page.locator(`[data-event="${id}"] .countdown-square`).evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
        assert.equal(await page.locator(`[data-event="${id}"] .countdown-square`).evaluate(el=>getComputedStyle(el,'::before').backgroundColor),'rgb(85, 85, 85)');
        assert.ok(await page.locator(`[data-event="${id}"] [data-days]`).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>42),'TBC is larger');
      }
      assert.equal(await page.locator('.countdown-clock:visible').count(),1);
      assert.equal(await page.locator('[data-event="tmua"] .countdown-clock').isVisible(),true);
      assert.equal(await page.locator('.countdown-square').first().evaluate(el=>getComputedStyle(el,'::before').animationDuration),'3s');
      assert.equal(await page.locator('[data-event="bath"] .countdown-square').evaluate(el=>getComputedStyle(el,'::before').animationDuration),'5s');
      const orbit = await page.locator('.countdown-square').first().evaluate(el=>getComputedStyle(el,'::before').transform);
      const age = await page.locator('[data-exact-age]').innerText();
      const gap = Number(await page.locator('[data-gap-percent]').innerText());
      await page.clock.runFor(100);
      const gapIncrement = Number(await page.locator('[data-gap-percent]').innerText())-gap;
      assert.ok(gapIncrement>0&&gapIncrement<0.000001,'Gap percentage advances in small subsecond increments');
      await page.clock.runFor(250);
      assert.notEqual(await page.locator('.countdown-square').first().evaluate(el=>getComputedStyle(el,'::before').transform),orbit,'Red trail moves');
      await page.clock.runFor(3500);
      assert.notEqual(await page.locator('[data-exact-age]').innerText(),age,'Seven-decimal age updates');
      const sizes=[];
      for(const days of [1234,123,11,1,0]) {
        await page.clock.setSystemTime(new Date(epoch(config.events[0].at)-(days*86400+123)*1000));
        await page.clock.runFor(100);
        const fit=await page.locator('[data-event="tmua"]').evaluate(row=>{
          const number=row.querySelector('[data-days]'),box=number.parentElement;
          const rect=number.getBoundingClientRect(),frame=box.getBoundingClientRect();
          return {text:number.textContent,size:parseFloat(getComputedStyle(number).fontSize),clock:getComputedStyle(row.querySelector('[data-hours]')).fontSize,comfortable:rect.width<frame.width*.82&&rect.height<frame.height*.72};
        });
        assert.equal(fit.text,String(days));
        assert.ok(fit.comfortable,`${days} fits comfortably`);
        assert.equal(fit.clock,'52px','Clock units do not resize with day digits');
        sizes.push(fit.size);
      }
      assert.ok(sizes[0]<sizes[1]&&sizes[1]<sizes[2]&&sizes[2]<sizes[3]&&sizes[3]===sizes[4],'Day font adapts to digit count');
      await page.clock.setSystemTime(new Date('2026-09-30T12:00:00Z'));
      await page.clock.runFor(100);
      for (const width of [2560,1920,1366,1101,1100,851,850,768,600,390,360,320]) {
        await page.setViewportSize({width,height:1080});
        await page.locator('.time-notes').scrollIntoViewIfNeeded();
        await page.clock.runFor(100);
        const layout=await page.evaluate(()=>{
          const panel=document.querySelector('.time-notes').getBoundingClientRect();
          const heading=document.querySelector('h1').getBoundingClientRect();
          const boxes=[...document.querySelectorAll('.time-notes .time-value,.countdown-square,.countdown-clock,.event-logo img')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
          const stats=document.querySelector('.time-stats').getBoundingClientRect();
          const next=document.querySelector('.countdown-event.is-next').getBoundingClientRect();
          const bath=document.querySelector('[data-event="bath"]').getBoundingClientRect();
          const brighton=document.querySelector('[data-event="brighton"]').getBoundingClientRect();
          const ironman=document.querySelector('[data-event="ironman"]').getBoundingClientRect();
          const oxford=document.querySelector('[data-event="oxford"]').getBoundingClientRect();
          const centre=document.documentElement.clientWidth/2;
          const art=document.querySelector('[data-event="tmua"] .event-logo').getBoundingClientRect();
          const image=document.querySelector('[data-event="tmua"] img').getBoundingClientRect();
          return {overflow:document.documentElement.scrollWidth>innerWidth,inside:boxes.every(box=>box.left>=0&&box.right<=innerWidth),separate:panel.top>=heading.bottom,centred:Math.abs(stats.left+stats.width/2-centre)<1,grid:next.bottom<=bath.top&&bath.top===brighton.top&&bath.right<=brighton.left&&ironman.top===oxford.top&&ironman.right<=oxford.left&&(innerWidth>850?bath.top===ironman.top:ironman.top>=bath.bottom),fillsPage:Math.abs(document.querySelector('.countdown-events').getBoundingClientRect().width-panel.width)<1,artAtDivider:Math.abs(art.top-next.top-1)<1&&image.top<art.top};
        });
        assert.deepEqual(layout,{overflow:false,inside:true,separate:true,centred:true,grid:true,fillsPage:true,artAtDivider:true},`${engine.name()} ${width}`);
        if(width===1920||width===390) await page.screenshot({path:path.join(__dirname,`../.preview-refresh/time-${engine.name()}-${width}.png`)});
      }
      await page.setViewportSize({width:1920,height:1080});
      await page.locator('.time-notes').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>!document.querySelector('.time-notes').classList.contains('is-paused'));
      await page.clock.setSystemTime(new Date('2026-10-12T11:59:58Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('[data-event="tmua"] [data-seconds]').innerText(),'02');
      await page.clock.runFor(2100);
      assert.equal(await page.locator('[data-event="tmua"] .countdown-clock').isVisible(),false);
      assert.equal(await page.locator('[data-event="tmua"] [data-day-label]').innerText(),'started');
      assert.equal(await page.locator('[data-event="bath"] .countdown-clock').isVisible(),true);
      assert.ok(await page.evaluate(()=>document.querySelector('[data-event="bath"]').getBoundingClientRect().bottom<=document.querySelector('[data-event="tmua"]').getBoundingClientRect().top),'New nearest event moves to the top');
      assert.equal(await page.locator('[data-event="bath"] .countdown-square').evaluate(el=>getComputedStyle(el,'::before').animationDuration),'3s');
      await page.clock.setSystemTime(new Date('2027-04-04T08:45:01Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.countdown-clock:visible').count(),0);
      assert.equal(await page.locator('.countdown-event.is-past').count(),3);
      assert.equal(await page.locator('.countdown-event.is-tbc').count(),2);
      await page.clock.setSystemTime(new Date('2026-09-30T12:00:00Z'));
      await page.clock.runFor(100);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.countdown-square').first().evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
      assert.equal(await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).animationName),'none');
      await page.setViewportSize({width:390,height:360});
      await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('.time-notes').classList.contains('is-paused'));
      const frozen=await page.locator('[data-exact-age]').innerText();
      await page.clock.runFor(1100);
      assert.equal(await page.locator('[data-exact-age]').innerText(),frozen,'No age updates offscreen');
      await page.locator('.back-home').click();
      await page.waitForURL('**/index.html#home');
      assert.equal(await page.locator('.time-notes').count(),0,'Home remains free of the countdown panel');
      assert.deepEqual(errors,[]);
      console.log(`${engine.name()}: responsive layout, ticking, next-event handover, reduced motion and offscreen pause passed.`);
    } finally {await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
