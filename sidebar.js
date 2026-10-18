/* Shared navigation behaviour on Home, Writings and every article. */
(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new WeakMap();
  let pointer;
  function setupFoldawayMenu() {
    const nav = sidebar.querySelector('nav');
    if (!nav) return;
    const mobile = matchMedia('(max-width:1100px)');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'menu-toggle';
    nav.id ||= 'site-navigation';
    toggle.setAttribute('aria-controls',nav.id);
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML = '<strong class="menu-current"></strong><span>Menu <b aria-hidden="true">+</b></span>';
    nav.before(toggle);
    sidebar.classList.add('has-foldaway-menu');
    function syncCurrent() {
      const current = nav.querySelector('a[aria-current]');
      const label = current?.querySelector('span:last-child')?.textContent.trim() || 'Home';
      toggle.querySelector('.menu-current').textContent = label;
      toggle.setAttribute('aria-label','Navigation menu, current section: '+label);
    }
    function setOpen(open, returnFocus = false) {
      open = Boolean(open && mobile.matches);
      sidebar.dataset.menuOpen = String(open);
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
    new ResizeObserver(()=>{
      if(mobile.matches) document.documentElement.style.setProperty('--mobile-nav-clearance',sidebar.offsetHeight+8+'px');
    }).observe(sidebar);
    syncCurrent();setOpen(false);
  }
  setupFoldawayMenu();
  function setupFooterPosition() {
    const brand = sidebar.querySelector('.brand');
    const footerLogo = document.querySelector('.footer-brand .brand-crop');
    if (!footerLogo) return;
    const desktop = matchMedia('(min-width:1101px)');
    let visible = false;
    function update() {
      sidebar.style.setProperty('--brand-height',brand.offsetHeight+'px');
      const atFooter = desktop.matches && visible;
      sidebar.classList.toggle('at-footer',atFooter);
      brand.inert = atFooter;
    }
    new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;update();}).observe(footerLogo);
    new ResizeObserver(update).observe(brand);
    desktop.addEventListener('change',update);
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
