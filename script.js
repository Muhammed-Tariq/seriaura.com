/* The ribbon and the text exclusions share the same curve, including on resize. */
const content = window.siteContent;
// The selected leaning wave is now the permanent design.
const ribbonDesign = {id: 'lean', left: 420, right: 1600, turn: 500, span: 1700};
const intro = document.querySelector('#intro-copy');
const originalCopy = intro.innerHTML;
// Preserve the authored heading for the ribbon's layout measurement.
const homeTitle = document.querySelector('#page-title').innerHTML;
const svgNS = 'http://www.w3.org/2000/svg';
let ribbonText = 'For progeny and posterity. ';
let resizeFrame;
let ribbonOpeningHeight = 0;
let ribbonExtent = 1;
let measuredWidth = 0;
let measuredPhoneLayout = null;
let ribbonRenderKey = '';
let ribbonSidebarEdge = 0;
let ribbonPhoneY = 180;
let ribbonMotionFrame;
let ribbonMotionSeconds = 0;
let ribbonMotionTime = null;
let ribbonPainter = null;
let ribbonGraphics = null;
let ribbonGraphicsUnavailable = false;
let ribbonFontsReady = false;
let ribbonViewportTop = scrollY;
let ribbonViewportHeight = innerHeight;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const headingWords = ['posterity', 'PB&J', 'percussion', 'personhood', 'Photoshop'];
const optionValue = (key, fallback=1) => window.SiteOptions?.get()[key] ?? fallback;
document.querySelector('.closing-signature')?.addEventListener('contextmenu',event=>event.preventDefault());
document.querySelector('.closing-signature')?.addEventListener('dragstart',event=>event.preventDefault());
let headingTimer;
let headingEndTimer;
let headingScrambleTimer;
let headingSwapTimer;
let headingBag = [];
const headingHistory = ['posterity'];
const headingEffects = ['scramble','decode','scanline','split','splice'];
let headingEffect = new URLSearchParams(location.search).get('glitch') || 'scramble';
if (!headingEffects.includes(headingEffect)) headingEffect = 'scramble';
const sidebar = document.querySelector('.sidebar');
const phoneLayout = matchMedia('(max-width: 1100px)');
let sidebarFrame;

function scheduleSidebar() {
  if (sidebarFrame) return;
  sidebarFrame = requestAnimationFrame(() => { sidebarFrame = 0; updateSectionNavigation(); });
}
window.addEventListener('scroll', scheduleSidebar, { passive: true });
window.addEventListener('resize', scheduleSidebar);
new ResizeObserver(scheduleSidebar).observe(document.querySelector('.site-footer'));

function spinFlower(link) {
  window.siteSidebar?.spinFlower(link);
}

