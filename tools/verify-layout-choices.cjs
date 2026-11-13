const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cheerio=require('cheerio');
const {lifeProgress,gapPercent,easedProgress}=require('../time.js');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const birth='2008-04-09T07:00:00+01:00',now=Date.parse('2026-11-13T12:00:00Z');
assert.equal(lifeProgress(Date.parse(birth),birth),0);
assert.equal(lifeProgress(Date.parse('2093-04-09T06:00:00Z'),birth,85),100);
assert.equal(lifeProgress(Date.parse('2100-01-01T00:00:00Z'),birth,85),100);
assert.equal(lifeProgress(Date.parse('2035-01-01T00:00:00Z'),birth,85,true),100);
assert.equal(lifeProgress(now,birth,85,true),gapPercent(now,birth,'2035-01-01T00:00:00Z'));
assert(lifeProgress(now,birth,85,true)>lifeProgress(now,birth,85));
const transition=Array.from({length:11},(_,i)=>easedProgress(22,70,i/10));
assert.equal(transition[0],22);assert.equal(transition.at(-1),70);assert.equal(transition[5],46);
assert(transition.slice(1).every((value,i)=>value>transition[i]));
assert.equal(easedProgress(70,22,.5),46);

// Exercise the actual interaction and animation, including interrupted transitions.
function verifyHorizonAnimation(){
  const $=cheerio.load(read('countdowns/index.html')),cache=new WeakMap(),frames=new Map(),docListeners=new Map();
  let stamp=0,nextFrame=0;
  const listen=(map,name,fn)=>{const list=map.get(name)||[];list.push(fn);map.set(name,list);};
  function wrap(node){
    if(!node)return null;if(cache.has(node))return cache.get(node);
    const listeners=new Map();
    const el={
      get textContent(){return $(node).text();},set textContent(value){$(node).text(value);},
      get value(){return Number($(node).attr('value'));},set value(value){$(node).attr('value',String(value));},
      get children(){return $(node).children().toArray().map(wrap);},
      querySelector:selector=>wrap($(node).find(selector)[0]),
      setAttribute:(key,value)=>$(node).attr(key,String(value)),
      addEventListener:(name,fn)=>listen(listeners,name,fn),
      dispatch:(name,event={})=>listeners.get(name)?.forEach(fn=>fn(event)),
      matches:()=>false,
      classList:{toggle:(name,on)=>$(node).toggleClass(name,on)},
      dataset:{},style:{values:new Map(),setProperty(name,value){this.values.set(name,value);},getPropertyValue(name){return this.values.get(name);}}
    };cache.set(node,el);return el;
  }
  const doc={hidden:false,documentElement:{clientWidth:390},currentScript:{src:'http://localhost/time.js'},querySelector:selector=>wrap($(selector)[0]),addEventListener:(name,fn)=>listen(docListeners,name,fn)};
  const motionListeners=[];
  const motion={matches:false,addEventListener:(name,fn)=>motionListeners.push(fn)};
  const win={siteContent:{time:{events:[],birth,gapStart:'2026-06-01',gapEnd:'2027-10-01'}},LayoutChoices:{get:()=>({lifeYears:85})},addEventListener(){}};
  class TestDate extends Date{static now(){return now+stamp;}}
  const raf=fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancel=id=>frames.delete(id);
  new Function('document','window','matchMedia','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','performance','Date','clearTimeout',read('time.js'))(doc,win,query=>query.includes('reduced-motion')?motion:{matches:false,addEventListener(){}},class{observe(){}},raf,cancel,{now:()=>stamp},TestDate,()=>{});
  const button=doc.querySelector('.age-horizon'),hover=doc.querySelector('.age-stat'),bar=doc.querySelector('.life-progress');
  const baseline=bar.value;
  const labelMix=()=>Number(button.style.getPropertyValue('--scenario-mix'));
  assert.equal(labelMix(),0);
  const step=time=>{stamp=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(stamp));};
  const advance=duration=>{const end=stamp+duration;while(stamp<end)step(Math.min(end,stamp+16));};
  const synchronised=()=>assert.equal($('[data-life-percent]').text(),bar.value.toFixed(2)+'%');
  hover.dispatch('pointerenter',{pointerType:'mouse'});
  assert.equal(bar.value,baseline,'Hover must not jump to the target');
  assert.equal($('[data-horizon-label]').text(),'Short timeline scenario');
  advance(225);assert(bar.value>baseline&&bar.value<lifeProgress(now,birth,85,true));synchronised();
  const midpoint=bar.value;hover.dispatch('pointerleave');assert.equal(bar.value,midpoint);
  advance(225);assert(bar.value<midpoint&&bar.value>baseline);synchronised();
  advance(1200);assert(Math.abs(bar.value-baseline)<.00001);synchronised();
  assert.equal($('[data-horizon-label]').text(),'Business-as-usual scenario');
  for(let i=0;i<60;i++){const prior=bar.value,priorMix=labelMix();hover.dispatch(i%2?'pointerleave':'pointerenter',{pointerType:'mouse'});assert.equal(bar.value,prior,'No synchronous jump on reversal');assert.equal(labelMix(),priorMix,'The label reverses from its current position');advance(8);assert(bar.value>=baseline&&bar.value<=lifeProgress(now+stamp,birth,85,true));assert(frames.size<=1,'Only one animation loop');synchronised();}
  advance(1500);assert(Math.abs(bar.value-baseline)<.00001);
  button.dispatch('click');advance(225);synchronised();assert.equal($('.age-horizon').attr('aria-pressed'),'true');
  motion.matches=true;motionListeners.forEach(fn=>fn());
  assert.equal(bar.value,lifeProgress(now+stamp,birth,85,true));assert.equal(labelMix(),1);assert.equal(frames.size,0);synchronised();
  button.dispatch('keydown',{key:'Escape'});assert.equal($('.age-horizon').attr('aria-pressed'),'false');
  assert.equal($('.age-horizon').attr('title'),undefined);assert.equal($('.time-assumption-link').length,0);
}
verifyHorizonAnimation();

