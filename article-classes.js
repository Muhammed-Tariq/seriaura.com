/* One shared, unclipped description card for article badges and list flowers. */
(() => {
  const descriptions={
    Salient:"These articles have well-formed ideas, are what I think you're most likely to enjoy reading, and have meant a lot to me during some period of my life.",
    Considerable:"These articles have well-formed ideas or have meant a lot to me during some period of my life. Some of these are purely anecdotal, so may present less value to you, but they can be great reads if you relate to them.",
    Tangential:"These articles are usually my best attempt to articulate something I've been thinking about for a bit, even if I'm not the best at doing so. Often, it's just me talking about some specific thing I got fleetingly interested in."
  };
  const card=document.createElement('aside');card.className='article-class-card';card.id='article-class-description';card.setAttribute('role','tooltip');
  card.innerHTML='<div class="class-heading"></div><p class="class-description"></p>';
  document.body.append(card);
  let active,owner,timer;
  function close(){clearTimeout(timer);card.classList.remove('is-open');owner?.removeAttribute('aria-describedby');active?.setAttribute('aria-expanded','false');active=owner=null;}
  function deferClose(){clearTimeout(timer);timer=setTimeout(close,160);}
  function open(badge){
    clearTimeout(timer);if(active===badge)return;
    close();active=badge;owner=badge.closest('.post-link')||badge;
    const label=badge.dataset.classDescription,heading=card.querySelector('.class-heading');heading.replaceChildren();
    const icon=badge.querySelector('svg')?.cloneNode(true);if(icon)heading.append(icon);
    heading.append(document.createTextNode(label));card.querySelector('.class-description').textContent=descriptions[label];
    owner.setAttribute('aria-describedby',card.id);if(!badge.closest('.post-link'))badge.setAttribute('aria-expanded','true');
    const b=badge.getBoundingClientRect(),view=window.visualViewport;
    const left=view?.offsetLeft||0,top=view?.offsetTop||0,width=view?.width||innerWidth,height=view?.height||innerHeight;
    card.style.width=`${Math.min(360,width-32)}px`;card.style.maxHeight=`${height-32}px`;
    const c=card.getBoundingClientRect();
    card.style.left=`${Math.max(left+16,Math.min(b.left+b.width/2-c.width/2,left+width-c.width-16))}px`;
    card.style.top=`${Math.max(top+16,b.bottom+12+c.height<=top+height-16?b.bottom+12:b.top-c.height-12)}px`;
    card.classList.add('is-open');
  }
  document.querySelectorAll('.post-importance').forEach(badge=>{
    const label=badge.getAttribute('aria-label')||badge.textContent.trim();if(!descriptions[label])return;
    badge.dataset.classDescription=label;
    const link=badge.closest('.post-link');
    if(!link){badge.tabIndex=0;badge.setAttribute('role','button');badge.setAttribute('aria-label',label+' — about this article class');badge.setAttribute('aria-expanded','false');}
    badge.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open(badge);});
    badge.addEventListener('pointerleave',deferClose);
    (link||badge).addEventListener('focus',()=>{
      // Wait for keyboard focus scrolling, and never put a card over a link
      // between pointer-down and click.
      requestAnimationFrame(()=>{if(document.activeElement===(link||badge)&&(!link||link.matches(':focus-visible')))open(badge);});
    });
    (link||badge).addEventListener('blur',deferClose);
    badge.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(badge);});
    if(!link)badge.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();active===badge?close():open(badge);}});
  });
  card.addEventListener('pointerenter',()=>clearTimeout(timer));card.addEventListener('pointerleave',deferClose);
  document.addEventListener('pointerdown',e=>{if(active&&!active.contains(e.target)&&!card.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();close();}});
  window.addEventListener('scroll',close,{passive:true});window.addEventListener('resize',close);
})();
