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
  const isVideo = media.type === 'video' && controls;
  const element = document.createElement(isVideo ? 'video' : 'img');
  element.src = isVideo || controls ? media.src : media.poster || media.thumbnail || media.src;
  if (isVideo) {
    element.controls = controls;
    element.playsInline = true;
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
function openMedia(media) {
  document.querySelector('.dialog-content').replaceChildren(createMedia(media));
  dialog.showModal();
}
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  dialog.querySelectorAll('video').forEach(video => video.pause());
  document.querySelector('.dialog-content').replaceChildren();
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
    button.addEventListener('click', () => openMedia(media));
    slot.append(button);
  } else frame.setAttribute('aria-hidden', 'true');
  frame.append(slot);
  const destination = media.section === 'listening' ? '#further .moment-album'
    : media.section === 'little' ? '.continuation-left .moment-album' : '.polaroids';
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

// A broad parabolic opening joins a repeating wave with matching position,
// tangent and curvature. No flattened valleys or abrupt changes in bend.
function ribbonX(y, width) {
  const scale = width / 1920;
  const headingClearance = Math.max(0, 1920 - width) / 480 * 65;
  const valley = Math.max(420, (ribbonSidebarEdge + 32 + ribbonBand(width)) / scale);
  const openingRate = 1130 / ribbonOpeningHeight;
  const openingX = Math.max(valley + 20, Math.min(580 - headingClearance, (ribbonContentEdge - ribbonBand(width) - 24) / scale));
  const bend = (openingX - valley) / 600 ** 2;
  if (y <= ribbonOpeningHeight) return (valley + bend * (y * openingRate - 600) ** 2) * scale;

  const length = 1020 * Math.max(1, scale);
  const halfPeriod = 1350 * Math.max(1, scale);
  const peakY = ribbonOpeningHeight + length;
  const amplitude = 1600 - valley;
  if (y >= peakY) return (valley + amplitude * (1 + Math.cos((y - peakY) * Math.PI / halfPeriod)) / 2) * scale;

  // Quintic Hermite bridge: preserve both derivatives at each end.
  const t = (y - ribbonOpeningHeight) / length;
  const a0 = valley + bend * 530 ** 2;
  const a1 = 2 * bend * 530 * openingRate * length;
  const a2 = bend * (openingRate * length) ** 2;
  const remaining = 1600 - a0 - a1 - a2;
  const slope = -a1 - 2 * a2;
  const curvature = -amplitude * Math.PI ** 2 / (2 * halfPeriod ** 2) * length ** 2 - 2 * a2;
  const a3 = 10 * remaining - 4 * slope + curvature / 2;
  const a4 = -15 * remaining + 7 * slope - curvature;
  const a5 = 6 * remaining - 3 * slope + curvature / 2;
  return (a0 + t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))))) * scale;
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
async function layoutContinuations(main, width, generation) {
  if (width <= 600) return;
  const scale = width / 1920;
  for (const section of main.querySelectorAll('.continuation')) {
    if (section.hidden) continue;
    const obstacle = section.querySelector('.flow-obstacle');
    obstacle.style.height = `${1150 * Math.max(1, scale)}px`;
    // Grow the exclusion with the text, so it never ends mid-paragraph.
    for (let pass = 0; pass < 64; pass++) {
      const rect = section.getBoundingClientRect();
      const obstacleRect = obstacle.getBoundingClientRect();
      const startY = obstacleRect.top - main.getBoundingClientRect().top;
      const exclusionHeight = obstacle.offsetHeight;
      const onRight = section.classList.contains('continuation-right');
      const points = [];
      for (let y = 0; y <= exclusionHeight + 20; y += 20) {
        const clampedY = Math.min(y, exclusionHeight);
        const clearance = ribbonHalfWidth(startY + clampedY, width, 22 * scale);
        const edge = ribbonX(startY + clampedY, width) - rect.left + (onRight ? -clearance : clearance);
        // A sliver narrower than a readable line is completely excluded.
        const minLine = Math.min(180, rect.width * .45);
        const x = onRight && edge < minLine ? 0 : !onRight && rect.width - edge < minLine ? rect.width : Math.max(0, Math.min(rect.width, edge));
        points.push(`${x.toFixed(1)}px ${clampedY}px`);
      }
      const boundary = onRight ? `${rect.width}px` : '0px';
      obstacle.style.shapeOutside = `polygon(${boundary} 0px,${points.join(',')},${boundary} ${exclusionHeight}px)`;
      // WebKit does not consistently recompute line boxes synchronously after
      // changing a float's shape. Measure on the next frame, not stale geometry.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (generation !== layoutGeneration) return;
      const copyBottom = section.querySelector('.continuation-copy').getBoundingClientRect().bottom;
      const needed = Math.ceil(copyBottom - obstacleRect.top + 80);
      if (needed <= exclusionHeight) break;
      obstacle.style.height = `${needed}px`;
    }
  }
}

