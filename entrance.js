/* Hide only when JavaScript is available; always recover from slow assets. */
(() => {
  const root = document.documentElement;
  root.classList.add('site-loading');
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    root.classList.remove('site-loading');
    root.classList.add('site-ready');
  };
  const fallback = setTimeout(reveal, 3500);
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.allSettled([
      document.fonts.ready,
      window.siteReady,
      ...[...document.images].filter(image => image.loading !== 'lazy').map(image => image.decode().catch(() => {}))
    ]);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      clearTimeout(fallback);
      reveal();
    }));
  }, { once: true });
})();
