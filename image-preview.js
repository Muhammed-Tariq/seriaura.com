/* Enlarge editorial images without leaving the current page. */
(() => {
  if (!window.HTMLDialogElement) return;
  const selector = '.post-body img,.polaroid img,.blog-layout .footnote-popup img';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let dialog, preview, caption, error, closeButton, source, returnFocus, animation;
  let closing = false, openingFrame, previousScrollbar;

  function captionFor(image) {
    return image.closest('figure')?.querySelector('figcaption')?.textContent.trim() || image.alt.trim();
  }
  function decorate(image) {
    if (image.hasAttribute('data-image-preview') || image.closest('button')) return;
    image.setAttribute('data-image-preview', '');
    const trigger = image.closest('a') || image;
    trigger.setAttribute('data-image-preview-trigger', '');
    trigger.setAttribute('aria-haspopup', 'dialog');
    if (trigger === image) {
      trigger.tabIndex = 0;
      trigger.setAttribute('role', 'button');
    }
    if (!trigger.hasAttribute('aria-label') && (trigger === image || !trigger.textContent.trim())) {
      trigger.setAttribute('aria-label', `Enlarge ${captionFor(image) || 'image'}`);
    }
  }
  function scan(root) {
    if (root.matches?.(selector)) decorate(root);
    root.querySelectorAll?.(selector).forEach(decorate);
  }
  function createDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'image-preview';
    dialog.setAttribute('aria-label', 'Image preview');
    dialog.innerHTML = `<div class="image-preview-surface">
      <img class="image-preview-image" alt="" draggable="false">
      <p class="image-preview-error" role="status" hidden>This image couldn’t be loaded.</p>
    </div>
    <div class="image-preview-toolbar">
      <button class="image-preview-close" type="button" aria-label="Close image preview" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div><p class="image-preview-caption"></p>`;
    preview = dialog.querySelector('.image-preview-image');
    caption = dialog.querySelector('.image-preview-caption');
    error = dialog.querySelector('.image-preview-error');
    closeButton = dialog.querySelector('.image-preview-close');
    closeButton.addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.classList.contains('image-preview-surface') || event.target === preview) close();
    });
    preview.addEventListener('error', () => { preview.hidden = true; error.hidden = false; });
    preview.addEventListener('load', () => { if (dialog.open && !closing) fit(); });
    document.body.append(dialog);
  }
  function fit() {
    const ratio = (preview.naturalWidth || source.naturalWidth || Number(source.getAttribute('width')) || 4) /
      (preview.naturalHeight || source.naturalHeight || Number(source.getAttribute('height')) || 3);
    const gutter = dialog.clientWidth <= 600 ? 32 : 64;
    const width = Math.max(1, Math.min(1800, dialog.clientWidth - gutter, (dialog.clientHeight - 176) * ratio));
    preview.style.setProperty('--preview-width', `${width}px`);
    preview.style.setProperty('--preview-height', `${width / ratio}px`);
  }
  function sourceTransform(rect, target) {
    const scale = Math.min(rect.width / target.width, rect.height / target.height);
    return `translate(${rect.left + rect.width / 2 - target.left - target.width / 2}px,${rect.top + rect.height / 2 - target.top - target.height / 2}px) scale(${Math.max(.01, scale)})`;
  }
  function open(image, trigger) {
    if (dialog?.open) return;
    if (!dialog) createDialog();
    source = image;
    returnFocus = trigger;
    closing = false;
    const from = source.getBoundingClientRect();
    preview.hidden = false;
    error.hidden = true;
    preview.alt = source.alt;
    caption.textContent = captionFor(source);
    caption.hidden = !caption.textContent;
    preview.src = source.currentSrc || source.src;
    const root = document.documentElement;
    previousScrollbar = root.style.getPropertyValue('--preview-scrollbar');
    root.style.setProperty('--preview-scrollbar', `${innerWidth - root.clientWidth}px`);
    root.classList.add('image-preview-open');
    dialog.showModal();
    fit();
    closeButton.focus({preventScroll:true});
    if (!motion.matches) {
      animation = preview.animate([
        {transform:sourceTransform(from, preview.getBoundingClientRect()),opacity:0},
        {transform:'none',opacity:1}
      ], {duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    openingFrame = requestAnimationFrame(() => { if (!closing) dialog.classList.add('is-visible'); });
  }
  async function close() {
    if (!dialog?.open || closing) return;
    closing = true;
    cancelAnimationFrame(openingFrame);
    const currentTransform = getComputedStyle(preview).transform;
    animation?.cancel();
    dialog.classList.remove('is-visible');
    if (!motion.matches && !preview.hidden) {
      const rect = source.getBoundingClientRect();
      const visible = source.isConnected && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
      animation = preview.animate([
        {transform:currentTransform,opacity:1},
        {transform:visible ? sourceTransform(rect, preview.getBoundingClientRect()) : 'scale(.96)',opacity:0}
      ], {duration:280,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
      await animation.finished.catch(() => {});
    }
    dialog.close();
    animation?.cancel();
    document.documentElement.classList.remove('image-preview-open');
    if (previousScrollbar) document.documentElement.style.setProperty('--preview-scrollbar', previousScrollbar);
    else document.documentElement.style.removeProperty('--preview-scrollbar');
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    preview.removeAttribute('src');
    closing = false;
  }
  document.addEventListener('click', event => {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const trigger = event.target.closest('[data-image-preview-trigger]');
    if (!trigger) return;
    const image = event.target.closest('img[data-image-preview]') || trigger.querySelector('img[data-image-preview]');
    if (!image) return;
    event.preventDefault();
    event.stopPropagation();
    open(image, trigger);
  }, true);
  document.addEventListener('keydown', event => {
    const image = event.target;
    if (!image.matches('img[data-image-preview]') || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    open(image, image);
  });
  window.addEventListener('resize', () => {
    if (dialog?.open && !closing) { animation?.cancel(); fit(); }
  });
  motion.addEventListener('change', () => { if (motion.matches) animation?.cancel(); });
  scan(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) scan(node);
  }))).observe(document.body, {childList:true,subtree:true});
})();
