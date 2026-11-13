/* Local-clock notes; the featured film plays only while visible. */
(() => {
  const clamp = value => Math.max(0, Math.min(100, value));
  function gapPercent(now, start, end) {
    return clamp((now - Date.parse(start)) / (Date.parse(end) - Date.parse(start)) * 100);
  }
  function ageInYears(now, birth) {
    const born = new Date(birth);
    const year = new Date(now).getUTCFullYear();
    // 9 April at 07:00 UK time is 06:00 UTC (BST). Interpolate between
    // birthdays, so a leap year is accounted for and birthdays are integers.
    const anniversary = y => Date.UTC(y, born.getUTCMonth(), born.getUTCDate(), born.getUTCHours(), born.getUTCMinutes());
    const lastYear = now < anniversary(year) ? year - 1 : year;
    return lastYear - born.getUTCFullYear() + (now - anniversary(lastYear)) / (anniversary(lastYear + 1) - anniversary(lastYear));
  }
  function remaining(now, at) {
    const seconds = Math.ceil(Math.max(0, Date.parse(at) - now) / 1000);
    return {days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24,
      minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60, started: now >= Date.parse(at)};
  }
  function countdownEffect(millisecondsLeft, thresholds={glow:10,ripple:5,combined:1}) {
    if (millisecondsLeft <= 0 || millisecondsLeft > thresholds.glow * 86400000) return 'original';
    if (millisecondsLeft <= thresholds.combined * 86400000) return 'combined';
    return millisecondsLeft <= thresholds.ripple * 86400000 ? 'ripple' : 'glow';
  }
  function elapsedDays(now, at) {
    return Math.max(0, Math.floor((now - Date.parse(at)) / 86400000));
  }
  function lifeProgress(now,birth,years=85,scenario=false){
    return scenario?gapPercent(now,birth,'2035-01-01T00:00:00Z'):clamp(ageInYears(now,birth)/years*100);
  }
  function easedProgress(from,to,progress){
    const t=Math.max(0,Math.min(1,progress));return from+(to-from)*t*t*(3-2*t);
  }
  // The same calculations are exercised by the boundary/date tests in Node.
  if (typeof module !== 'undefined' && module.exports) module.exports = {gapPercent, ageInYears, remaining, countdownEffect, elapsedDays, lifeProgress, easedProgress};
  if (typeof document === 'undefined') return;
  const panel = document.querySelector('.time-notes');
  const config = window.siteContent?.time;
  if (!panel || !config) return;
  const assetRoot = new URL('.', document.currentScript.src);
  const scheduledAt = event => event.at ? Date.parse(event.at) : Infinity;
  const events = [...config.events].sort((a, b) => scheduledAt(a) - scheduledAt(b));
  function fitBand(){panel.style.setProperty('--countdown-page-width',document.documentElement.clientWidth+'px');}
  fitBand();window.addEventListener('resize',fitBand);
  if(window.ResizeObserver)new ResizeObserver(fitBand).observe(document.documentElement);
  const dateFormat = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const list = panel.querySelector('.countdown-events');
  const completedSection = panel.querySelector('.completed-events');
  const completedList = completedSection.querySelector('.countdown-events');
  const rows = events.map(event => {
    const row = document.createElement('li');
    row.className = 'countdown-event'; row.dataset.event = event.id;
    row.classList.toggle('is-tbc', !event.at);
    const title = document.createElement('h3');
    const link = document.createElement(event.href ? 'a' : 'span');
    link.className = 'event-logo';
    link.title = event.at ? `${event.name} · ${dateFormat.format(new Date(event.at))} UK${event.provisional ? ' (provisional)' : ''}` : `${event.name} · date TBC`;
    if (event.dateOnly) {
      const date = new Intl.DateTimeFormat('en-GB', {timeZone:event.timeZone, day:'numeric', month:'long', year:'numeric'}).format(new Date(event.at));
      link.title = `${event.name} · ${date} · race day (start time TBC)`;
    }
    if (event.href) { link.href = event.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    if (event.logo) {
      const logo = document.createElement('img'); logo.src = new URL(event.logo, assetRoot).href; logo.alt = event.name;
      if (event.id === 'tmua') { logo.width = 1418; logo.height = 1418; }
      link.append(logo);
    } else if (event.id === 'redemption' || event.id === 'absolution') {
      link.classList.add('redemption-wordmark');
      const numeral = document.createElement('span'); numeral.className = 'redemption-iv'; numeral.textContent = event.id === 'redemption' ? 'IV' : 'V';
      const name = document.createElement('span'); name.textContent = event.id === 'redemption' ? 'Redemption' : 'Absolution';
      link.append(numeral, document.createTextNode(' '), name);
    } else link.textContent = event.name;
    title.append(link);
    const completedInfo = document.createElement('div');
    completedInfo.className = 'completed-event-info';
    const completedName = document.createElement('span');
    completedName.className = 'completed-event-name';
    completedName.textContent = event.name;
    completedInfo.append(completedName);
    if (event.at) {
      const completedDate = document.createElement('time');
      completedDate.dateTime = event.at;
      const dateParts=new Intl.DateTimeFormat('en-GB', {timeZone:event.timeZone || 'Europe/London',day:'numeric',month:'short',year:'numeric'}).formatToParts(new Date(event.at));
      for(const part of dateParts){if(['day','year'].includes(part.type)){const number=document.createElement('span');number.className='technical-value';number.textContent=part.value;completedDate.append(number);}else completedDate.append(document.createTextNode(part.value));}
      completedInfo.append(completedDate);
    }
    const values = document.createElement('div'); values.className = 'countdown-values';
    values.innerHTML = '<span class="countdown-days"><span class="countdown-square"><span class="countdown-number" data-days></span></span><span class="countdown-label" data-day-label>days</span></span><span class="countdown-clock" hidden><span><b data-hours></b><span class="countdown-label">hrs</span></span><span><b data-minutes></b><span class="countdown-label">mins</span></span><span><b data-seconds></b><span class="countdown-label">secs</span></span></span>';
    const square = values.querySelector('.countdown-square');
    const frame = document.createElement('span'); frame.className = 'countdown-frame';
    const pulse = document.createElement('span'); pulse.className = 'countdown-pulse';
    pulse.setAttribute('aria-hidden', 'true');
    const halo = document.createElement('span'); halo.className = 'countdown-halo';
    halo.setAttribute('aria-hidden', 'true');
    square.replaceWith(frame); frame.append(square, halo, pulse);
    row.append(title, completedInfo, values);
    values.querySelectorAll('.countdown-clock > span').forEach(unit => {
      const colon = document.createElement('span');
      colon.className = 'countdown-colon'; colon.textContent = ':';
      colon.setAttribute('aria-hidden', 'true'); unit.prepend(colon);
    });
    if (event.provisional) {
      const note = document.createElement('a'); note.href = event.source;
      note.className = 'countdown-note'; note.textContent = 'provisional';
      note.title = 'Published marathon start; the 2027 Wave 1 time is not yet confirmed.';
      row.append(note);
    }
    list.append(row);
    return {event, row, clock:row.querySelector('.countdown-clock'), days:row.querySelector('[data-days]'),
      label:row.querySelector('[data-day-label]'), hours:row.querySelector('[data-hours]'),
      minutes:row.querySelector('[data-minutes]'), seconds:row.querySelector('[data-seconds]')};
  });
  const age = panel.querySelector('[data-exact-age]');
  age.title = 'Years since 9 April 2008, 07:00 UK time, with the fraction measured between birthdays. Uses your device’s clock.';
  const percent = panel.querySelector('[data-gap-percent]');
  const progress = panel.querySelector('.gap-progress');
  const horizonButton=panel.querySelector('.age-horizon'),lifeBar=panel.querySelector('.life-progress'),horizonLabel=panel.querySelector('[data-horizon-label]'),lifePercent=panel.querySelector('[data-life-percent]');
  let horizonHovered=false,horizonFocused=false,horizonPinned=false;
  let horizonFrame=0,horizonDisplayed=null,horizonTarget=0,horizonStamp=0;
  function paintLife(value){
    horizonDisplayed=value;lifeBar.value=value;lifePercent.textContent=value.toFixed(2)+'%';
    const normal=lifeProgress(Date.now(),config.birth,window.LayoutChoices?.get().lifeYears||85),short=lifeProgress(Date.now(),config.birth,85,true);
    const blend=Math.max(0,Math.min(1,(value-normal)/Math.max(.001,short-normal)));
    const colour=[255,139,25].map((channel,i)=>Math.round(channel+([186,48,72][i]-channel)*blend));
    horizonButton.style.setProperty('--scenario-mix',String(blend));
    horizonButton.style.setProperty('--life-colour','rgb('+colour.join(',')+')');
  }
  function animateLife(stamp){
    const delta=Math.min(64,Math.max(0,stamp-horizonStamp));horizonStamp=stamp;
    const distance=horizonTarget-horizonDisplayed;
    if(Math.abs(distance)<.005){paintLife(horizonTarget);horizonFrame=0;return;}
    paintLife(horizonDisplayed+distance*(1-Math.exp(-delta/95)));
    horizonFrame=requestAnimationFrame(animateLife);
  }
  function updateLife(){
    if(!lifeBar)return;
    const scenario=horizonHovered||horizonFocused||horizonPinned,years=window.LayoutChoices?.get().lifeYears||85;
    const percentage=lifeProgress(Date.now(),config.birth,years,scenario);
    lifeBar.setAttribute('aria-label',scenario?'Life elapsed to 1 January 2035':'Life elapsed against an assumed '+years+'-year lifespan');
    horizonLabel.textContent=scenario?'Short timeline scenario':'Business-as-usual scenario';
    horizonButton.dataset.scenario=String(scenario);horizonButton.setAttribute('aria-pressed',String(horizonPinned));
    horizonTarget=percentage;
    if(horizonDisplayed===null||motion.matches||document.hidden){cancelAnimationFrame(horizonFrame);horizonFrame=0;paintLife(percentage);return;}
    if(!horizonFrame){
      if(Math.abs(horizonTarget-horizonDisplayed)<.005)paintLife(percentage);
      else{horizonStamp=performance.now();horizonFrame=requestAnimationFrame(animateLife);}
    }
  }
  if(horizonButton){
    const hoverArea=panel.querySelector('.age-stat')||horizonButton;
    hoverArea.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){horizonHovered=true;updateLife();}});
    hoverArea.addEventListener('pointerleave',()=>{horizonHovered=false;updateLife();});
    horizonButton.addEventListener('focus',()=>{horizonFocused=horizonButton.matches(':focus-visible');updateLife();});
    horizonButton.addEventListener('blur',()=>{horizonFocused=false;updateLife();});
    horizonButton.addEventListener('click',()=>{horizonPinned=!horizonPinned;horizonFocused=false;updateLife();});
    horizonButton.addEventListener('keydown',event=>{if(event.key==='Escape'){horizonPinned=horizonFocused=horizonHovered=false;updateLife();}});
    window.addEventListener('layoutchoiceschange',updateLife);
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change',updateLife);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&horizonFrame){cancelAnimationFrame(horizonFrame);horizonFrame=0;paintLife(horizonTarget);}});
  const largeVideo = matchMedia('(min-width: 1101px)');
  const nextTitle = panel.querySelector('.next-event-title');
  let featuredEvent, featuredMedia, showcase;
  function updatePlaybackButton(button, playing) {
    button.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    button.title = playing ? 'Pause video' : 'Play video';
    button.classList.toggle('is-playing', playing);
  }
  function syncMedia() {
    if (!featuredMedia) return;
    const {video, button, event, visible, paused} = featuredMedia;
    const still = motion.matches || navigator.connection?.saveData;
    showcase?.setPaused(paused);
    button.hidden = Boolean(still || video.error);
    if (!visible || document.hidden || still || paused) { video.pause(); return; }
    const src = new URL(largeVideo.matches && event.film.largeSrc ? event.film.largeSrc : event.film.src, assetRoot).href;
    if (video.getAttribute('src') !== src) {
      const position = video.currentTime;
      video.onloadedmetadata = () => { if (position < video.duration) video.currentTime = position; };
      video.src = src;
    }
    if (video.paused) video.play().catch(() => { if (video.paused) updatePlaybackButton(button, false); });
  }
  function featureMedia(event) {
    if (event === featuredEvent) return;
    featuredEvent = event;
    showcase?.destroy();showcase=null;
    if (featuredMedia) {
      featuredMedia.observer.disconnect();
      featuredMedia.video.pause?.();
      featuredMedia.nodes.forEach(node => node.remove());
      featuredMedia.row.classList.remove('has-event-film');
      featuredMedia = null;
    }
    if (!event?.film) return;
    const row = rows.find(parts => parts.event === event).row;
    showcase=window.BrightonShowcase?.mount(row,event);
    const video = document.createElement('video');
    const filmStage=document.createElement('div');filmStage.className='event-film-stage';
    video.className = 'event-film';
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
    video.preload = 'none'; video.poster = new URL(event.film.poster, assetRoot).href;
    video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
    const button = document.createElement('button');
    button.className = 'event-film-toggle'; button.type = 'button';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="film-play" d="m8 5 11 7-11 7Z"/><path class="film-pause" d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>';
    updatePlaybackButton(button, false);
    button.addEventListener('click', () => {
      featuredMedia.paused = !video.paused;
      syncMedia();
    });
    video.addEventListener('playing', () => { updatePlaybackButton(button, true); });
    video.addEventListener('pause', () => { updatePlaybackButton(button, false); });
    video.addEventListener('error', () => { button.hidden = true; });
    const observer = new IntersectionObserver(([entry]) => {
      if (featuredMedia?.video !== video) return;
      featuredMedia.visible = entry.isIntersecting; syncMedia();
    });
    featuredMedia = {event, row, video, button, observer, visible:false, paused:false, nodes:[filmStage, button]};
    filmStage.append(video);
    row.classList.add('has-event-film'); row.prepend(filmStage); row.append(button);
    observer.observe(row); syncMedia();
  }
  const write = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  const writeDays = (node, text) => {
    if (node.textContent === text) return;
    node.style.setProperty('--digits', text.length);
    node.classList.toggle('is-single-digit', /^\d$/.test(text));
    node.textContent = text;
  };
  let timer, frame, activeClock, inView = false, lastSecond = -1;
  function render() {
    const now = Date.now();
    // The colon reaches zero on the same wall-clock boundary as the digits.
    // Deriving opacity from time avoids independent CSS animation phases/drift.
    if (activeClock) activeClock.style.setProperty('--colon-opacity', motion.matches ? '.7' : String((1 - Math.cos(now % 1000 / 1000 * Math.PI * 2)) / 2));
    write(age, ageInYears(now, config.birth).toFixed(7));
    const complete = gapPercent(now, config.gapStart, config.gapEnd);
    write(percent, complete.toFixed(5)); progress.value = complete;
    const second = Math.floor(now / 1000);
    if (second === lastSecond) return;
    lastSecond = second;
    updateLife();
    const nearest = events.find(event => event.at && scheduledAt(event) > now);
    activeClock = rows.find(parts => parts.event === nearest)?.clock;
    if (nextTitle) nextTitle.hidden = !nearest;
    const effect = nearest ? countdownEffect(scheduledAt(nearest) - now,nearest.effects) : 'original';
    if (panel.dataset.pulse !== effect) panel.dataset.pulse = effect;
    rows.forEach(parts => {
      parts.row.classList.toggle('is-next', parts.event === nearest);
      if (!parts.event.at) {
        writeDays(parts.days, 'TBC'); write(parts.label, ''); parts.clock.hidden = true;
        return;
      }
      const value = remaining(now, parts.event.at);
      parts.clock.hidden = parts.event !== nearest;
      parts.row.classList.toggle('is-past', value.started);
      const destination = value.started ? completedList : list;
      if (parts.row.parentElement !== destination) {
        // Keep each section chronological, including when the device clock changes.
        const after = [...destination.children].find(row => scheduledAt(events.find(event => event.id === row.dataset.event)) > scheduledAt(parts.event));
        destination.insertBefore(parts.row, after || null);
      }
      const days = value.started ? elapsedDays(now, parts.event.at) : value.days;
      writeDays(parts.days, String(days));
      write(parts.label, value.started ? (days === 1 ? 'day since' : 'days since') : days === 1 ? 'day' : 'days');
      for (const unit of ['hours','minutes','seconds']) write(parts[unit], String(value[unit]).padStart(2,'0'));
    });
    completedSection.hidden = !completedList.children.length;
    featureMedia(nearest);
  }
  function sync() {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    panel.hidden = false;
    const active = inView && !document.hidden;
    panel.classList.toggle('is-paused', !active);
    render();
    syncMedia();
    if (!active) return;
    const tick = () => {
      render();
      schedule();
    };
    // Paint the seven-decimal age on the next frame; the five-decimal gap
    // percentage changes roughly every four seconds.
    const schedule = () => {
      if (motion.matches) timer = setTimeout(tick, 1000);
      else frame = requestAnimationFrame(tick);
    };
    schedule();
  }
  new IntersectionObserver(entries => {inView = entries[0].isIntersecting; sync();}).observe(panel);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  largeVideo.addEventListener('change', syncMedia);
  sync();
})();
