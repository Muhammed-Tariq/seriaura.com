/* A dated version picker anchored to the paragraph's margin clock. */
(() => {
  const root=new URL('.',document.currentScript.src),entry=document.querySelector('#now-archive-entry'),copy=document.querySelector('#now-copy');
  if(!entry||!copy)return;
  const wrapper=copy.closest('.now-update'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let entries=[],request=null,selected=copy.dataset.month,isOpen=false,menuAnimation,copyAnimation,heightAnimation,revision=0,geometryFrame=0;
  entry.innerHTML=`<svg class="history-brace" aria-hidden="true" data-glow-outline><path/></svg><button type="button" class="history-trigger" aria-label="Past updates" title="Past updates" aria-haspopup="menu" aria-expanded="false" aria-controls="now-archive"><svg class="history-clock" viewBox="0 0 24 24" aria-hidden="true" data-glow-outline><path class="history-orbit" d="M3.5 10a8.5 8.5 0 1 1 .5 6M3.5 4.5V10H9"/><path class="history-hour" d="M12 12l3 2"/><path class="history-minute" d="M12 7v5"/></svg></button>`;
  entry.hidden=false;
  const trigger=entry.querySelector('button'),brace=entry.querySelector('.history-brace'),hand=entry.querySelector('.history-minute'),hour=entry.querySelector('.history-hour');
  const menu=document.createElement('div');menu.id='now-archive';menu.className='history-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Past updates');
  menu.innerHTML='<span class="history-connector" aria-hidden="true"></span><div class="history-menu-title">Past updates</div><p class="history-menu-status" role="status">Loading…</p><div class="history-versions" role="group" aria-label="Saved months"></div><button type="button" class="history-retry" hidden>Try again</button>';
  const revealFrame=document.createElement('div');revealFrame.className='history-reveal';revealFrame.hidden=true;revealFrame.append(menu);document.body.append(revealFrame);
  const status=menu.querySelector('.history-menu-status'),list=menu.querySelector('.history-versions');
  const live=document.createElement('span');live.className='history-announcement';live.setAttribute('role','status');document.body.append(live);
  const format=key=>new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));
  trigger.setAttribute('aria-label',`Past updates, ${format(selected)} selected`);
  const refreshMask=()=>window.dispatchEvent(new Event('readingartchange'));
  function positionMenu(){
    if(!isOpen)return;
    const anchor=trigger.getBoundingClientRect(),box=menu.getBoundingClientRect(),gap=12,pad=10;
    const anchorTop=anchor.top+scrollY;
    let left=anchor.right+gap,top=anchorTop+(anchor.height-box.height)/2,placement='right';
    if(left+box.width>innerWidth-pad){
      placement='below';left=Math.max(pad,Math.min(innerWidth-box.width-pad,anchor.right-box.width));top=anchorTop+anchor.height+gap;
    }
    top=Math.max(pad,top);
    const frameLeft=Math.max(0,left-12),frameTop=Math.max(0,top-12);
    Object.assign(revealFrame.style,{left:frameLeft+'px',top:frameTop+'px',width:Math.min(innerWidth,left+box.width+12)-frameLeft+'px',height:top+box.height+12-frameTop+'px'});
    menu.dataset.placement=placement;menu.style.left=left-frameLeft+'px';menu.style.top=top-frameTop+'px';
    menu.style.setProperty('--history-tip-x',Math.max(16,Math.min(box.width-16,anchor.left+anchor.width/2-left))+'px');
    menu.style.setProperty('--history-tip-y',Math.max(16,Math.min(box.height-16,anchorTop+anchor.height/2-top))+'px');
  }
  function geometry(){
    geometryFrame=0;
    const rect=copy.getBoundingClientRect(),height=Math.max(32,rect.height),space=Math.min(52,Math.max(20,document.documentElement.clientWidth-rect.right-2)),small=space<40;
    entry.style.width=space+'px';entry.style.right=-space+'px';entry.dataset.narrow=String(small);
    const w=small?9:15,m=height/2,r=small?5:9;
    brace.setAttribute('viewBox',`0 0 ${w} ${height}`);brace.style.width=w+'px';brace.style.height=height+'px';
    // Curves keep their pixel radius as the paragraph grows; the stems alone stretch.
    const d=small?`M1 1Q${r} 1 ${r} 9V${m-18}Q${r} ${m-13} ${w-1} ${m-13}M${w-1} ${m+13}Q${r} ${m+13} ${r} ${m+18}V${height-9}Q${r} ${height-1} 1 ${height-1}`:`M1 1Q${r} 1 ${r} 10V${m-12}Q${r} ${m} ${w-1} ${m}Q${r} ${m} ${r} ${m+12}V${height-10}Q${r} ${height-1} 1 ${height-1}`;
    if(brace.firstElementChild.getAttribute('d')!==d){brace.firstElementChild.setAttribute('d',d);refreshMask();}
    positionMenu();
  }
  function scheduleGeometry(){if(!geometryFrame)geometryFrame=requestAnimationFrame(geometry);}
  let minuteAngle=0,hourAngle=0,handAnimation,hourAnimation,maskFrame=0;
  function protectMovingHands(){
    cancelAnimationFrame(maskFrame);
    const draw=()=>{refreshMask();if([handAnimation,hourAnimation].some(a=>a?.playState==='running'))maskFrame=requestAnimationFrame(draw);};draw();
  }
  function turnHands(){
    handAnimation?.cancel();hourAnimation?.cancel();
    const before=minuteAngle,oldHour=hourAngle;minuteAngle+=720;hourAngle+=360;
    hand.style.transform='rotate('+minuteAngle+'deg)';hour.style.transform='rotate('+hourAngle+'deg)';
    if(motion.matches){refreshMask();return;}
    const frames=(a,b)=>[{transform:'rotate('+a+'deg)'},{transform:'rotate('+b+'deg)'}];
    const timing={duration:650,easing:'cubic-bezier(.4,0,.15,1)'};
    handAnimation=hand.animate(frames(before,minuteAngle),timing);hourAnimation=hour.animate(frames(oldHour,hourAngle),timing);protectMovingHands();
  }
  function render(){
    list.replaceChildren(...entries.map((item,index)=>{
      const button=document.createElement('button');button.type='button';button.className='history-version';button.dataset.month=item.month;button.setAttribute('role','menuitemradio');button.setAttribute('aria-checked',String(item.month===selected));button.tabIndex=item.month===selected?0:-1;
      const label=document.createElement('span');label.textContent=format(item.month);button.append(label);
      if(index===0){const note=document.createElement('small');note.textContent='Latest';button.append(note);}
      button.insertAdjacentHTML('beforeend','<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>');
      button.addEventListener('click',()=>choose(item));return button;
    }));
  }
  async function load(){
    if(entries.length)return;if(request)return request;
    request=(async()=>{
      status.hidden=false;status.textContent='Loading…';menu.querySelector('.history-retry').hidden=true;
      try{
        const response=await fetch(new URL('now-archive.json',root));if(!response.ok)throw new Error();
        entries=(await response.json()).filter(item=>/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)&&typeof item.html==='string').sort((a,b)=>b.month.localeCompare(a.month));
        status.hidden=entries.length>0;status.textContent=entries.length?'':'No saved updates yet.';render();
      }catch(_){status.textContent='Couldn’t load updates.';menu.querySelector('.history-retry').hidden=false;}
      finally{request=null;}
    })();return request;
  }
  function reveal(show){
    const interrupted=menuAnimation?.playState==='running'?getComputedStyle(revealFrame).maskPosition:null;
    menuAnimation?.cancel();
    // Include the connector outside the grid in the mask's painting area.
    const span=revealFrame.offsetWidth,visible='0px 0px',hidden=`${-span*1.5}px 0px`;
    Object.assign(revealFrame.style,{maskImage:'linear-gradient(to right,#000 40%,transparent 60%)',maskSize:`${span*2.5}px 100%`,maskRepeat:'no-repeat'});
    menuAnimation=revealFrame.animate([{maskPosition:interrupted||(show?hidden:visible)},{maskPosition:show?visible:hidden}],{duration:motion.matches?0:300,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    const current=menuAnimation;
    current.finished.then(()=>{
      if(menuAnimation!==current)return;
      if(!show){menu.hidden=true;revealFrame.hidden=true;}
      current.cancel();menuAnimation=null;
      for(const property of ['maskImage','maskSize','maskRepeat'])revealFrame.style[property]='';
    }).catch(()=>{});
  }
  async function open(){
    if(isOpen){close();return;}
    isOpen=true;revealFrame.hidden=false;menu.hidden=false;trigger.setAttribute('aria-expanded','true');positionMenu();reveal(true);
    await load();if(!isOpen)return;positionMenu();
    (list.querySelector('[aria-checked=true]')||list.querySelector('button')||menu.querySelector('.history-retry:not([hidden])'))?.focus({preventScroll:true});
  }
  function close(restore=true){
    if(!isOpen)return;isOpen=false;trigger.setAttribute('aria-expanded','false');reveal(false);
    if(restore)trigger.focus({preventScroll:true});
  }
  async function choose(item){
    if(item.month===selected)return;turnHands();
    const version=++revision,hadFocus=menu.contains(document.activeElement);selected=item.month;render();
    if(hadFocus)list.querySelector('[aria-checked=true]')?.focus({preventScroll:true});
    copyAnimation?.cancel();heightAnimation?.cancel();copy.style.height='';
    const oldHeight=copy.getBoundingClientRect().height;
    copyAnimation=copy.animate([{opacity:1},{opacity:0}],{duration:motion.matches?0:110,easing:'ease-out',fill:'forwards'});
    await copyAnimation.finished.catch(()=>{});if(version!==revision)return;
    copy.innerHTML=item.html;copy.dataset.month=item.month;trigger.setAttribute('aria-label',`Past updates, ${format(item.month)} selected`);trigger.title=`Past updates · ${format(item.month)}`;
    const newHeight=copy.getBoundingClientRect().height;copyAnimation.cancel();
    heightAnimation=copy.animate([{height:oldHeight+'px'},{height:newHeight+'px'}],{duration:motion.matches?0:260,easing:'cubic-bezier(.22,.7,.2,1)'});
    copyAnimation=copy.animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:motion.matches?0:220,easing:'ease-out'});
    live.textContent=`Showing ${format(item.month)} update.`;scheduleGeometry();refreshMask();
    await Promise.allSettled([heightAnimation.finished,copyAnimation.finished]);if(version===revision){scheduleGeometry();refreshMask();}
  }
  trigger.addEventListener('click',open);menu.querySelector('.history-retry').addEventListener('click',async()=>{await load();positionMenu();});
  menu.addEventListener('keydown',event=>{
    const buttons=[...list.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    const next=event.key==='ArrowDown'?(index+1)%buttons.length:event.key==='ArrowUp'?(index+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
    if(next!==null&&buttons.length){event.preventDefault();buttons.forEach((button,i)=>button.tabIndex=i===next?0:-1);buttons[next].focus();}
  });
  document.addEventListener('keydown',event=>{if(isOpen&&event.key==='Escape'){event.preventDefault();close();}});
  window.addEventListener('resize',scheduleGeometry);
  new ResizeObserver(scheduleGeometry).observe(copy);document.fonts.ready.then(scheduleGeometry);geometry();
  window.NowArchive={open,close,selected:()=>selected};
})();
