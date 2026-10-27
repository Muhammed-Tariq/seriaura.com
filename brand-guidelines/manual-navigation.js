/* Section tracking; menu, focus and flower behaviour come from sidebar.js. */
(() => {
  const sidebar=document.querySelector('[data-manual-navigation]');
  if(!sidebar)return;
  const links=[...sidebar.querySelectorAll('nav a')],sections=links.map(link=>document.querySelector(link.hash));
  const compact=matchMedia('(max-width:1100px)');
  const slot=document.querySelector('.manual-navigation-slot');
  let frame=0;
  function update(){
    frame=0;let selected=0;
    // Keep the same column when footer mode switches from sticky to fixed,
    // including the centred margin on screens wider than the manual.
    const bounds=slot.getBoundingClientRect();
    slot.style.setProperty('--manual-rail-left',bounds.left+'px');
    slot.style.setProperty('--manual-rail-width',bounds.width+'px');
    const threshold=Math.max(150,innerHeight*.25,compact.matches?sidebar.getBoundingClientRect().bottom+64:0);
    sections.forEach((section,i)=>{if(section.getBoundingClientRect().top<=threshold)selected=i;});
    if(scrollY>0&&scrollY+innerHeight>=document.documentElement.scrollHeight-2)selected=sections.length-1;
    links.forEach((link,i)=>{
      if(i===selected){if(!link.hasAttribute('aria-current')){link.setAttribute('aria-current','location');window.siteSidebar?.spinFlower(link);}}
      else link.removeAttribute('aria-current');
    });
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);window.addEventListener('hashchange',schedule);
  new ResizeObserver(schedule).observe(document.querySelector('.manual-content'));
  new ResizeObserver(()=>{
    slot.style.setProperty('--manual-nav-height',sidebar.offsetHeight+'px');
    schedule();
  }).observe(sidebar);
  slot.style.setProperty('--manual-nav-height',sidebar.offsetHeight+'px');
  update();
})();
