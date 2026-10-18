const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {gapPercent, ageInYears, remaining, countdownEffect, elapsedDays} = require('../time.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),context);
const config = context.window.siteContent.time;
const epoch = Date.parse;
const day = 86400000;
for (const [left,effect] of [[10*day+1,'original'],[10*day,'glow'],[5*day+1,'glow'],[5*day,'ripple'],[day+1,'ripple'],[day,'combined'],[1,'combined'],[0,'original'],[-1,'original']]) {
  assert.equal(countdownEffect(left),effect,`Effect at ${left}ms remaining`);
}

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
for (const [id,utc] of [['tmua','2026-10-13T12:00:00Z'],['redemption','2027-01-12T00:00:00Z'],['bath','2027-03-14T10:30:00Z'],['brighton','2027-04-04T08:45:00Z'],['absolution','2027-04-04T23:00:00Z'],['ironman','2027-09-11T22:00:00Z'],['tallinn','2027-08-07T21:00:00Z']]) {
  const event = config.events.find(event=>event.id===id);
  assert.equal(epoch(event.at),epoch(utc),'UK daylight-saving offset');
  assert.deepEqual(remaining(epoch(utc)-90061000,event.at),{days:1,hours:1,minutes:1,seconds:1,started:false});
  assert.deepEqual(remaining(epoch(utc)-1,event.at),{days:0,hours:0,minutes:0,seconds:1,started:false});
  assert.deepEqual(remaining(epoch(utc),event.at),{days:0,hours:0,minutes:0,seconds:0,started:true});
  assert.deepEqual(remaining(epoch(utc)+1000,event.at),{days:0,hours:0,minutes:0,seconds:0,started:true});
}
for (const elapsed of [-1,0,1,86399999,86400000,9*day,10*day,100*day]) assert.equal(elapsedDays(epoch(config.events[0].at)+elapsed,config.events[0].at),Math.max(0,Math.floor(elapsed/day)));
console.log('Date boundaries, leap years, and UK offsets passed.');

const {chromium,webkit} = require('playwright');
(async()=>{
  fs.mkdirSync(path.join(__dirname,'../.preview-refresh'),{recursive:true});
  for (const [engine,options] of (process.argv.includes('--chromium-only') ? [[chromium,{channel:'msedge'}]] : [[chromium,{channel:'msedge'}],[webkit,{}]])) {
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
      assert.match(await counting.locator('..').innerText(),/counting down to things/);
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
      assert.match(await page.locator('[data-gap-percent]').innerText(),/^\d+\.\d{5}$/);
      assert.equal(await page.locator('.pulse-picker,[name="countdown-pulse"]').count(),0,'Preview menu removed');
      await page.evaluate(()=>localStorage.setItem('countdown-pulse-preview','combined'));
      await page.reload();
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      assert.equal(await page.locator('.time-notes').getAttribute('data-pulse'),'original','Old saved selection is ignored');
      const tmuaAt = epoch(config.events.find(event=>event.id==='tmua').at);
      for (const [left,style] of [[10*day+1000,'original'],[10*day,'glow'],[5*day+1000,'glow'],[5*day,'ripple'],[day+1000,'ripple'],[day,'combined']]) {
        await page.clock.setSystemTime(new Date(tmuaAt-left));
        await page.clock.runFor(100);
        assert.equal(await page.locator('.time-notes').getAttribute('data-pulse'),style);
        const pulse = page.locator('.is-next .countdown-pulse');
        assert.equal(await pulse.evaluate(el=>getComputedStyle(el).animationName),style==='original'?'none':`countdown-${style==='combined'?'ripple':style}`);
        assert.equal(await page.locator('.countdown-halo:visible').count(),style==='combined'?1:0,'Extra glow only appears for the combined option');
        if (style==='combined') assert.equal(await page.locator('.is-next .countdown-halo').evaluate(el=>getComputedStyle(el).animationName),'countdown-glow');
        assert.equal(await page.locator('.countdown-pulse:visible').count(),style==='original'?0:1,'Only the big countdown pulses within its thresholds');
      }
      // Cross each threshold by ticking forward, without a reload.
      for (const [days,before,after] of [[10,'original','glow'],[5,'glow','ripple'],[1,'ripple','combined']]) {
        await page.clock.setSystemTime(new Date(tmuaAt-days*day-1000));
        await page.clock.runFor(100);
        assert.equal(await page.locator('.time-notes').getAttribute('data-pulse'),before);
        await page.clock.runFor(1000);
        assert.equal(await page.locator('.time-notes').getAttribute('data-pulse'),after);
      }
      await page.clock.setSystemTime(new Date('2026-09-30T12:00:00Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.time-notes h2:visible').count(),0);
      assert.equal(await page.locator('.event-logo img').count(),6);
      await page.locator('.event-logo img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.match(await page.locator('[data-event="tmua"] img').getAttribute('src'),/assets\/events\/tmua\.svg$/);
      assert.equal(await page.locator('.countdown-colon:visible').count(),3);
      assert.equal(await page.locator('.countdown-colon').first().getAttribute('aria-hidden'),'true');
      assert.equal(await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).animationDuration),'0.8s');
      const colonOpacity=await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).opacity);
      await page.clock.runFor(250);
      assert.notEqual(await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).opacity),colonOpacity,'Colons fade smoothly');
      assert.equal(await page.locator('[data-colon-toggle],.countdown-controls').count(),0);
      assert.equal(await page.locator('.countdown-event').count(),8);
      assert.equal((await page.locator('[data-event="redemption"] h3').innerText()).replace(/\s+/g,' '),'IV Redemption');
      assert.deepEqual(await page.locator('[data-event="redemption"] .redemption-iv').evaluate(el=>[getComputedStyle(el).fontFamily.replaceAll('"',''),getComputedStyle(el).color]),['Source Code Pro, monospace','rgb(192, 16, 52)']);
      assert.match(await page.locator('[data-event="redemption"] .event-logo').getAttribute('title'),/12 Jan 2027, 00:00 UK/);
      for(const id of ['oxford']) {
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
      await page.clock.runFor(4500);
      const gapIncrement = Number(await page.locator('[data-gap-percent]').innerText())-gap;
      assert.ok(gapIncrement>0&&gapIncrement<=0.000021,'Five-decimal gap percentage advances over time');
      await page.clock.runFor(250);
      assert.notEqual(await page.locator('.countdown-square').first().evaluate(el=>getComputedStyle(el,'::before').transform),orbit,'Red trail moves');
      await page.clock.runFor(3500);
      assert.notEqual(await page.locator('[data-exact-age]').innerText(),age,'Seven-decimal age updates');
      const clockSize=await page.locator('[data-event="tmua"] [data-hours]').evaluate(el=>getComputedStyle(el).fontSize);
      const sizes=[];
      for(const days of [1234,123,11,1,0]) {
        await page.clock.setSystemTime(new Date(epoch(config.events[0].at)-(days*86400+123)*1000));
        await page.clock.runFor(100);
        const fit=await page.locator('[data-event="tmua"]').evaluate(row=>{
          const number=row.querySelector('[data-days]'),box=number.parentElement;
          const rect=number.getBoundingClientRect(),frame=box.getBoundingClientRect();
          return {text:number.textContent,size:parseFloat(getComputedStyle(number).fontSize),clock:getComputedStyle(row.querySelector('[data-hours]')).fontSize,comfortable:rect.width<frame.width*.82&&rect.height<frame.height*.96};
        });
        assert.equal(fit.text,String(days));
        assert.ok(fit.comfortable,`${days} fits comfortably`);
        assert.equal(fit.clock,clockSize,'Clock units do not resize with day digits');
        sizes.push(fit.size);
      }
      assert.ok(sizes[0]<sizes[1]&&sizes[1]<sizes[2]&&sizes[2]<sizes[3]&&sizes[3]===sizes[4],'Day font adapts to digit count');
      await page.clock.setSystemTime(new Date('2026-09-30T12:00:00Z'));
      await page.clock.runFor(100);
      for (const width of [3440,2560,1920,1600,1401,1400,1399,1366,1200,1101,1100,1001,1000,999,900,851,850,768,600,390,360,320]) {
        await page.setViewportSize({width,height:1080});
        await page.locator('.time-notes').scrollIntoViewIfNeeded();
        await page.clock.runFor(100);
        const layout=await page.evaluate(()=>{
          const panel=document.querySelector('.time-notes').getBoundingClientRect();
          const heading=document.querySelector('h1').getBoundingClientRect();
          const boxes=[...document.querySelectorAll('.time-notes .time-value,.countdown-square,.countdown-clock,.event-logo img')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
          const stats=document.querySelector('.time-stats').getBoundingClientRect();
          const next=document.querySelector('.countdown-event.is-next').getBoundingClientRect();
          const others=[...document.querySelectorAll('.countdown-event:not(.is-next)')].map(el=>el.getBoundingClientRect());
          const bath=document.querySelector('[data-event="bath"]').getBoundingClientRect();
          const brighton=document.querySelector('[data-event="brighton"]').getBoundingClientRect();
          const ironman=document.querySelector('[data-event="ironman"]').getBoundingClientRect();
          const oxford=document.querySelector('[data-event="oxford"]').getBoundingClientRect();
          const centre=document.documentElement.clientWidth/2;
          const art=document.querySelector('[data-event="tmua"] .event-logo').getBoundingClientRect();
          const image=document.querySelector('[data-event="tmua"] img').getBoundingClientRect();
          const values=document.querySelector('.is-next .countdown-values').getBoundingClientRect();
          const gap=parseFloat(getComputedStyle(document.querySelector('.is-next')).columnGap);
          const columnWidth=(next.width-gap)/2;
          const columnCentre=next.right-columnWidth/2;
          return {overflow:document.documentElement.scrollWidth>innerWidth,inside:boxes.every(box=>box.left>=0&&box.right<=innerWidth),separate:panel.top>=heading.bottom,centred:Math.abs(stats.left+stats.width/2-centre)<1,grid:others.every((box,i)=>box.top>=next.bottom&&others.slice(i+1).every(other=>box.right<=other.left+1||other.right<=box.left+1||box.bottom<=other.top+1||other.bottom<=box.top+1)),fillsPage:Math.abs(document.querySelector('.countdown-events').getBoundingClientRect().width-panel.width)<1,artContained:image.top>=art.top-1&&image.bottom<=art.bottom+1,artClear:((art.right+20<=values.left)||(art.bottom+20<=values.top))&&image.left>=art.left-1&&image.right<=art.right+1,clockCentred:innerWidth<1400||Math.abs(values.left+values.width/2-columnCentre)<1};
        });
        assert.deepEqual(layout,{overflow:false,inside:true,separate:true,centred:true,grid:true,fillsPage:true,artContained:true,artClear:true,clockCentred:true},`${engine.name()} ${width}`);
        if([1920,1001,900,390].includes(width)) await page.screenshot({path:path.join(__dirname,`../.preview-refresh/time-${engine.name()}-${width}.png`)});
      }
      await page.setViewportSize({width:1920,height:1080});
      await page.locator('.time-notes').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>!document.querySelector('.time-notes').classList.contains('is-paused'));
      await page.clock.setSystemTime(new Date('2026-10-13T11:59:58Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('[data-event="tmua"] [data-seconds]').innerText(),'02');
      await page.clock.runFor(2100);
      assert.equal(await page.locator('[data-event="tmua"] .countdown-clock').isVisible(),false);
      assert.equal(await page.locator('[data-event="tmua"] [data-day-label]').innerText(),'days since');
      assert.equal(await page.locator('.completed-events').isVisible(),true);
      assert.equal(await page.locator('.completed-events [data-event="tmua"] [data-days]').innerText(),'0');
      const completedStyle = await page.locator('[data-event="tmua"] .countdown-square').evaluate(el=>{
        const style=getComputedStyle(el,'::before');
        return {direction:style.animationDirection,duration:style.animationDuration,background:style.backgroundImage};
      });
      assert.equal(completedStyle.direction,'reverse');
      assert.equal(completedStyle.duration,'5s');
      assert.match(completedStyle.background,/75, 154, 112/,'Completed border is green');
      assert.equal(await page.locator('[data-event="redemption"] .countdown-clock').isVisible(),true);
      assert.equal(await page.locator('.time-notes').getAttribute('data-pulse'),'original','Effect resets for the next event');
      assert.ok(await page.evaluate(()=>document.querySelector('[data-event="redemption"]').getBoundingClientRect().bottom<=document.querySelector('[data-event="tmua"]').getBoundingClientRect().top),'New nearest event moves to the top');
      assert.equal(await page.locator('[data-event="redemption"] .countdown-square').evaluate(el=>getComputedStyle(el,'::before').animationDuration),'3s');
      await page.clock.setSystemTime(new Date(tmuaAt+day));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.completed-events [data-days]').innerText(),'1');
      assert.equal(await page.locator('.completed-events [data-day-label]').innerText(),'day since');
      await page.clock.setSystemTime(new Date(tmuaAt+4*day));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.completed-events [data-days]').innerText(),'4');
      assert.equal(await page.locator('.completed-events [data-day-label]').innerText(),'days since');
      assert.equal(await page.locator('.completed-events .completed-event-name').innerText(),'TMUA');
      assert.equal(await page.locator('.completed-events time').innerText(),'13 Oct 2026');
      assert.ok((await page.locator('.completed-events .countdown-square').boundingBox()).width<=72,'Completed elapsed-day indicator stays compact');
      for (const width of [3440,1920,1400,1101,1001,768,390,320]) {
        await page.setViewportSize({width,height:1080});
        assert.ok(await page.locator('.time-notes').evaluate(panel=>{
          const visible=[...panel.querySelectorAll('.countdown-number,.event-logo,.event-logo img')].filter(el=>el.getClientRects().length);
          return document.documentElement.scrollWidth<=innerWidth && visible.every(el=>{
            const rect=el.getBoundingClientRect(),parent=el.parentElement.getBoundingClientRect();
            return rect.left>=parent.left-1&&rect.right<=parent.right+1&&rect.top>=parent.top-1&&rect.bottom<=parent.bottom+1;
          });
        }),`Current events and large wordmark fit at ${width}px`);
      }
      await page.setViewportSize({width:1920,height:1080});
      await page.locator('.time-notes').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>!document.querySelector('.time-notes').classList.contains('is-paused'));
      await page.clock.setSystemTime(new Date('2027-01-12T00:00:01Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('[data-event="redemption"] [data-day-label]').innerText(),'days since');
      assert.equal(await page.locator('[data-event="bath"] .countdown-clock').isVisible(),true);
      await page.clock.setSystemTime(new Date('2027-04-04T23:00:00Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.completed-events [data-event="absolution"] [data-days]').innerText(),'0');
      assert.equal(await page.locator('.is-next').getAttribute('data-event'),'tallinn');
      assert.equal(await page.locator('.countdown-clock:visible').count(),0,'Date-only races do not imply a confirmed start time');
      assert.match(await page.locator('[data-event="tallinn"] .event-logo').getAttribute('title'),/8 August 2027/);
      assert.match(await page.locator('[data-event="ironman"] .event-logo').getAttribute('title'),/12 September 2027/);
      await page.clock.setSystemTime(new Date('2027-09-13T08:45:01Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.countdown-clock:visible').count(),0);
      assert.equal(await page.locator('.countdown-event.is-past').count(),7);
      assert.equal(await page.locator('.countdown-event.is-tbc').count(),1);
      assert.equal(await page.locator('.countdown-pulse:visible,.countdown-halo:visible').count(),0,'No effects when all dated events have started');
      await page.clock.setSystemTime(new Date('2026-09-30T12:00:00Z'));
      await page.clock.runFor(100);
      assert.equal(await page.locator('.completed-events').isVisible(),false,'Changing the clock back restores the upcoming section');
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.countdown-square').first().evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
      assert.equal(await page.locator('.countdown-colon').first().evaluate(el=>getComputedStyle(el).animationName),'none');
      for (const [days,style] of [[9,'glow'],[4,'ripple'],[.5,'combined']]) {
        await page.clock.setSystemTime(new Date(tmuaAt-days*day));
        await page.clock.runFor(1100);
        assert.equal(await page.locator('.time-notes').getAttribute('data-pulse'),style);
        assert.equal(await page.locator('.is-next .countdown-pulse').evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion disables each pulse');
        assert.equal(await page.locator('.countdown-halo:visible').count(),0,'Reduced motion hides the extra glow');
      }
      await page.setViewportSize({width:390,height:360});
      await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('.time-notes').classList.contains('is-paused'));
      await page.emulateMedia({reducedMotion:'no-preference'});
      assert.equal(await page.locator('.is-next .countdown-pulse').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
      assert.equal(await page.locator('.is-next .countdown-halo').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
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
