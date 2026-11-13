/* Compact publication details. Preferences change presentation, never source dates. */
(() => {
  const key='seriaura-article-age-v3';
  const defaults=Object.freeze({style:'ledger',months:0});
  const styles=Object.freeze([
    {id:'byline',name:'Byline',group:'compact',visibility:'Unboxed',description:'The live age clock and lightly separated publication details, without filled boxes.'},
    {id:'ledger',name:'Ledger',group:'compact',visibility:'Fine rules',description:'A small countdown followed by individual date, reading-time and article-class boxes.'},
    {id:'inset',name:'Inset',group:'compact',visibility:'Soft surface',description:'The same live countdown, paired with softly filled metadata boxes.'}
  ]);
  const validStyle=value=>styles.some(style=>style.id===value);
  function validate(value){return {style:validStyle(value?.style)?value.style:defaults.style,months:0};}
  function read(){try{return validate(JSON.parse(localStorage.getItem(key)));}catch(_){return {...defaults};}}
  let settings=read(),timer;
  // Count completed calendar months in UTC, including end-of-month anniversaries.
  function ageMonths(iso,now=new Date()){
    const date=new Date(iso);
    if(!iso||!Number.isFinite(date.getTime())||!Number.isFinite(now.getTime())||date>now)return null;
    let months=(now.getUTCFullYear()-date.getUTCFullYear())*12+now.getUTCMonth()-date.getUTCMonth();
    const day=Math.min(date.getUTCDate(),new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,0)).getUTCDate());
    const anniversary=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),day,date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds(),date.getUTCMilliseconds()));
    if(now<anniversary)months--;
    return Math.max(0,months);
  }
  function ageAmount(months){const amount=months>=12?Math.floor(months/12):months,unit=months>=12?'year':'month';return amount+' '+unit+(amount===1?'':'s');}
  function elapsed(iso,now=Date.now()){
    const start=Date.parse(iso);if(!Number.isFinite(start)||!Number.isFinite(now)||start>now)return null;
    const seconds=Math.floor((now-start)/1000);
    return {days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};
  }

  const tracked=new Set();let colonFrame=0;
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function syncColons(){
    if(!window.requestAnimationFrame)return;
    const visible=[...tracked].filter(note=>note.isConnected&&!note.classList.contains('age-paused'));
    if(document.hidden||motion?.matches||!visible.length){window.cancelAnimationFrame(colonFrame);colonFrame=0;if(motion?.matches)visible.forEach(note=>note.style.setProperty('--age-colon-opacity','.7'));return;}
    if(!colonFrame)colonFrame=window.requestAnimationFrame(()=>{colonFrame=0;const phase=String((1-Math.cos(Date.now()%1000/1000*Math.PI*2))/2);visible.forEach(note=>note.style.setProperty('--age-colon-opacity',phase));syncColons();});
  }
  motion?.addEventListener('change',syncColons);
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const entry of entries){entry.target.classList.toggle('age-paused',!entry.isIntersecting);if(entry.isIntersecting)updateCounter(entry.target);}syncColons();}):null;
  function updateCounter(note){
    const value=elapsed(note.dataset.published);if(!value)return;
    for(const field of note.querySelectorAll('[data-age-unit]')){
      const unit=field.dataset.ageUnit,text=unit==='days'?String(value.days):String(value[unit]).padStart(2,'0');
      if(field.textContent!==text)field.textContent=text;
    }
    const label=value.days+' '+(value.days===1?'day':'days')+' old';
    note.setAttribute('aria-label','Article age: '+label+', '+value.hours+' hours, '+value.minutes+' minutes and '+value.seconds+' seconds');
    note.style.setProperty('--age-digits',String(value.days).length);
    note.title='Published '+new Date(note.dataset.published).toLocaleString('en-GB',{timeZone:'UTC'})+' UTC; '+ageAmount(ageMonths(note.dataset.published))+' ago.';
  }
  function tick(){
    clearTimeout(timer);if(document.hidden)return;
    for(const note of tracked){if(!note.isConnected){observer?.unobserve(note);tracked.delete(note);}else if(!note.classList.contains('age-paused'))updateCounter(note);}
    if(tracked.size)timer=setTimeout(tick,1000-Date.now()%1000);
  }
  function create(style,months,published=null,{sample=false,compact=false}={}){
    const note=document.createElement('span');note.className='article-age';note.dataset.ageStyle=validStyle(style)?style:defaults.style;
    if(!elapsed(published)){note.textContent=ageAmount(months)+' old';return note;}
    note.dataset.published=published;
    note.innerHTML='<span class="age-day-tile"><b data-age-unit="days"></b></span><span class="age-clock">'+['hours','minutes','seconds'].map(unit=>'<span class="age-clock-unit"><b data-age-unit="'+unit+'"></b></span>').join('')+'</span>';
    updateCounter(note);tracked.add(note);observer?.observe(note);clearTimeout(timer);timer=setTimeout(tick,1000-Date.now()%1000);return note;
  }
  function removeNote(note){if(!note)return;observer?.unobserve(note);tracked.delete(note);note.remove();}
  function formatMeta(meta){
    const date=meta.querySelector('time[datetime]');
    if(date&&Number.isFinite(Date.parse(date.getAttribute('datetime')))){
      date.dataset.fullDate ||= date.textContent;date.title=date.dataset.fullDate;
      date.textContent=new Date(date.getAttribute('datetime')).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    }
    const reading=meta.querySelector('.reading-time');
    if(reading){reading.dataset.fullReading ||= reading.textContent;reading.title=reading.dataset.fullReading;reading.setAttribute('aria-label',reading.dataset.fullReading);reading.textContent=reading.dataset.fullReading.replace(/ min read$/,' min');}
  }
  function renderHome(){
    const choice=settings;
    for(const meta of document.querySelectorAll('.home-writings .blog-meta')){
      removeNote(meta.querySelector('.writing-age'));formatMeta(meta);
      const published=meta.querySelector('time')?.getAttribute('datetime'),months=ageMonths(published);
      meta.classList.add('writing-instrument');meta.dataset.ageStyle=choice.style;
      if(months===null)continue;
      const note=create(choice.style,months,published,{compact:true});note.classList.add('writing-age');meta.append(note);
    }
    window.dispatchEvent(new Event('readingartchange'));
    syncColons();
  }
  function render(){
    renderHome();const header=document.querySelector('.post-header');if(!header)return;
    const meta=header.querySelector('.blog-meta');if(!meta)return;
    let context=header.querySelector('.post-context');
    if(!context){context=document.createElement('div');context.className='post-context';meta.before(context);context.append(meta);}
    removeNote(context.querySelector('.article-age'));formatMeta(meta);
    const choice=settings,published=meta.querySelector('time[datetime]')?.getAttribute('datetime'),months=ageMonths(published);
    context.dataset.ageStyle=choice.style;
    if(months!==null)context.append(create(choice.style,months,published));
    syncColons();
  }
  function set(value){settings=validate(value);let saved=true;try{localStorage.setItem(key,JSON.stringify(settings));}catch(_){saved=false;}render();window.dispatchEvent(new Event('articleagechange'));return saved;}
  window.ArticleAge={styles,defaults,get:()=>({...settings}),set,ageMonths,elapsed,create};
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){settings=read();render();window.dispatchEvent(new Event('articleagechange'));}});
  document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('age-document-hidden',document.hidden);if(!document.hidden){render();tick();}else clearTimeout(timer);syncColons();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