function loadOptions(search='',stored={},denied=false){
  const data=new Map(Object.entries(stored)),listeners=new Map(),html={dataset:{},style:{setProperty(){}}};
  const storage={getItem:key=>{if(denied)throw Error('Storage unavailable');return data.get(key)||null;},setItem:(key,value)=>{if(denied)throw Error('Storage unavailable');data.set(key,value);}};
  const win={addEventListener:(name,fn)=>{const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list);},dispatchEvent:event=>listeners.get(event.type)?.forEach(fn=>fn(event))};
  const doc={currentScript:{src:'http://localhost/site-options.js'},documentElement:html,createElement:()=>({}),head:{append(){}},readyState:'loading',addEventListener(){}};
  new Function('window','document','localStorage','location',read('site-options.js'))(win,doc,storage,{search});
  return {api:win.LayoutChoices,data,html,win};
}
const options=loadOptions();
assert.equal(options.win.SiteOptions.defaults().strength,15);
const formerDefaults={...options.win.SiteOptions.defaults(),strength:22};
assert.equal(loadOptions('',{'seriaura-options-v1':JSON.stringify({version:2,values:formerDefaults})}).win.SiteOptions.get().strength,15);
assert.equal(loadOptions('',{'seriaura-options-v1':JSON.stringify({version:2,values:{...formerDefaults,strength:30}})}).win.SiteOptions.get().strength,30);
assert.equal(loadOptions('',{'seriaura-options-v1':JSON.stringify({version:3,values:{...formerDefaults,backgroundOpacity:40}})}).win.SiteOptions.get().backgroundOpacity,40);
assert.deepEqual(options.api.get(),{footer:'balanced',home:'tile',lifeYears:85});
options.api.preview({footer:'split'});assert.equal(options.data.size,0,'Previews do not save');
assert.equal(options.html.dataset.footerLayout,'split');
assert(options.api.set({home:'tile',lifeYears:90}));
assert.deepEqual(loadOptions('',Object.fromEntries(options.data)).api.get(),{footer:'split',home:'tile',lifeYears:90});
options.api.set({footer:'invalid',home:'invalid',lifeYears:NaN});assert.deepEqual(options.api.get(),options.api.defaults);
assert.equal(loadOptions('?footerLayout=quiet&homeLayout=breadcrumb&lifeYears=92').api.get().lifeYears,92);
assert.equal(loadOptions('',{},true).api.set({footer:'quiet'}),false,'Unavailable storage is reported');

