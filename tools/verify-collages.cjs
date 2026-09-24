const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const safari=process.argv.includes('--webkit');
  const browser=await (safari?webkit:chromium).launch({headless:true,...(safari?{}:{channel:'msedge'})});
  try{
    const page=await browser.newPage();
    for(const width of [1920,1280,1024,820,601,390,320]){
      await page.setViewportSize({width,height:1000});
      await page.goto('http://127.0.0.1:4173/');
      await page.waitForFunction(()=>document.documentElement.dataset.ribbonReady==='true');
      await page.evaluate(async()=>{await siteReady;await window.ribbonLayoutReady;});
      const result=await page.evaluate(()=>{
        const main=document.querySelector('main').getBoundingClientRect();
        const album=document.querySelector('.moment-album');
        const frames=[...album.querySelectorAll('.polaroid')];
        const collisions=[];
        if(innerWidth>600) for(const [i,frame] of frames.entries()){
          const r=frame.getBoundingClientRect();
          for(let y=r.top;y<=r.bottom;y+=8){
            const x=ribbonX(y-main.top,innerWidth),half=ribbonHalfWidth(y-main.top,innerWidth);
            if(r.left<x+half&&r.right>x-half){collisions.push(i);break;}
          }
        }
        const gaps=[...document.querySelectorAll('.continuation-copy')].map(copy=>{
          const walker=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT),ys=[];
          while(walker.nextNode()){
            const range=document.createRange();range.selectNodeContents(walker.currentNode);
            for(const r of range.getClientRects())if(r.height)ys.push(r.top);
          }
          const unique=[...new Set(ys.map(Math.round))].sort((a,b)=>a-b);
          return Math.max(...unique.slice(1).map((y,i)=>y-unique[i]));
        });
        return {frames:frames.length,bottomFrames:document.querySelectorAll('.continuation-left .polaroid').length,
          collisions,gaps,albumHeight:album.clientHeight,positions:frames.map(f=>[Math.round(f.offsetLeft),Math.round(f.offsetTop)]),
          pictures:document.querySelectorAll('.substack-card .post-image').length};
      });
      console.log(width,JSON.stringify(result));
      assert.equal(result.frames,8);assert.equal(result.bottomFrames,0);assert.equal(result.pictures,3);
      assert.ok(result.gaps.every(g=>g<100),'No empty viewport between lines');
      assert.deepEqual(result.collisions,[],'Middle photographs clear the ribbon');
    }
    await page.setViewportSize({width:1024,height:1000});
    await page.goto('http://127.0.0.1:4173/');
    await page.locator('.polaroid-film').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{const v=document.querySelector('.polaroid-film video');return !v.paused&&v.currentTime>.1;});
    const playback=await page.locator('.polaroid-film video').evaluate(async v=>{
      let loops=0,last=v.currentTime;
      const timer=setInterval(()=>{if(v.currentTime<last-.3)loops++;last=v.currentTime;},50);
      await new Promise(r=>setTimeout(r,14500));clearInterval(timer);
      return {loops,muted:v.muted,loop:v.loop,src:v.currentSrc};
    });
    assert.ok(playback.loops>=2);assert.ok(playback.muted&&playback.loop);assert.match(playback.src,/-loop.mp4$/);
    await page.locator('.polaroid-film button').click();
    const bezel=await page.locator('.media-dialog').evaluate(e=>({top:parseFloat(getComputedStyle(e).paddingTop),bottom:parseFloat(getComputedStyle(e).paddingBottom)}));
    assert.ok(bezel.bottom>bezel.top*2);
    assert.equal(await page.locator('.polaroid-film video').evaluate(v=>v.paused),true);
    await page.getByRole('button',{name:'Close media'}).click();
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.polaroid-film video').paused);
    console.log('PASS: photo locations, continuous text, post covers, autoplay loops, decoder pauses and bottom bezel.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
