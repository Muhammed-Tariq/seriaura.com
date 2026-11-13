/* The race film's letter reels, alternating with the live timer in the same band. */
(() => {
  const duration=20000;
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function frameAt(time){
    const t=((time%duration)+duration)%duration;
    const wipe=ease((t-3300)/400);
    const logo=t<3700?1:0;
    const timer=1-ease((t-19400)/600);
    return {time:t,logo,timer,wipe,flap:ease((t-1350)/650),reels:Array.from({length:8},(_,i)=>ease((t-i*85)/(500+i*20)))};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={frameAt};
  if(typeof document==='undefined')return;
  const root=new URL('.',document.currentScript.src);
  window.BrightonShowcase={mount(row,event){
    if(event.id!=='brighton')return null;
    const link=row.querySelector('.event-logo'),motion=matchMedia('(prefers-reduced-motion: reduce)');
    const mark=document.createElement('span');mark.className='brighton-identity';mark.setAttribute('aria-hidden','true');
    const sprite=new URL('assets/events/brighton-reels.svg',root).href,letters='brighton';
    const tile=letter=>`<svg viewBox="0 0 97.689 121.245" aria-hidden="true">${letter?`<use href="${sprite}#${letter}"/>`:''}</svg>`;
    mark.innerHTML='<span class="brighton-letters">'+[...letters].map((letter,i)=>{
      const sequence=[null,letters[(i+6)%8],letters[(i+1)%8],letter];
      if(i%2)sequence.reverse();
      return '<span class="brighton-slot"><span class="brighton-reel">'+sequence.map(tile).join('')+'</span></span>';
    }).join('')+'</span><span class="brighton-flap"><svg viewBox="0 0 283 46.34"><use href="'+sprite+'#marathon"/></svg></span>';
    link.append(mark);
    const reels=[...mark.querySelectorAll('.brighton-reel')],flap=mark.querySelector('.brighton-flap');
    let elapsed=0,stamp=0,frame=0,visible=false,paused=false,focused=false,destroyed=false,lastPaint='';
    function paint(){
      const state=frameAt(elapsed);
      // Settled logo/timer phases do not need DOM writes on every frame.
      const visual=JSON.stringify([state.logo,state.timer,state.wipe,state.flap,state.reels]);
      if(visual===lastPaint)return;lastPaint=visual;
      row.style.setProperty('--brighton-logo-opacity',state.logo);
      row.style.setProperty('--brighton-timer-opacity',state.timer);
      // A soft boundary moves left to right; only the replay fades uniformly.
      const edge=112-state.wipe*124;
      row.style.setProperty('--brighton-logo-mask',`linear-gradient(to left,#000 ${edge-12}%,transparent ${edge+12}%)`);
      row.style.setProperty('--brighton-timer-mask',`linear-gradient(to left,transparent ${edge-12}%,#000 ${edge+12}%)`);
      row.dataset.brightonView=state.wipe<.5?'logo':'timer';
      reels.forEach((reel,i)=>{const progress=i%2?1-state.reels[i]:state.reels[i];reel.style.transform=`translateY(${-300*progress}%)`;});
      flap.style.transform=`perspective(700px) rotateX(${-100*(1-state.flap)}deg)`;
      flap.style.opacity=String(state.flap);
    }
    function tick(now){
      frame=0;if(destroyed)return;
      const delta=Math.min(100,Math.max(0,now-stamp));stamp=now;
      elapsed=focused?Math.min(2200,elapsed+delta):elapsed+delta;paint();
      if(!focused||elapsed<2200)frame=requestAnimationFrame(tick);
    }
    function sync(){
      cancelAnimationFrame(frame);frame=0;
      if(destroyed)return;
      row.classList.toggle('brighton-showcase',!motion.matches);
      paint();
      if(visible&&!document.hidden&&!motion.matches&&(!paused||focused)&&(!focused||elapsed<2200)){stamp=performance.now();frame=requestAnimationFrame(tick);}
    }
    function onFocus(){const state=frameAt(elapsed);elapsed=state.wipe>0?0:state.time;focused=true;sync();}
    function onBlur(){focused=false;sync();}
    link.addEventListener('focus',onFocus);link.addEventListener('blur',onBlur);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
    motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    observer.observe(row);sync();
    return {setPaused(value){paused=value;sync();},destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);link.removeEventListener('focus',onFocus);link.removeEventListener('blur',onBlur);mark.remove();row.classList.remove('brighton-showcase');delete row.dataset.brightonView;}};
  }};
})();
