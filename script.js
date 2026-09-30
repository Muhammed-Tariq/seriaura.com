/* The ribbon and the text exclusions share the same curve, including on resize. */
const content = window.siteContent;
// The selected leaning wave is now the permanent design.
const ribbonDesign = {id: 'lean', left: 420, right: 1600, turn: 500, span: 1700};
const intro = document.querySelector('#intro-copy');
const originalCopy = intro.innerHTML;
const svgNS = 'http://www.w3.org/2000/svg';
let ribbonText = 'For progeny and posterity. ';
let resizeFrame;
let ribbonOpeningHeight = 0;
let ribbonExtent = 1;
let measuredWidth = 0;
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
const headingWords = ['posterity', 'PB&J', 'white girl pop', 'percussion'];
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

function setCollection({ scroll = false, initial = false } = {}) {
  const anchor = location.hash.slice(1);
  const footnote = /^footnote-(?:ref-)?([a-z]+)-\d+$/.exec(anchor);
  // Shared URLs and browser history restore the collection containing the note.
  const name = footnote ? footnote[1] : anchor.replace(/^writings$/, 'home');
  const knownCollection = Object.hasOwn(content.collections, name);
  if (name && !knownCollection && !initial) return;
  const key = knownCollection ? name : 'home';
  const collection = content.collections[key];
  const previous = document.querySelector('[data-section][aria-current]')?.dataset.section;
  if (footnote && previous === key && !initial) return;
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
  document.querySelector('.intro-likes').hidden = key !== 'home';
  document.querySelector('#further-title').innerHTML = collection.continuation ?? 'Musings';
  document.querySelectorAll('.continuation-copy').forEach((copy, index) => {
    copy.closest('.continuation').hidden = !collection.original && !collection.paragraphs.length;
    copy.innerHTML = collection.original
      ? content.continuationCopy[index] || ''
      : collection.continuationCopy?.[index] || '';
  });
  document.title = key === 'home' ? 'Seriaura' : `${key[0].toUpperCase() + key.slice(1)} — Seriaura`;
  document.dispatchEvent(new Event('collectionchange'));
  if (scroll && !footnote) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  scheduleLayout();
  if (footnote && !initial) requestAnimationFrame(() => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
}

window.addEventListener('hashchange', () => setCollection({ scroll: true }));

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

function layoutContinuations(main, width) {
  if (width <= 1100) return;
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
  if (reducedMotion.matches || document.hidden || !ribbonPainter) return;
  const tick = time => {
    if (ribbonMotionTime === null) ribbonMotionTime = time;
    const elapsed = time - ribbonMotionTime;
    ribbonGraphics?.sampleFrame(elapsed);
    ribbonMotionSeconds += Math.min(elapsed, 100) / 1000;
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
  if (ribbonPainter) ribbonPainter(ribbonMotionSeconds);
}, {passive: true});

function layoutRibbon() {
  const main = document.querySelector('main');
  const width = main.clientWidth;
  const scale = width / 1920;
  if (measuredWidth !== width) {
    const sidebarNav = document.querySelector('.sidebar nav');
    const navStyle = getComputedStyle(sidebarNav);
    const selectedInset = width > 1100 ? parseFloat(getComputedStyle(sidebarNav.querySelector('a')).fontSize) * .83 + 9 * scale : 24;
    ribbonSidebarEdge = Math.max(document.querySelector('.sidebar .brand-crop').getBoundingClientRect().right,
      sidebarNav.getBoundingClientRect().left + parseFloat(navStyle.borderLeftWidth) + parseFloat(navStyle.paddingLeft)
      + selectedInset + Math.max(...[...sidebarNav.querySelectorAll('a > span:last-child')].map(label => label.getBoundingClientRect().width)));
    // Measure Home in the same desktop design space at every width, even when
    // another collection is open. Font rounding must not change the curve.
    const reference = document.querySelector('.opening').cloneNode(true);
    reference.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0;width:100%;';
    if (width > 1100) {
      reference.style.width = '1920px';
      reference.style.setProperty('--unit', '1px');
      reference.style.setProperty('--body-size', '19px');
    }
    reference.setAttribute('aria-hidden', 'true');
    reference.querySelector('h1').innerHTML = content.collections.home.title;
    decorateHeading(reference.querySelector('h1'));
    reference.querySelector('.body-copy').innerHTML = originalCopy;
    main.append(reference);
    ribbonOpeningHeight = reference.getBoundingClientRect().height * (width > 1100 ? scale : 1);
    ribbonPhoneY = reference.querySelector('h1').getBoundingClientRect().bottom - main.getBoundingClientRect().top + 64;
    reference.remove();
    measuredWidth = width;
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
  scrapbook.style.setProperty('--scrapbook-top', `${copyBottom - main.getBoundingClientRect().top + 70 * scale}px`);
  const height = Math.max(main.clientHeight, ribbonOpeningHeight + 2480 * scale);
  const svg = document.querySelector('.text-ribbon');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.height = `${height}px`;
  updateFooterSidebar();
  const ribbonStyle = content.ribbonStyle === 'spacing' ? 'spacing' : 'warped';
  const ribbonMovement = content.ribbonMovement === 'together' ? 'together' : 'alternating';
  const renderKey = `${ribbonDesign.id}:${ribbonStyle}:${ribbonMovement}:${width}:${height}:${ribbonExtent}:${ribbonOpeningHeight}:${ribbonText}`;
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
  const isPhone = width <= 1100;
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

setCollection({ initial: true });
const ribbonReady = fetch('assets/text-art.txt').then(response => {
  if (!response.ok) throw new Error('Text could not be loaded');
  return response.text();
}).then(text => { ribbonText = text.replace(/\s+/g, ' ').trim(); scheduleLayout(); })
  .catch(() => { scheduleLayout(); });
window.siteReady = Promise.all([ribbonReady, document.fonts.ready]).then(() => {
  ribbonFontsReady = true;
  ribbonRenderKey = '';
  measuredWidth = 0;
  cancelAnimationFrame(resizeFrame);
  layoutRibbon();
});
window.addEventListener('resize', scheduleLayout);
// Font/float layout can settle after the first render, especially in WebKit.
// Keep the taper tied to the final content height as well as viewport changes.
new ResizeObserver(scheduleLayout).observe(document.querySelector('main'));