async function layoutRibbon() {
  const generation = ++layoutGeneration;
  delete document.documentElement.dataset.ribbonReady;
  await siteFontsReady;
  if (generation !== layoutGeneration) return;
  const main = document.querySelector('main');
  const width = main.clientWidth;
  const scale = width / 1920;

  if (measuredWidth !== width) {
    const sidebarNav = document.querySelector('.sidebar nav');
    const navStyle = getComputedStyle(sidebarNav);
    const selectedInset = width > 600 ? parseFloat(getComputedStyle(sidebarNav.querySelector('a')).fontSize) * .83 + 9 : 24;
    ribbonSidebarEdge = Math.max(document.querySelector('.sidebar .brand-crop').getBoundingClientRect().right,
      sidebarNav.getBoundingClientRect().left + parseFloat(navStyle.borderLeftWidth) + parseFloat(navStyle.paddingLeft)
      + selectedInset + Math.max(...[...sidebarNav.querySelectorAll('a > span:last-child')].map(label => label.getBoundingClientRect().width)));
    // Measure Home at this width even on a direct link to a different collection.
    // Its geometry, rather than the selected page's length, anchors the ribbon.
    const reference = document.querySelector('.opening').cloneNode(true);
    reference.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0;width:100%;';
    reference.setAttribute('aria-hidden', 'true');
    reference.querySelector('.scrapbook').hidden = false;
    reference.querySelector('h1').innerHTML = content.collections.home.title;
    decorateHeading(reference.querySelector('h1'));
    reference.querySelector('.body-copy').innerHTML = originalCopy;
    main.append(reference);
    reference.style.minHeight = '0';
    ribbonOpeningHeight = Math.max(reference.offsetHeight, reference.querySelector('.scrapbook').offsetTop + reference.querySelector('.scrapbook').offsetHeight + 40);
    ribbonContentEdge = reference.querySelector('.intro').getBoundingClientRect().left;
    ribbonPhoneY = reference.querySelector('h1').getBoundingClientRect().bottom - main.getBoundingClientRect().top + 52;
    reference.remove();
    measuredWidth = width;
  }
  document.querySelector('.opening').style.minHeight = main.dataset.collection === 'home' ? `${ribbonOpeningHeight}px` : '';
  await layoutContinuations(main, width, generation);
  if (generation !== layoutGeneration) return;
  updateFooterSidebar();
  renderRibbon(main, width);
  document.documentElement.dataset.ribbonReady = 'true';
}

// Small persistent SVG tiles let WebKit paint nearby artwork without rasterizing
// a page-sized layer. Overscan and an arc-length phase keep glyphs seamless.
// Tiles are never removed on scroll; collection changes only clip their container.
function ribbonBand(width) { return ribbonMetrics(width).spacing * 4.5 + ribbonMetrics(width).fontSize; }
function ribbonMetrics(width) {
  const fontSize = Math.max(4.8, 9.5 * width / 1920);
  return { fontSize, spacing: Math.max(7.4, 15 * width / 1920) };
}
let ribbonTiles = 0;
function renderRibbon(main, width) {
  const holder = document.querySelector('.text-ribbon');
  const phone = width <= 600;
  const key = `${width}:${ribbonOpeningHeight}:${ribbonText}`;
  if (key !== ribbonRenderKey) { holder.replaceChildren(); ribbonTiles = 0; ribbonRenderKey = key; }
  const tileHeight = 512;
  const needed = phone ? 1 : Math.ceil(main.clientHeight / tileHeight);
  if (needed <= ribbonTiles) return;
  const tracks = phone ? 5 : 10;
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
