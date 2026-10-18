/* Add <sup data-footnote><template>Your <em>formatted</em> note.</template></sup>.
   Notes are numbered in reading order and appear on hover, focus or tap. */
(() => {
  let active;
  let pinned = false;
  let closeTimer;
  let positionFrame;
  const canOpen = () => !document.body.classList.contains('blog-layout') || !document.body.classList.contains('article-margin-notes');

  function fade(popup, visible) {
    const opacity = popup.hidden ? '0' : getComputedStyle(popup).opacity;
    // Capture the current opacity before cancelling, so quick re-entry is smooth.
    popup.getAnimations().forEach(animation => animation.cancel());
    popup.hidden = false;
    popup.style.opacity = visible ? '1' : '0';
    popup.style.pointerEvents = visible ? '' : 'none';
    popup.inert = !visible;
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
    const viewport = window.visualViewport;
    const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
    const origin = viewport?.offsetLeft || 0;
    popup.style.maxWidth = Math.min(340,width-24)+'px';
    popup.style.maxHeight = height-24+'px';
    const box = popup.getBoundingClientRect();
    const left = Math.max(origin+12, Math.min(origin+width - box.width - 12, reference.left + reference.width / 2 - box.width / 2));
    const above = reference.top - box.height - 10;
    active.side ??= above >= 12 ? 'above' : 'below';
    const top = active.side === 'above' ? above : reference.bottom + 10;
    // Use page coordinates so the browser scrolls the note and its number
    // together, without viewport clamping or switching sides during scrolling.
    popup.style.left = `${left + scrollX}px`;
    popup.style.top = `${top + scrollY}px`;
  }

  function open(button, popup) {
    if (!canOpen()) return;
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
      if (!active || pinned || active.button === document.activeElement || active.popup.contains(document.activeElement) || active.button.matches(':hover') || active.popup.matches(':hover')) return;
      close();
    }, 180);
  }

  function focusableElements(popup) {
    return [...popup.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length);
  }

  function renderFootnotes() {
    close();
    document.querySelectorAll('.footnote-popup,.page-footnotes').forEach(element => element.remove());
    const main = document.querySelector('main');
    if (!main) return;
    const references = [...main.querySelectorAll('[data-footnote]')]
      .filter(reference => !reference.closest('[hidden]'));
    const scope = main.dataset.footnoteScope || document.querySelector('[data-section][aria-current]')?.dataset.section || 'page';
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
      button.setAttribute('aria-controls', `footnote-popup-${scope}-${number}`);
      button.setAttribute('aria-describedby', `footnote-popup-${scope}-${number}`);
      button.textContent = number;
      // Keep the inert source in place so repeated renders and collection changes
      // can rebuild notes without losing markup or accumulating buttons.
      const template = reference.querySelector('template');
      reference.replaceChildren(...(template ? [template, button] : [button]));

      // A body-level overlay avoids clipping by the curved page's overflow.
      const popup = document.createElement('div');
      popup.className = 'footnote-popup';
      popup.id = `footnote-popup-${scope}-${number}`;
      popup.setAttribute('role', 'note');
      popup.setAttribute('aria-label', `Footnote ${number}`);
      popup.hidden = true;
      if (template) popup.append(template.content.cloneNode(true));
      else popup.textContent = reference.dataset.footnote; // Older plain-text notes still work.
      // Make note links explicit tab stops, including in WebKit configurations
      // that otherwise skip ordinary links when navigating with Tab.
      popup.querySelectorAll('a[href]:not([tabindex])').forEach(link => { link.tabIndex = 0; });
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
      // The overlay lives at the end of <body>; bridge the tab order so its
      // links are reached immediately after the reference, then resume reading.
      button.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || event.shiftKey || active?.button !== button) return;
        const first = focusableElements(popup)[0];
        if (first) { event.preventDefault(); first.focus(); }
      });
      popup.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const elements = focusableElements(popup);
        if (event.shiftKey && document.activeElement === elements[0]) {
          event.preventDefault();
          button.focus();
        } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
          button.focus();
          close();
        }
      });
      popup.addEventListener('focusin', () => clearTimeout(closeTimer));
      popup.addEventListener('focusout', () => { pinned = false; scheduleClose(); });
      popup.addEventListener('pointerenter', () => clearTimeout(closeTimer));
      popup.addEventListener('pointerleave', scheduleClose);
    });
  }

  document.addEventListener('pointerdown', event => {
    if (active && !active.button.contains(event.target) && !active.popup.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) {
      if (active.popup.contains(document.activeElement)) active.button.focus();
      close();
    }
  });
  const schedulePosition = () => {
    cancelAnimationFrame(positionFrame);
    if (active) positionFrame = requestAnimationFrame(position);
  };
  window.addEventListener('resize', schedulePosition);
  window.visualViewport?.addEventListener('resize',schedulePosition);
  document.addEventListener('articlefootnotemodechange',close);
  document.addEventListener('DOMContentLoaded', renderFootnotes);
  document.addEventListener('collectionchange', renderFootnotes);
})();
