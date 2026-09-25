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
          <span class="brand-crop"><img class="logo logo-neutral" src="${local('assets/logo.png')}" alt="セリアウラ" width="2000" height="2000"><img class="logo logo-orange" src="${local('assets/logo-orange.png')}" alt="" width="2000" height="2000"></span>
        </a>
        <p>Quintessentially Seri.</p>
      </div>
      <div class="footer-connect">
        <div class="footer-links" role="navigation" aria-label="Information">
          <a href="${local('brand-guidelines/')}">Brand guidelines</a>
          <a href="${local('payment/')}">Payment</a>
          <a href="${local('contact/')}">Contact</a>
        </div>
        <div class="social-links" role="group" aria-label="Find me elsewhere"></div>
      </div>
    </div>
    <div class="footer-bottom"><small>© ${new Date().getFullYear()} Seriaura. All rights reserved.</small><a href="#main" class="back-to-top">Back to the top ↑</a></div>
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
    { name: 'Goodreads', icon: 'goodreads', href: 'https://www.goodreads.com/user/show/193354807-muhammed-tariq' }
  ];
  profiles.forEach(profile => {
    const control = document.createElement(profile.copy ? 'button' : 'a');
    control.className = 'social-link';
    control.setAttribute('aria-label', profile.copy ? `Copy ${profile.name}: ${profile.copy}` : profile.name);
    if (profile.copy) { control.type = 'button'; control.dataset.copy = profile.copy; control.dataset.copyLabel = profile.name; }
    else { control.href = profile.href; control.target = '_blank'; control.rel = 'noopener noreferrer'; }
    const icon = document.createElement('img');
    icon.className = 'social-icon'; icon.setAttribute('aria-hidden', 'true');
    icon.src = local(`assets/icons/${profile.icon}.svg`); icon.alt = '';
    icon.width = 21; icon.height = 21;
    const label = document.createElement('span');
    label.className = 'social-label'; label.textContent = profile.copy ? `Copy ${profile.name}` : profile.name;
    control.append(icon, label);
    footer.querySelector('.social-links').append(control);
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
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => copyText(button)));
  document.querySelectorAll('.brand').forEach(brand => brand.addEventListener('click', event => {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = new URL(brand.href);
    if (destination.pathname === location.pathname && location.hash === '#home') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }));
})();
