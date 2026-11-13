/* Complementary ink masks follow the pointer without doubling the white edge. */
(() => {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const controls=[];
  function mount(host){
    if(host.classList.contains('radial-brand'))return;
    const crop=host.querySelector('.brand-crop')||host;
    const orange=host.querySelector('.logo-orange,.primary-orange');
    const white=host.querySelector('.logo-white,.specimen-mark:not(.primary-orange)');
    if(!orange||!white)return;
    const base=document.createElement('span');base.className='radial-base';
    white.before(base);base.append(white);
    const layer=document.createElement('span');layer.className='radial-ink';layer.setAttribute('aria-hidden','true');
    orange.before(layer);layer.append(orange);host.classList.add('radial-brand');
    let value=0,target=0,frame=0,stamp=0,hovered=false,focused=false,x=.5,y=.5,box;
    function measure(){box=layer.getBoundingClientRect();}
    function paint(){
      if(!box)measure();
      const width=layer.clientWidth||box.width,height=layer.clientHeight||box.height;
      const cx=x*width,cy=y*height;
      const reach=Math.hypot(Math.max(cx,width-cx),Math.max(cy,height-cy));
      const feather=Math.max(24,Math.min(180,width*.4)),radius=value*(reach+feather);
      const start=Math.max(0,radius-feather),centre=`${x*100}% ${y*100}%`;
      layer.style.maskImage=`radial-gradient(circle at ${centre}, #000 ${start}px, transparent ${radius}px)`;
      base.style.maskImage=`radial-gradient(circle at ${centre}, transparent ${start}px, #000 ${radius}px)`;
      layer.style.opacity=value===0?'0':'1';
      base.style.opacity=value===1?'0':'1';
    }
    function tick(now){
      frame=0;const step=Math.min(64,Math.max(0,now-stamp))/(target===1?280:450);stamp=now;
      value+=Math.sign(target-value)*Math.min(Math.abs(target-value),step);paint();
      if(value!==target)frame=requestAnimationFrame(tick);
    }
    function sync(){
      target=hovered||focused?1:0;
      if(motion.matches||document.hidden){cancelAnimationFrame(frame);frame=0;value=target;paint();return;}
      if(!frame&&target!==value){stamp=performance.now();frame=requestAnimationFrame(tick);}
    }
    function origin(event){
      measure();
      x=box.width?Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)):.5;
      y=box.height?Math.max(0,Math.min(1,(event.clientY-box.top)/box.height)):.5;
    }
    crop.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;origin(event);hovered=true;sync();});
    crop.addEventListener('pointermove',event=>{if(hovered){origin(event);paint();}});
    crop.addEventListener('pointerleave',()=>{hovered=false;sync();});
    crop.addEventListener('pointercancel',()=>{hovered=false;sync();});
    host.addEventListener('focus',()=>{focused=host.matches(':focus-visible');if(focused&&!hovered&&value===0){x=y=.5;measure();}sync();});
    host.addEventListener('blur',()=>{focused=false;sync();});
    const resize=new ResizeObserver(()=>{measure();paint();});resize.observe(layer);
    controls.push(sync);paint();
  }
  document.querySelectorAll('.brand,.primary-specimen').forEach(mount);
  motion.addEventListener('change',()=>controls.forEach(sync=>sync()));
  document.addEventListener('visibilitychange',()=>controls.forEach(sync=>sync()));
})();
