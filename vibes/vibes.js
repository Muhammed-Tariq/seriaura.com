/* Shuffle clusters once per visit; resizing keeps related images together. */
(() => {
  const gallery=document.querySelector('.vibes-gallery');
  if(!gallery)return;
  const clusters=[],groups=new Map();
  for(const item of window.pageContent?.images||[]){
    if(item.group&&groups.has(item.group)){groups.get(item.group).push(item);continue;}
    const cluster=[item];clusters.push(cluster);
    if(item.group)groups.set(item.group,cluster);
  }
  for(let i=clusters.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[clusters[i],clusters[j]]=[clusters[j],clusters[i]];
  }
  let imageIndex=0;
  const units=clusters.map(items=>{
    if(items.length>1)items.sort((a,b)=>a.src.localeCompare(b.src));
    const photos=items.map(item=>{
      const figure=document.createElement('figure'),slot=document.createElement('div'),image=document.createElement('img');
      const angle=(Math.random()<.5?-1:1)*(1.2+Math.random()*3.2);
      const ratio=item.width/item.height;
      figure.className='vibes-photo';slot.className='media-slot';
      if(item.group)figure.dataset.group=item.group;
      figure.style.setProperty('--photo-angle',angle+'deg');
      figure.style.setProperty('--photo-ratio',ratio);
      image.src=item.src;image.alt=item.alt||'';image.width=item.width;image.height=item.height;
      image.loading=imageIndex++<6?'eager':'lazy';image.decoding='async';image.draggable=false;
      slot.append(image);figure.append(slot);gallery.append(figure);
      return {figure,ratio,sourceWidth:item.width,maxDisplayWidth:item.maxDisplayWidth??Infinity,angle:Math.abs(angle)*Math.PI/180,size:Math.random(),stagger:Math.random()};
    });
    return {photos,x:Math.random(),y:Math.random(),gap:Math.random(),candidates:Array.from({length:24},()=>Math.random())};
  });
  let previousWidth=0,previousDensity=0,frame=0;
  function arrange(){
    frame=0;const width=gallery.clientWidth;
    // Reserve source pixels for crisp rendering on high-density displays too.
    const density=Math.max(1.5,Math.min(2,devicePixelRatio||1));
    if(!width||(width===previousWidth&&density===previousDensity))return;
    previousWidth=width;previousDensity=density;
    const narrow=width<600,placed=[];
    for(const unit of units){
      const gutter=8,gap=(narrow?18:12)+unit.gap*(narrow?16:20),clusterGap=18;
      const sideBySide=width>=700&&unit.photos.length>1&&Math.max(...unit.photos.map(p=>p.ratio))/Math.min(...unit.photos.map(p=>p.ratio))<1.5;
      const lane=sideBySide?(width-gutter*2-clusterGap*(unit.photos.length-1))/unit.photos.length:width-gutter*2;
      let boundsWidth=0,boundsHeight=0;
      const pieces=unit.photos.map(photo=>{
        const cos=Math.cos(photo.angle),sin=Math.sin(photo.angle);
        const desired=narrow?(width-16)*(.82+photo.size*.16):Math.min(330,width*.25)*(.67+photo.size*.9)*(photo.ratio>2?1.7:1);
        const imageWidth=Math.min(Math.min(lane,desired)/(cos+sin/photo.ratio),photo.sourceWidth/density,photo.maxDisplayWidth);
        const imageHeight=imageWidth/photo.ratio;
        const w=imageWidth*cos+imageHeight*sin,h=imageHeight*cos+imageWidth*sin;
        const x=sideBySide?boundsWidth:photo.stagger*Math.min(16,Math.max(0,lane-w));
        const y=sideBySide?photo.stagger*14:boundsHeight;
        boundsWidth=Math.max(boundsWidth,x+w+(sideBySide?clusterGap:0));
        boundsHeight=Math.max(boundsHeight,y+h+(sideBySide?0:clusterGap));
        return {photo,imageWidth,imageHeight,w,h,x,y};
      });
      if(sideBySide)boundsWidth-=clusterGap;else boundsHeight-=clusterGap;
      const maxLeft=width-gutter-boundsWidth;
      const positions=[gutter,maxLeft,...unit.candidates.map(x=>gutter+x*(maxLeft-gutter)),...placed.flatMap(p=>[p.right+gap,p.left-gap-boundsWidth])].filter(x=>x>=gutter&&x<=maxLeft);
      const options=positions.map(left=>{
        const x=(left-gutter)/Math.max(1,maxLeft-gutter);
        let top=12+unit.y*(narrow?12:22),blocked;
        do {
          blocked=placed.find(p=>left<p.right+gap&&left+boundsWidth>p.left-gap&&top<p.bottom+gap&&top+boundsHeight>p.top-gap);
          if(blocked)top=blocked.bottom+gap;
        } while(blocked);
        return {left,top,score:top+Math.abs(x-unit.x)*12};
      });
      const {left,top}=options.reduce((a,b)=>a.score<b.score?a:b);
      for(const {photo,imageWidth,imageHeight,w,h,x,y} of pieces){
        photo.figure.style.width=imageWidth+'px';
        photo.figure.style.left=(left+x+(w-imageWidth)/2)+'px';
        photo.figure.style.top=(top+y+(h-imageHeight)/2)+'px';
      }
      placed.push({left,top,right:left+boundsWidth,bottom:top+boundsHeight});
    }
    gallery.style.height=Math.ceil(Math.max(0,...placed.map(p=>p.bottom))+32)+'px';
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(arrange);};
  new ResizeObserver(schedule).observe(gallery);
  window.addEventListener('resize',schedule);
  arrange();
})();