function decorateHeading(heading) {
  const emphasis = heading.querySelector('em:last-child');
  const word = document.createElement('span');
  word.className = 'glitch-word';
  word.dataset.word = 'posterity.';
  const sizer = document.createElement('span');
  sizer.className = 'word-sizer'; sizer.textContent = 'personhood.';
  sizer.setAttribute('aria-hidden', 'true');
  const value = document.createElement('span');
  value.className = 'word-value'; value.textContent = 'posterity.';
  word.append(sizer, value);
  emphasis.replaceChildren(word);
  heading.setAttribute('aria-label', 'For progeny and posterity.');
}
function stopHeadingCycle() {
  clearTimeout(headingTimer); clearTimeout(headingEndTimer); clearTimeout(headingSwapTimer);
  clearInterval(headingScrambleTimer);
  const word = document.querySelector('#page-title .glitch-word');
  if (word) {
    word.classList.remove('is-glitching');
    word.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    word.querySelector('.word-value').textContent = word.dataset.word;
  }
}
function chooseHeadingWord(current) {
  let options = headingBag.filter(value=>value!==current && !headingHistory.includes(value));
  if (!options.length) {
    headingBag = [...headingWords];
    options = headingBag.filter(value=>value!==current && !headingHistory.includes(value));
  }
  return options[Math.floor(Math.random()*options.length)];
}
function animateHeading() {
  const word = document.querySelector('#page-title .glitch-word');
  if (!word || document.hidden) return;
  stopHeadingCycle();
  const nextWord = chooseHeadingWord(word.dataset.word.slice(0,-1));
  const next = nextWord+'.';
  const value = word.querySelector('.word-value');
  const previous = [...word.dataset.word];
  const symbols = '!?<>/{}[]#%&*+_░';
  let committed = false;
  const swap = () => {
    if (committed) return;
    committed = true;
    headingBag = headingBag.filter(item=>item!==nextWord);
    headingHistory.push(nextWord); if (headingHistory.length>2) headingHistory.shift();
    word.dataset.word = next;
    word.dataset.ghost = next;
    value.textContent = next;
    document.querySelector('#page-title').setAttribute('aria-label','For progeny and '+next);
  };
  if (reducedMotion.matches) {swap();queueHeadingCycle();return;}
  word.dataset.effect = headingEffect;
  word.dataset.ghost = word.dataset.word;
  word.classList.add('is-glitching');
  const speed=Math.max(.1,optionValue('headingSpeed'));
  const duration = (headingEffect==='scramble'?520:headingEffect==='decode'?480:420)/speed;
  if (headingEffect==='scramble' || headingEffect==='decode') {
    const started = performance.now();
    const scramble = () => {
      const progress = Math.min(1,(performance.now()-started)/duration);
      const letters = headingEffect==='decode' ? [...next] : previous;
      value.textContent = letters.map((character,index)=> /\s|\./.test(character) || (headingEffect==='decode' && index<Math.floor(progress*letters.length)) ? character : symbols[Math.floor(Math.random()*symbols.length)]).join('');
    };
    scramble(); headingScrambleTimer = setInterval(scramble,(headingEffect==='scramble'?45:35)/speed);
  } else {
    headingSwapTimer = setTimeout(swap,Math.round(duration*.48));
  }
  headingEndTimer = setTimeout(()=>{
    clearInterval(headingScrambleTimer);swap();word.classList.remove('is-glitching');queueHeadingCycle();
  },duration);
}
function queueHeadingCycle() {
  clearTimeout(headingTimer);
  if (document.hidden || optionValue('headingSpeed')===0) return;
  headingTimer = setTimeout(animateHeading,(3800+Math.random()*1200)/optionValue('headingSpeed'));
}
window.siteHeading = {
  effects:headingEffects,
  setEffect(effect) {if (!headingEffects.includes(effect)) return;stopHeadingCycle();headingEffect=effect;animateHeading();},
  replay:animateHeading
};

document.addEventListener('visibilitychange', () => { stopHeadingCycle(); if (!document.hidden) queueHeadingCycle(); });
window.addEventListener('siteoptionschange',event=>{
  if(event.detail.keys.includes('headingSpeed')){stopHeadingCycle();queueHeadingCycle();}
  if(event.detail.keys.includes('ribbonSpeed'))syncRibbonMotion();
});
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
    element.loading = 'eager';
    element.fetchPriority = 'low';
    element.decoding = 'async';
  }
  return element;
}

// Frames retain their layout; image-preview.js makes the photographs expandable.
content.polaroids.forEach(media => {
  const frame = document.createElement('figure');
  frame.className = 'polaroid';
  frame.dataset.photo = media.id;
  for (const [name, value] of Object.entries({x: `${media.x}%`, y: `${media.y}%`, w: media.width, h: media.height, rotation: `${media.rotation}deg`, crop: media.crop || '50% 50%', layer: media.layer || 1})) {
    frame.style.setProperty(`--${name}`, value);
  }
  const slot = document.createElement('div');
  slot.className = 'media-slot';
  const element = createMedia(media, { controls: false });
  if (element && media.cropBox) {
    const [left, top, width, height] = media.cropBox;
    element.style.cssText = `position:absolute;left:${-100 * left / width}%;top:${-100 * top / height}%;width:${10000 / width}%;height:${10000 / height}%;max-width:none`;
  }
  if (element && media.quarterTurn) {
    element.dataset.previewRotation = String(media.quarterTurn * 90);
    // Swap the image box before turning it; the Polaroid frame stays landscape.
    const innerWidth = media.width - 24, innerHeight = media.height - 55;
    element.style.cssText = `position:absolute;left:50%;top:50%;width:${innerHeight / innerWidth * 100}%;height:${innerWidth / innerHeight * 100}%;max-width:none;transform:translate(-50%,-50%) rotate(${media.quarterTurn * 90}deg)`;
  }
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
    } else {
      element.loading = 'eager';
      element.draggable = false;
    }
    slot.append(element);
  }
  frame.prepend(slot);
  document.querySelector(`[data-gallery="${media.gallery}"]`).append(frame);
});

