(() => {
  const frame=document.querySelector('#study-frame'),status=document.querySelector('.study-status');
  let study='options',design='window',entry='brace',size='desktop',opening=null;
  const names={window:'Window',brace:'History clock'};
  function sync(){
    document.querySelectorAll('[data-study]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.study===study)));
    document.querySelectorAll('[data-study-section]').forEach(section=>section.hidden=section.dataset.studySection!==study);
    document.querySelectorAll('[data-design]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.design===design)));
    document.querySelectorAll('[data-entry]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.entry===entry)));
    document.querySelectorAll('[data-opening]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.opening)===opening)));
    document.querySelector('#preview-label').textContent=study==='options'?'Options / '+names[design]:study==='archive'?'Archive / '+names[entry]:'Opening line / '+(opening===null?'Original':String(opening+1).padStart(2,'0'));
    const params=new URLSearchParams({optionsDesign:design,archiveEntry:entry});
    if(study==='options')params.set('showOptions','1');if(opening!==null)params.set('opening',opening);
    document.querySelector('#open-full').href='../?'+params;
  }
  function updatePreview(){
    const win=frame.contentWindow;if(!win.SiteOptions?.open||!win.NowArchive)return;
    win.OpeningLines?.preview(opening);
    win.NowArchive.close();
    if(study==='options'){win.SiteOptions.open();win.scrollTo({top:0,behavior:'instant'});}
    else{
      win.SiteOptions.close();
      const target=win.document.querySelector(study==='archive'?'#now-copy':'#opening-sentence');
      target?.scrollIntoView({block:'center',behavior:'instant'});
    }
    sync();
  }
  function fit(){
    const stage=document.querySelector('.study-stage'),available=stage.clientWidth-(innerWidth<=850?24:36),width=size==='phone'?390:1280,scale=Math.min(1,available/width);
    frame.style.width=width+'px';frame.style.height=(stage.clientHeight-(innerWidth<=850?24:36))/scale+'px';frame.style.transform=`scale(${scale})`;
  }
  new ResizeObserver(fit).observe(document.querySelector('.study-stage'));
  frame.addEventListener('load',()=>{
    const win=frame.contentWindow;updatePreview();
    win.siteReady?.then(()=>{if(frame.contentWindow===win)updatePreview();});
  });
  document.querySelectorAll('[data-study]').forEach(button=>button.addEventListener('click',()=>{study=button.dataset.study;sync();updatePreview();status.textContent=study==='opening'?'Select a sentence to preview it. Your original copy is unchanged.':'Try the current design in the live preview.';}));
  document.querySelectorAll('[data-design]').forEach(button=>button.addEventListener('click',()=>{design=button.dataset.design;updatePreview();status.textContent=names[design]+' preview. Settings are saved on this browser.';}));
  document.querySelectorAll('[data-entry]').forEach(button=>button.addEventListener('click',()=>{entry=button.dataset.entry;updatePreview();status.textContent=names[entry]+' selected. Use the entrance in the preview to open the archive.';}));
  document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{size=button.dataset.size;document.querySelectorAll('[data-size]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));fit();}));
  document.querySelector('#open-archive').addEventListener('click',()=>frame.contentWindow.NowArchive?.open());
  document.querySelector('#original-opening').addEventListener('click',()=>{opening=null;updatePreview();status.textContent='Original sentence restored in the preview.';});
  const choices=document.querySelector('#opening-choices');let index=0;
  for(const group of window.OpeningLines.groups){
    const heading=document.createElement('h3');heading.textContent=group.name;choices.append(heading);
    for(const line of group.lines){
      const number=index++,button=document.createElement('button');button.type='button';button.className='opening-choice';button.dataset.opening=number;button.setAttribute('aria-pressed','false');
      const label=document.createElement('span');label.textContent=String(number+1).padStart(2,'0');const quote=document.createElement('q');quote.textContent=line;button.append(label,quote);choices.append(button);
      button.addEventListener('click',()=>{opening=number;updatePreview();status.textContent=`Previewing sentence ${number+1}. Tell me its number to make it the permanent opening.`;});
    }
  }
  sync();fit();
})();
