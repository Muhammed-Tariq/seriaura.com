/* Small, local-clock notes. Nothing is fetched and no timers run offscreen. */
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
  // The same calculations are exercised by the boundary/date tests in Node.
  if (typeof module !== 'undefined' && module.exports) module.exports = {gapPercent, ageInYears, remaining};
  if (typeof document === 'undefined') return;
  const panel = document.querySelector('.time-notes');
  const config = window.siteContent?.time;
  if (!panel || !config) return;
  const assetRoot = new URL('.', document.currentScript.src);
  const scheduledAt = event => event.at ? Date.parse(event.at) : Infinity;
  const events = [...config.events].sort((a, b) => scheduledAt(a) - scheduledAt(b));
  const dateFormat = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const list = panel.querySelector('.countdown-events');
  const colonToggle = panel.querySelector('[data-colon-toggle]');
  try { colonToggle.checked = localStorage.getItem('countdown-colons') !== 'off'; } catch {}
  const updateColons = () => { panel.dataset.colons = colonToggle.checked ? 'on' : 'off'; };
  updateColons();
  colonToggle.addEventListener('change', () => {
    updateColons();
    try { localStorage.setItem('countdown-colons', panel.dataset.colons); } catch {}
  });
  const rows = events.map(event => {
    const row = document.createElement('li');
    row.className = 'countdown-event'; row.dataset.event = event.id;
    row.classList.toggle('is-tbc', !event.at);
    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = event.href; link.className = 'event-logo';
    link.title = event.at ? `${event.name} · ${dateFormat.format(new Date(event.at))} UK${event.provisional ? ' (provisional)' : ''}` : `${event.name} · date TBC`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    const logo = document.createElement('img'); logo.src = new URL(event.logo, assetRoot).href; logo.alt = event.name;
    link.append(logo); title.append(link);
    const values = document.createElement('div'); values.className = 'countdown-values';
    values.innerHTML = '<span class="countdown-days"><span class="countdown-square"><span class="countdown-number" data-days></span></span><span class="countdown-label" data-day-label>days</span></span><span class="countdown-clock" hidden><span><b data-hours></b><span class="countdown-label">hrs</span></span><span><b data-minutes></b><span class="countdown-label">mins</span></span><span><b data-seconds></b><span class="countdown-label">secs</span></span></span>';
    row.append(title, values);
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
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const write = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  const writeDays = (node, text) => {
    if (node.textContent === text) return;
    node.style.setProperty('--digits', text.length);
    node.textContent = text;
  };
  let timer, frame, inView = false, lastSecond = -1;
  function render() {
    const now = Date.now();
    write(age, ageInYears(now, config.birth).toFixed(7));
    const complete = gapPercent(now, config.gapStart, config.gapEnd);
    write(percent, complete.toFixed(7)); progress.value = complete;
    const second = Math.floor(now / 1000);
    if (second === lastSecond) return;
    lastSecond = second;
    const nearest = events.find(event => event.at && scheduledAt(event) > now);
    rows.forEach(parts => {
      parts.row.classList.toggle('is-next', parts.event === nearest);
      if (!parts.event.at) {
        writeDays(parts.days, 'TBC'); write(parts.label, ''); parts.clock.hidden = true;
        return;
      }
      const value = remaining(now, parts.event.at);
      parts.clock.hidden = parts.event !== nearest;
      parts.row.classList.toggle('is-past', value.started);
      writeDays(parts.days, String(value.days));
      write(parts.label, value.started ? 'started' : value.days === 1 ? 'day' : 'days');
      for (const unit of ['hours','minutes','seconds']) write(parts[unit], String(value[unit]).padStart(2,'0'));
    });
  }
  function sync() {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    panel.hidden = false;
    const active = inView && !document.hidden;
    panel.classList.toggle('is-paused', !active);
    render();
    if (!active) return;
    const tick = () => {
      render();
      schedule();
    };
    // Seven decimal places change roughly every 40ms. Paint each increment
    // on the next frame instead of batching a second's worth of changes.
    const schedule = () => {
      if (motion.matches) timer = setTimeout(tick, 1000);
      else frame = requestAnimationFrame(tick);
    };
    schedule();
  }
  new IntersectionObserver(entries => {inView = entries[0].isIntersecting; sync();}).observe(panel);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  sync();
})();
