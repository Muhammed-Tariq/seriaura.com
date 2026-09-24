const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const snapshot = require('../assets/substack-posts.json');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage();
    let revision=1, unavailable=false;
    await page.route('http://seriaura.test/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/api/substack') {
        if(unavailable) return route.fulfill({status:503,body:'Unavailable'});
        const data=structuredClone(snapshot);
        data.posts[0].title=`Updated post ${revision}`;
        return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
      }
      const response=await route.fetch({url:'http://127.0.0.1:4173'+url.pathname});
      return route.fulfill({response});
    });
    await page.goto('http://seriaura.test/index.html#home');
    await page.waitForFunction(()=>document.querySelector('.substack-card h2')?.textContent==='Updated post 1');
    assert.equal(await page.locator('.substack-card').count(),3);
    revision=2;
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(()=>document.querySelector('.substack-card h2')?.textContent==='Updated post 2');
    unavailable=true;
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.substack-card h2').first().textContent(),'Updated post 2');
    await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll('.substack-card').length===3);
    assert.equal(await page.locator('.substack-card h2').first().textContent(),snapshot.posts[0].title);
    console.log('PASS: three live cards refresh in place; failures retain posts or show the bundled snapshot.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
