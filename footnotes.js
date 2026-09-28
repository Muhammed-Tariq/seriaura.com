/* Add <sup data-footnote="Your note."></sup> after the relevant words.
   Notes are numbered in reading order and appear on hover, focus or tap. */
(() => {
  let active;
  let pinned = false;
  let closeTimer;
  let positionFrame;

  function fade(popup, visible) {
    const opacity = popup.hidden ? '0' : getComputedStyle(popup).opacity;
    // Capture the current opacity before cancelling, so quick re-entry is smooth.
    popup.getAnimations().forEach(animation => animation.cancel());
    popup.hidden = false;
    popup.style.opacity = visible ? '1' : '0';
    popup.style.pointerEvents = visible ? '' : 'none';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      popup.hidden = !visible;
      return;
    }
    const animation = popup.animate([
      {opacity}, {opacity: visible ? '1' : '0'}
    ], {duration: 160, easing: 'ease-out'});
    animation.finished.then(() => {
      if (!visible) popup.hidden = true;
    }).catch(() => {}); // Reopening cancels the pending hide.
  }

  function close() {
    clearTimeout(closeTimer);
    if (active) {
      fade(active.popup, false);
      active.button.setAttribute('aria-expanded', 'false');
    }
    active = null;
    pinned = false;
  }

  function position() {
    if (!active) return;
    const {button, popup} = active;
    const reference = button.getBoundingClientRect();
    if (!button.isConnected) {
      close();
      return;
    }
    const box = popup.getBoundingClientRect();
    const left = Math.max(12, Math.min(innerWidth - box.width - 12, reference.left + reference.width / 2 - box.width / 2));
    const above = reference.top - box.height - 10;
    active.side ??= above >= 12 ? 'above' : 'below';
    const top = active.side === 'above' ? above : reference.bottom + 10;
    // Use page coordinates so the browser scrolls the note and its number
    // together, without viewport clamping or switching sides during scrolling.
    popup.style.left = `${left + scrollX}px`;
    popup.style.top = `${top + scrollY}px`;
  }

  function open(button, popup) {
    clearTimeout(closeTimer);
    const changed = active?.button !== button;
    if (changed) {
      close();
      active = {button, popup};
      fade(popup, true);
    }
    button.setAttribute('aria-expanded', 'true');
    position();
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    // Leave enough time to cross the small gap and hover the note itself.
    closeTimer = setTimeout(() => {
      if (!active || pinned || active.button === document.activeElement || active.button.matches(':hover') || active.popup.matches(':hover')) return;
      close();
    }, 180);
  }

  function renderFootnotes() {
    close();
    document.querySelectorAll('.footnote-popup,.page-footnotes').forEach(element => element.remove());
    const main = document.querySelector('main');
    if (!main) return;
    const references = [...main.querySelectorAll('[data-footnote]')]
      .filter(reference => !reference.closest('[hidden]'));
    const scope = document.querySelector('[data-section][aria-current]')?.dataset.section || 'page';
    references.forEach((reference, index) => {
      const number = index + 1;
      // Keep existing note URLs pointing to their place in the text.
      reference.id = `footnote-${scope}-${number}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'footnote-trigger';
      button.id = `footnote-ref-${scope}-${number}`;
      button.setAttribute('aria-label', `Footnote ${number}`);
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-describedby', `footnote-popup-${scope}-${number}`);
      button.textContent = number;
      reference.replaceChildren(button);

      // A body-level overlay avoids clipping by the curved page's overflow.
      const popup = document.createElement('div');
      popup.className = 'footnote-popup';
      popup.id = `footnote-popup-${scope}-${number}`;
      popup.setAttribute('role', 'tooltip');
      popup.hidden = true;
      popup.textContent = reference.dataset.footnote;
      document.body.append(popup);

      button.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch') open(button, popup);
      });
      button.addEventListener('pointerleave', scheduleClose);
      button.addEventListener('focus', () => open(button, popup));
      button.addEventListener('blur', () => { pinned = false; scheduleClose(); });
      button.addEventListener('click', () => {
        if (active?.button === button && pinned) close();
        else { open(button, popup); pinned = true; }
      });
      popup.addEventListener('pointerenter', () => clearTimeout(closeTimer));
      popup.addEventListener('pointerleave', scheduleClose);
    });
  }

  document.addEventListener('pointerdown', event => {
    if (active && !active.button.contains(event.target) && !active.popup.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
  const schedulePosition = () => {
    cancelAnimationFrame(positionFrame);
    if (active) positionFrame = requestAnimationFrame(position);
  };
  window.addEventListener('resize', schedulePosition);
  document.addEventListener('DOMContentLoaded', renderFootnotes);
  document.addEventListener('collectionchange', renderFootnotes);
})();
