const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
(async () => {
  for (const [engine, options] of [[chromium,{channel:'msedge'}],[webkit,{}]]) {
    const browser = await engine.launch({headless:true,...options});
    try {
      const context = await browser.newContext({reducedMotion:'reduce'});
      // Exercise real new-tab navigation without loading third-party sites.
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
        ? route.continue() : route.fulfill({contentType:'text/html',body:'External destination'}));
      const page = await context.newPage();
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      for (const route of ['/','/contact/','/payment/','/brand-guidelines/','/josh-isms/','/counting/']) {
        await page.goto(`http://127.0.0.1:4173${route}`);
        const failures=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].filter(link=>{
          const url=new URL(link.href);
          const internal=url.origin===location.origin || /^(www\.)?seriaura\.com$/i.test(url.hostname);
          return internal ? !!link.target : link.target!=='_blank'||!link.relList.contains('noopener');
        }).map(link=>link.href));
        assert.deepEqual(failures,[],route);
      }
      await page.goto('http://127.0.0.1:4173/');
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      await page.locator('.small-things a[href="counting/"]').click();
      await page.waitForURL('**/counting/');
      assert.equal(context.pages().length,1,'Countdown subpage stays in the same tab');
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      const original=page.url();
      const popupPromise=context.waitForEvent('page');
      await page.locator('[data-event="tmua"] .event-logo').click();
      const popup=await popupPromise;
      await popup.waitForLoadState();
      assert.match(popup.url(),/esat-tmua\.ac\.uk/);
      assert.equal(page.url(),original);
      await popup.close();
      await page.locator('.back-home').click();
      await page.waitForURL('**/index.html#home');
      await page.waitForFunction(()=>document.documentElement.classList.contains('entrance-complete'));
      await page.locator('a[href="josh-isms/"]').click();
      await page.waitForURL('**/josh-isms/');
      assert.equal(context.pages().length,1,'Internal subpage stays in the same tab');
      await page.evaluate(()=>{
        const link=document.createElement('a');link.id='test-link';link.href='https://example.com';document.querySelector('main').append(link);
      });
      await page.waitForFunction(()=>document.querySelector('#test-link').target==='_blank');
      await page.locator('#test-link').evaluate(link=>{link.href='https://seriaura.com/contact/';});
      await page.waitForFunction(()=>!document.querySelector('#test-link').target);
      assert.deepEqual(errors,[]);
      console.log(`${engine.name()}: all six pages, event-logo popup, same-tab subpages and dynamic links passed.`);
    } finally {await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
