/* The ribbon and the text exclusions share the same curve, including on resize. */
const content = window.siteContent;
const intro = document.querySelector('#intro-copy');
const originalCopy = intro.innerHTML;
const originalParagraphs = [...intro.querySelectorAll('p')].map(p => p.innerHTML);
const svgNS = 'http://www.w3.org/2000/svg';
let ribbonText = 'For progeny and posterity. ';
let resizeFrame;
let ribbonOpeningHeight = 0;
let measuredWidth = 0;
let ribbonRenderKey = '';
let ribbonSidebarEdge = 0;
let ribbonContentEdge = 0;
let ribbonPhoneY = 180;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// Load every weight used in the measured copy before calculating exclusions.
const siteFontsReady = Promise.allSettled([
  '400 19px Sentient', '500 36px Sentient', 'italic 500 36px Sentient',
  '700 40px Sentient', 'italic 700 40px Sentient', '800 10px "Source Code Pro"'
].map(font => document.fonts.load(font)));
const headingWords = ['posterity', 'blog posts', 'PB&J', 'white girl pop', 'percussion', 'progress', 'Prague'];
let headingTimer;
let headingEndTimer;
let headingScrambleTimer;
const flowerAnimations = new WeakMap();
const sidebar = document.querySelector('.sidebar');
const sidebarBrand = sidebar.querySelector('.brand');
const phoneLayout = matchMedia('(max-width: 600px)');
let sidebarFrame;

function updateFooterSidebar() {
  const footerTop = document.querySelector('.site-footer').getBoundingClientRect().top;
  // Separate enter/leave thresholds prevent small scroll reversals from
  // repeatedly restarting the movement at the edge of the footer.
  const wasAtFooter = sidebar.classList.contains('at-footer');
  const atFooter = !phoneLayout.matches && footerTop <= innerHeight - (wasAtFooter ? 48 : 96);
  sidebar.style.setProperty('--brand-height', `${sidebarBrand.offsetHeight}px`);
  sidebar.style.setProperty('--sidebar-edge', `${sidebar.querySelector('nav').getBoundingClientRect().left}px`);
  sidebar.classList.toggle('at-footer', atFooter);
  sidebarBrand.inert = atFooter;
}
function scheduleSidebar() {
  if (sidebarFrame) return;
  sidebarFrame = requestAnimationFrame(() => { sidebarFrame = 0; updateFooterSidebar(); });
}
window.addEventListener('scroll', scheduleSidebar, { passive: true });
window.addEventListener('resize', scheduleSidebar);
new ResizeObserver(scheduleSidebar).observe(document.querySelector('.site-footer'));

function spinFlower(link) {
  if (!link.hasAttribute('aria-current') || reducedMotion.matches) return;
  const flower = link.querySelector('.flower');
  if (flowerAnimations.get(flower)?.playState === 'running') return;
  const from = Number(flower.dataset.angle || 0);
  const to = from + 180;
  flower.dataset.angle = to;
  // Keep the final angle, including after mouse exit, so there is no snap or reverse.
  flower.style.transform = `translateY(-50%) scale(1) rotate(${to}deg)`;
  flowerAnimations.set(flower, flower.animate([
    { transform: `translateY(-50%) scale(1) rotate(${from}deg)` },
    { transform: `translateY(-50%) scale(1) rotate(${to}deg)` }
  ], { duration: 600, easing: 'cubic-bezier(.25,.1,.25,1)', iterations: 1 }));
}
document.querySelectorAll('[data-section]').forEach(link => {
  link.addEventListener('pointerenter', event => {
    const sidebarMoving = sidebar.getAnimations().some(animation => animation.transitionProperty === 'transform');
    if (event.pointerType !== 'touch' && !sidebarMoving) spinFlower(link);
  });
  link.addEventListener('focus', () => { if (link.matches(':focus-visible')) spinFlower(link); });
  link.addEventListener('click', () => { if (link.hasAttribute('aria-current')) spinFlower(link); });
});

