const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

// Stage a clean set before replacing any existing preview files.
(async () => {
  const output = path.resolve(__dirname, '../.preview-refresh');
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
    const open = async (width,height,route='index.html#home') => {
      await page.setViewportSize({width,height});
      await page.goto(`http://127.0.0.1:4173/${route}`);
      await page.waitForFunction(() => document.documentElement.classList.contains('site-ready'));
      await page.evaluate(async () => {
        await document.fonts.ready;
        if (typeof stopHeadingCycle === 'function') stopHeadingCycle();
        await Promise.all([...document.querySelectorAll('.polaroid img,.media-card img')].map(img => img.decode().catch(() => {})));
        window.scrollTo({top:0,behavior:'instant'});
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await page.mouse.move(0,0);
    };
    const shot = (name,options={}) => page.screenshot({path:path.join(output,name),...options});
    await open(1920,1080);
    await shot('preview-desktop.png');
    // Keep the fixed sidebar at its visible viewport position in the long capture.
    const sidebar = await page.locator('.sidebar').boundingBox();
    const freeze = await page.addStyleTag({content:`.sidebar{top:${sidebar.y}px!important;transform:none!important}.sidebar .brand{opacity:1!important;visibility:visible!important}`});
    await shot('preview-full.png',{fullPage:true});
    await freeze.evaluate(element => element.remove());
    await page.locator('.site-footer').screenshot({path:path.join(output,'preview-footer-desktop.png')});
    await open(768,1080);
    await shot('preview-tablet.png');
    await open(390,844);
    await shot('preview-mobile.png');
    await page.locator('.site-footer').screenshot({path:path.join(output,'preview-footer-mobile.png')});
    await open(1920,1080,'contact/');
    await shot('preview-contact.png');
    console.log(`Captured seven current website previews in ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
