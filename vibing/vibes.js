/* Shuffle once on each visit; resizing reflows the same random composition. */
(() => {
  const gallery=document.querySelector('.vibes-gallery');
  if(!gallery)return;
  const images=[...(window.pageContent?.images||[])];
  for(let i=images.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[images[i],images[j]]=[images[j],images[i]];
  }
  const photos=images.map((item,index)=>{
    const figure=document.createElement('figure'),slot=document.createElement('div'),image=document.createElement('img');
    const angle=(Math.random()<.5?-1:1)*(1.2+Math.random()*3.2);
    const ratio=item.width/item.height;
    figure.className='vibes-photo';slot.className='media-slot';
    figure.style.setProperty('--photo-angle',angle+'deg');
    figure.style.setProperty('--photo-ratio',ratio);
    image.src=item.src;image.alt=item.alt||'';image.width=item.width;image.height=item.height;
    image.loading=index<6?'eager':'lazy';image.decoding='async';image.draggable=false;
    slot.append(image);figure.append(slot);gallery.append(figure);
    return {figure,ratio,angle:Math.abs(angle)*Math.PI/180,x:Math.random(),y:Math.random(),size:Math.random(),gap:Math.random(),candidates:Array.from({length:24},()=>Math.random())};
  });
  let previousWidth=0,frame=0;
  function arrange(){
    frame=0;const width=gallery.clientWidth;
    if(!width||width===previousWidth)return;previousWidth=width;
    const narrow=width<600,placed=[];
    for(const photo of photos){
      const gutter=8,gap=(narrow?18:12)+photo.gap*(narrow?16:20);
      const cos=Math.cos(photo.angle),sin=Math.sin(photo.angle);
      // Continuous widths and positions avoid visible rows or column tracks.
      // Larger landscape pieces punctuate the smaller snapshots.
      const desired=narrow?(width-16)*(.82+photo.size*.16):Math.min(330,width*.25)*(.67+photo.size*.9)*(photo.ratio>2?1.7:1);
      const imageWidth=Math.min(width-gutter*2,desired)/(cos+sin/photo.ratio);
      const imageHeight=imageWidth/photo.ratio;
      const boundsWidth=imageWidth*cos+imageHeight*sin,boundsHeight=imageHeight*cos+imageWidth*sin;
      const maxLeft=width-gutter-boundsWidth;
      // Try the actual edges of earlier photos as well as free positions, so
      // smaller pieces can fit the pockets left by larger ones.
      const positions=[gutter,maxLeft,...photo.candidates.map(x=>gutter+x*(maxLeft-gutter)),...placed.flatMap(p=>[p.right+gap,p.left-gap-boundsWidth])].filter(x=>x>=gutter&&x<=maxLeft);
      const options=positions.map(left=>{
        const x=(left-gutter)/Math.max(1,maxLeft-gutter);
        let top=12+photo.y*(narrow?12:22),blocked;
        do {
          blocked=placed.find(p=>left<p.right+gap&&left+boundsWidth>p.left-gap&&top<p.bottom+gap&&top+boundsHeight>p.top-gap);
          if(blocked)top=blocked.bottom+gap;
        } while(blocked);
        return {left,top,score:top+Math.abs(x-photo.x)*12};
      });
      const {left,top}=options.reduce((a,b)=>a.score<b.score?a:b);
      photo.figure.style.width=imageWidth+'px';
      photo.figure.style.left=(left+(boundsWidth-imageWidth)/2)+'px';
      photo.figure.style.top=(top+(boundsHeight-imageHeight)/2)+'px';
      placed.push({left,top,right:left+boundsWidth,bottom:top+boundsHeight});
    }
    gallery.style.height=Math.ceil(Math.max(0,...placed.map(p=>p.bottom))+32)+'px';
  }
  new ResizeObserver(()=>{if(!frame)frame=requestAnimationFrame(arrange);}).observe(gallery);
  arrange();
})();
