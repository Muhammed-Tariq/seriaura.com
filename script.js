/* The ribbon and the text exclusions share the same curve, including on resize. */
const content = window.siteContent;
const intro = document.querySelector('#intro-copy');
const originalCopy = intro.innerHTML;
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
const headingWords = ['posterity', 'blog posts', 'PB&J', 'white girl pop', 'percussion', 'progress', 'Prague'];
let headingTimer;
let headingEndTimer;
let headingScrambleTimer;
const flowerAnimations = new WeakMap();
const sidebar = document.querySelector('.sidebar');
const sidebarBrand = sidebar.querySelector('.brand');
const phoneLayout = matchMedia('(max-width: 1100px)');
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
  }, 3800 + Math.random() * 1200);
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
  const element = document.createElement(media.type === 'video' ? 'video' : 'img');
  element.src = media.src;
  if (media.type === 'video') {
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
    element.loading = 'lazy';
    element.decoding = 'async';
  }
  return element;
}

// Frames are deliberately not buttons: photos stay in the collage.
content.polaroids.forEach(media => {
  const frame = document.createElement('figure');
  frame.className = 'polaroid';
  frame.dataset.photo = media.id;
  for (const [name, value] of Object.entries({x: `${media.x}%`, y: `${media.y}%`, w: media.width, h: media.height, rotation: `${media.rotation}deg`, crop: media.crop || '50% 50%'})) {
    frame.style.setProperty(`--${name}`, value);
  }
  const slot = document.createElement('div');
  slot.className = 'media-slot';
  const element = createMedia(media, { controls: false });
  if (element) {
    frame.dataset.filled = '';
    if (media.type === 'video') {
      // The crossfade is encoded in this small clip: only one decoder is needed.
      element.muted = true; element.defaultMuted = true;
      element.autoplay = true; element.loop = true; element.preload = 'auto';
      element.setAttribute('muted', ''); element.setAttribute('playsinline', '');
      const control = document.createElement('button');
      control.className = 'film-control'; control.type = 'button';
      control.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="pause-mark"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></g><path class="play-mark" d="M7 4.5v15l12-7.5z"/></svg>';
      let manuallyPaused = false;
      const label = () => {
        control.dataset.paused = String(element.paused);
        control.setAttribute('aria-label', element.paused ? 'Play film' : 'Pause film');
      };
      control.addEventListener('click', () => {
        manuallyPaused = !element.paused;
        if (element.paused) element.play().catch(label); else element.pause();
      });
      element.addEventListener('play', label); element.addEventListener('pause', label);
      slot.append(control); label();
      let revealTimer;
      slot.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse') return;
        clearTimeout(revealTimer);
        slot.classList.add('show-film-control');
        revealTimer = setTimeout(() => slot.classList.remove('show-film-control'), 3000);
      });
      const resume = () => {
        if (document.hidden || reducedMotion.matches || frame.closest('[hidden]')) element.pause();
        else if (!manuallyPaused) element.play().catch(label);
      };
      document.addEventListener('visibilitychange', resume);
      document.addEventListener('collectionchange', resume);
      reducedMotion.addEventListener('change', resume);
      if (reducedMotion.matches) element.autoplay = false;
    } else element.loading = 'eager';
    slot.append(element);
  }
  frame.prepend(slot);
  document.querySelector(`[data-gallery="${media.gallery}"]`).append(frame);
});

let postsRenderKey = '';
function renderPosts(posts) {
  if (!Array.isArray(posts) || posts.length < 3) return;
  const key = JSON.stringify(posts.slice(0, 3));
  if (key === postsRenderKey) return;
  const cards = posts.slice(0, 3).map(post => {
    const url = new URL(post.href);
    if (url.protocol !== 'https:' || url.hostname !== 'muhammedtariq.substack.com') throw new Error('Invalid post URL');
    const card = document.createElement('a'); card.className = 'media-card'; card.href = url.href;
    const slot = document.createElement('div'); slot.className = 'media-slot';
    if (post.image && new URL(post.image).protocol === 'https:') {
      const img = createMedia({src: post.image, alt: '', type: 'image'});
      img.loading = 'eager';
      slot.append(img);
    }
    const copy = document.createElement('div');
    const title = document.createElement('h2'); title.textContent = post.title;
    const description = document.createElement('p'); description.textContent = post.description;
    const label = document.createElement('span'); label.className = 'post-label'; label.textContent = 'Read on Substack';
    copy.append(title, description, label); card.append(slot, copy);
    return card;
  });
  document.querySelector('.media-cards').replaceChildren(...cards);
  postsRenderKey = key;
}
async function loadPosts(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {cache: 'no-cache', signal: controller.signal});
    if (!response.ok) throw new Error('Posts unavailable');
    renderPosts((await response.json()).posts);
  } finally { clearTimeout(timeout); }
}
// The deployed snapshot works immediately. The public GitHub copy keeps even a
// static deployment current without a CORS proxy or third-party embed scripts.
async function refreshPosts() {
  try { await loadPosts(content.substack.liveSnapshot); } catch { /* Keep the successful snapshot. */ }
}
loadPosts(content.substack.snapshot).catch(() => {}).finally(refreshPosts);
setInterval(() => { if (!document.hidden) refreshPosts(); }, 15 * 60 * 1000);

