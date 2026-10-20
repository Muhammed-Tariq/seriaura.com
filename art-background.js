/* Optional art directions for the design preview. No choice is applied by default. */
(() => {
  const modes = ['marginalia','monument','afterglow','wordwall','loose-type','searchlight'];
  const mode = new URLSearchParams(location.search).get('art');
  if (!modes.includes(mode)) return;
  const main = document.querySelector('main');
  if (!main) return;
  document.documentElement.dataset.art = mode;
  const layer = document.createElement('div');
  layer.className = 'text-art-background';
  layer.setAttribute('aria-hidden','true');
  const panels = () => ['home','musings','thousings','writings'].map(section => `<div class="art-wall-panel art-wall-${section}"><img src="assets/text-art/orangesongsfinal.png" alt="" width="3000" height="3000"></div>`).join('');
  if (mode === 'wordwall' || mode === 'searchlight') {
    layer.innerHTML = `<div class="art-wall-base">${panels()}</div>` + (mode === 'searchlight' ? `<div class="art-illuminated">${panels()}</div>` : '');
  } else if (mode === 'loose-type') {
    // Crop the original transparent artwork in SVG without resampling its fine text.
    const crops = [[205,240,650,900],[1120,240,470,900],[1620,240,660,900],[2400,240,620,900],[3190,240,550,900]];
    layer.innerHTML = Array.from({length:12},(_,i) => `<div class="art-letter art-letter-${i}"><svg viewBox="${crops[i%5].join(' ')}" focusable="false"><image href="assets/text-art/serilogo.png" width="4000" height="1500"/></svg></div>`).join('');
  } else layer.innerHTML = `<div class="art-warmth"></div>
    <img class="art-heart art-heart-first" src="assets/text-art/orangesongsfinal.png" alt="" width="3000" height="3000">
    <img class="art-heart art-heart-second" src="assets/text-art/orangesongsfinal.png" alt="" width="3000" height="3000" loading="lazy">
    <img class="art-signature art-signature-first" src="assets/text-art/serilogo.png" alt="" width="4000" height="1500">
    <img class="art-signature art-signature-second" src="assets/text-art/serilogo.png" alt="" width="4000" height="1500" loading="lazy">`;
  main.prepend(layer);
  let frame;
  function position() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const top = main.getBoundingClientRect().top;
      for (const section of ['musings','thousings','writings']) {
        const element = document.getElementById(section);
        if (element) layer.style.setProperty(`--${section}-y`,element.getBoundingClientRect().top-top+'px');
      }
    });
  }
  new ResizeObserver(position).observe(main);
  document.fonts.ready.then(position);
  position();

  if (!['loose-type','searchlight'].includes(mode)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const letters = [...layer.querySelectorAll('.art-letter')];
  let interactionFrame, pendingPoint;
  function respond(point) {
    pendingPoint = point;
    if (interactionFrame || reduced.matches || document.hidden) return;
    interactionFrame = requestAnimationFrame(() => {
      interactionFrame = 0;
      const {x,y} = pendingPoint;
      const bounds = layer.getBoundingClientRect();
      layer.style.setProperty('--spot-x', x-bounds.left+'px');
      layer.style.setProperty('--spot-y', y-bounds.top+'px');
      letters.forEach((letter,i) => {
        // The outer element stays still so transformed artwork cannot feed back into hit testing.
        const rect = letter.getBoundingClientRect();
        const dx=rect.left+rect.width/2-x, dy=rect.top+rect.height/2-y;
        const distance=Math.hypot(dx,dy), reach=Math.max(240,rect.width);
        const strength=Math.max(0,1-distance/reach);
        const angle=Math.atan2(dy,dx);
        letter.style.setProperty('--drift-x',Math.cos(angle)*strength*64+'px');
        letter.style.setProperty('--drift-y',Math.sin(angle)*strength*64+'px');
        letter.style.setProperty('--drift-turn',(i%2?1:-1)*strength*18+'deg');
      });
    });
  }
  document.addEventListener('pointermove',event => {
    if (event.pointerType !== 'touch') respond({x:event.clientX,y:event.clientY});
  },{passive:true});
  document.addEventListener('pointerdown',event => {
    if (!event.target.closest('a,button,input,select,textarea,[role="button"]')) respond({x:event.clientX,y:event.clientY});
  },{passive:true});
  function reset() {
    cancelAnimationFrame(interactionFrame);interactionFrame=0;
    letters.forEach(letter => {for (const prop of ['--drift-x','--drift-y','--drift-turn']) letter.style.removeProperty(prop);});
  }
  document.documentElement.addEventListener('pointerleave',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  reduced.addEventListener('change',reset);
  let stirCount=0;
  window.siteArt = {stir() {
    stirCount++;
    const visible = letters.filter(letter => {const box=letter.getBoundingClientRect();return box.bottom>0&&box.top<innerHeight;});
    const chosen=visible[(stirCount-1)%visible.length];
    const box=chosen?.getBoundingClientRect();
    respond(box ? {x:box.left+box.width*.45,y:box.top+box.height*.4} : {x:innerWidth*(stirCount%2?.8:.2),y:innerHeight*.4});
  }};
})();
