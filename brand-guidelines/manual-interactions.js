/* The official wording has some unofficial footnotes. */
(() => {
  document.querySelectorAll('.copy-swap').forEach(button => {
    let hovered = false, pinned = false, originalRects = [];
    const render = () => {
      const active = hovered || pinned || button.matches(':focus-visible');
      button.querySelector('.swap-original').hidden = active;
      button.querySelector('.swap-alternative').hidden = !active;
      button.setAttribute('aria-pressed', String(active));
    };
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || hovered) return;
      originalRects = [...button.getClientRects()];
      hovered = true; render();
    });
    // Replacing an inline phrase can move its edges away from the pointer.
    // Keep both old and new hit regions until the pointer actually leaves them.
    document.addEventListener('pointermove', event => {
      if (!hovered || event.pointerType === 'touch') return;
      const inside = [...originalRects, ...button.getClientRects()].some(rect =>
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
      if (!inside) { hovered = false; render(); }
    });
    button.addEventListener('focus', render);
    button.addEventListener('blur', () => { pinned = false; render(); });
    button.addEventListener('click', () => { pinned = !pinned; render(); });
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click(); }
      if (event.key === 'Escape') { pinned = hovered = false; button.blur(); render(); }
    });
  });

  const pronunciationAudio = document.createElement('audio');
  pronunciationAudio.className = 'pronunciation-audio';
  pronunciationAudio.preload = 'none';
  document.body.append(pronunciationAudio);
  let playingLink;
  const clearSpeaker = () => {
    playingLink?.classList.remove('is-playing');
  };
  pronunciationAudio.addEventListener('ended', clearSpeaker);
  pronunciationAudio.addEventListener('pause', clearSpeaker);
  pronunciationAudio.addEventListener('error', clearSpeaker);
  pronunciationAudio.addEventListener('playing', () => playingLink?.classList.add('is-playing'));
  document.querySelectorAll('.pronunciation').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      pronunciationAudio.pause();
      clearSpeaker();
      playingLink = link;
      pronunciationAudio.src = link.href;
      pronunciationAudio.play().catch(error => {
        if (error.name !== 'AbortError') clearSpeaker();
      });
    });
  });

  const trigger = document.querySelector('.bard-email');
  const warning = document.querySelector('#bard-warning');
  const sirenAudio = document.createElement('audio');
  sirenAudio.className = 'warning-audio';
  sirenAudio.src = '../assets/brand/air-raid-siren.mp3';
  sirenAudio.loop = true;
  sirenAudio.preload = 'none';
  document.body.append(sirenAudio);
  let previousOverflow;
  function silence() {
    sirenAudio.pause(); sirenAudio.currentTime = 0;
  }
  function siren() {
    sirenAudio.currentTime = 0;
    sirenAudio.play().catch(error => { if (error.name !== 'AbortError') silence(); });
  }
  trigger.addEventListener('click', event => {
    event.preventDefault();
    if (warning.open) return;
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    warning.showModal();
    siren();
  });
  // The copy affordance is the joke; it never writes to the clipboard or opens mail.
  ['copy', 'cut', 'dragstart', 'contextmenu'].forEach(type => trigger.addEventListener(type, event => event.preventDefault()));
  document.addEventListener('copy', event => {
    if (window.getSelection()?.containsNode(trigger, true)) event.preventDefault();
  });
  warning.querySelector('.warning-dismiss').addEventListener('click', () => warning.close());
  warning.addEventListener('close', () => {
    silence(); document.documentElement.style.overflow = previousOverflow; trigger.focus();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { silence(); pronunciationAudio.pause(); }
    else if (warning.open) siren();
  });
  window.addEventListener('pagehide', () => { silence(); pronunciationAudio.pause(); });
})();
