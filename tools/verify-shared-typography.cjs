const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium, webkit} = require('playwright');
const {createServer} = require('./serve.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [name, engine, options] of [
      ['edge',chromium,{channel:'msedge'}],
      ['webkit',webkit,{executablePath:path.resolve('.browser-test/webkit-2336/Playwright.exe')}]
    ]) {
      const browser = await engine.launch(options);
      try {
        const context = await browser.newContext({reducedMotion:'reduce'});
        await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
        const page = await context.newPage(), errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        for (const width of [390,1440]) {
          const styles = {};
          await page.setViewportSize({width,height:1000});
          for (const route of ['/', '/brand-guidelines/', '/credits/', '/countdowns/', '/vibes/', '/writings/why-im-an-atheist/']) {
            await page.goto(base+route);
            await page.evaluate(()=>document.fonts.ready);
            const state=await page.evaluate(()=>({
              overflow:document.documentElement.scrollWidth>innerWidth,
              headings:[...document.querySelectorAll('h1,h2,h3,h4')].filter(element=>!element.classList.contains('display-heading')).map(element=>{
                const style=getComputedStyle(element);
                return {level:element.tagName,style:[style.fontFamily,style.fontSize,style.fontWeight,style.lineHeight,style.letterSpacing]};
              }),
              wrongColour:[...document.querySelectorAll('a[data-link-kind=hyperlink]')].filter(element=>{const orange=getComputedStyle(element).color==='rgb(255, 139, 25)';return !orange;}).map(element=>({text:element.textContent.trim().slice(0,60),className:element.className,color:getComputedStyle(element).color}))
            }));
            assert(!state.overflow, `${route}: no horizontal overflow at ${width}`);
            assert.deepEqual(state.wrongColour,[],`${route}: prose hyperlinks are orange`);
            for(const heading of route==='/'?[]:state.headings){
              if(route==='/brand-guidelines/'&&heading.level==='H1')heading.level='H2';
              styles[heading.level] ||= heading.style;
              assert.deepEqual(heading.style,styles[heading.level],`${route}: ${heading.level} matches the shared scale at ${width}`);
            }
            if(['/','/brand-guidelines/','/credits/','/countdowns/'].includes(route)) {
              if(route==='/brand-guidelines/') await page.locator('#preface').scrollIntoViewIfNeeded();
              const label=route==='/'?'home':route.split('/')[1];
              await page.screenshot({path:`.preview-refresh/typography-${label}-${name}-${width}.png`});
            }
          }
        }
        assert.deepEqual(errors,[]);
        console.log(`${name}: six pages share heading sizes and use orange links; mobile and desktop layouts fit`);
      } finally {await browser.close();}
    }
  } finally {await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
