const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.browser-test');
const {chromium, webkit} = require('playwright');
const {createServer} = require('./serve.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [name, engine] of Object.entries({chromium, webkit})) {
      const browser = await engine.launch(name === 'chromium' ? {channel:'msedge'} : {executablePath:process.env.WEBKIT_EXECUTABLE_PATH});
      try {
        const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
        const fixture = await fs.readFile('assets/photos/IMG_1922.webp');
        await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() :
          route.request().resourceType() === 'image' ? route.fulfill({body:fixture,contentType:'image/webp'}) : route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const ready = () => page.waitForFunction(() => document.documentElement.classList.contains('entrance-complete'));
        await page.goto(base); await ready();
        const toggle = page.locator('.menu-toggle');
        const nav = page.locator('.sidebar nav');
        await toggle.tap();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar nav')).opacity === '1');
        assert.equal(await nav.evaluate(el => getComputedStyle(el.querySelector('[aria-current]'),'::after').content), 'none');
        const menuBox = await nav.boundingBox(), toggleBox = await toggle.boundingBox();
        assert.ok(Math.abs(menuBox.x-toggleBox.x)<1 && Math.abs(menuBox.width-toggleBox.width)<1,'Dropdown matches the divider width');
        assert.equal(await page.locator('.sidebar .logo-white').evaluate(el => el.src.endsWith('/assets/logo.png') && getComputedStyle(el).filter === 'brightness(1.12)'),true,'Header gently brightens the white artwork');
        assert.equal(await page.locator('.footer-brand .logo-white').evaluate(el => getComputedStyle(el).filter),'brightness(1.12)');
        assert.equal(await page.locator('.back-to-top').count(),0);
        await toggle.tap();
        const fade = await nav.evaluate(el => {
          const animations = el.getAnimations();
          const opacity = animations.find(animation => animation.transitionProperty === 'opacity');
          opacity?.pause();
          if (opacity) opacity.currentTime = 80;
          return {animates:!!opacity,opacity:Number(getComputedStyle(el).opacity),inert:el.inert};
        });
        assert.ok(fade.animates && fade.opacity > 0 && fade.opacity < 1, 'Closing menu fades through intermediate opacity');
        assert.equal(fade.inert,true,'Closing menu cannot receive focus or taps');
        await nav.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
        const labelFade = await nav.evaluate(async nav => {
          nav.querySelector('[aria-current]').removeAttribute('aria-current');
          nav.querySelectorAll('a')[1].setAttribute('aria-current','true');
          await Promise.resolve();
          const label = document.querySelector('.menu-current');
          const animation = label.getAnimations()[0];
          animation.pause(); animation.currentTime=35;
          const result = {text:label.textContent,opacity:Number(getComputedStyle(label).opacity)};
          animation.finish();
          return result;
        });
        assert.equal(labelFade.text,'Home','Previous section remains during fade-out');
        assert.ok(labelFade.opacity>0 && labelFade.opacity<1);
        await page.waitForFunction(() => document.querySelector('.menu-current').textContent==='Musings');
        const musingsLabel = await page.locator('.menu-current').elementHandle();
        await nav.evaluate(nav => {
          nav.querySelector('[aria-current]').removeAttribute('aria-current');
          nav.querySelector('a').setAttribute('aria-current','true');
        });
        await page.waitForFunction(() => document.querySelector('.menu-current').textContent==='Home');
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.menu-current')).opacity==='1');
        assert.equal(await musingsLabel.evaluate(el=>el.isConnected),false,'Outgoing text layer is removed before showing Home');
        assert.equal(await page.locator('.menu-current').count(),1);
        assert.equal(await page.locator('.menu-current').innerText(),'Home');
        await page.screenshot({path:`.preview-refresh/mobile-home-${name}.png`});
        for (const id of ['mountains','loch','liquicity-tent','orange-hat','mirror','paint','tube-sign']) {
          const image = page.locator(`[data-photo="${id}"] img`);
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(image => image.decode());
          const expected = await image.evaluate(image => ({
            tilt:parseFloat(getComputedStyle(image.closest('.polaroid')).getPropertyValue('--rotation')),
            orientation:Number(image.dataset.previewRotation) || 0,
            ratio:image.naturalWidth / image.naturalHeight,
            slot:image.closest('.media-slot').getBoundingClientRect().toJSON()
          }));
          // Pause on the opening frame to inspect both the starting tilt and the final orientation.
          await image.evaluate(image => {
            image.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
          });
          await page.locator('dialog.image-preview').waitFor({state:'visible'});
          const opening = await page.evaluate(() => {
            const frame = document.querySelector('.image-preview-frame');
            const animation = frame.getAnimations()[0];
            animation.pause(); animation.currentTime = 0;
            return animation.effect.getKeyframes()[0].transform;
          });
          const angle = Number(opening.match(/rotate\(([-\d.]+)deg\)/)[1]);
          assert.ok(Math.abs(angle - expected.tilt) < .01, `${id} starts at its original tilt`);
          const crop = await page.locator('.image-preview-frame').evaluate(frame => {
            const animation = frame.getAnimations()[0];
            animation.currentTime=272;
            const target=frame.getBoundingClientRect();
            animation.currentTime=0;
            const style=getComputedStyle(frame), matrix=new DOMMatrixReadOnly(style.transform);
            const readInsets=value=>{
              const values=value.match(/-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
              return [values[0],values[1]??values[0],values[2]??values[0],values[3]??values[1]??values[0]];
            };
            const insets=readInsets(style.clipPath);
            const [top,right,bottom,left]=insets;
            const points=[
              [target.width*(left/100-.5),target.height*(top/100-.5)],
              [target.width*(.5-right/100),target.height*(top/100-.5)],
              [target.width*(left/100-.5),target.height*(.5-bottom/100)],
              [target.width*(.5-right/100),target.height*(.5-bottom/100)]
            ].map(([x,y])=>matrix.transformPoint({x,y}));
            const bounds={left:Math.min(...points.map(p=>p.x))+target.x+target.width/2,
              right:Math.max(...points.map(p=>p.x))+target.x+target.width/2,
              top:Math.min(...points.map(p=>p.y))+target.y+target.height/2,
              bottom:Math.max(...points.map(p=>p.y))+target.y+target.height/2};
            animation.currentTime=136;
            const middle=readInsets(getComputedStyle(frame).clipPath);
            return {bounds,insets,middle,duration:animation.effect.getTiming().duration};
          });
          assert.equal(crop.duration,272,'Zoom uses the faster duration');
          for(const edge of ['left','right','top','bottom']) assert.ok(Math.abs(crop.bounds[edge]-expected.slot[edge])<1,`${id}: initial crop ${edge} matches the thumbnail: ${JSON.stringify({crop,slot:expected.slot})}`);
          assert.ok(crop.insets.some(value=>value>0),'Cropped photo starts with a clip');
          assert.ok(crop.middle.every((value,i)=>value<=crop.insets[i]),'Crop opens progressively');
          if (id==='orange-hat') {
            for (const time of [0,136]) {
              await page.locator('.image-preview-frame').evaluate((frame,time)=>{
                const animation=frame.getAnimations()[0]; animation.pause(); animation.currentTime=time;
              },time);
              await page.screenshot({path:`.preview-refresh/crop-reveal-${name}-${time}.png`});
            }
          }
          const samples = await page.locator('.image-preview-frame').evaluate(frame => {
            const animation = frame.getAnimations()[0];
            return [0,68,136,204,272].map(time => {
              animation.currentTime = time;
              const matrix = new DOMMatrixReadOnly(getComputedStyle(frame).transform);
              return Math.hypot(matrix.a,matrix.b);
            });
          });
          assert.ok(samples[1] > samples[0] && samples[1] < samples[0]+(1-samples[0])*.4,'First quarter of zoom does not jump near the final size');
          assert.ok(samples.every((value,i) => !i || value>samples[i-1]),'Zoom progresses smoothly throughout the animation');
          assert.equal(await page.locator('.image-preview-close').evaluate(el => getComputedStyle(el).outlineStyle),'none','Touch opening does not draw a focus ring');
          await page.locator('.image-preview-frame').evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
          const result = await page.locator('.image-preview-image').evaluate(image => {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
            const box = image.getBoundingClientRect();
            const caption = document.querySelector('.image-preview-caption').getBoundingClientRect();
            return {angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI,ratio:box.width/box.height,gap:caption.top-box.bottom,right:box.right,bottom:caption.bottom};
          });
          assert.ok(Math.abs(result.angle - expected.orientation) < .01, `${id} retains the photograph's orientation correction`);
          assert.ok(Math.abs(result.ratio - (expected.orientation ? 1/expected.ratio : expected.ratio)) < .01);
          // Caption reveal may still be translating by up to 5px.
          assert.ok(result.gap >= 11 && result.gap <= 18);
          assert.ok(result.right <= 390.1 && result.bottom <= 844);
          if (id === 'liquicity-tent') {
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.image-preview-caption')).opacity === '1');
            await page.screenshot({path:`.preview-refresh/mobile-photo-${name}.png`});
          }
          await page.keyboard.press('Tab');
          assert.equal(await page.locator('dialog').evaluate(el => el.classList.contains('opened-with-pointer')),false,'Keyboard interaction restores focus indicators');
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.querySelector('dialog').open);
        }
        const livePhoto = page.locator('[data-photo="mountains"] img');
        await livePhoto.scrollIntoViewIfNeeded();
        await livePhoto.tap();
        await page.locator('dialog.image-preview').waitFor({state:'visible'});
        await page.waitForFunction(() => document.querySelector('.image-preview-frame').getAnimations()[0]?.playState==='running');
        const liveMotion = await page.locator('.image-preview-frame').evaluate(async frame => {
          const animation = frame.getAnimations()[0];
          const start = animation.currentTime;
          await new Promise(resolve => setTimeout(resolve,80));
          return {start,end:animation.currentTime,decoded:document.querySelector('.image-preview-image').complete};
        });
        assert.ok(liveMotion.decoded && liveMotion.end>liveMotion.start,'Real touch opening paints the image and advances without manual playback');
        await page.locator('.image-preview-frame').evaluate(async frame => { await Promise.all(frame.getAnimations().map(animation=>animation.finished)); });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog').open);
        await page.emulateMedia({reducedMotion:'reduce'});
        for (const width of [320,390,600,768,900,1100]) {
          await page.setViewportSize({width,height:844});
          await page.locator('.footer-brand').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .brand')).opacity === '0');
          const menuAtFooter = await toggle.boundingBox();
          assert.ok(Math.abs(menuAtFooter.y)<1,'Header slides up to leave only the menu');
          const footer = await page.locator('.footer-brand .brand-crop').boundingBox();
          assert.ok(footer.x >= 0 && footer.x+footer.width <= width+.1, 'Footer logo fits');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
          if (width === 390) await page.screenshot({path:`.preview-refresh/mobile-footer-${name}.png`});
          await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
          await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar .brand')).opacity === '1');
        }
        await page.setViewportSize({width:390,height:844});
        await page.goto(base+'/writings/why-im-an-atheist/'); await ready();
        assert.equal(await page.locator('.post-body').evaluate(el => getComputedStyle(el).fontSize),'17px');
        assert.equal(await page.locator('.post-header .post-importance>span').innerText(),'Considerable');
        await page.screenshot({path:`.preview-refresh/mobile-article-${name}.png`});
        const note = page.locator('.footnote-trigger').first();
        await note.scrollIntoViewIfNeeded();
        const hitbox = await note.evaluate(el => {
          const box = el.getBoundingClientRect();
          const target = getComputedStyle(el,'::after');
          return {x:box.x+box.width/2,y:box.y+box.height/2+14,width:parseFloat(target.width),height:parseFloat(target.height)};
        });
        assert.ok(hitbox.width >= 32 && hitbox.height >= 36);
        await page.touchscreen.tap(hitbox.x,hitbox.y);
        await page.locator('.footnote-popup:visible').waitFor();
        assert.deepEqual(errors,[]);
        console.log(`${name}: menu fade-out, photo tilt/orientation, touch focus, captions, footer bounds/handoff and footnote tap area passed`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