function articleDOM(markup){
  const $=cheerio.load(markup),cache=new WeakMap();
  function wrap(node){
    if(!node)return null;if(cache.has(node))return cache.get(node);
    const el={node,style:{setProperty(){}},addEventListener(){},
      get className(){return $(node).attr('class')||'';},set className(value){$(node).attr('class',value);},
      get textContent(){return $(node).text();},set textContent(value){$(node).text(value);},
      get innerHTML(){return $(node).html();},set innerHTML(value){$(node).html(value);},
      querySelector:selector=>wrap($(node).find(selector)[0]),querySelectorAll:selector=>$(node).find(selector).toArray().map(wrap),
      setAttribute:(key,value)=>$(node).attr(key,String(value)),getAttribute:key=>$(node).attr(key)??null,
      before:child=>$(node).before(child.node),append:child=>$(node).append(child.node),prepend:child=>$(node).prepend(child.node),remove:()=>$(node).remove(),
      classList:{add:name=>$(node).addClass(name),contains:name=>$(node).hasClass(name),toggle:(name,on)=>$(node).toggleClass(name,on)},
      dataset:new Proxy({},{get:(_,key)=>$(node).attr('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())),set:(_,key,value)=>{$(node).attr('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),String(value));return true;}})
    };cache.set(node,el);return el;
  }
  const doc={readyState:'complete',hidden:false,querySelector:selector=>wrap($(selector)[0]),querySelectorAll:selector=>$(selector).toArray().map(wrap),createElement:tag=>wrap($('<'+tag+'>')[0]),addEventListener(){}};
  const win={addEventListener(){},dispatchEvent(){}};
  class TestDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  new Function('document','window','localStorage','location','setTimeout','clearTimeout','Date',read('article-age.js'))(doc,win,{getItem:()=>null,setItem(){}},{search:''},()=>0,()=>{},TestDate);
  return {$,api:win.ArticleAge};
}
const article=articleDOM(read('writings/excellence-born-of-insecurity/index.html'));
assert.equal(article.api.ageMonths('2026-05-09T12:00:00Z',new Date('2026-11-09T11:59:59Z')),5);
assert.equal(article.api.ageMonths('2026-05-09T12:00:00Z',new Date('2026-11-09T12:00:00Z')),6);
assert.equal(article.api.ageMonths('2026-01-31T00:00:00Z',new Date('2026-02-28T00:00:00Z')),1);
assert.equal(article.api.ageMonths('2024-02-29T00:00:00Z',new Date('2025-02-28T00:00:00Z')),12);
assert.equal(article.api.ageMonths('invalid'),null);
assert.equal(article.api.elapsed('2030-01-01T00:00:00Z',now),null);
assert.deepEqual(article.api.elapsed('2026-11-12T10:57:56Z',now),{days:1,hours:1,minutes:2,seconds:4});
const meta=article.$('.blog-meta')[0];
for(const style of article.api.styles){
  article.api.preview({style:style.id,months:6});
  assert.equal(article.$('.post-context').length,1);
  assert.equal(article.$('.post-context .blog-meta')[0],meta,'Keep the original metadata and badge listeners');
  assert.equal(article.$('.post-context .article-age').length,1);
  assert.equal(article.$('.post-context time').attr('datetime'),'2026-01-06T22:59:20.000Z');
}
article.api.preview({style:'ledger',months:12});assert.equal(article.$('.article-age').length,1,'Age is shown regardless of the former threshold');
article.api.preview({style:'byline',months:1});assert.equal(article.$('.article-age').length,1);
const fresh=articleDOM(read('writings/excellence-born-of-insecurity/index.html').replace('2026-01-06T22:59:20.000Z','2026-11-13T12:00:00.000Z'));
assert.equal(fresh.$('.article-age [data-age-unit=days]').text(),'0','A newly published article immediately shows its age');
assert.equal(fresh.$('.article-age [data-age-unit]').length,4);
const home=articleDOM(read('index.html'));
assert.equal(home.$('.writing-instrument').length,4);
assert.equal(home.$('.writing-age').length,4);
assert.equal(home.$('.writing-age .age-clock').length,4,'Each Writings entry retains its live clock');
home.api.preview({style:'inset',months:12});
assert.equal(home.$('.writing-age').length,4,'All entries retain their day counter, regardless of reminder threshold');
assert.equal(home.$('.home-writings time').length,4);
assert.equal(home.$('.home-writings .post-importance').length,4);assert.equal(home.$('.article-age small').length,0,'Unit labels are omitted');
console.log('Passed: life-horizon arithmetic and synchronised animation (hover, reversal, tap, Escape and reduced motion), preference validation/persistence, preview isolation, article metadata preservation, all three publication styles and four condensed Writings entries.');

