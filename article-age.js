/* Shared article-age notices. Change defaults here to set the public appearance.
   The design selector saves a device-local override, never publication dates. */
(() => {
  const key='seriaura-article-age-v1';
  const defaults=Object.freeze({style:'elapsed-orbit',months:6});
  const styles=Object.freeze([
    {id:'silver',name:'Silver line',visibility:'Quiet',description:'A fine rule and soft silver lettering. Almost part of the date.'},
    {id:'sage',name:'Sage note',visibility:'Subtle',description:'A muted green wash, with the calm of a pencilled margin note.'},
    {id:'blue',name:'Blue hour',visibility:'Balanced',description:'Cool blue, a crisp outline, and a little breathing room.'},
    {id:'amber',name:'Amber edge',visibility:'Distinct',description:'A warm orange edge that belongs to the rest of the site.'},
    {id:'paper',name:'Archive slip',visibility:'Prominent',description:'Warm paper against charcoal. A small keepsake from the archive.'},
    {id:'signal',name:'Golden hour',visibility:'Bold',description:'A clear golden highlight. The most visible of the original six.'},
    {id:'daymark',name:'Daymark',group:'countdown',visibility:'Subtle motion',description:'A small sage day counter, framed by the backwards-travelling light from completed countdowns.'},
    {id:'elapsed',name:'Elapsed',group:'countdown',visibility:'Live clock',description:'Days, hours, minutes and seconds. The countdown’s red orbit, counting up from publication.'},
    {id:'ember',name:'Ember',group:'countdown',visibility:'Warm glow',description:'An amber day counter with a slow, breathing halo. A softer companion to the site’s orange accents.'},
    {id:'whisper',name:'Quiet clock',group:'countdown',visibility:'Reveal on demand',description:'The article’s age and days at a glance. Hover, focus or tap to reveal the precise elapsed time.'},
    {id:'elapsed-line',name:'Elapsed / Hairline',group:'refined',visibility:'Minimal',description:'One fine amber rule. The age leads, with a small, unboxed clock beneath it.'},
    {id:'elapsed-wash',name:'Elapsed / Soft wash',group:'refined',visibility:'Warm & quiet',description:'A faint wash of orange, rounded corners and a single compact line of elapsed time.'},
    {id:'elapsed-orbit',name:'Elapsed / Small orbit',group:'refined',visibility:'Selected default',description:'A small orange day counter with slow travelling light, set on a soft amber background.'}
  ]);
  const validStyle=value=>styles.some(style=>style.id===value);
  function validate(value){return {style:validStyle(value?.style)?value.style:defaults.style,months:[1,6,12].includes(value?.months)?value.months:defaults.months};}
  function read(){try{return validate(JSON.parse(localStorage.getItem(key)));}catch(_){return {...defaults};}}
  let settings=read(),preview=null;
  const params=new URLSearchParams(location.search);
  if(validStyle(params.get('ageStyle')))preview=validate({style:params.get('ageStyle'),months:Number(params.get('ageMonths'))});
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
  const tracked=new Set();let timer;
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const entry of entries){entry.target.classList.toggle('age-paused',!entry.isIntersecting);if(entry.isIntersecting)updateCounter(entry.target);}}):null;
  function updateCounter(note){
    const value=elapsed(note.dataset.published);if(!value)return;
    for(const field of note.querySelectorAll('[data-age-unit]')){
      const unit=field.dataset.ageUnit,text=unit==='days'?String(value[unit]):String(value[unit]).padStart(2,'0');
      if(field.textContent!==text)field.textContent=text;
      if(unit==='days')field.style.setProperty('--age-digits',text.length);
    }
    for(const label of note.querySelectorAll('[data-day-label]'))label.textContent=value.days===1?'day':'days';
    const amount=ageAmount(ageMonths(note.dataset.published));
    for(const label of note.querySelectorAll('[data-age-amount]'))if(label.textContent!==amount)label.textContent=amount;
  }
  function tick(){
    clearTimeout(timer);if(document.hidden)return;
    for(const note of tracked){if(!note.isConnected){observer?.unobserve(note);tracked.delete(note);}else if(!note.classList.contains('age-paused'))updateCounter(note);}
    if(tracked.size)timer=setTimeout(tick,1000);
  }
  const clock=()=>'<span class="age-clock">'+['hours','minutes','seconds'].map(unit=>'<span><b data-age-unit="'+unit+'">00</b><small>'+unit+'</small></span>').join('')+'</span>';
  const compactClock=includeDays=>'<span class="age-compact-clock">'+(includeDays?['days','hours','minutes','seconds']:['hours','minutes','seconds']).map(unit=>'<span><b data-age-unit="'+unit+'">00</b><abbr title="'+unit+'">'+{days:'d',hours:'h',minutes:'m',seconds:'s'}[unit]+'</abbr></span>').join('')+'</span>';
  function create(style,months,published=null,{sample=false}={}){
    const note=document.createElement('aside');note.className='article-age';note.dataset.ageStyle=style;note.setAttribute('aria-label','Article age');
    const group=styles.find(item=>item.id===style)?.group;
    if(['countdown','refined'].includes(group)&&elapsed(published)){
      note.classList.add('age-countdown');note.dataset.published=published;
      const days='<b data-age-unit="days">0</b>',label='<span data-day-label>days</span>';
      const headline='<span class="age-counter-title age-summary">This article is <strong data-age-amount></strong> old.</span>';
      if(group==='refined'){
        note.classList.add('age-refined');
        note.innerHTML=(style==='elapsed-orbit'?'<span class="age-day-frame"><span class="age-day-tile">'+days+'<small>'+label+'</small></span></span>':'')+'<span class="age-counter-copy">'+headline+compactClock(style!=='elapsed-orbit')+'</span>';
      }else if(style==='whisper'){
        const summary='<span class="age-whisper-copy">'+headline+'<span class="age-whisper-title">'+days+' '+label+' since publication</span></span><span class="age-expand" aria-hidden="true">+</span>';
        note.innerHTML=sample?'<span class="age-whisper-sample">'+summary+'</span>':'<details class="age-details"><summary>'+summary+'</summary><span class="age-exact">'+clock()+'<span class="age-caption">…and counting.</span></span></details>';
      }else{
        note.innerHTML='<span class="age-day-frame"><span class="age-day-tile">'+days+'<small>'+label+'</small></span></span><span class="age-counter-copy">'+headline+(style==='elapsed'?clock()+'<span class="age-caption">Since publication</span>':'<span class="age-date"></span>')+'</span>';
        const date=note.querySelector('.age-date');if(date)date.textContent=new Date(published).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
      }
      const details=note.querySelector('details');
      if(details){
        let pinned=false,hovered=false;
        const sync=()=>{details.open=pinned||hovered||details.contains(document.activeElement);};
        details.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;sync();}});
        details.addEventListener('pointerleave',()=>{hovered=false;sync();});
        details.addEventListener('focusin',sync);details.addEventListener('focusout',()=>setTimeout(sync,0));
        details.querySelector('summary').addEventListener('click',event=>{event.preventDefault();pinned=!pinned;details.open=pinned;});
      }
      updateCounter(note);tracked.add(note);observer?.observe(note);clearTimeout(timer);timer=setTimeout(tick,1000);return note;
    }
    note.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"/><path d="M12 7v5l3 2"/></svg><span>This article is <strong></strong> old.</span>';
    note.querySelector('strong').textContent=ageAmount(months);return note;
  }
  function render(){
    const header=document.querySelector('.post-header');if(!header)return;
    const old=header.querySelector('.article-age');if(old){observer?.unobserve(old);tracked.delete(old);old.remove();}
    const published=header.querySelector('time[datetime]')?.getAttribute('datetime'),months=ageMonths(published);
    const choice=preview||settings;
    if(months===null||months<choice.months)return;
    header.prepend(create(choice.style,months,published));
  }
  function set(value){settings=validate(value);preview=null;let saved=true;try{localStorage.setItem(key,JSON.stringify(settings));}catch(_){saved=false;}render();window.dispatchEvent(new Event('articleagechange'));return saved;}
  window.ArticleAge={styles,defaults,get:()=>({...settings}),set,ageMonths,elapsed,create,preview:value=>{preview=value?validate(value):null;render();}};
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){settings=read();render();window.dispatchEvent(new Event('articleagechange'));}});
  document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('age-document-hidden',document.hidden);if(!document.hidden){render();tick();}else clearTimeout(timer);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