function setCollection({ scroll = false, initial = false } = {}) {
  const name = location.hash.slice(1).replace(/^writings$/, 'home');
  const knownCollection = Object.hasOwn(content.collections, name);
  if (name && !knownCollection && !initial) return;
  const key = knownCollection ? name : 'home';
  const collection = content.collections[key];
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
  document.querySelector('[data-gallery="listening"]').hidden = key !== 'home';
  document.querySelector('#further-title').innerHTML = collection.continuation ?? 'Listening to<br>the <em>world.</em>';
  document.querySelectorAll('.continuation-copy').forEach((copy, index) => {
    copy.closest('.continuation').hidden = !collection.original && !collection.paragraphs.length;
    copy.innerHTML = collection.original
      ? content.continuationCopy[index] || ''
      : collection.continuationCopy?.[index] || '';
  });
  document.title = `${key[0].toUpperCase() + key.slice(1)} — Quintessentially Seri`;
  document.dispatchEvent(new Event('collectionchange'));
  if (scroll) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  scheduleLayout();
}

window.addEventListener('hashchange', () => setCollection({ scroll: true }));

// A broad parabolic opening joins a repeating wave with matching position,
// tangent and curvature. No flattened valleys or abrupt changes in bend.
function ribbonX(y, width) {
  const scale = width / 1920;
  const headingClearance = Math.max(0, 1920 - width) / 480 * 65;
  // At smaller desktop widths, preserve a real bow instead of clamping the
  // opening almost straight. Both ends still clear the navigation and heading.
  const valley = width <= 1600
    ? Math.max(360, (ribbonSidebarEdge + 28) / scale + 80)
    : Math.max(420, (ribbonSidebarEdge + 54) / scale + 80);
  const openingRate = 1130 / ribbonOpeningHeight;
  const openingX = width <= 1600
    ? Math.min(580, (ribbonContentEdge - 32) / scale - 80)
    : 580 - headingClearance;
  const bend = Math.max(12, openingX - valley) / 600 ** 2;
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
  const half = 80 * scale;
  return (half + margin) * Math.hypot(1, ribbonSlope(y, width));
}

function layoutContinuations(main, width) {
  if (width <= 1100) return;
  const scale = width / 1920;
  main.querySelectorAll('.continuation').forEach(section => {
    if (section.hidden) return;
    const obstacle = section.querySelector('.flow-obstacle');
    obstacle.style.height = `${1150 * Math.max(1, scale)}px`;
    // Grow the exclusion with the text, so it never ends mid-paragraph.
    for (let pass = 0; pass < 8; pass++) {
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
        const x = Math.max(0, Math.min(rect.width, edge));
        points.push(`${x.toFixed(1)}px ${clampedY}px`);
      }
      const boundary = onRight ? `${rect.width}px` : '0px';
      obstacle.style.shapeOutside = `polygon(${boundary} 0px,${points.join(',')},${boundary} ${exclusionHeight}px)`;
      const copyBottom = section.querySelector('.continuation-copy').getBoundingClientRect().bottom;
      const needed = Math.ceil(copyBottom - obstacleRect.top + 30);
      if (needed <= exclusionHeight) break;
      obstacle.style.height = `${needed}px`;
    }
  });
}

