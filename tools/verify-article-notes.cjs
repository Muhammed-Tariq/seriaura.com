const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');
const posts = require('../writings/posts.json');

async function run() {
  const server = createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge'});
    const page = await browser.newPage({reducedMotion:'reduce'}), errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    const ready = async () => {
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});
    };
    for (const width of [1920,1600,1599,1440,1207,1101,1100,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.goto(base);await ready();
      assert.equal(await page.locator('.post-pin').innerText(),'','Pin has no visible text');
      assert.equal(await page.locator('h3 .post-pin').count(),1,'Pin sits beside the title');
      assert.equal(await page.locator('.writings-heading a').evaluate(el=>getComputedStyle(el).color),'rgb(255, 139, 25)');
      if (width>1100) {
        const offset = await page.evaluate(()=>{
          const a=document.querySelector('.sidebar .brand-crop').getBoundingClientRect(),b=document.querySelector('.sidebar nav').getBoundingClientRect();
          return Math.abs(a.left+a.width/2-b.left-b.width/2);
        });
        assert.ok(Math.abs(offset-18*width/1920)<1,'Navigation retains its rightward offset');
      }
      for (const post of posts) {
        await page.goto(base+`writings/${post.slug}/`);await ready();
        assert.equal(await page.locator('.post-header .blog-meta .post-flower').count(),1,'Article displays its botanical symbol in metadata');
        assert.equal(await page.locator('.post-header h1 .post-flower,.post-header .post-pin').count(),0,'Article title is not displaced by a flower or pin');
        assert.equal(await page.locator('.footnote-popup:visible').count(),0,'Popup notes start closed');
        assert.equal(await page.locator('.article-sidenote').count(),await page.locator('.footnote-trigger').count());
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
        if(width>=1600) {
          await page.mouse.move(0,0);
          const geometry=await page.evaluate(()=>({
            body:document.querySelector('.post-body').getBoundingClientRect().toJSON(),
            source:document.querySelector('.blog-source').getBoundingClientRect().toJSON(),
            notes:[...document.querySelectorAll('.article-sidenote')].map(el=>el.getBoundingClientRect().toJSON())
          }));
          let previous=0;
          for(const note of geometry.notes) {
            assert.ok(note.left>geometry.body.right+20 && note.right<=width-12,'Notes fit in the right margin');
            assert.ok(note.top>=previous,'Consecutive margin notes never overlap');
            assert.ok(note.bottom<geometry.source.top,'Notes clear the source and footer');
            previous=note.bottom+15;
          }
          assert.equal(await page.locator('.footnote-trigger[aria-expanded]').count(),0,'Visible desktop notes are not marked as permanently expanded disclosures');
          assert.equal(await page.locator('.article-sidenote').evaluateAll(notes=>notes.every(note=>getComputedStyle(note).borderLeftColor==='rgb(70, 67, 63)')),true,'All bars start grey');
          assert.equal(await page.locator('.article-sidenote em,.article-sidenote i').evaluateAll(els=>els.every(el=>getComputedStyle(el).fontStyle==='normal')),true,'Footnotes are never italic');
          assert.equal(await page.locator('[data-footnote]').evaluateAll(refs=>refs.every(ref=>{
            const content=document.getElementById(ref.querySelector('button').getAttribute('aria-controls')).querySelector('.sidenote-content');
            const normal=text=>text.replace(/\s+/g,' ').trim();
            return normal(ref.querySelector('template').content.textContent)===normal(content.textContent);
          })),true,'Paragraph formatting preserves every word of the original note');
        } else {
          const first=page.locator('.footnote-trigger').first();
          const note=page.locator('#'+await first.getAttribute('aria-controls'));
          assert.equal(await note.isVisible(),false);
          await first.click();
          assert.equal(await note.isVisible(),true,'Small screens use shared popup notes');
          assert.equal(await first.getAttribute('aria-expanded'),'true');
          const box=await note.boundingBox();
          assert.ok(box.x>=11&&box.x+box.width<=width-11,'Popup fits the screen');
          await page.keyboard.press('Escape');
          assert.equal(await note.isVisible(),false);
        }
      }
      console.log(`${width}px: sidebar alignment, flowers, title pin, link colour and all article notes passed`);
    }
    // Reflow a dense article between both layouts while retaining note content.
    await page.goto(base+'writings/why-im-an-atheist/');await ready();
    const text=await page.locator('.article-sidenote').allTextContents();
    for(const width of [1920,1207,390,1920]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.deepEqual(await page.locator('.article-sidenote').allTextContents(),text);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    }
    await page.locator('.footnote-trigger').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:'.preview-refresh/article-margin-notes.png'});
    assert.deepEqual(errors,[]);
    console.log('Resize reflow, rich note content and console checks passed');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1});