function decorateHeading(heading) {
  const emphasis = heading.querySelector('em:last-child');
  const word = document.createElement('span');
  word.className = 'glitch-word';
  word.dataset.word = 'posterity.';
  const sizer = document.createElement('span');
  sizer.className = 'word-sizer'; sizer.textContent = 'white girl pop.';
  sizer.setAttribute('aria-hidden', 'true');
  const value = document.createElement('span');
  value.className = 'word-value'; value.textContent = 'posterity.';
  word.append(sizer, value);
  emphasis.replaceChildren(word);
  heading.setAttribute('aria-label', 'For progeny and posterity.');
}
function stopHeadingCycle() {
  clearTimeout(headingTimer); clearTimeout(headingEndTimer);
  clearInterval(headingScrambleTimer);
  const word = document.querySelector('#page-title .glitch-word');
  if (word) { word.classList.remove('is-glitching'); word.querySelector('.word-value').textContent = word.dataset.word; }
}
function queueHeadingCycle() {
  const word = document.querySelector('#page-title .glitch-word');
  if (!word || document.hidden) return;
  headingTimer = setTimeout(() => {
    if (!word.isConnected || document.hidden) return;
    const options = headingWords.filter(value => `${value}.` !== word.dataset.word);
    const next = `${options[Math.floor(Math.random() * options.length)]}.`;
    const swap = () => { word.querySelector('.word-value').textContent = next; word.dataset.word = next; };
    if (reducedMotion.matches) { swap(); queueHeadingCycle(); return; }
    word.classList.add('is-glitching');
    const value = word.querySelector('.word-value');
    const previous = [...word.dataset.word];
    const symbols = '!?<>/{}[]#%&*+_░';
    // Keep the outgoing phrase's length and typography until the final swap.
    const scramble = () => {
      const frame = previous.map(character => /\s|\./.test(character) ? character : symbols[Math.floor(Math.random() * symbols.length)]);
      value.textContent = frame.join('');
    };
    scramble();
    headingScrambleTimer = setInterval(scramble, 45);
    headingEndTimer = setTimeout(() => {
      clearInterval(headingScrambleTimer); swap(); word.classList.remove('is-glitching'); queueHeadingCycle();
    }, 520);
  }, 3500 + Math.random() * 1000);
}
document.addEventListener('visibilitychange', () => { stopHeadingCycle(); if (!document.hidden) queueHeadingCycle(); });
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    document.querySelectorAll('.flower').forEach(flower => flower.getAnimations().forEach(animation => animation.cancel()));
    stopHeadingCycle(); queueHeadingCycle();
  }
});

function createMedia(media, { controls = true } = {}) {
  if (!media?.src) return null;
  const isVideo = media.type === 'video';
  const element = document.createElement(isVideo ? 'video' : 'img');
  element.src = isVideo ? media.loopSrc || media.src : controls ? media.src : media.thumbnail || media.src;
  if (isVideo) {
    element.controls = controls;
    element.playsInline = true;
    element.muted = true;
    element.loop = true;
    element.autoplay = controls;
    element.preload = 'metadata';
    element.setAttribute('aria-label', media.alt || 'Video');
    if (media.poster) element.poster = media.poster;
    // A supplied captions file can be configured alongside each video.
    if (media.captions) {
      const track = document.createElement('track');
      Object.assign(track, { kind: 'captions', src: media.captions, srclang: media.language || 'en', label: media.captionLabel || 'English', default: true });
      element.append(track);
    }
  } else {
    element.alt = media.alt || '';
    element.loading = 'eager';
    element.decoding = 'async';
    if (media.position && !controls) element.style.objectPosition = media.position;
  }
  return element;
}