function layoutRibbon() {
  const main = document.querySelector('main');
  const width = main.clientWidth;
  const scale = width / 1920;
  if (measuredWidth !== width) {
    const sidebarNav = document.querySelector('.sidebar nav');
    const navStyle = getComputedStyle(sidebarNav);
    const selectedInset = width > 1100 ? parseFloat(getComputedStyle(sidebarNav.querySelector('a')).fontSize) * .83 + 9 : 24;
    ribbonSidebarEdge = Math.max(document.querySelector('.sidebar .brand-crop').getBoundingClientRect().right,
      sidebarNav.getBoundingClientRect().left + parseFloat(navStyle.borderLeftWidth) + parseFloat(navStyle.paddingLeft)
      + selectedInset + Math.max(...[...sidebarNav.querySelectorAll('a > span:last-child')].map(label => label.getBoundingClientRect().width)));
    // Measure Home at this width even on a direct link to a different collection.
    // Its geometry, rather than the selected page's length, anchors the ribbon.
    const reference = document.querySelector('.opening').cloneNode(true);
    reference.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0;width:100%;';
    reference.setAttribute('aria-hidden', 'true');
    reference.querySelector('.scrapbook').remove();
    reference.querySelector('h1').innerHTML = content.collections.home.title;
    decorateHeading(reference.querySelector('h1'));
    reference.querySelector('.body-copy').innerHTML = originalCopy;
    main.append(reference);
    ribbonOpeningHeight = reference.offsetHeight;
    ribbonContentEdge = reference.querySelector('.intro').getBoundingClientRect().left;
    ribbonPhoneY = reference.querySelector('h1').getBoundingClientRect().bottom - main.getBoundingClientRect().top + 64;
    reference.remove();
    measuredWidth = width;
  }
  layoutContinuations(main, width);
  const height = Math.max(main.clientHeight, ribbonOpeningHeight + 2480 * Math.max(1, scale));
  const svg = document.querySelector('.text-ribbon');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.height = `${height}px`;
  updateFooterSidebar();
  const renderKey = `${width}:${ribbonOpeningHeight}:${ribbonText}`;
  if (renderKey === ribbonRenderKey) return;
  ribbonRenderKey = renderKey;
  const defs = svg.querySelector('defs');
  const group = svg.querySelector('g');
  defs.replaceChildren(); group.replaceChildren();
  const isPhone = width <= 1100;
  const tracks = isPhone ? 5 : 10;
  const spacing = isPhone ? 11 : 15 * scale;
  // Upward-reading text starts at a fixed depth, never at a collection's bottom.
  // The SVG viewport clips this shared artwork to the current page height.
  const ribbonDepth = Math.ceil(height / 100) * 100 + 100;
  for (let row = 0; row < tracks; row++) {
    const path = document.createElementNS(svgNS, 'path');
    const offset = (row - (tracks - 1) / 2) * spacing;
    const points = [];
    if (isPhone) {
      // A broad, readable wave separates the phone heading from its full-width copy.
      for (let x = -100; x <= width + 100; x += 3) {
        const phase = x / width * Math.PI * 1.6;
        const y = ribbonPhoneY + 22 * Math.sin(phase);
        const slope = 22 * Math.cos(phase) * Math.PI * 1.6 / width;
        const length = Math.hypot(1, slope);
        points.push(`${x - offset * slope / length},${y + offset / length}`);
      }
    } else {
      // Offset perpendicular to the curve, so diagonal stretches retain their width.
      for (let y = ribbonDepth; y >= -100; y -= 6) {
        const slope = ribbonSlope(y, width);
        const length = Math.hypot(1, slope);
        points.push(`${ribbonX(y, width) + offset / length},${y - offset * slope / length}`);
      }
    }
    path.id = `ribbon-${row}`;
    path.setAttribute('d', `M${points.join(' L')}`);
    defs.append(path);
    const text = document.createElementNS(svgNS, 'text');
    const fontSize = isPhone ? 7 : 9.5 * scale;
    text.style.fontSize = `${fontSize}px`;
    const textPath = document.createElementNS(svgNS, 'textPath');
    textPath.setAttribute('href', `#${path.id}`);
    const start = Math.floor(ribbonText.length / tracks * row);
    const rotatedText = ribbonText.slice(start) + ' ' + ribbonText.slice(0, start) + ' ';
    const neededCharacters = Math.ceil(path.getTotalLength() / (fontSize * .6)) + 20;
    textPath.textContent = rotatedText.repeat(Math.ceil(neededCharacters / rotatedText.length)).slice(0, neededCharacters);
    text.append(textPath); group.append(text);
  }

}
function scheduleLayout() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(layoutRibbon);
}

setCollection({ initial: true });
const ribbonReady = fetch('assets/text-art.txt').then(response => {
  if (!response.ok) throw new Error('Text could not be loaded');
  return response.text();
}).then(text => { ribbonText = text.replace(/\s+/g, ' ').trim(); scheduleLayout(); })
  .catch(() => { scheduleLayout(); });
window.siteReady = Promise.all([ribbonReady, document.fonts.ready]).then(() => {
  measuredWidth = 0;
  cancelAnimationFrame(resizeFrame);
  layoutRibbon();
});
window.addEventListener('resize', scheduleLayout);