// Navigation moves through the existing page without replacing its writing or notes.
function updateSectionNavigation() {
  // During a cross-page anchor arrival, scrollY briefly describes Home while
  // layout is still loading. Preserve the already-selected destination.
  if (document.documentElement.dataset.initialSection) return;
  const previous = document.querySelector('[data-section][aria-current]')?.dataset.section;
  const threshold = Math.max(150, innerHeight * .25, phoneLayout.matches ? sidebar.getBoundingClientRect().bottom + 64 : 0);
  let section = 'home';
  for (const id of ['musings', 'thousings', 'writings']) {
    if (document.getElementById(id).getBoundingClientRect().top <= threshold) section = id;
  }
  // The last section may be too close to the footer to reach the usual
  // reading threshold, particularly on a tall desktop display.
  if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) section = 'writings';
  document.querySelectorAll('[data-section]').forEach(link => {
    if (link.dataset.section === section) link.setAttribute('aria-current', section === 'home' ? 'page' : 'location');
    else link.removeAttribute('aria-current');
  });
  if (previous && previous !== section) spinFlower(document.querySelector(`[data-section="${section}"]`));
}
function scrollToNavigationTarget() {
  const section = location.hash.slice(1);
  if (!section || section === 'home') window.scrollTo({top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  else if (['musings', 'thousings', 'writings'].includes(section)) {
    const target = document.getElementById(section);
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    window.scrollTo({top:target.getBoundingClientRect().top + scrollY - margin - padding,behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    target.focus({preventScroll: true});
  }
  updateSectionNavigation();
}
window.addEventListener('hashchange', scrollToNavigationTarget);
document.querySelectorAll('.sidebar [data-section]').forEach(link=>link.addEventListener('click',event=>{
  if(event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if(location.hash!==link.hash) history.pushState(null,'',link.hash);
  scrollToNavigationTarget();
}));
document.addEventListener('initialsectionready', updateSectionNavigation);

// The asymmetric leaning wave and its analytic slope drive both the lettering
// and the space reserved around the reading text.
function ribbonWave(phase) {
  const c = Math.cos(phase), s = Math.sin(phase);
  return {value: c + .18 * s * s, slope: -s + .36 * s * c};
}
function ribbonX(y, width) {
  const scale = width / 1920;
  const phase = (y / scale - ribbonDesign.turn) * Math.PI / ribbonDesign.span;
  return (ribbonDesign.left + (ribbonDesign.right - ribbonDesign.left) / 2 * (1 - ribbonWave(phase).value)) * scale;
}

function ribbonSlope(y, width) {
  const phase = (y / (width / 1920) - ribbonDesign.turn) * Math.PI / ribbonDesign.span;
  return -(ribbonDesign.right - ribbonDesign.left) / 2 * ribbonWave(phase).slope * Math.PI / ribbonDesign.span;
}
function ribbonPhoneFrame(x, width) {
  const frequency = Math.PI * 1.6 * 1600 / ribbonDesign.span / width;
  const wave = ribbonWave(x * frequency + Math.PI / 2);
  const amplitude = 22 * (ribbonDesign.right - ribbonDesign.left) / 1180;
  return {y: ribbonPhoneY - amplitude * wave.value, slope: -amplitude * wave.slope * frequency};
}

// A single, gently eased swell: narrow at both ends, widest halfway along.
// Its zero end-slopes avoid pinched tips or sudden changes in track direction.
function ribbonSwell(progress) {
  const t = Math.max(0, Math.min(1, progress));
  return Math.sin(Math.PI * t) ** 2;
}
function ribbonWidthScale(progress) {
  return .65 + .7 * ribbonSwell(progress);
}
// Keep the old spacing renderer intact. The warped version has a much gentler
// swell, with letter height controlled separately from the distance between rows.
function ribbonTrackScale(progress) {
  return content.ribbonStyle === 'spacing' ? ribbonWidthScale(progress) : .65 + .45 * ribbonSwell(progress);
}
function ribbonGlyphScale(progress) {
  return .90 + .24 * ribbonSwell(progress);
}
function ribbonHalfWidth(y, width, margin = 0) {
  const scale = width / 1920;
  // Include the outer baseline and glyph allowance; layout adds 22px of clearance.
  // Share the envelope between both styles so switching never reflows the copy.
  const half = (67.5 * ribbonWidthScale(y / ribbonExtent) + 12.5) * scale;
  return (half + margin) * Math.hypot(1, ribbonSlope(y, width));
}

function layoutWritingsContour(writings, mainRect, width) {
  const scale = width / 1920;
  const textGap = Math.max(16, 24 * scale);
  const labelGap = Math.max(10, 14 * scale);
  const edgeAt = y => mainRect.left + ribbonX(y, width) + ribbonHalfWidth(y, width, 18 * scale);
  const text = [...writings.querySelectorAll('.writings-heading,.blog-meta,.post-title-row,.post-summary>p,.writings-substack')];
  // Reset before measuring so repeated layouts and breakpoint changes converge.
  writings.style.removeProperty('--writings-outset');
  text.forEach(element => element.style.removeProperty('--ribbon-inset'));
  const original = writings.getBoundingClientRect();
  let left = original.left;
  for (let y = original.top - mainRect.top; y <= original.bottom - mainRect.top; y += 4 * scale) {
    left = Math.min(left, edgeAt(y));
  }
  writings.style.setProperty('--writings-outset', `${left - original.left}px`);
  // Earlier text can wrap differently once inset; measure subsequent blocks
  // after each change and settle the remaining wrapping in a few passes.
  for (let pass = 0; pass < 4; pass++) {
    for (const element of text) {
      const rect = element.getBoundingClientRect();
      const start = rect.top - mainRect.top, end = rect.bottom - mainRect.top;
      let edge = Math.max(edgeAt(start), edgeAt(end));
      for (let y = start; y < end; y += 4 * scale) edge = Math.max(edge, edgeAt(y));
      const gap = element.matches('.writings-heading,.writings-substack') ? labelGap : textGap;
      element.style.setProperty('--ribbon-inset', `${Math.max(0, edge - left) + gap}px`);
    }
  }
  // Exaggerate the fade contour inward while keeping its outermost point
  // clear of the portraits.
  const list = writings.querySelector('.post-list');
  const rules = [list, ...list.children].map((element, index) => {
    const rect = element.getBoundingClientRect();
    return {element, edge:edgeAt((index ? rect.bottom : rect.top) - mainRect.top)};
  });
  const outerEdge = Math.max(...rules.map(rule => rule.edge));
  rules.forEach(({element, edge}) => {
    element.style.setProperty('--rule-inset', `${Math.max(0, edge - left)}px`);
    element.style.setProperty('--rule-end-inset', `${2 * (outerEdge - edge) - 80 * scale}px`);
  });
  // Use the same envelope as the dividers, with a little extra length for the
  // faded ends. The SVG stays decorative and cannot intercept article links.
  let boundary = writings.querySelector('.writings-boundary');
  if (!boundary) {
    boundary = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    boundary.classList.add('writings-boundary');
    boundary.setAttribute('aria-hidden', 'true');
    boundary.setAttribute('focusable', 'false');
    boundary.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    writings.prepend(boundary);
  }
  const bounds = writings.getBoundingClientRect(), listBounds = list.getBoundingClientRect();
  const start = listBounds.top - mainRect.top - 84 * scale;
  const end = listBounds.bottom - mainRect.top + 84 * scale;
  const points = [];
  for (let y = start; y < end; y += 2 * scale) points.push(`${edgeAt(y) - bounds.left},${y - start}`);
  points.push(`${edgeAt(end) - bounds.left},${end - start}`);
  boundary.setAttribute('viewBox', `0 0 ${bounds.width} ${end - start}`);
  boundary.style.setProperty('--boundary-top', `${start + mainRect.top - bounds.top}px`);
  boundary.style.setProperty('--boundary-height', `${end - start}px`);
  // Finish fading before the first junction and begin only after the last.
  boundary.style.setProperty('--boundary-fade', `${64 * scale}px`);
  boundary.firstElementChild.setAttribute('d', `M${points.join(' L')}`);
}

// Mobile article fields are straight. Clear desktop geometry when resizing.
function layoutMobileWritings(writings) {
  writings.style.removeProperty('--writings-outset');
  writings.querySelectorAll('[style]').forEach(element=>{
    for(const property of ['--ribbon-inset','--rule-inset','--rule-end-inset']) element.style.removeProperty(property);
  });
  writings.querySelector('.writings-boundary')?.remove();
}
function layoutContinuations(main, width) {
  if (phoneLayout.matches) {
    main.querySelectorAll('.continuation').forEach(section => { section.style.minHeight = ''; });
    main.querySelectorAll('.home-writings').forEach(layoutMobileWritings);
    return;
  }
  const scale = width / 1920;
  main.querySelectorAll('.continuation').forEach(section => {
    if (section.hidden) return;
    const obstacle = section.querySelector('.flow-obstacle');
    obstacle.style.height = `${1150 * scale}px`;
    // Grow the exclusion with the text, so it never ends mid-paragraph.
    for (let pass = 0; pass < 8; pass++) {
      const rect = section.getBoundingClientRect();
      const obstacleRect = obstacle.getBoundingClientRect();
      const startY = obstacleRect.top - main.getBoundingClientRect().top;
      const exclusionHeight = obstacle.offsetHeight;
      const onRight = section.classList.contains('continuation-right');
      const points = [];
      for (let y = 0; y <= exclusionHeight + 20 * scale; y += 20 * scale) {
        const clampedY = Math.min(y, exclusionHeight);
        const clearance = ribbonHalfWidth(startY + clampedY, width, 22 * scale);
        const edge = ribbonX(startY + clampedY, width) - rect.left + (onRight ? -clearance : clearance);
        const x = Math.max(0, Math.min(rect.width, edge));
        points.push(`${x.toFixed(1)}px ${clampedY}px`);
      }
      const boundary = onRight ? `${rect.width}px` : '0px';
      obstacle.style.shapeOutside = `polygon(${boundary} 0px,${points.join(',')},${boundary} ${exclusionHeight}px)`;
      const copyBottom = section.querySelector('.continuation-copy').getBoundingClientRect().bottom;
      const needed = Math.ceil(copyBottom - obstacleRect.top + 30 * scale);
      if (needed <= exclusionHeight) break;
      obstacle.style.height = `${needed}px`;
    }
    const closing = section.querySelector('.closing-row');
    if (closing) {
      const copyBottom = section.querySelector('.continuation-copy').getBoundingClientRect().bottom;
      const top = copyBottom - section.getBoundingClientRect().top + 80 * scale;
      closing.style.setProperty('--closing-top', `${top}px`);
      const sectionRect = section.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      const writings = closing.querySelector('.home-writings');
      writings.style.removeProperty('--writings-outset');
      writings.querySelectorAll('[style]').forEach(element => element.style.removeProperty('--ribbon-inset'));
      closing.style.setProperty('--closing-width', `${sectionRect.width}px`);
      // Reserve a lane beside the ribbon for both photos and the compact list.
      // Recheck after wrapping the list, since its height changes with width.
      for (let pass = 0; pass < 3; pass++) {
        const startY = sectionRect.top - mainRect.top + top;
        let left = sectionRect.left;
        for (let y = startY - 30 * scale; y <= startY + closing.offsetHeight + 30 * scale; y += 20 * scale) {
          left = Math.max(left, mainRect.left + ribbonX(y, width) + ribbonHalfWidth(y, width, 35 * scale));
        }
        closing.style.setProperty('--closing-left', `${left - sectionRect.left}px`);
        closing.style.setProperty('--closing-width', `${sectionRect.right - left}px`);
      }
      layoutWritingsContour(writings, mainRect, width);
      section.style.minHeight = `${Math.max(1220 * scale, top + closing.offsetHeight + 108 * scale)}px`;
    } else {
      section.style.minHeight = '';
    }
  });
}

// Map a flat strip of lettering onto the ribbon. The two columns of each glyph's
// matrix retain the bend's distortion along each row, while the perpendicular
// direction caps letter height independently so the glyphs never become tall.
function warpRibbonLetters(group, width, scale, depth, isPhone, tracks, spacing) {
  if (!ribbonFontsReady) return;
  const fontSize = isPhone ? 7 : 9.5 * scale;
  const documentTop = group.ownerSVGElement.getBoundingClientRect().top + scrollY;
  const samples = [];
  function add(x, y, slope, progress) {
    const length = Math.hypot(1, slope);
    const previous = samples.at(-1);
    samples.push({x, y, nx: isPhone ? -slope / length : 1 / length,
      ny: isPhone ? 1 / length : -slope / length, swell: ribbonTrackScale(progress), glyphScale: ribbonGlyphScale(progress),
      distance: previous ? previous.distance + Math.hypot(x - previous.x, y - previous.y) : 0});
  }
  if (isPhone) {
    for (let x = -100; x <= width + 100; x += 3) {
      const frame = ribbonPhoneFrame(x, width);
      add(x, frame.y, frame.slope, x / width);
    }
  } else {
    for (let y = depth; y >= -240 * scale; y -= 6 * scale) {
      add(ribbonX(y, width), y, ribbonSlope(y, width), y / ribbonExtent);
    }
  }
  const probe = document.createElementNS(svgNS, 'text');
  // Measure in design pixels before scaling, so font rounding cannot change
  // which letters occupy each bend at different desktop widths.
  probe.style.fontSize = `${isPhone ? 7 : 9.5}px`;
  probe.textContent = 'MMMMMMMMMM';
  group.append(probe);
  const advance = probe.getComputedTextLength() / 10 * (isPhone ? 1 : scale);
  probe.remove();
  function frameAt(distance) {
    let lo = 0, hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].distance < distance) lo = mid; else hi = mid;
    }
    const a = samples[lo], b = samples[hi];
    const t = Math.max(0, Math.min(1, (distance - a.distance) / (b.distance - a.distance)));
    const frame = {};
    for (const key of ['x', 'y', 'nx', 'ny', 'swell', 'glyphScale']) frame[key] = a[key] + (b[key] - a[key]) * t;
    return frame;
  }
  function position(frame, offset) {
    return {x: frame.x + frame.nx * offset * frame.swell, y: frame.y + frame.ny * offset * frame.swell};
  }
  const rows = [];
  const total = samples.at(-1).distance;
  for (let row = 0; row < tracks; row++) {
    const offset = (row - (tracks - 1) / 2) * spacing;
    const start = Math.floor(ribbonText.length / tracks * row);
    const letters = Array.from(ribbonText.slice(start) + ' ' + ribbonText.slice(0, start) + ' ');
    const direction = content.ribbonMovement === 'together' ? -1 : (row % 2 ? 1 : -1);
    rows.push({offset, letters, direction, speed: 5 + (row % 3) * .6});
  }
  // The GPU moves a texture over an immutable mesh. Each animation frame sends
  // just the clock and viewport, rather than changing thousands of SVG nodes.
  if (!ribbonGraphicsUnavailable && !ribbonGraphics?.lost) {
    try {
      ribbonGraphics ||= new RibbonGraphics(group.ownerSVGElement);
      ribbonGraphics.build({width, documentTop, fontSize, advance, total, rows, frameAt, position, isPhone});
      group.replaceChildren();
      group.ownerSVGElement.dataset.renderer = 'webgl';
      ribbonPainter = seconds => ribbonGraphics.paint(seconds, ribbonViewportTop, ribbonViewportHeight);
      ribbonPainter(ribbonMotionSeconds);
      syncRibbonMotion();
      return;
    } catch (error) {
      ribbonGraphicsUnavailable = true;
      if (ribbonGraphics) ribbonGraphics.canvas.hidden = true;
      console.warn('Using the static ribbon fallback:', error.message);
    }
  }
  // Unsupported/lost graphics contexts retain the same artwork, without the
  // expensive DOM animation that would make the rest of the page unresponsive.
  group.ownerSVGElement.dataset.renderer = 'static';
  ribbonGraphics?.cache?.remove();
  const fragment = document.createDocumentFragment();
  rows.forEach((row, rowIndex) => {
    const slots = [];
    for (let i = 1; i * advance < total - 2 * advance; i++) {
      const glyph = document.createElementNS(svgNS, 'text');
      glyph.style.fontSize = `${fontSize}px`;
      glyph.dataset.ribbonRow = rowIndex;
      const frame = frameAt(i * advance);
      slots.push({glyph, index: i, y: frame.y, x: frame.x});
      fragment.append(glyph);
    }
    row.slots = slots;
  });
  group.replaceChildren(fragment);
  ribbonPainter = (seconds, all = false) => {
    // Only visible letters need repainting. Offscreen rows retain their DOM and
    // catch up from the shared clock as they enter the viewport after scrolling.
    // Cache the document position during layout; measuring the SVG every frame
    // would force the browser to lay out thousands of offscreen characters.
    const top = ribbonViewportTop - documentTop - 120, bottom = ribbonViewportTop - documentTop + ribbonViewportHeight + 120;
    rows.forEach(row => {
      const shift = row.direction * seconds * row.speed * (isPhone ? 1 : scale) / advance;
      const whole = Math.floor(shift), fraction = shift - whole;
      row.slots.forEach(slot => {
        if (!all && (slot.y < top || slot.y > bottom || (isPhone && (slot.x < -80 || slot.x > width + 80)))) return;
        const i = slot.index;
        const distance = (i + fraction) * advance;
        const frame = frameAt(distance);
        const point = position(frame, row.offset);
        const before = position(frameAt(distance - advance / 2), row.offset);
        const after = position(frameAt(distance + advance / 2), row.offset);
        // Recycle fixed slots by one character at a time: no reset of the whole
        // sentence, no gaps at the viewport edges, and no moving ribbon shape.
        const index = ((i - 1 - whole) % row.letters.length + row.letters.length) % row.letters.length;
        const character = row.letters[index];
        if (slot.character !== character) { slot.glyph.textContent = character; slot.character = character; }
        slot.glyph.setAttribute('transform', `matrix(${(after.x - before.x) / advance} ${(after.y - before.y) / advance} ${frame.nx * frame.glyphScale} ${frame.ny * frame.glyphScale} ${point.x} ${point.y})`);
      });
    });
  };
  ribbonPainter(ribbonMotionSeconds, true);
  ribbonPainter = null;
}

function stopRibbonMotion() {
  cancelAnimationFrame(ribbonMotionFrame);
  ribbonMotionFrame = null;
  ribbonMotionTime = null;
}
function syncRibbonMotion() {
  stopRibbonMotion();
  if (reducedMotion.matches || document.hidden || !ribbonPainter || optionValue('ribbonSpeed')===0) return;
  const tick = time => {
    if (ribbonMotionTime === null) ribbonMotionTime = time;
    const elapsed = time - ribbonMotionTime;
    ribbonGraphics?.sampleFrame(elapsed);
    ribbonMotionSeconds += Math.min(elapsed, 100) / 1000 * optionValue('ribbonSpeed');
    ribbonMotionTime = time;
    ribbonPainter(ribbonMotionSeconds);
    ribbonMotionFrame = requestAnimationFrame(tick);
  };
  ribbonMotionFrame = requestAnimationFrame(tick);
}
reducedMotion.addEventListener('change', syncRibbonMotion);
document.addEventListener('visibilitychange', syncRibbonMotion);
// A reduced-motion page still repaints newly visible letters at its frozen phase.
window.addEventListener('scroll', () => {
  ribbonViewportTop = scrollY;
  ribbonViewportHeight = innerHeight;
  if (ribbonPainter && !ribbonMotionFrame) ribbonPainter(ribbonMotionSeconds);
}, {passive: true});

function layoutRibbon() {
  const main = document.querySelector('main');
  const width = main.clientWidth;
  // Breakpoints use the viewport, like CSS; geometry uses the available page
  // width, which may be narrower because of a classic scrollbar.
  const isPhone = phoneLayout.matches;
  const scale = width / 1920;
  const opening = main.querySelector('.opening');
  if (!isPhone) {
    const title = opening.querySelector('h1').getBoundingClientRect();
    const lastParagraph = opening.querySelector('.body-copy p:last-child').getBoundingClientRect();
    // Balance the full introduction around the first inward turn of the curve.
    opening.style.setProperty('--intro-top', `${Math.max(24 * scale, (ribbonDesign.turn - 18) * scale - (lastParagraph.bottom - title.top) / 2)}px`);
  } else opening.style.removeProperty('--intro-top');
  if (measuredWidth !== width || measuredPhoneLayout !== isPhone) {
    const sidebarNav = document.querySelector('.sidebar nav');
    const navStyle = getComputedStyle(sidebarNav);
    const selectedInset = !isPhone ? parseFloat(getComputedStyle(sidebarNav.querySelector('a')).fontSize) * .83 + 9 * scale : 24;
    ribbonSidebarEdge = Math.max(document.querySelector('.sidebar .brand-crop').getBoundingClientRect().right,
      sidebarNav.getBoundingClientRect().left + parseFloat(navStyle.borderLeftWidth) + parseFloat(navStyle.paddingLeft)
      + selectedInset + Math.max(...[...sidebarNav.querySelectorAll('a > span:last-child')].map(label => label.getBoundingClientRect().width)));
    // Measure Home in the same desktop design space at every width, even when
    // another collection is open. Font rounding must not change the curve.
    const reference = document.querySelector('.opening').cloneNode(true);
    reference.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0;width:100%;';
    if (!isPhone) {
      reference.style.width = '1920px';
      reference.style.setProperty('--unit', '1px');
      reference.style.setProperty('--body-size', '19px');
    }
    reference.setAttribute('aria-hidden', 'true');
    reference.querySelector('h1').innerHTML = homeTitle;
    decorateHeading(reference.querySelector('h1'));
    reference.querySelector('.body-copy').innerHTML = originalCopy;
    main.append(reference);
    ribbonOpeningHeight = reference.getBoundingClientRect().height * (!isPhone ? scale : 1);
    ribbonPhoneY = reference.querySelector('h1').getBoundingClientRect().bottom - main.getBoundingClientRect().top + 40;
    reference.remove();
    measuredWidth = width;
    measuredPhoneLayout = isPhone;
  }
  // Text wrapping and the page's final depth share the same tapered envelope.
  for (let pass = 0; pass < 3; pass++) {
    ribbonExtent = main.getBoundingClientRect().height;
    layoutContinuations(main, width);
    if (Math.abs(main.getBoundingClientRect().height - ribbonExtent) < scale) break;
  }
  // Follow the actual end of the second text block as fonts and wrapping settle.
  const scrapbook = main.querySelector('.scrapbook');
  const copyBottom = main.querySelector('#further .continuation-copy').getBoundingClientRect().bottom;
  scrapbook.style.setProperty('--scrapbook-top', `${copyBottom - main.getBoundingClientRect().top + 40 * scale}px`);
  const height = Math.max(main.clientHeight, ribbonOpeningHeight + 2480 * scale);
  const svg = document.querySelector('.text-ribbon');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.height = `${height}px`;
  const ribbonStyle = content.ribbonStyle === 'spacing' ? 'spacing' : 'warped';
  const ribbonMovement = content.ribbonMovement === 'together' ? 'together' : 'alternating';
  const renderKey = `${ribbonDesign.id}:${ribbonStyle}:${ribbonMovement}:${isPhone}:${width}:${height}:${ribbonExtent}:${ribbonOpeningHeight}:${ribbonText}`;
  if (renderKey === ribbonRenderKey) {
    // Height-only viewport changes still resize a paused drawing surface.
    ribbonPainter?.(ribbonMotionSeconds);
    return;
  }
  ribbonRenderKey = renderKey;
  stopRibbonMotion();
  ribbonPainter = null;
  if (ribbonGraphics) ribbonGraphics.canvas.hidden = true;
  const defs = svg.querySelector('defs');
  const group = svg.querySelector('g');
  defs.replaceChildren(); group.replaceChildren();
  const tracks = isPhone ? 5 : 10;
  const spacing = isPhone ? 11 : 15 * scale;
  group.setAttribute('fill', '#f1f0ed');
  svg.dataset.ribbonStyle = ribbonStyle;
  svg.dataset.curve = ribbonDesign.id;
  // Upward-reading text starts at a fixed depth, never at a collection's bottom.
  // The SVG viewport clips this shared artwork to the current page height.
  const ribbonDepth = (Math.ceil(height / scale / 100) * 100 + 240) * scale;
  for (let row = 0; row < tracks; row++) {
    const path = document.createElementNS(svgNS, 'path');
    const offset = (row - (tracks - 1) / 2) * spacing;
    const points = [];
    if (isPhone) {
      // A broad, readable wave separates the phone heading from its full-width copy.
      for (let x = -100; x <= width + 100; x += 3) {
        const {y, slope} = ribbonPhoneFrame(x, width);
        const length = Math.hypot(1, slope);
        const taperedOffset = offset * ribbonTrackScale(x / width);
        points.push(`${x - taperedOffset * slope / length},${y + taperedOffset / length}`);
      }
    } else {
      // Offset perpendicular to the curve, so diagonal stretches retain their width.
      for (let y = ribbonDepth; y >= -240 * scale; y -= 6 * scale) {
        const slope = ribbonSlope(y, width);
        const length = Math.hypot(1, slope);
        const taperedOffset = offset * ribbonTrackScale(y / ribbonExtent);
        points.push(`${ribbonX(y, width) + taperedOffset / length},${y - taperedOffset * slope / length}`);
      }
    }
    path.id = `ribbon-${row}`;
    path.setAttribute('d', `M${points.join(' L')}`);
    defs.append(path);
    if (ribbonStyle === 'warped') continue;
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
  if (ribbonStyle === 'warped') warpRibbonLetters(group, width, scale, ribbonDepth, isPhone, tracks, spacing);
}
function scheduleLayout() {
  ribbonViewportTop = scrollY;
  ribbonViewportHeight = innerHeight;
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(layoutRibbon);
}

decorateHeading(document.querySelector('#page-title'));
queueHeadingCycle();
updateSectionNavigation();
const ribbonReady = fetch('assets/text-art.txt').then(response => {
  if (!response.ok) throw new Error('Text could not be loaded');
  return response.text();
}).then(text => { ribbonText = text.replace(/\s+/g, ' ').trim(); scheduleLayout(); })
  .catch(() => { scheduleLayout(); });
const photosReady = Promise.all([...document.querySelectorAll('.polaroid img')].map(image=>image.decode().catch(()=>{})));
window.siteReady = Promise.all([ribbonReady, document.fonts.ready, photosReady]).then(() => {
  ribbonFontsReady = true;
  ribbonRenderKey = '';
  measuredWidth = 0;
  cancelAnimationFrame(resizeFrame);
  layoutRibbon();
});
window.addEventListener('resize', scheduleLayout);
phoneLayout.addEventListener('change', scheduleLayout);
// Font/float layout can settle after the first render, especially in WebKit.
// Keep the taper tied to the final content height as well as viewport changes.
new ResizeObserver(scheduleLayout).observe(document.querySelector('main'));