const dialog = document.querySelector('.media-dialog');
// Keep one lightweight decoder, paused whenever the film is offscreen or hidden.
const previewVideos = new Set();
function updatePreviewPlayback() {
  for (const video of previewVideos) {
    if (video.dataset.inView === 'true' && !document.hidden && !dialog.open && !reducedMotion.matches && !document.querySelector('.scrapbook').hidden) {
      video.play().catch(() => {}); // Low-power mode can require a tap; the frame still opens the player.
    } else video.pause();
  }
}
const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { entry.target.dataset.inView = String(entry.isIntersecting); });
  updatePreviewPlayback();
}, {rootMargin:'80px'});
document.addEventListener('visibilitychange', updatePreviewPlayback);
reducedMotion.addEventListener('change', updatePreviewPlayback);
function openMedia(media) {
  document.querySelector('.dialog-content').replaceChildren(createMedia(media));
  dialog.showModal();
  updatePreviewPlayback();
}
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  dialog.querySelectorAll('video').forEach(video => video.pause());
  document.querySelector('.dialog-content').replaceChildren();
  updatePreviewPlayback();
});

content.polaroids.forEach(media => {
  const frame = document.createElement('figure');
  frame.className = 'polaroid';
  if (media.type === 'video') frame.classList.add('polaroid-film');
  const slot = document.createElement('div');
  slot.className = 'media-slot';
  const element = createMedia(media, { controls: false });
  if (element) {
    frame.dataset.filled = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `${media.type === 'video' ? 'Play' : 'View'} ${media.alt || 'media'}`);
    button.append(element);
    if (media.type === 'video') {
      previewVideos.add(element);
      videoObserver.observe(element);
      const icon = document.createElementNS(svgNS, 'svg');
      icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('film-indicator');
      icon.innerHTML = '<path d="m9 5 11 7-11 7z"/>';
      button.append(icon);
    }
    button.addEventListener('click', () => openMedia(media));
    slot.append(button);
  } else frame.setAttribute('aria-hidden', 'true');
  frame.append(slot);
  const destination = media.section === 'opening' ? '.polaroids' : '#further .moment-album';
  document.querySelector(destination).append(frame);
});

