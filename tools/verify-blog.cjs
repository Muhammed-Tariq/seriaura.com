const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');
const {createServer} = require('./serve.cjs');
const {cleanArticle, selectHomePosts, updateHomeWritings} = require('./sync-substack.cjs');
const posts = require('../writings/posts.json');
const homePosts = selectHomePosts(posts);
async function run() {
  const safe = cleanArticle('<script>alert(1)</script><p onclick="alert(1)">Words <a href="javascript:alert(1)">link</a><img src="https://example.com/a.png" onerror="alert(1)"></p>', new Set());
  assert.doesNotMatch(safe, /<script|onclick|onerror|javascript:/i);
  assert.equal(cleanArticle('<p>we<a href="https://example.com"><span> know </span></a>of</p>',new Set()),'<p>we <a href="https://example.com/"><span>know</span></a> of</p>');
  const future = {...posts[0],slug:'future-post',published:'2030-01-01T00:00:00Z'};
  const selection = selectHomePosts([future,...posts]);
  assert.equal(selection.length,4);
  assert.equal(selection[0].slug,'excellence-born-of-insecurity');
  assert.equal(selection[1].slug,'future-post');
  assert.equal(new Set(selection.map(post=>post.slug)).size,4);
  const home = await fs.readFile('index.html','utf8');
  assert.equal(updateHomeWritings(home,posts),home,'Cached posts and generated home list agree');
  const server = createServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge'});
    const context = await browser.newContext({reducedMotion:'reduce'});
    await context.addInitScript(() => {sessionStorage.setItem('blog-ribbon','on'); sessionStorage.setItem('blog-view','cards');});
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => requests.push(r.url()));
    const ready = () => page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
    const selectSection = async section => {
      const toggle=page.locator('.menu-toggle');
      if(await toggle.isVisible() && await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
      await page.locator('[data-section="'+section+'"]').click();
    };
    await fs.mkdir('.preview-refresh',{recursive:true});
    for (const width of [3440,2560,1920,1600,1440,1207,1101,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.goto(base + 'writings/?ribbon=on&view=cards'); await ready();
      assert.match(page.url(), /index\.html#writings$/,'Old index redirects to the home section');
      assert.deepEqual(await page.locator('.post-link').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),homePosts.map(post=>`writings/${post.slug}/`));
      assert.equal(await page.locator('.post-pin').count(),1);
      assert.equal(await page.locator('.post-flower-3').count(),1);
      assert.equal(await page.locator('.post-flower-2').count(),1);
      assert.equal(await page.locator('.post-flower-1').count(),2);
      assert.equal(await page.locator('.blog-tools,.blog-preview,.blog-ribbon,.post-cover,.post-list img').count(),0);
      assert.equal(await page.locator('#writings').innerText(),'Writings');
      assert.equal(await page.locator('.writings-substack').innerText(),'Read on Substack');
      assert.equal(await page.locator('[data-section="writings"]').getAttribute('aria-current'),'location');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      const geometry = await page.evaluate(() => {
        const photos = [...document.querySelectorAll('.closing-portraits .polaroid')].map(e=>e.getBoundingClientRect());
        const writing = document.querySelector('.home-writings').getBoundingClientRect();
        const footer = document.querySelector('.site-footer').getBoundingClientRect();
        return {photoLeft:Math.min(...photos.map(p=>p.left)),photoTop:Math.min(...photos.map(p=>p.top)),photoBottom:Math.max(...photos.map(p=>p.bottom)),writingRight:writing.right,writingTop:writing.top,writingBottom:writing.bottom,footerTop:footer.top};
      });
      if (width > 1100) {
        assert.ok(geometry.writingRight + 15 < geometry.photoLeft,'Writings sit beside the ribbon with portraits to the right');
        const contour = await page.evaluate(() => {
          const mainTop = document.querySelector('main').getBoundingClientRect().top;
          const scale = innerWidth / 1920;
          const points = [...document.querySelectorAll('.text-ribbon path')].flatMap(path => path.getAttribute('d').slice(1).split(' L').map(pair => pair.split(',').map(Number)));
          const list = document.querySelector('.home-writings .post-list');
          const rules = [list,...list.children].map((element,index) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element,index ? '::after' : '::before');
            const y = (index ? rect.bottom : rect.top) - mainTop;
            const left = rect.left + parseFloat(style.left);
            const ribbonEdge = Math.max(...points.filter(point => Math.abs(point[1]-y)<6*scale).map(point => point[0]));
            return {left,right:rect.right-parseFloat(style.right),gap:(left-ribbonEdge)/scale};
          });
          const textLeft = [...document.querySelectorAll('.home-writings .blog-meta,.home-writings .post-title-row,.home-writings .post-summary>p')].map(element => element.getBoundingClientRect().left);
          const boundary = document.querySelector('.writings-boundary');
          const boundaryRect = boundary.getBoundingClientRect();
          const boundaryPoints = boundary.querySelector('path').getAttribute('d').slice(1).split(' L').map(pair=>pair.split(',').map(Number));
          const textGaps = [...document.querySelectorAll('.home-writings .blog-meta,.home-writings .post-title-row,.home-writings .post-summary>p')].map(element=>{
            const rect = element.getBoundingClientRect();
            const edge = Math.max(...boundaryPoints.filter(point=>point[1]+boundaryRect.top>=rect.top&&point[1]+boundaryRect.top<=rect.bottom).map(point=>point[0]+boundaryRect.left));
            return rect.left-edge;
          });
          const fade = parseFloat(getComputedStyle(boundary).getPropertyValue('--boundary-fade'));
          const listRect = list.getBoundingClientRect();
          return {rules,textLeft,textGaps,solidAtJunctions:boundaryRect.top+fade<listRect.top&&boundaryRect.bottom-fade>listRect.bottom,boundaryMask:getComputedStyle(boundary).maskImage,ruleFade:getComputedStyle(list,'::before').backgroundImage,boundaryStroke:getComputedStyle(boundary.querySelector('path')).stroke};
        });
        assert.ok(Math.max(...contour.rules.map(rule=>rule.left))-Math.min(...contour.rules.map(rule=>rule.left))>30*width/1920,'Divider starts follow the ribbon curve');
        assert.ok(Math.max(...contour.textLeft)-Math.min(...contour.textLeft)>30*width/1920,'Text follows the curve within each entry');
        assert.ok(contour.rules.every(rule=>rule.gap>8&&rule.gap<70),'Every divider hugs the rendered ribbon without touching it');
        assert.ok(contour.rules.every(rule=>rule.right<geometry.photoLeft),'Extended divider fade-outs clear the portraits');
        const leftSpread = Math.max(...contour.rules.map(rule=>rule.left))-Math.min(...contour.rules.map(rule=>rule.left));
        const rightSpread = Math.max(...contour.rules.map(rule=>rule.right))-Math.min(...contour.rules.map(rule=>rule.right));
        assert.ok(Math.abs(rightSpread / leftSpread - 2)<.05,'Divider fade-outs exaggerate the boundary curve');
        assert.ok(contour.solidAtJunctions,'Boundary remains fully opaque at the first and last intersections');
        assert.ok(contour.textGaps.every(gap=>Number.isFinite(gap)&&gap>=15),'Text stays comfortably clear of the curved boundary');
        assert.match(contour.boundaryMask,/linear-gradient/,'Boundary fades at its ends');
        assert.match(contour.ruleFade,/linear-gradient/,'Dividers fade towards their right ends');
        assert.equal(contour.boundaryStroke,'rgb(101, 97, 90)','Boundary matches the stronger divider colour');
      } else {
        assert.ok(geometry.writingBottom + 15 < geometry.photoTop,'Portraits follow writings on narrow screens');
      }
      assert.ok(Math.max(geometry.photoBottom,geometry.writingBottom)+15<geometry.footerTop,'Closing section clears the footer');
      if ([1920,1440,390].includes(width)) await page.screenshot({path:`.preview-refresh/home-writings-${width}.png`});
      await selectSection('home');
      await page.waitForFunction(()=>scrollY<2);
      await selectSection('writings');
      await page.waitForFunction(()=>document.querySelector('[data-section="writings"]').hasAttribute('aria-current'));
      assert.match(page.url(),/#writings$/);
      requests.length = 0;
      const homeType = await page.locator('.continuation-copy').first().evaluate(el=>({size:getComputedStyle(el).fontSize,line:getComputedStyle(el).lineHeight,font:getComputedStyle(el).fontFamily}));
      await page.locator('.post-link[href="writings/why-im-an-atheist/"]').click(); await ready();
      assert.equal(await page.locator('h1').innerText(),posts[0].title);
      assert.equal(await page.locator('.post-body').evaluate(el=>getComputedStyle(el).fontFamily),homeType.font);
      assert.equal(await page.locator('.post-body').evaluate(el=>getComputedStyle(el).fontSize),width>1100?'22.99px':'19px','Mobile reading type avoids the desktop enlargement');
      if(width>=1101) assert.ok((await page.locator('.post-body').boundingBox()).width>=640,'Desktop article text has a comfortable reading width');
      if(width>=1600) assert.ok((await page.locator('.post-body').boundingBox()).width>=width/3-1,'Wide articles occupy at least one third of the screen');
      assert.equal(await page.getByText('Join the conversation',{exact:false}).count(),0);
      assert.equal(await page.locator('.post-body a').evaluateAll(links=>links.some(a=>/^\s|\s$/.test(a.textContent))),false);
      assert.equal(await page.locator('.footnote-trigger').count(),16);
      assert.equal(await page.locator('.blog-tools,.blog-ribbon,.ribbon-canvas').count(),0);
      assert.ok(!requests.some(url => /ribbon-renderer|text-art\.txt|blog-preference\.js|\/blog\.js/.test(url)), 'Articles do not load ribbon or preview code');
      await page.locator('.footnote-trigger').first().click();
      assert.equal(await page.locator('.footnote-trigger').first().getAttribute('aria-expanded'),width>=1600 ? null : 'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      await page.locator('.blog-back').click(); await ready();
      assert.match(page.url(), /index\.html#writings$/);
      assert.equal(await page.locator('.post-link').count(),homePosts.length);
      console.log(`${width}px: home writings, photo layout, anchor navigation, articles and footnotes passed`);
    }
    await page.setViewportSize({width:1440,height:900});
    for (const post of posts) {
      await page.goto(base + `writings/${post.slug}/`); await ready();
      assert.equal(await page.locator('h1').innerText(),post.title);
      assert.ok((await page.locator('.post-body').innerText()).length > 5000);
      assert.equal(await page.locator('.post-body script,.post-body iframe,.post-body form').count(),0);
      for (const href of await page.locator('.post-body a[href^="../"]').evaluateAll(links => links.map(a => a.href))) assert.equal((await context.request.get(href)).status(),200);
    }
    const noJS = await browser.newContext({javaScriptEnabled:false});
    const staticPage = await noJS.newPage();
    await staticPage.goto(base + 'writings/' + posts[0].slug + '/');
    assert.ok(await staticPage.locator('.post-body').isVisible());
    assert.equal(await staticPage.locator('a[href="#footnote-1"]').count(),1);
    assert.equal(await staticPage.locator('#footnote-1').count(),1);
    await staticPage.goto(base + 'index.html#writings');
    assert.equal(await staticPage.locator('.post-link').count(),homePosts.length);
    assert.ok(await staticPage.locator('#writings').isVisible());
    await noJS.close(); assert.deepEqual(errors,[]);
    console.log('All articles, sanitizer, no ribbon requests and no-JavaScript reading passed');
  } finally {await browser?.close(); await new Promise(resolve => server.close(resolve));}
}
run().catch(error => {console.error(error); process.exitCode = 1;});
