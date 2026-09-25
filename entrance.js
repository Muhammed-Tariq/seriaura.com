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
    requestAnimationFrame(() => requestAnimationFrame(() => {
      clearTimeout(fallback);
      reveal();
    }));
  }, { once: true });
})();
