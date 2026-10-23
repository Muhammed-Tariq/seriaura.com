/* Hide only when JavaScript is available; always recover from slow assets. */
(() => {
  const root = document.documentElement;
  root.classList.add('site-loading');
  root.classList.add('navigation-pending');
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    root.classList.remove('site-loading');
    root.classList.remove('navigation-pending');
    root.classList.add('site-ready');
    // Release the whole-page opacity layer once the entrance ends. Keeping it
    // composited can make long pages disappear/repaint during iPad scrolling.
    setTimeout(() => root.classList.add('entrance-complete'), 650);
  };
  const fallback = setTimeout(reveal, 3500);
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.allSettled([
      document.fonts.ready,
      window.siteReady,
      ...[...document.querySelectorAll('.brand img')].map(image => image.decode().catch(() => {}))
    ]);
    // The closing grid and ribbon can settle over several ResizeObserver
    // passes. Resolve a deep link only after its document position is stable.
    const destination = /^#(?:musings|thousings|writings)$/.test(location.hash)
      ? document.getElementById(location.hash.slice(1)) : null;
    if (destination) {
      let previous, stable = 0;
      for (let frame = 0; frame < 30 && stable < 3; frame++) {
        await new Promise(requestAnimationFrame);
        const top = destination.getBoundingClientRect().top + scrollY;
        stable = previous !== undefined && Math.abs(top - previous) < .5 ? stable + 1 : 0;
        previous = top;
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      clearTimeout(fallback);
      reveal();
      // Native anchor scrolling can run before fonts and generated notes settle.
      if (/^#footnote-(?:ref-)?[a-z]+-\d+$/.test(location.hash)) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'center' });
      } else if (/^#(?:musings|thousings|writings)$/.test(location.hash)) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      // Keep the incoming sidebar selection until the corrected anchor scroll
      // has landed, then hand selection back to normal reading-position updates.
      if (root.dataset.initialSection) requestAnimationFrame(() => {
        delete root.dataset.initialSection;
        document.dispatchEvent(new Event('initialsectionready'));
      });
    }));
  }, { once: true });
})();