async function browserChecks(){
  const {chromium,webkit}=require('playwright'),{createServer}=require('./serve.cjs');
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;let browser;
  try{
    browser=await(process.argv.includes('--webkit')?webkit.launch({executablePath:path.join(root,'.browser-test/webkit-2336/Playwright.exe')}):chromium.launch({channel:'msedge'}));
    const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce',hasTouch:true}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    await page.clock.install({time:new Date(now)});
    for(const width of [320,390,768,1920]){
      await page.setViewportSize({width,height:900});
      await page.goto(base+'/writings/excellence-born-of-insecurity/');
      await page.locator('.article-age').waitFor();await page.evaluate(()=>document.fonts.ready);
      for(const style of ['byline','ledger','inset']){
        await page.evaluate(style=>ArticleAge.set({style,months:6}),style);
        const fit=await page.locator('.post-context').evaluate(el=>{const box=el.getBoundingClientRect();return {height:box.height,overflow:el.scrollWidth>el.clientWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth};});
        assert(fit.height<=38);assert(!fit.overflow&&!fit.pageOverflow,JSON.stringify(fit));
      }
      await page.goto(base+'/home');await page.locator('.writing-instrument').first().waitFor();await page.locator('html.entrance-complete').waitFor();
      if(width<=1100){
        await page.locator('.menu-toggle').click();
        const widths=await page.evaluate(()=>['.menu-toggle','.sidebar nav','.home-writings .post-list'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.left,r.width];}));
        assert(widths.every(([left,w])=>Math.abs(left-widths[0][0])<1&&Math.abs(w-widths[0][1])<1),JSON.stringify(widths));
      }
      if(width<=900)for(const footer of ['balanced','split','quiet']){
        await page.evaluate(footer=>LayoutChoices.set({footer}),footer);
        const centre=await page.locator('.footer-connect').evaluate(el=>{const band=el.getBoundingClientRect(),grid=el.querySelector('.social-links').getBoundingClientRect();return Math.abs((band.top+band.bottom-grid.top-grid.bottom)/2);});assert(centre<1);
      }
      await page.goto(base+'/countdowns/');await page.locator('.is-next').waitFor();await page.evaluate(()=>document.fonts.ready);
      if(width<=600){
        const row=await page.locator('.is-next').evaluate(el=>{const boxes=[el.querySelector('.countdown-square'),...el.querySelectorAll('.countdown-clock b')].map(node=>node.getBoundingClientRect());return {centres:boxes.map(r=>r.top+r.height/2),gaps:boxes.slice(1).map((r,i)=>r.left-boxes[i].right),overflow:document.documentElement.scrollWidth>innerWidth};});
        assert(Math.max(...row.centres)-Math.min(...row.centres)<1.5);assert(row.gaps.every(gap=>gap>=11));assert(!row.overflow);
      }
      const initial=Number(await page.locator('.life-progress').getAttribute('value'));
      await page.locator('.age-horizon').hover();assert.equal(await page.locator('.age-horizon').getAttribute('data-scenario'),'true');
      assert(Number(await page.locator('.life-progress').getAttribute('value'))>initial);
      await page.mouse.move(0,0);assert.equal(await page.locator('.age-horizon').getAttribute('data-scenario'),'false');
      await page.locator('.age-horizon').tap();assert.equal(await page.locator('.age-horizon').getAttribute('aria-pressed'),'true');
      await page.locator('.age-horizon').tap();assert.equal(await page.locator('.age-horizon').getAttribute('aria-pressed'),'false');
    }
    await page.goto(base+'/?showOptions=1');await page.locator('#site-options[open]').waitFor();
    const glowWidths=await page.locator('.options-minimize,.options-maximize').evaluateAll(buttons=>buttons.map(button=>parseFloat(getComputedStyle(button,'::before').width)));
    assert.equal(glowWidths[0],glowWidths[1]+10,'Minimise has an extra ten pixels for its outer fade');
    await page.locator('.options-close').hover();
    assert.match(await page.locator('.options-close').evaluate(button=>getComputedStyle(button,'::before').backgroundImage),/182, 54, 50/,'Close retains its red glow');
    assert.deepEqual(errors,[]);
    console.log('Passed browser geometry, equal-height instruments, mobile widths, centred socials, inline countdown, hover/tap horizons and selector persistence.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
if(process.argv.includes('--browser'))browserChecks().catch(error=>{console.error(error);process.exitCode=1;});
