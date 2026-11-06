/* Shared inline name pronunciation controls. */
(() => {
  if (!document.querySelector('.pronunciation')) return;
  const links = [...document.querySelectorAll('.pronunciation')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hovered = new WeakSet();
  const speakerActive = link => hovered.has(link) || link.matches(':focus-visible,.is-playing');
  const syncSpeaker = link => {
    if (!link) return;
    link.querySelectorAll('.speaker-wave').forEach(wave => {
      if (reducedMotion.matches) wave.classList.remove('is-animating');
      else if (speakerActive(link)) wave.classList.add('is-animating');
      // Inactive waves stop independently at their next cycle boundary.
    });
  };
  const pronunciationAudio = document.createElement('audio');
  pronunciationAudio.className = 'pronunciation-audio';
  pronunciationAudio.preload = 'none';
  document.body.append(pronunciationAudio);
  let playingLink, playbackTimer;
  let playbackRequest = 0;
  const clearSpeaker = () => {
    playingLink?.classList.remove('is-playing');
    syncSpeaker(playingLink);
  };
  const stop = () => {
    clearTimeout(playbackTimer);
    playbackRequest++;
    pronunciationAudio.pause();
    clearSpeaker();
  };
  pronunciationAudio.addEventListener('ended', () => { if (pronunciationAudio.ended) clearSpeaker(); });
  pronunciationAudio.addEventListener('pause', () => { if (pronunciationAudio.paused) clearSpeaker(); });
  pronunciationAudio.addEventListener('error', clearSpeaker);
  pronunciationAudio.addEventListener('playing', () => {
    if (!pronunciationAudio.paused && !pronunciationAudio.ended) {
      playingLink?.classList.add('is-playing');
      syncSpeaker(playingLink);
    }
  });
  links.forEach(link => {
    link.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovered.add(link); syncSpeaker(link);
    });
    link.addEventListener('pointerleave', () => { hovered.delete(link); syncSpeaker(link); });
    link.addEventListener('focus', () => syncSpeaker(link));
    link.addEventListener('blur', () => syncSpeaker(link));
    link.querySelectorAll('.speaker-wave').forEach(wave => {
      wave.addEventListener('animationiteration', event => {
        if (event.animationName === 'speaker-pulse' && !speakerActive(link)) wave.classList.remove('is-animating');
      });
    });
    link.addEventListener('click', event => {
      event.preventDefault();
      // Let the current word finish instead of repeatedly clipping its opening.
      if (playingLink === link && !pronunciationAudio.paused && !pronunciationAudio.ended) return;
      stop();
      playingLink = link;
      const request = playbackRequest;
      // A brief settling time turns a burst of clicks into one pronunciation.
      playbackTimer = setTimeout(() => {
        pronunciationAudio.src = link.href;
        pronunciationAudio.play().catch(error => {
          if (request === playbackRequest && error.name !== 'AbortError') clearSpeaker();
        });
      }, 180);
    });
  });
  reducedMotion.addEventListener('change', () => links.forEach(syncSpeaker));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  window.addEventListener('pagehide', stop);
})();
