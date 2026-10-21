const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const {createServer}=require('./serve.cjs');
const posts=require('../writings/posts.json');
(async()=>{
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}/writings/`;
  try{for(const [name,engine,options] of [['chromium',chromium,{channel:'msedge'}],['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]]){
    const browser=await engine.launch(options);
    try{
      const page=await browser.newPage({reducedMotion:'reduce',deviceScaleFactor:2}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const ready=async()=>{await page.waitForFunction(()=>window.articleArcArt);await page.locator('html.entrance-complete').waitFor();};
      for(const width of [320,390,768,1100,1101,1440,1920]){
        await page.setViewportSize({width,height:900});
        for(const post of posts){
          await page.goto(base+post.slug+'/');await ready();
          const state=await page.evaluate(()=>{
            const arcs=[...document.querySelectorAll('.article-arc')];
            const checks=arcs.map(arc=>{
              const p=arc.querySelectorAll('path')[1],length=p.getTotalLength();
              const points=Array.from({length:101},(_,i)=>p.getPointAtLength(length*i/100));
              const anchor=document.querySelector(arc.dataset.arc==='top'?'.post-header .blog-deck':'.blog-source');
              const range=document.createRange();range.selectNodeContents(anchor);const bounds=range.getBoundingClientRect();
              const host=arc.getBoundingClientRect(),near=points.filter(p=>p.x>=bounds.left&&p.x<=bounds.right);
              return {down:arc.dataset.arc==='top',start:points[0].y,end:points[100].y,min:Math.min(...points.map(p=>p.y)),max:Math.max(...points.map(p=>p.y)),clear:near.every(p=>arc.dataset.arc==='top'?p.y+host.top>bounds.bottom+10:p.y+host.top<bounds.top-10)};
            });
            return {checks,overflow:document.documentElement.scrollWidth>innerWidth,diagnostics:articleArcArt.diagnostics(),borders:[getComputedStyle(document.querySelector('.post-header')).borderBottomWidth,getComputedStyle(document.querySelector('.blog-source')).borderTopWidth],ratio:arcs[0].querySelector('canvas')?.width/parseFloat(arcs[0].querySelector('canvas')?.style.width)};
          });
          assert.equal(state.overflow,false);assert.deepEqual(state.borders,['0px','0px']);
          assert.equal(state.checks.length,2);
          for(const arc of state.checks){assert.ok(arc.clear,`${name} ${post.slug} ${width}: arc clears text`);assert.ok(arc.down?arc.max>Math.max(arc.start,arc.end)+10:arc.min<Math.min(arc.start,arc.end)-10,'Opposing bows');}
          assert.equal(state.diagnostics.running,false,'Reduced motion remains still');
          if(name==='chromium')assert.ok(state.ratio>=1.9,'Native high-density canvas');
        }
      }
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.goto(base+'why-im-an-atheist/');await ready();
      const first=await page.evaluate(()=>articleArcArt.diagnostics());await page.waitForTimeout(600);
      const moving=await page.evaluate(()=>articleArcArt.diagnostics());
      if(first.arcs[0].renderer==='webgl'){
        assert.ok(moving.seconds>first.seconds);assert.ok(moving.paints>first.paints);
        assert.ok(moving.paints-first.paints<44,'Paints capped near 60fps');
        assert.equal(moving.builds,first.builds,'No geometry rebuild during motion');
      }
      await page.evaluate(()=>scrollTo({top:document.querySelector('.post-body').offsetHeight/2,behavior:'instant'}));
      await page.waitForTimeout(200);const idle=await page.evaluate(()=>articleArcArt.diagnostics());
      await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>articleArcArt.diagnostics())).paints,idle.paints,'Offscreen arcs stop');
      await page.locator('.blog-source').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
      await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>articleArcArt.diagnostics())).arcs[1].visible,true);
      await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:getContext.call(this,type,...args)};});
      await page.reload();await ready();
      const fallback=await page.evaluate(()=>articleArcArt.diagnostics());
      assert.ok(fallback.arcs.every(a=>a.renderer==='svg'));assert.equal(fallback.running,false);
      assert.equal(await page.locator('.article-arc svg').first().evaluate(el=>getComputedStyle(el).visibility),'visible');
      assert.deepEqual(errors,[]);
      console.log(`${name}: all articles, seven widths, opposite arcs, clear text, reduced motion, offscreen pause and SVG fallback passed`);
    }finally{await browser.close();}
  }}finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
