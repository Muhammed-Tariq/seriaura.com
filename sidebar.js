/* Shared navigation behaviour on Home, Writings and every article. */
(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  // Keep names across navigation in this tab, but draw new ones on reload or
  // in a new tab. Remember the last draw across tabs to avoid immediate repeats.
  const sectionNames = {
    musings: ['Musings', 'Monologues', 'Meditations', 'Manifestos', 'Memos'],
    thousings: ['Thoughts', 'Theories', 'Trifles', 'Tangents', 'Treatises']
  };
  let chosen = {}, previous = {}, lastInTab = {};
  try {
    const newTab = !window.name.startsWith('seriaura-tab:');
    if (newTab) window.name = 'seriaura-tab:' + crypto.randomUUID();
    previous = JSON.parse(localStorage.getItem('seriaura-section-names') || '{}');
    lastInTab = JSON.parse(sessionStorage.getItem('seriaura-section-names') || '{}');
    if (!newTab && performance.getEntriesByType('navigation')[0]?.type !== 'reload') {
      chosen = lastInTab;
    }
  } catch (_) { /* Navigation still works when browser storage is disabled. */ }
  for (const [id, names] of Object.entries(sectionNames)) {
    const available = names.filter(name => name !== previous[id] && name !== lastInTab[id]);
    const name = names.includes(chosen[id]) ? chosen[id] : available[Math.floor(Math.random() * available.length)];
    chosen[id] = name;
    const heading = document.getElementById(id);
    if (heading) heading.textContent = name;
    sidebar.querySelectorAll(`nav a[href$="#${id}"] span:last-child`).forEach(label => {
      label.textContent = name;
    });
  }
  try {
    sessionStorage.setItem('seriaura-section-names', JSON.stringify(chosen));
    localStorage.setItem('seriaura-section-names', JSON.stringify(chosen));
  } catch (_) {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Articles switch navigation together with their margin-footnote breakpoint.
  const compact = matchMedia(document.body.classList.contains('blog-layout') ? '(width < 1600px)' : '(max-width:1100px)');
  const animations = new WeakMap();
  let pointer;
  function updateClearance() {
    if (compact.matches) {
      const hiddenHeight = sidebar.classList.contains('at-footer') ? sidebar.querySelector('.brand').offsetHeight : 0;
      document.documentElement.style.setProperty('--mobile-nav-clearance',sidebar.offsetHeight-hiddenHeight+8+'px');
    }
  }
  function setupFoldawayMenu() {
    const nav = sidebar.querySelector('nav');
    if (!nav) return;
    const mobile = compact;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'menu-toggle';
    nav.id ||= 'site-navigation';
    toggle.setAttribute('aria-controls',nav.id);
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML = '<strong class="menu-current"></strong><span>Menu <b aria-hidden="true">+</b></span>';
    nav.before(toggle);
    sidebar.classList.add('has-foldaway-menu');
    let currentLabel = toggle.querySelector('.menu-current');
    let labelAnimation, labelVersion = 0, requestedLabel;
    async function syncCurrent() {
      const current = nav.querySelector('a[aria-current]');
      const label = current?.querySelector('span:last-child')?.textContent.trim() || 'Home';
      if (label === requestedLabel) return;
      requestedLabel = label;
      const version = ++labelVersion;
      const opacity = getComputedStyle(currentLabel).opacity;
      labelAnimation?.cancel();
      toggle.setAttribute('aria-label','Navigation menu, current section: '+label);
      if (!currentLabel.textContent || !mobile.matches || reduced.matches) {
        currentLabel.textContent = label;
        return;
      }
      labelAnimation = currentLabel.animate([{opacity},{opacity:0}],{duration:70,fill:'forwards',easing:'ease-out'});
      await labelAnimation.finished.catch(()=>{});
      if (version !== labelVersion) return;
      // Retire the faded text layer completely; reusing a shrinking layer can
      // leave trailing glyphs from the longer word on mobile compositors.
      const nextLabel = currentLabel.cloneNode(false);
      nextLabel.textContent = label;
      currentLabel.replaceWith(nextLabel);
      currentLabel = nextLabel;
      labelAnimation.cancel();
      labelAnimation = currentLabel.animate([{opacity:0},{opacity:1}],{duration:90,easing:'ease-in'});
    }
    function setOpen(open, returnFocus = false) {
      open = Boolean(open && mobile.matches);
      sidebar.dataset.menuOpen = String(open);
      nav.inert = mobile.matches && !open;
      toggle.setAttribute('aria-expanded',String(open));
      toggle.querySelector('b').textContent = open ? '−' : '+';
      if (returnFocus && mobile.matches) toggle.focus({preventScroll:true});
    }
    toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
    toggle.addEventListener('keydown',event=>{
      if(event.key!=='ArrowDown') return;
      event.preventDefault();setOpen(true);
      (nav.querySelector('a[aria-current]') || nav.querySelector('a'))?.focus({preventScroll:true});
    });
    nav.addEventListener('click',event=>{
      const link = event.target.closest('a');
      if (!link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      setOpen(false,mobile.matches);
    });
    sidebar.querySelector('.brand')?.addEventListener('click',()=>setOpen(false));
    document.addEventListener('pointerdown',event=>{
      if (!sidebar.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && toggle.getAttribute('aria-expanded')==='true') {
        event.preventDefault();setOpen(false,true);
      }
    });
    sidebar.addEventListener('focusout',event=>{
      // Focus events can yield a microtask between blur and the next focus.
      // Do not hide the clicked link during that interval.
      if(event.relatedTarget) {
        if(!sidebar.contains(event.relatedTarget)) setOpen(false);
      } else requestAnimationFrame(()=>{
        if(!sidebar.contains(document.activeElement)) setOpen(false);
      });
    });
    mobile.addEventListener('change',()=>{
      const focused = document.activeElement;
      setOpen(false,mobile.matches && nav.contains(focused));
      if(!mobile.matches && focused===toggle) (nav.querySelector('a[aria-current]') || nav.querySelector('a'))?.focus({preventScroll:true});
    });
    new MutationObserver(syncCurrent).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});
    // The dropdown overlays the page; its open state never moves the ribbon.
    new ResizeObserver(updateClearance).observe(sidebar);
    syncCurrent();setOpen(false);
  }
  setupFoldawayMenu();
  // Commit the closed dropdown before revealing it; otherwise its initial
  // opacity transition briefly displays the old navigation on a slow reload.
  sidebar.getBoundingClientRect();
  document.documentElement.classList.remove('navigation-pending');
  function setupFooterPosition() {
    const brand = sidebar.querySelector('.brand');
    const footerLogo = document.querySelector('.footer-brand .brand-crop');
    if (!footerLogo) return;
    let visible = false;
    function update() {
      sidebar.style.setProperty('--brand-height',brand.offsetHeight+'px');
      const atFooter = visible;
      sidebar.classList.toggle('at-footer',atFooter);
      brand.inert = atFooter;
      updateClearance();
    }
    new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;update();}).observe(footerLogo);
    new ResizeObserver(update).observe(brand);
    compact.addEventListener('change',update);
    document.fonts.ready.then(update);
    update();
  }
  document.addEventListener('DOMContentLoaded',setupFooterPosition,{once:true});
  document.addEventListener('pointermove', event => {pointer = [event.clientX,event.clientY];}, {passive:true});
  function spinFlower(link) {
    if (!link?.hasAttribute('aria-current') || reduced.matches) return;
    const flower = link.querySelector('.flower');
    if (!flower || animations.get(flower)?.playState === 'running') return;
    const from = Number(flower.dataset.angle || 0), to = from + 180;
    flower.dataset.angle = to;
    flower.style.transform = `translateY(-50%) scale(1) rotate(${to}deg)`;
    animations.set(flower, flower.animate([
      {transform:`translateY(-50%) scale(1) rotate(${from}deg)`},
      {transform:`translateY(-50%) scale(1) rotate(${to}deg)`}
    ], {duration:600,easing:'cubic-bezier(.25,.1,.25,1)'}));
  }
  sidebar.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('pointerenter', event => {
      // Scrolling/layout can move a link under a stationary pointer. Only an
      // actual pointer entry should trigger a hover turn.
      const moved = !pointer || pointer[0] !== event.clientX || pointer[1] !== event.clientY;
      const moving = sidebar.getAnimations().some(animation=>animation.transitionProperty==='transform');
      if (event.pointerType !== 'touch' && moved && !moving) spinFlower(link);
    });
    link.addEventListener('focus', () => {if (link.matches(':focus-visible')) spinFlower(link);});
    link.addEventListener('click', () => spinFlower(link));
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) sidebar.querySelectorAll('.flower').forEach(flower => animations.get(flower)?.cancel());
  });
  window.siteSidebar = {spinFlower};
})();
