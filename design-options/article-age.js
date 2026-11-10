(() => {
  const api=window.ArticleAge,frame=document.querySelector('#article-preview'),status=document.querySelector('#status');
  const savedStyle=api.get().style,focusRefined=new URLSearchParams(location.search).get('studies')==='elapsed';
  let selected=focusRefined&&!savedStyle.startsWith('elapsed-')?api.defaults.style:savedStyle,months=api.get().months,size='desktop';
  const sampleDate=new Date(Date.now()-(307*86400+12*3600+34*60+56)*1000).toISOString();
  const threshold=document.querySelector('#threshold'),article=document.querySelector('#article');threshold.value=months;
  for(const [index,style] of api.styles.entries()){
    const button=document.createElement('button');button.type='button';button.className='choice';button.dataset.style=style.id;
    button.innerHTML=`<span class="choice-heading"><span class="choice-number">${String(style.group==='refined'?index-9:style.group==='countdown'?index-5:index+1).padStart(2,'0')}</span><span class="visibility">${style.visibility}</span></span><h2>${style.name}</h2><div class="sample"></div><p class="description">${style.description}</p><span class="selection"></span>`;
    button.querySelector('.sample').append(api.create(style.id,10,sampleDate,{sample:true}));
    button.addEventListener('click',()=>{selected=style.id;sync();preview();});document.querySelector(style.group==='refined'?'#refined-choices':style.group==='countdown'?'#countdown-choices':'#choices').append(button);
  }
  function url(){return '../writings/'+article.value+'/?'+new URLSearchParams({ageStyle:selected,ageMonths:months});}
  function sync(){
    const style=api.styles.find(item=>item.id===selected);
    document.querySelectorAll('[data-style]').forEach(button=>{const active=button.dataset.style===selected;button.setAttribute('aria-pressed',String(active));button.querySelector('.selection').textContent=active?'Selected for preview ✓':'Preview this style';});
    document.querySelector('#preview-title').textContent=style.name;document.querySelector('#apply').textContent='Use '+style.name;document.querySelector('#open-article').href=url();
    if(style.group!=='refined')document.querySelector('.original-studies').open=true;
  }
  function describeAge(){
    const date=frame.contentDocument?.querySelector('.post-header time')?.getAttribute('datetime'),age=api.ageMonths(date);
    document.querySelector('#age-note').textContent=age===null?'Loading the article’s publication date…':age<months?'This article is younger than the selected threshold, so its notice is hidden. Choose an older article or a shorter threshold.':'The preview uses the article’s actual age: '+age+' completed months.';
  }
  function preview(){frame.contentWindow.ArticleAge?.preview({style:selected,months});describeAge();status.textContent='Previewing only. Choose “Use” to save this style and age threshold on this browser.';}
  function fit(){const stage=document.querySelector('.stage'),padding=innerWidth<=600?16:32,available=stage.clientWidth-padding,width=size==='phone'?390:1440,scale=Math.min(1,available/width);frame.style.width=width+'px';frame.style.height=(stage.clientHeight-padding)/scale+'px';frame.style.transform=`scale(${scale})`;}
  new ResizeObserver(fit).observe(document.querySelector('.stage'));
  frame.addEventListener('load',()=>{frame.contentWindow.ArticleAge?.preview({style:selected,months});describeAge();});
  article.addEventListener('change',()=>{sync();frame.src=url();});
  threshold.addEventListener('change',()=>{months=Number(threshold.value);sync();preview();});
  document.querySelector('#apply').addEventListener('click',()=>{const saved=api.set({style:selected,months});status.textContent=saved?'Saved on this browser. This style now appears on all articles old enough to meet your chosen threshold.':'Applied for this visit. Browser storage is unavailable, so this choice cannot be remembered.';});
  document.querySelector('#reset').addEventListener('click',()=>{selected=api.defaults.style;months=api.defaults.months;threshold.value=months;sync();preview();const saved=api.set(api.defaults);status.textContent=saved?'Reset and saved: Small orbit, appearing at six months.':'Reset for this visit. Browser storage is unavailable.';});
  document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{size=button.dataset.size;document.querySelectorAll('[data-size]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.size===size)));fit();}));
  sync();frame.src=url();fit();
})();
