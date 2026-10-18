/* Shared footer for the main site and its standalone information pages. */
(() => {
  const root = new URL('.', document.currentScript.src);
  const local = path => new URL(path, root).href;
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="footer-top">
      <div class="footer-identity">
        <a class="brand footer-brand" href="${local('index.html#home')}" aria-label="Seriaura — Home">
          <span class="brand-crop"><img class="logo logo-white" src="${local('assets/logo.png')}" alt="セリアウラ" width="2000" height="2000"><img class="logo logo-orange" src="${local('assets/logo-orange.png')}" alt="" aria-hidden="true" width="2000" height="2000"></span>
        </a>
      </div>
      <div class="footer-connect">
        <div class="social-hub">
          <div class="social-links" id="footer-social-links" role="group" aria-label="Find me elsewhere"></div>
          <span class="social-page-status" role="status" aria-live="polite" aria-atomic="true"></span>
        </div>
      </div>
    </div>
    <div class="footer-bottom"><small>© ${new Date().getFullYear()} Seriaura. All rights reserved.</small></div>
    <div class="copy-status" role="status" aria-live="polite" aria-atomic="true"></div>`;
  const profiles = [
    { name: 'Email', icon: 'envelope', copy: 'hi@muhammedtariq.com' },
    { name: 'LinkedIn', icon: 'linkedin-in', href: 'https://www.linkedin.com/in/muhammed5371/' },
    { name: 'Personal website', icon: 'globe', href: 'https://www.muhammedtariq.com/' },
    { name: 'Substack', icon: 'substack', href: 'https://substack.com/@seriaura' },
    { name: 'X', icon: 'x', href: 'https://x.com/Seriaura_' },
    { name: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/_muhammedtariq/' },
    { name: 'Discord', icon: 'discord', copy: 'seriaura' },
    { name: 'Strava', icon: 'strava', href: 'https://www.strava.com/athletes/160737412' },
    { name: 'Goodreads', icon: 'goodreads', href: 'https://www.goodreads.com/user/show/193354807-muhammed-tariq' },
    { name: 'Snapchat', icon: 'snapchat', copy: 'seriaura' },
    { name: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@seriaura' },
    { name: 'Spotify', icon: 'spotify', href: 'https://open.spotify.com/user/h32v6o66m76ypv7ztlzv1q0pc?si=60d42ea38a4e4dc0' },
    { name: 'Letterboxd', icon: 'letterboxd', href: 'https://letterboxd.com/Seriaura/' },
    { name: 'Steam', icon: 'steam', href: 'https://steamcommunity.com/id/Seriaura/' },
    { name: 'GitHub', icon: 'github', href: 'https://github.com/Muhammed-Tariq' },
    { name: 'osu!', icon: 'osu', href: 'https://osu.ppy.sh/users/18736758' }
  ];
  const grid = footer.querySelector('.social-links');
  function createControl(profile) {
    if (!profile) {
      const empty = document.createElement('span');
      empty.className = 'social-link social-empty';
      empty.setAttribute('aria-hidden','true');
      empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg>';
      return empty;
    }
    const control = document.createElement(profile.copy ? 'button' : 'a');
    control.className = 'social-link';
    control.setAttribute('aria-label', profile.copy ? `Copy ${profile.name}: ${profile.copy}` : profile.name);
    if (profile.copy) { control.type = 'button'; control.dataset.copy = profile.copy; control.dataset.copyLabel = profile.name; }
    else {
      control.href = profile.href;
      if (new URL(profile.href).origin !== root.origin) {control.target = '_blank'; control.rel = 'noopener noreferrer';}
    }
    const icon = document.createElement('img');
    icon.className = 'social-icon'; icon.setAttribute('aria-hidden', 'true');
    icon.src = local(`assets/icons/${profile.icon}.svg`); icon.alt = '';
    icon.width = 25; icon.height = 25;
    control.append(icon);
    return control;
  }
  const pages = [];
  for (let start = 0; start < profiles.length; start += 8) {
    pages.push(Array.from({length:8}, (_,i) => createControl(profiles[start+i])));
  }
  const pager = document.createElement('button');
  pager.type = 'button';
  pager.className = 'social-link social-page';
  pager.setAttribute('aria-controls', grid.id);
  grid.append(pager);
  let requestedPage = 0, transitionSerial = 0, activeAnimations = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function showPage(index, announce = false) {
    grid.querySelectorAll('.social-link:not(.social-page)').forEach(control => control.remove());
    pages[index].slice(0,4).forEach(control => grid.insertBefore(control,pager));
    grid.append(...pages[index].slice(4));
    grid.dataset.page = String(index+1);
    pager.innerHTML = `<span class="social-page-number" aria-hidden="true">${index+1}</span>`;
    pager.setAttribute('aria-label', `Links page ${index+1} of ${pages.length}. Show page ${(index+1)%pages.length+1}`);
    if (announce) footer.querySelector('.social-page-status').textContent = `Links page ${index+1} of ${pages.length}`;
  }
  function cancelAnimations() {
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations = [];
  }
  function animateIcons(entering) {
    return [...grid.children].map((cell,i) => {
      const icon = cell.querySelector('.social-icon,.empty-icon,.social-page-number');
      const x = 1-i%3, y = 1-Math.floor(i/3);
      const inward = `translate(${x*10}px,${y*10}px) perspective(160px) rotateX(${-y*18}deg) rotateY(${x*18}deg) rotateZ(${x*12}deg) scale(.65)`;
      const resting = {opacity:1,transform:getComputedStyle(icon).transform};
      const hidden = {opacity:0,transform:inward};
      return icon.animate(entering ? [hidden,resting] : [resting,hidden], {
        duration:entering ? 220 : 160, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards'
      });
    });
  }
  async function transitionPage(index) {
    const serial = ++transitionSerial;
    cancelAnimations();
    if (reducedMotion.matches) {showPage(index,true); grid.removeAttribute('aria-busy'); return;}
    grid.setAttribute('aria-busy','true');
    activeAnimations = animateIcons(false);
    await Promise.all(activeAnimations.map(animation => animation.finished.catch(() => {})));
    if (serial !== transitionSerial) return;
    showPage(index,true);
    cancelAnimations();
    activeAnimations = animateIcons(true);
    await Promise.all(activeAnimations.map(animation => animation.finished.catch(() => {})));
    if (serial !== transitionSerial) return;
    cancelAnimations();
    grid.removeAttribute('aria-busy');
  }
  showPage(0);
  pager.addEventListener('click', () => {
    requestedPage = (requestedPage+1)%pages.length;
    transitionPage(requestedPage);
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    transitionSerial++;
    cancelAnimations();
    showPage(requestedPage,true);
    grid.removeAttribute('aria-busy');
  });
  let statusTimer;
  async function copyText(button) {
    const value = button.dataset.copy;
    const status = footer.querySelector('.copy-status');
    clearTimeout(statusTimer);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const input = document.createElement('textarea');
        input.value = value; input.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
        document.body.append(input); input.select();
        const copied = document.execCommand('copy'); input.remove(); button.focus({ preventScroll: true });
        if (!copied) throw new Error('Copy unavailable');
      }
      status.textContent = `${button.dataset.copyLabel || 'Text'} copied: ${value}`;
      button.classList.add('is-copied');
      setTimeout(() => button.classList.remove('is-copied'), 1800);
    } catch {
      status.textContent = `Copy unavailable. ${value}`;
    }
    status.classList.add('is-visible');
    statusTimer = setTimeout(() => status.classList.remove('is-visible'), 4500);
  }
  footer.addEventListener('click', event => {
    const button = event.target.closest('[data-copy]');
    if (button) copyText(button);
  });
  document.querySelectorAll('[data-copy]').forEach(button => {
    if (!footer.contains(button)) button.addEventListener('click', () => copyText(button));
  });
  document.querySelectorAll('.brand').forEach(brand => brand.addEventListener('click', event => {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = new URL(brand.href);
    if (destination.pathname === location.pathname && location.hash === '#home') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }));
})();
