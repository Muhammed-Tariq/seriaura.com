/* Enlarge editorial images without leaving the current page. */
(() => {
  if (!window.HTMLDialogElement) return;
  const selector = '.post-body img,.polaroid img,.blog-layout .footnote-popup img';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let dialog, preview, frame, caption, error, closeButton, source, returnFocus, animation;
  let orientation = 0;
  let closing = false, preparing = false, openingFrame, previousScrollbar;

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
      <div class="image-preview-frame"><img class="image-preview-image" alt="" draggable="false"></div>
      <p class="image-preview-error" role="status" hidden>This image couldn’t be loaded.</p>
      <p class="image-preview-caption"></p>
    </div>
    <div class="image-preview-toolbar">
      <button class="image-preview-close" type="button" aria-label="Close image preview" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div>`;
    preview = dialog.querySelector('.image-preview-image');
    frame = dialog.querySelector('.image-preview-frame');
    caption = dialog.querySelector('.image-preview-caption');
    error = dialog.querySelector('.image-preview-error');
    closeButton = dialog.querySelector('.image-preview-close');
    closeButton.addEventListener('click', close);
    dialog.addEventListener('keydown', () => dialog.classList.remove('opened-with-pointer'));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.classList.contains('image-preview-surface') || event.target === preview || event.target === frame) close();
    });
    preview.addEventListener('error', () => { preview.hidden = true; frame.hidden = true; error.hidden = false; });
    preview.addEventListener('load', () => { if (dialog.open && !closing) fit(); });
    document.body.append(dialog);
  }
  function fit() {
    const naturalRatio = (source.naturalWidth || preview.naturalWidth || Number(source.getAttribute('width')) || 4) /
      (source.naturalHeight || preview.naturalHeight || Number(source.getAttribute('height')) || 3);
    const sideways = Math.abs(orientation % 180) === 90;
    const ratio = sideways ? 1 / naturalRatio : naturalRatio;
    const gutter = dialog.clientWidth <= 600 ? 32 : 64;
    const surface = getComputedStyle(frame.parentElement);
    const availableHeight = dialog.clientHeight - parseFloat(surface.paddingTop) - parseFloat(surface.paddingBottom) - (caption.hidden ? 0 : caption.offsetHeight + 12);
    const width = Math.max(1, Math.min(1800, dialog.clientWidth - gutter, availableHeight * ratio));
    const height = width / ratio;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    preview.style.width = `${sideways ? height : width}px`;
    preview.style.height = `${sideways ? width : height}px`;
    preview.style.transform = `translate(-50%,-50%) rotate(${orientation}deg)`;
  }
  function sourceGeometry() {
    // Use the visible photo slot, not the oversized image used for cropping.
    const box = source.closest('.media-slot') || source;
    let angle = 0;
    for (let node = box; node instanceof Element; node = node.parentElement) {
      const transform = getComputedStyle(node).transform;
      if (transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        angle += Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      }
    }
    if (box === source) angle -= orientation;
    return {rect:box.getBoundingClientRect(),width:box.clientWidth,height:box.clientHeight,angle};
  }
  function sourceTransform(geometry, target) {
    const {rect, width, height, angle} = geometry;
    const scale = Math.min(width / target.width, height / target.height);
    return `translate(${rect.left + rect.width / 2 - target.left - target.width / 2}px,${rect.top + rect.height / 2 - target.top - target.height / 2}px) rotate(${angle}deg) scale(${Math.max(.01, scale)})`;
  }
  async function open(image, trigger, pointer = false) {
    if (dialog?.open || preparing) return;
    preparing = true;
    if (!dialog) createDialog();
    source = image;
    returnFocus = trigger;
    closing = false;
    animation?.cancel();
    animation = null;
    orientation = Number(source.dataset.previewRotation) || 0;
    dialog.classList.toggle('opened-with-pointer', pointer);
    preview.hidden = false;
    frame.hidden = false;
    error.hidden = true;
    preview.alt = source.alt;
    caption.textContent = captionFor(source);
    caption.hidden = !caption.textContent;
    preview.src = source.currentSrc || source.src;
    // Decode before starting the clock: on phones an undecoded image can miss
    // the first, most visible part of the zoom animation.
    await preview.decode().catch(() => {});
    preparing = false;
    if (!source.isConnected) return;
    const from = sourceGeometry();
    const root = document.documentElement;
    previousScrollbar = root.style.getPropertyValue('--preview-scrollbar');
    root.style.setProperty('--preview-scrollbar', `${innerWidth - root.clientWidth}px`);
    root.classList.add('image-preview-open');
    dialog.showModal();
    fit();
    closeButton.focus({preventScroll:true});
    if (!motion.matches) {
      animation = frame.animate([
        {transform:sourceTransform(from, frame.getBoundingClientRect()),opacity:1},
        {transform:'none',opacity:1}
      ], {duration:500,easing:'cubic-bezier(.4,0,.25,1)'});
      animation.pause();
      animation.currentTime = 0;
    }
    // Paint the decoded photograph at its source position before moving it.
    openingFrame = requestAnimationFrame(() => {
      if (closing) return;
      dialog.classList.add('is-visible');
      openingFrame = requestAnimationFrame(() => {
        if (!closing && !motion.matches && animation?.playState === 'paused' && animation.currentTime === 0) animation.play();
      });
    });
  }
  async function close() {
    if (!dialog?.open || closing) return;
    closing = true;
    cancelAnimationFrame(openingFrame);
    const currentTransform = getComputedStyle(frame).transform;
    animation?.cancel();
    dialog.classList.remove('is-visible');
    if (!motion.matches && !preview.hidden) {
      const geometry = sourceGeometry();
      const {rect} = geometry;
      const visible = source.isConnected && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
      animation = frame.animate([
        {transform:currentTransform,opacity:1},
        {transform:visible ? sourceTransform(geometry, frame.getBoundingClientRect()) : 'scale(.96)',opacity:0}
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
    open(image, trigger, event.detail > 0);
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
