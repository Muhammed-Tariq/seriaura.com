const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');

async function run() {
  const server = createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge'});
    const page = await browser.newPage({viewport:{width:1440,height:900}}), errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.ribbonResizes=0;
      for(const key of ['width','height']) {
        const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);
        Object.defineProperty(HTMLCanvasElement.prototype,key,{...descriptor,set(value){
          if(this.classList.contains('ribbon-canvas'))window.ribbonResizes++;
          descriptor.set.call(this,value);
        }});
      }
    });
    const ready=()=>page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});await page.goto(base);await ready();
      assert.equal(await page.locator('.text-ribbon').getAttribute('data-renderer'),'webgl');
      assert.equal(await page.locator('.polaroid img').evaluateAll(images=>images.every(img=>img.loading==='eager'&&img.complete&&img.naturalWidth>0)),true,'Every photo is ready before scrolling');
      const tiles=await page.locator('.ribbon-tile').evaluateAll(tiles=>tiles.map(tile=>{
        const data=tile.getContext('2d').getImageData(0,0,tile.width,tile.height).data;
        return {top:parseFloat(tile.style.top),height:parseFloat(tile.style.height),ink:data.some((value,i)=>i%4===3&&value>0)};
      }));
      assert.ok(tiles.length>0 && tiles.every(tile=>tile.ink),'Prepared tiles contain actual ribbon pixels');
      for(let i=1;i<tiles.length;i++) assert.ok(Math.abs(tiles[i].top-tiles[i-1].top-tiles[i-1].height)<1,'Prepared river has no gaps between tiles');
      const baseline=await page.locator('.sidebar nav').boundingBox();
      for(const section of ['musings','thousings','writings','home']) {
        await page.locator(`[data-section="${section}"]`).click();
        await page.waitForFunction(section=>document.querySelector(`[data-section="${section}"]`).hasAttribute('aria-current'),section);
        const box=await page.locator('.sidebar nav').boundingBox();
        assert.ok(Math.abs(box.x-baseline.x)<.1,'Changing sections never moves the sidebar horizontally');
      }
      if(width>1100) {
        const resizes=await page.evaluate(async()=>{
          scrollTo({top:0,behavior:'instant'});await new Promise(requestAnimationFrame);
          const start=ribbonResizes;
          for(let i=0;i<80;i++){scrollTo({top:i*35,behavior:'instant'});await new Promise(requestAnimationFrame)}
          return ribbonResizes-start;
        });
        assert.ok(resizes<40,`Scroll does not repeatedly reallocate the drawing surface (${resizes} resizes over 80 frames)`);
      }
      await page.evaluate(async()=>{
        const max=document.documentElement.scrollHeight-innerHeight;
        for(let i=0;i<12;i++){scrollTo({top:i%2?0:max,behavior:'instant'});await new Promise(requestAnimationFrame)}
      });
      const after=await page.locator('.sidebar nav').boundingBox();
      assert.ok(Math.abs(after.x-baseline.x)<.1&&Math.abs(after.y-baseline.y)<.1,'Rapid scrolling does not move the sidebar');
      assert.equal(await page.locator('#thousings').evaluate(el=>getComputedStyle(el).textAlign),width>1100?'right':'start');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      await page.locator('.sidebar .brand').hover();
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar .logo')).filter === 'contrast(1) brightness(1)');
      assert.equal(await page.locator('.sidebar-logo-color').count(),0);
      assert.equal(await page.locator('.sidebar .brand img').count(),1,'Logo has no overlapping image edge');
      await page.screenshot({path:`.preview-refresh/sidebar-gradient-${width}.png`});
      console.log(`${width}px: prepared river tiles, eager photos, fixed sidebar, gradient logo, Thousings alignment and fast scrolling passed`);
    }
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1});
