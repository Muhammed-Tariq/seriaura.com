/* Optional cursor ripple. Set ENABLED to false, or remove this script's tag
   from index.html, to restore the original ribbon. No saved preferences. */
(() => {
  const ENABLED = true;
  const main = document.querySelector('main');
  if (!ENABLED || !main || !document.querySelector('.text-ribbon')) return;
  const hover = matchMedia('(any-hover: hover)');
  let pointer = null;
  let lastFrame = performance.now();

  function reset() { pointer = null; }
  document.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch' || !hover.matches) return;
    const x = event.clientX, y = event.clientY;
    pointer = {x: pointer?.x ?? x, y: pointer?.y ?? y, targetX: x, targetY: y,
      left: main.getBoundingClientRect().left, at: performance.now()};
  }, {passive: true});
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset, {passive: true});
  window.addEventListener('scroll', reset, {passive: true});
  document.addEventListener('pointerleave', reset);
  document.addEventListener('pointercancel', reset);
  document.addEventListener('visibilitychange', reset);
  for (const preference of [reducedMotion, hover]) preference.addEventListener('change', () => {
    reset(); ribbonPainter?.(ribbonMotionSeconds);
  });

  window.ribbonInteraction = {
    sample(graphics) {
      const now = performance.now();
      const elapsed = Math.min(64, Math.max(0, now - lastFrame));
      lastFrame = now;
      if (reducedMotion.matches || !hover.matches || document.hidden) return {enabled: false};
      const result = {enabled: true, strength: 0};
      if (!pointer) return result;
      const age = Math.max(0, now - pointer.at - 50) / 650;
      if (age >= 1) { reset(); return result; }
      const follow = 1 - Math.exp(-elapsed / 45);
      pointer.x += (pointer.targetX - pointer.x) * follow;
      pointer.y += (pointer.targetY - pointer.y) * follow;
      return {...result, x: pointer.x - pointer.left,
        y: pointer.y + scrollY - graphics.documentTop,
        radius: Math.max(120, Math.min(170, graphics.width * .12)),
        strength: .5 * (1 - age) * (1 - age)};
    }
  };
})();