function setCollection({ scroll = false, initial = false } = {}) {
  const name = location.hash.slice(1).replace(/^writings$/, 'home');
  const knownCollection = Object.hasOwn(content.collections, name);
  if (name && !knownCollection && !initial) return;
  const key = knownCollection ? name : 'home';
  const collection = content.collections[key];
  document.querySelector('main').dataset.collection = key;
  const previous = document.querySelector('[data-section][aria-current]')?.dataset.section;
  document.querySelectorAll('[data-section]').forEach(link => {
    if (link.dataset.section === key) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (!initial && previous !== key) spinFlower(document.querySelector(`[data-section="${key}"]`));
  stopHeadingCycle();
  const heading = document.querySelector('#page-title');
  heading.innerHTML = collection.title;
  heading.removeAttribute('aria-label');
  if (key === 'home') { decorateHeading(heading); queueHeadingCycle(); }
  if (collection.original) intro.innerHTML = originalCopy;
  else {
    intro.replaceChildren();
    collection.paragraphs.forEach(text => {
      const p = document.createElement('p'); p.textContent = text; intro.append(p);
    });
  }
  document.querySelector('.scrapbook').hidden = key !== 'home';
  updatePreviewPlayback();
  document.querySelectorAll('.moment-album').forEach(album => { album.hidden = key !== 'home'; });
  document.querySelector('#further-title').innerHTML = collection.continuation ?? 'Listening to<br>the <em>world.</em>';
  document.querySelectorAll('.continuation-copy').forEach((copy, index) => {
    copy.closest('.continuation').hidden = !collection.original && !collection.paragraphs.length;
    // Reference copy remains clearly editable sample text rather than an invented biography.
    copy.innerHTML = collection.original
      ? [...originalParagraphs.slice(index ? 1 : 0), ...originalParagraphs].map(text => `<p>${text.replaceAll('href="#further"', 'href="#main"')}</p>`).join('')
      : collection.paragraphs.map(text => `<p>${text}</p>`).join('');
  });
  document.title = `${key[0].toUpperCase() + key.slice(1)} — Quintessentially Seri`;
  if (scroll) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  scheduleLayout();
}

window.addEventListener('hashchange', () => setCollection({ scroll: true }));

// Content anchors keep each bend alongside a section instead of repeating
// a fixed wave that can leave an entire viewport between lines of text.
let ribbonAnchors = [];
function ribbonX(y, width) {
  if (!ribbonAnchors.length) return width * .25;
  const points = ribbonAnchors;
  const i = Math.max(0, Math.min(points.length - 2, points.findIndex((p, index) => index < points.length - 1 && y <= points[index + 1].y)));
  if (y > points.at(-1).y) return points.at(-1).x;
  const a = points[i], b = points[i + 1];
  const span = b.y - a.y, t = Math.max(0, Math.min(1, (y - a.y) / span));
  // Monotone cubic interpolation: continuous tangents without overshooting
  // into the sidebar, writing, or post cards.
  const tangent = n => {
    if (n === 0 || n === points.length - 1) return 0;
    const before = (points[n].x - points[n-1].x) / (points[n].y - points[n-1].y);
    const after = (points[n+1].x - points[n].x) / (points[n+1].y - points[n].y);
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  };
  return (2*t**3-3*t*t+1)*a.x + (t**3-2*t*t+t)*span*tangent(i)
    + (-2*t**3+3*t*t)*b.x + (t**3-t*t)*span*tangent(i+1);
}

function ribbonSlope(y, width) {
  return (ribbonX(y + 1, width) - ribbonX(y - 1, width)) / 2;
}
function ribbonHalfWidth(y, width, margin = 0) {
  const scale = width / 1920;
  const half = ribbonBand(width);
  return (half + margin) * Math.hypot(1, ribbonSlope(y, width));
}

let layoutGeneration = 0;
function arrangeAlbum(album, mainTop, width) {
  if (width <= 600) return;
  const rect = album.getBoundingClientRect();
  const frames = [...album.querySelectorAll('.polaroid')];
  const frameWidth = parseFloat(getComputedStyle(album).getPropertyValue('--photo-width'));
  const frameHeight = frameWidth / 1.2;
  const rows = width>1100 ? 4 : 5;
  const rowHeight = album.clientHeight / rows;
  let next = 0;
  for (let row = 0; row < rows && next < frames.length; row++) {
    const top = row * rowHeight + 18;
    const edges = Array.from({length:12}, (_,i) => {
      const y = rect.top-mainTop+top-20+i*(frameHeight+40)/11;
      return [ribbonX(y,width)-ribbonHalfWidth(y,width,20), ribbonX(y,width)+ribbonHalfWidth(y,width,20)];
    });
    const leftEnd = Math.min(...edges.map(e=>e[0])) - rect.left;
    const rightStart = Math.max(...edges.map(e=>e[1])) - rect.left;
    const intervals = [[18, Math.min(rect.width-18,leftEnd)], [Math.max(18,rightStart),rect.width-18]];
    const slots = [];
    for (const [left,right] of intervals) {
      const count = Math.max(0,Math.floor((right-left+22)/(frameWidth+22)));
      for(let n=0;n<count;n++) slots.push(left + (right-left-frameWidth)*(n+.5)/count);
    }
    const wanted = Math.min(Math.ceil((frames.length-next)/(rows-row)),slots.length);
    for(let n=0;n<wanted;n++) {
      const frame = frames[next++];
      const slot = slots[Math.floor((n+.5)*slots.length/wanted)];
      frame.style.left = `${slot}px`; frame.style.top = `${top+(n%2 ? 14 : 0)}px`;
    }
  }
  // Reserve another row if an unusually narrow screen needs more room.
  if(next < frames.length) {
    frames.slice(next).forEach((frame,n)=>{frame.style.left=`${18+n*(frameWidth+24)}px`;frame.style.top=`${album.clientHeight-frameHeight-12}px`;});
  }
}
async function layoutRibbon() {
  const generation = ++layoutGeneration;
  delete document.documentElement.dataset.ribbonReady;
  await siteFontsReady;
  if (generation !== layoutGeneration) return;
  const main = document.querySelector('main');
  const width = main.clientWidth;
  if (measuredWidth !== width) {
    const nav = sidebar.querySelector('nav'), navStyle = getComputedStyle(nav);
    const selectedInset = width > 600 ? parseFloat(getComputedStyle(nav.querySelector('a')).fontSize)*.83+9 : 24;
    ribbonSidebarEdge = Math.max(sidebar.querySelector('.brand-crop').getBoundingClientRect().right,
      nav.getBoundingClientRect().left + parseFloat(navStyle.borderLeftWidth) + parseFloat(navStyle.paddingLeft)
      + selectedInset + Math.max(...[...nav.querySelectorAll('a > span:last-child')].map(label=>label.getBoundingClientRect().width)));
    const valley = ribbonSidebarEdge + ribbonBand(width) + 42;
    main.style.setProperty('--final-left', `${valley+ribbonBand(width)+40}px`);
    // Measure a complete Home, including its photographs, even on a collection URL.
    const reference = document.createElement('div');
    reference.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0;width:100%;';
    reference.setAttribute('aria-hidden','true');
    reference.append(...[...main.querySelectorAll(':scope > .opening,:scope > .continuation')].map(node=>node.cloneNode(true)));
    reference.querySelectorAll('[hidden]').forEach(node=>node.hidden=false);
    reference.querySelectorAll('video').forEach(video=>{video.removeAttribute('autoplay');video.removeAttribute('src');});
    reference.querySelector('h1').innerHTML = content.collections.home.title;
    decorateHeading(reference.querySelector('h1'));
    reference.querySelector('#intro-copy').innerHTML = originalCopy;
    reference.querySelector('#further-title').innerHTML = 'Listening to<br>the <em>world.</em>';
    reference.querySelectorAll('.continuation-copy').forEach((copy,index)=>{
      copy.innerHTML=[...originalParagraphs.slice(index ? 1 : 0),...originalParagraphs].map(text=>`<p>${text}</p>`).join('');
    });
    main.append(reference);
    const photoWidth = Math.max(96, Math.min(220, width>1100 ? 220 : (width-217)*.24,  reference.querySelector('.polaroid-film').offsetWidth*.84));
    main.style.setProperty('--photo-width', `${photoWidth}px`);
    main.style.setProperty('--album-height', `${(width>1100 ? 4 : 5)*(photoWidth/1.2+90)+100}px`);

    const opening = reference.querySelector('.opening');
    opening.style.minHeight='0';
    const gallery = reference.querySelector('.scrapbook');
    ribbonOpeningHeight = Math.max(opening.offsetHeight, gallery.offsetTop+gallery.offsetHeight+24);
    opening.style.minHeight=`${ribbonOpeningHeight}px`;
    const origin = reference.getBoundingClientRect().top;
    const box = selector=>reference.querySelector(selector).getBoundingClientRect();
    const title = box('h1');
    ribbonContentEdge=box('.intro').left;
    ribbonPhoneY=title.bottom-origin+52;
    let listening, copy, album, final;
    const entry = Math.max(valley+8,ribbonContentEdge-ribbonBand(width)-34);
    const cardEdge = Math.max(valley+12,gallery.getBoundingClientRect().left-ribbonBand(width)-36);
    const right = width-ribbonBand(width)-24;
    for(let pass=0;pass<14;pass++) {
      listening=box('#further'); copy=box('#further .continuation-copy'); album=box('.moment-album'); final=box('.continuation-left');
      const introBottom=box('.intro').bottom-origin;
      ribbonAnchors = [
        {y:-180,x:entry}, {y:Math.min(420,ribbonOpeningHeight*.25),x:valley},
        {y:Math.max(600,introBottom),x:entry},
        {y:ribbonOpeningHeight+50,x:cardEdge-32},
        {y:Math.max(ribbonOpeningHeight+280,(copy.top+copy.bottom)/2-origin),x:right},
        {y:copy.bottom-origin+80,x:right-width*.06},
        {y:album.bottom-origin+60,x:valley+45},
        {y:(final.top+final.bottom)/2-origin,x:valley},
        {y:final.bottom-origin+120,x:valley+width*.09}
      ];
      // A short opening can put two anchors together; preserve their order.
      ribbonAnchors.forEach((point,i)=>{if(i)point.y=Math.max(point.y,ribbonAnchors[i-1].y+100);});
      for(const section of reference.querySelectorAll('.continuation')) {
        const rect=section.getBoundingClientRect(), obstacle=section.querySelector('.flow-obstacle');
        const start=rect.top-origin+parseFloat(getComputedStyle(section).paddingTop);
        const rightSide=section.classList.contains('continuation-right');
        const height=Math.ceil(section.querySelector('.continuation-copy').getBoundingClientRect().bottom-origin-start+80);
        const points=[];
        for(let y=0;y<=height+20;y+=10) {
          const yy=Math.min(y,height), clearance=ribbonHalfWidth(start+yy,width,30);
          const edge=ribbonX(start+yy,width)-rect.left+(rightSide ? -clearance : clearance);
          points.push(`${Math.max(0,Math.min(rect.width,edge)).toFixed(1)}px ${yy}px`);
        }
        const boundary=rightSide ? `${rect.width}px` : '0px';
        obstacle.style.height=`${height}px`;
        obstacle.style.shapeOutside=`polygon(${boundary} 0px,${points.join(',')},${boundary} ${height}px)`;
      }
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(generation!==layoutGeneration){reference.remove();return;}
    }
    reference.querySelectorAll('.continuation').forEach((section,i)=>{
      const target=main.querySelectorAll(':scope > .continuation')[i];
      target.querySelector('.flow-obstacle').style.cssText=section.querySelector('.flow-obstacle').style.cssText;
    });
    reference.remove(); measuredWidth=width;
  }
  document.querySelector('.opening').style.minHeight=main.dataset.collection==='home' ? `${ribbonOpeningHeight}px` : '';
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(generation!==layoutGeneration)return;
  arrangeAlbum(document.querySelector('#further .moment-album'), main.getBoundingClientRect().top,width);
  updateFooterSidebar(); renderRibbon(main,width);
  document.documentElement.dataset.ribbonReady='true';
}

// Small persistent SVG tiles let WebKit paint nearby artwork without rasterizing
// a page-sized layer. Overscan and an arc-length phase keep glyphs seamless.
// Tiles are never removed on scroll; collection changes only clip their container.
function ribbonBand(width) { const m=ribbonMetrics(width); return m.spacing * (m.tracks-1)/2 + m.fontSize; }
function ribbonMetrics(width) {
  const fontSize = Math.max(4.8, 9.5 * width / 1920);
  return { fontSize, spacing: Math.max(7.4, 15 * width / 1920), tracks:Math.min(10,Math.max(6,Math.round(6+(width-600)/100))) };
}
let ribbonTiles = 0;
function renderRibbon(main, width) {
  const holder = document.querySelector('.text-ribbon');
  const phone = width <= 600;
  const key = `${width}:${JSON.stringify(ribbonAnchors)}:${ribbonText}`;
  if (key !== ribbonRenderKey) { holder.replaceChildren(); ribbonTiles = 0; ribbonRenderKey = key; }
  const tileHeight = 512;
  const needed = phone ? 1 : Math.ceil(main.clientHeight / tileHeight);
  if (needed <= ribbonTiles) return;
  const tracks = phone ? 5 : ribbonMetrics(width).tracks;
  const { fontSize, spacing } = phone ? {fontSize:7, spacing:11} : ribbonMetrics(width);
  const advance = fontSize * .6;
  // Build the geometry once, from a fixed origin, independently of collection length.
  const rows = Array.from({length:tracks}, (_, row) => {
    const offset = (row - (tracks-1)/2)*spacing;
    const points = [];
    let arc = 0;
    const add = (x,y) => {
      const previous = points.at(-1);
      if (previous) arc += Math.hypot(x-previous.x,y-previous.y);
      points.push({x,y,arc});
    };
    if (phone) {
      for(let x=-100;x<=width+100;x+=3) {
        const phase=x/width*Math.PI*1.6;
        const slope=19*Math.cos(phase)*Math.PI*1.6/width;
        const length=Math.hypot(1,slope);
        add(x-offset*slope/length,ribbonPhoneY+19*Math.sin(phase)+offset/length);
      }
    } else {
      for(let y=-144;y<=needed*tileHeight+144;y+=6) {
        const slope=ribbonSlope(y,width), length=Math.hypot(1,slope);
        add(ribbonX(y,width)+offset/length,y-offset*slope/length);
      }
    }
    return points;
  });
  for(let tile=ribbonTiles;tile<needed;tile++) {
    const top=phone ? 0 : tile*tileHeight;
    const svg=document.createElementNS(svgNS,'svg');
    svg.classList.add('ribbon-tile');
    svg.style.top=`${top}px`;
    const height=phone ? Math.ceil(ribbonPhoneY+70) : tileHeight;
    svg.style.height=`${height}px`;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const defs=document.createElementNS(svgNS,'defs');
    const group=document.createElementNS(svgNS,'g');
    svg.append(defs,group);
    rows.forEach((points,row) => {
      const segment=phone ? points : points.filter(point => point.y>=top-120 && point.y<=top+tileHeight+120).reverse();
      const path=document.createElementNS(svgNS,'path');
      path.id=`ribbon-${tile}-${row}`;
      path.setAttribute('d','M'+segment.map(p=>`${p.x.toFixed(3)},${(p.y-top).toFixed(3)}`).join(' L'));
      defs.append(path);
      const text=document.createElementNS(svgNS,'text');
      text.style.fontSize=`${fontSize}px`;
      text.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
      const textPath=document.createElementNS(svgNS,'textPath');
      textPath.setAttribute('href',`#${path.id}`);
      const arc=phone ? 0 : segment[0].arc;
      const character=Math.ceil(-arc/advance);
      textPath.setAttribute('startOffset',String(character*advance+arc));
      const source=ribbonText+' ';
      const phase=character+Math.floor(source.length/tracks*row);
      const start=((phase%source.length)+source.length)%source.length;
      const count=Math.ceil(Math.abs(segment.at(-1).arc-segment[0].arc)/advance)+4;
      textPath.textContent=source.repeat(Math.ceil((start+count)/source.length)).slice(start,start+count);
      text.append(textPath);group.append(text);
    });
    holder.append(svg);
  }
  ribbonTiles=needed;
}

function scheduleLayout() {
  delete document.documentElement.dataset.ribbonReady;
  if (resizeFrame) return window.ribbonLayoutReady;
  window.ribbonLayoutReady = new Promise(resolve => {
    resizeFrame = requestAnimationFrame(async () => {
      resizeFrame = 0;
      await layoutRibbon();
      resolve();
    });
  });
  return window.ribbonLayoutReady;
}

setCollection({ initial: true });
const ribbonReady = fetch('assets/text-art.txt').then(response => {
  if (!response.ok) throw new Error('Text could not be loaded');
  return response.text();
}).then(text => { ribbonText = text.replace(/\s+/g, ' ').trim(); scheduleLayout(); })
  .catch(() => { scheduleLayout(); });
window.siteReady = Promise.all([ribbonReady, siteFontsReady]).then(async () => {
  measuredWidth = 0;
  scheduleLayout();
  let pending;
  do {
    pending = window.ribbonLayoutReady;
    await pending;
  } while (pending !== window.ribbonLayoutReady);
});
// iPad browser chrome resizes the viewport height while scrolling. Width alone
// changes the artwork; avoid repeating text-flow measurements on those events.
window.addEventListener('resize', () => { if (document.querySelector('main').clientWidth !== measuredWidth) scheduleLayout(); });
window.addEventListener('postsupdated', () => { measuredWidth = 0; scheduleLayout(); });
