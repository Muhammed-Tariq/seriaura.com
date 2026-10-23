/* Page content lives beside each page in content.js. Random choices are made
   once per visit, then reused on resize so pictures don't jump around. */
(() => {
  const content=window.pageContent || {};
  const quotes=document.querySelector('[data-page-quotes]');
  if(quotes && content.quotes?.length){
    quotes.replaceChildren();
    for(const entry of content.quotes){
      if(!entry.text) continue;
      const block=document.createElement('blockquote'),text=document.createElement('p');
      text.textContent=entry.text;block.append(text);
      if(entry.context){const footer=document.createElement('footer');footer.textContent=entry.context;block.append(footer);}
      quotes.append(block);
    }
  }
  const sections=[...document.querySelectorAll('[data-scatter-section]')];
  if(!sections.length) return;
  function shuffle(items){
    const result=[...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  const slots=shuffle(sections),stages=new Map();
  shuffle((content.images || []).filter(item=>item.src)).forEach((item,index)=>{
    const section=slots[index%slots.length];
    if(!stages.has(section)){
      const stage=document.createElement('div');stage.className='scatter-stage';
      section.classList.add('has-scatter');section.append(stage);stages.set(section,{stage,photos:[]});
    }
    const record=stages.get(section),figure=document.createElement('figure'),slot=document.createElement('div'),image=document.createElement('img');
    figure.className='scatter-photo';slot.className='media-slot';
    image.src=item.src;image.alt=item.alt || item.caption || '';image.loading='lazy';image.decoding='async';
    const ratio=Number(item.ratio)>0?Math.max(.6,Math.min(1.8,Number(item.ratio))):1;
    figure.style.setProperty('--photo-ratio',ratio);
    figure.style.setProperty('--photo-angle',`${(Math.random()<.5?-1:1)*(2+Math.random()*4)}deg`);
    slot.append(image);figure.append(slot);
    if(item.caption){const caption=document.createElement('figcaption');caption.textContent=item.caption;figure.append(caption);}
    record.stage.append(figure);
    record.photos.push({figure,x:Math.random(),y:Math.random(),size:.68+Math.random()*.12,ratio});
  });
  // Full-width galleries spread their random positions across the available
  // width, rather than occasionally clustering every photograph on one side.
  stages.forEach(record=>{
    if(!record.stage.closest('.gallery-only'))return;
    const bands=shuffle(record.photos.map((_,index)=>index));
    record.photos.forEach((photo,index)=>{photo.x=(bands[index]+photo.x)/bands.length;});
  });
  function arrange(record){
    const width=record.stage.clientWidth;
    if(!width || width===record.width) return;
    record.width=width;
    let top=20;
    for(const photo of record.photos){
      const size=Math.min(300,width*photo.size),margin=Math.max(14,width*.07);
      photo.figure.style.width=`${size}px`;
      photo.figure.style.left=`${margin+photo.x*Math.max(0,width-size-2*margin)}px`;
      top+=photo.y*32;
      photo.figure.style.top=`${top}px`;
      // Include captions and the rotated corners in the reserved height.
      top+=photo.figure.offsetHeight+size*.12+28;
    }
    record.stage.style.minHeight=`${Math.ceil(top)}px`;
  }
  // Write sizes on the next frame, outside ResizeObserver delivery. This
  // avoids a second layout notification in the same frame in Safari.
  let layoutFrame=0;
  const observer=new ResizeObserver(()=>{
    if(!layoutFrame) layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;stages.forEach(arrange);});
  });
  stages.forEach(record=>{observer.observe(record.stage);arrange(record);});
  document.fonts.ready.then(()=>stages.forEach(record=>{record.width=0;arrange(record);}));
})();
