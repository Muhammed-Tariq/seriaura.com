/* Lay out the source once per width, then rasterize the visible strip directly
   at display resolution. Hover copies native pixels into a small glow canvas. */
(async()=>{
 const options=new URLSearchParams(location.search);
 const main=document.querySelector('main');
 if(!main||options.has('art')||options.get('background')==='none'||document.querySelector('.lyric-field'))return;
 const response=await fetch('assets/text-art/quintessentially-seri.txt');
 if(!response.ok)throw new Error('The text-art source could not be loaded.');
 const source=(await response.text()).replace(/\s+/g,' ').trim();
 await document.fonts.load('800 11px "Glow Source Code"');
 await document.fonts.load('800 11px "Source Code Pro"');
 const layer=document.createElement('div');layer.className='lyric-field';layer.setAttribute('aria-hidden','true');
 const rest=document.createElement('canvas');rest.className='lyric-rest';
 const lit=document.createElement('canvas');lit.className='lyric-lit';
 layer.append(rest,lit);main.prepend(layer);
 document.documentElement.dataset.lyricBackground='true';
 const wordMask=document.createElement('canvas');wordMask.className='lyric-word-mask';
 const wordContext=wordMask.getContext('2d');
 const probe=document.createElement('canvas').getContext('2d');
 const restContext=rest.getContext('2d'),litContext=lit.getContext('2d');
 if(!probe||!restContext||!litContext||!wordContext){layer.remove();return;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const phoneLayout=matchMedia('(max-width:1100px)');
 const stats={textBuilds:0,stripBuilds:0,glowDraws:0};
 let width=0,height=0,mainTop=0,mainLeft=0,fontSize=0,lineHeight=0,ratio=1;
 let textRows=[],readingWords=[],headingWords=[],flowerShapes=[],protectedImages=[];
 let writingsClear=null;
 let footerTop=Infinity;
 let wordMaskTop=-Infinity,wordMaskDirty=true,headingDirty=false;
 let stripTop=-Infinity,stripHeight=0,radius=0,needsLayout=true,needsMask=true;
 let frame=0,touchTimer=0,target=null,current=null,lastTime=0,litActive=false;
 let touchId=null,touchActive=false,touchAnchor=null;
 let ribbonDescent=0,needsTint=true;
 function tintRest(){
  const preferences=window.SiteOptions?.get(),level=preferences?.backgroundOpacity??5;
  const chosen=preferences?.backgroundColor??'#eeece6';
  const ink=[1,3,5].map(i=>parseInt(chosen.slice(i,i+2),16));
  const t=Math.max(0,(level-5)/95),base=[37,36,35],paper=[238,236,230];
  // Preserve the original default at every visibility level; tint only the ink.
  const color=base.map((value,i)=>Math.round(value+(paper[i]-value)*t+(ink[i]-paper[i])*(.05+.95*t)));
  restContext.save();restContext.setTransform(1,0,0,1,0,0);
  restContext.globalCompositeOperation='source-in';restContext.fillStyle=`rgb(${color.join(',')})`;restContext.fillRect(0,0,rest.width,rest.height);restContext.restore();needsTint=false;
 }
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(paint);}
 function buildText(){
  stats.textBuilds++;
  probe.font=`800 ${fontSize}px "Glow Source Code"`;
  const spacing=fontSize*.035;
  probe.letterSpacing=spacing+'px';probe.wordSpacing='0px';
  const advance=probe.measureText('M').width;
  const columns=Math.max(16,Math.floor((width+64)/advance));
  const lines=[];let line='';
  for(const word of source.split(' ')){
   if(line&&line.length+word.length+1>columns){lines.push(line);line='';}
   if(word.length>columns){if(line){lines.push(line);line='';}for(let i=0;i<word.length;i+=columns)lines.push(word.slice(i,i+columns));}
   else line+=(line?' ':'')+word;
  }
  // Continue into the beginning of the source rather than stretching its short
  // final line across the screen. Every row keeps the font's natural spacing.
  if(line){
   for(const word of source.split(' ')){
    if(line.length+word.length+1>columns)break;
    line+=' '+word;
   }
   lines.push(line);
  }
  textRows=lines.map(line=>{
   const text=line+' ';
   return {text,width:probe.measureText(text).width};
  });
 }
 function layout(){
  const box=main.getBoundingClientRect(),style=getComputedStyle(layer);
  const nextWidth=main.clientWidth,nextFont=parseFloat(style.fontSize);
  const textChanged=nextWidth!==width||nextFont!==fontSize;
  width=nextWidth;height=main.clientHeight;mainTop=box.top+scrollY;mainLeft=box.left;
  footerTop=document.querySelector('.site-footer')?.getBoundingClientRect().top+scrollY||Infinity;
  fontSize=nextFont;lineHeight=fontSize*12.5/11;
  ratio=devicePixelRatio||1;
  radius=width*(window.SiteOptions?.get().radius??22)/100;
  if(textChanged||!textRows.length)buildText();
  probe.save();probe.font=`800 ${phoneLayout.matches?7:9.5*width/1920}px "Source Code Pro"`;
  const metrics=probe.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?');
  ribbonDescent=metrics.actualBoundingBoxDescent;probe.restore();
  cacheReadingAreas();
  cacheWritingsFade();
  stripTop=-Infinity;needsLayout=false;needsMask=true;
 }
 function cacheWritingsFade(){
  writingsClear=null;
  const list=main.querySelector('.home-writings .post-list');if(!list)return;
  const box=list.getBoundingClientRect();if(!box.height)return;
  const top=box.top+scrollY-mainTop,bottom=box.bottom+scrollY-mainTop;
  const desktop=!phoneLayout.matches&&typeof ribbonX==='function',scale=width/1920;
  const edge=y=>desktop?ribbonX(y,width)+ribbonHalfWidth(y,width,18*scale):box.left-mainLeft;
  const junctions=[top,...[...list.children].map(item=>item.getBoundingClientRect().bottom+scrollY-mainTop)];
  const outerEdge=Math.max(...junctions.map(edge));
  // Match the article dividers' contour. Only the closed list fields clear;
  // neither the heading nor the Substack link belongs to this mask.
  const right=y=>box.right-mainLeft-(desktop?2*(outerEdge-edge(y))-80*scale:0);
  const fade=Math.min(box.width*.4,fontSize*20),path=new Path2D(),clip=new Path2D(),points=[];
  for(let y=top;y<bottom;y+=4)points.push({y,left:edge(y),right:right(y)});
  points.push({y:bottom,left:edge(bottom),right:right(bottom)});
  path.moveTo(-width,top);
  for(const point of points)path.lineTo(point.right-fade,point.y);
  path.lineTo(-width,bottom);path.closePath();
  points.forEach((point,i)=>i?clip.lineTo(point.left,point.y):clip.moveTo(point.left,point.y));
  for(const point of [...points].reverse())clip.lineTo(point.right,point.y);
  clip.closePath();
  const feather=new Path2D(clip);feather.addPath(path);
  writingsClear={path,clip,feather,top,bottom,fade};
 }
 function fadeWritings(top,bottom){
  const area=writingsClear;
  if(!area||bottom<area.top||top>area.bottom)return;
  restContext.save();
  restContext.clip(area.clip);
  restContext.globalCompositeOperation='destination-out';
  restContext.fillStyle=restContext.strokeStyle='#000';restContext.lineJoin='round';
  // Keep 10% of the texture even at the darkest point. Exclude the core from
  // the feather passes so overlapping erasures cannot wipe out that trace.
  const suppression=.9;
  restContext.save();restContext.clip(area.feather,'evenodd');
  let previous=0;
  for(let i=1;i<=24;i++){
   const t=i/25,darkness=suppression*t*t*(3-2*t);
   restContext.globalAlpha=(darkness-previous)/(1-previous);previous=darkness;
   restContext.lineWidth=2*area.fade*(1-t);restContext.stroke(area.path);
  }
  restContext.restore();restContext.globalAlpha=suppression;restContext.fill(area.path);restContext.restore();
 }
 function measureWords(elements){
  const words=[],range=document.createRange(),seen=new Set();
  for(const element of elements){
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const node=walker.currentNode,parent=node.parentElement;
    if(seen.has(node)||parent.closest('[aria-hidden="true"],template'))continue;
    seen.add(node);
    const style=getComputedStyle(parent);
    // Home is briefly visibility:hidden during its entrance. Its text still
    // needs a halo on the first hover; hidden sizing spans are excluded above.
    if(style.display==='none')continue;
    const add=(text,rect,letter=false)=>{
     if(!rect.width||!rect.height)return;
     const actual=letter?getComputedStyle(parent,'::first-letter'):style;
     let size=parseFloat(actual.fontSize);
     if(letter&&rect.height>size*1.5)size=rect.height*.85;
     let font=`${actual.fontStyle} ${actual.fontWeight} ${size}px ${actual.fontFamily}`;
     probe.font=font;
     const metrics=probe.measureText(text),ascent=metrics.fontBoundingBoxAscent??size*.9,descent=metrics.fontBoundingBoxDescent??size*.25;
     let baseline=rect.top+scrollY-mainTop+(rect.height-ascent-descent)/2+ascent;
     const initialLines=letter?parseFloat(actual.initialLetter):0;
     if(initialLines>1&&node.textContent.length>1){
      // CSS initial-letter does not expose its enlarged size in font-size or
      // Range bounds. Align its capital height to the neighbouring baselines.
      range.setStart(node,1);range.setEnd(node,2);
      const neighbour=range.getBoundingClientRect(),extra=parseFloat(style.lineHeight)*(initialLines-1);
      baseline=neighbour.top+scrollY-mainTop+(neighbour.height-ascent-descent)/2+ascent+extra;
      size*=1+extra/(metrics.actualBoundingBoxAscent||size*.7);
      font=`${actual.fontStyle} ${actual.fontWeight} ${size}px ${actual.fontFamily}`;
     }
     words.push({text,font,size,spacing:actual.letterSpacing==='normal'?'0px':actual.letterSpacing,
      x:rect.left-mainLeft,y:baseline,
      top:Math.min(rect.top+scrollY-mainTop,baseline-size),bottom:Math.max(rect.bottom+scrollY-mainTop,baseline+size*.3)});
    };
    for(const match of node.textContent.matchAll(/\S+/g)){
     const start=match.index,end=start+match[0].length;
     range.setStart(node,start);range.setEnd(node,end);
     const rects=[...range.getClientRects()];
     const drop=parent.matches('.drop-cap')&&start===0&&node===parent.firstChild;
     if(rects.length===1&&!drop){add(match[0],rects[0]);continue;}
     // Split wrapped words and the enlarged initial by their actual line positions.
     let fragment=null;
     for(let i=start;i<end;i++){
      range.setStart(node,i);range.setEnd(node,i+1);
      const rect=range.getBoundingClientRect(),letter=drop&&i===start;
      if(fragment&&!letter&&!fragment.letter&&Math.abs(fragment.rect.top-rect.top)<1){
       fragment.text+=node.textContent[i];fragment.rect.right=rect.right;fragment.rect.width=rect.right-fragment.rect.left;
      }else{
       if(fragment)add(fragment.text,fragment.rect,fragment.letter);
       fragment={text:node.textContent[i],rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height},letter};
      }
     }
     if(fragment)add(fragment.text,fragment.rect,fragment.letter);
    }
   }
  }
  return words;
 }
 function cacheReadingAreas(){
  readingWords=measureWords(main.querySelectorAll('.body-copy,.post-link,.writings-substack,h2'));
  headingWords=measureWords(main.querySelectorAll('h1'));
  flowerShapes=[];
  for(const svg of main.querySelectorAll('.post-flower')){
   const box=svg.getBoundingClientRect();
   for(const element of svg.querySelectorAll('path[fill="currentColor"]')){
    const matrix=element.getScreenCTM();if(!matrix)continue;
    const path=new Path2D();
    path.addPath(new Path2D(element.getAttribute('d')),new DOMMatrix([matrix.a,matrix.b,matrix.c,matrix.d,matrix.e-mainLeft,matrix.f+scrollY-mainTop]));
    flowerShapes.push({path,top:box.top+scrollY-mainTop,bottom:box.bottom+scrollY-mainTop});
   }
  }
  protectedImages=[...main.querySelectorAll('img[data-glow-protect]')].filter(image=>image.complete&&image.naturalWidth).map(image=>{
   const box=image.getBoundingClientRect();
   const matrix=new DOMMatrix(getComputedStyle(image).transform);
   return {image,x:box.left-mainLeft,y:box.top+scrollY-mainTop,width:box.width,height:box.height,inkWidth:image.clientWidth,inkHeight:image.clientHeight,angle:Math.atan2(matrix.b,matrix.a)};
  });
  headingDirty=false;wordMaskDirty=true;
 }
 function paintWordMask(){
  const nextTop=Math.floor(stripTop),nextHeight=Math.ceil(stripHeight+1),nextWidth=Math.ceil(width);
  const delta=nextTop-wordMaskTop;
  const reuse=!wordMaskDirty&&wordMask.width===nextWidth&&wordMask.height===nextHeight&&Math.abs(delta)<nextHeight;
  let bandTop=0,bandHeight=nextHeight;
  if(wordMask.width!==nextWidth||wordMask.height!==nextHeight){wordMask.width=nextWidth;wordMask.height=nextHeight;}
  wordContext.setTransform(1,0,0,1,0,0);
  if(reuse){
   bandTop=delta>0?nextHeight-delta:0;bandHeight=Math.abs(delta);
   if(delta){
    wordContext.globalCompositeOperation='copy';
    wordContext.drawImage(wordMask,0,Math.max(0,delta),nextWidth,nextHeight-Math.abs(delta),0,Math.max(0,-delta),nextWidth,nextHeight-Math.abs(delta));
    wordContext.globalCompositeOperation='source-over';
   }
  }
  wordMaskTop=nextTop;wordMaskDirty=false;
  const drawBand=(top,bottom)=>{
   top=Math.max(nextTop,top);bottom=Math.min(nextTop+nextHeight,bottom);if(bottom<=top)return;
   wordContext.clearRect(0,top-nextTop,nextWidth,bottom-top);
   wordContext.save();wordContext.beginPath();wordContext.rect(0,top-nextTop,nextWidth,bottom-top);wordContext.clip();
   wordContext.translate(0,-nextTop);wordContext.fillStyle=wordContext.strokeStyle='#000';wordContext.lineJoin='round';
   for(const word of [...readingWords,...headingWords]){
    // Keep this modest readability adjustment local so it is easy to reverse.
    const core=1.15*Math.max(2,Math.min(3,word.size*.1)),fade=1.15*Math.max(4,Math.min(8,word.size*.25));
    if(word.bottom+core+fade<top||word.top-core-fade>bottom)continue;
    wordContext.font=word.font;wordContext.letterSpacing=word.spacing;
    // A halo around the glyph ink, never a paragraph, line or word rectangle.
    for(const [extent,alpha] of [[1,.10],[.75,.20],[.5,.34],[.25,.58],[0,1]]){
     wordContext.globalAlpha=alpha;wordContext.lineWidth=2*(core+fade*extent);
     wordContext.strokeText(word.text,word.x,word.y);
    }
    wordContext.globalAlpha=1;wordContext.fillText(word.text,word.x,word.y);
   }
   for(const flower of flowerShapes){
    if(flower.bottom+9<top||flower.top-9>bottom)continue;
    for(const [spread,alpha] of [[9,.08],[7,.16],[5,.28],[4,.5],[3,1]]){
     wordContext.globalAlpha=alpha;wordContext.lineWidth=spread*2;wordContext.stroke(flower.path);
    }
    wordContext.globalAlpha=1;wordContext.fill(flower.path);
   }
   for(const item of protectedImages){
    if(item.y+item.height+18<top||item.y-18>bottom)continue;
    wordContext.globalAlpha=1;wordContext.shadowColor='#000';wordContext.shadowBlur=12;
    // Use the transparent signature's ink as a soft halo, not its rectangle.
    wordContext.save();wordContext.translate(item.x+item.width/2,item.y+item.height/2);wordContext.rotate(item.angle);
    for(let pass=0;pass<4;pass++)wordContext.drawImage(item.image,-item.inkWidth/2,-item.inkHeight/2,item.inkWidth,item.inkHeight);
    wordContext.restore();
    wordContext.shadowBlur=0;
   }
   wordContext.restore();
  };
  if(bandHeight)drawBand(nextTop+bandTop,nextTop+bandTop+bandHeight);
  if(headingDirty){
   const old=headingWords;headingWords=measureWords(main.querySelectorAll('h1'));headingDirty=false;
   const affected=[...old,...headingWords];
   if(affected.length)drawBand(Math.min(...affected.map(w=>w.top-w.size)),Math.max(...affected.map(w=>w.bottom+w.size)));
  }
 }
 function ribbonPath(top,bottom){
  const far=[],phone=phoneLayout.matches;
  // Use the rendered tracks and actual glyph ink, not the wider layout exclusion.
  const add=(x,y,slope,progress)=>{
   const length=Math.hypot(1,slope),nx=phone?-slope/length:1/length,ny=phone?1/length:-slope/length;
   const half=(phone?22:67.5*width/1920)*ribbonTrackScale(progress);
   const high=half+ribbonDescent*ribbonGlyphScale(progress);
   far.push([x+nx*high,y+ny*high]);
  };
  if(phone){for(let x=-100;x<=width+100;x+=4){const f=ribbonPhoneFrame(x,width);add(x,f.y,f.slope,x/width);}}
  else{for(let y=Math.floor((top-180)/6)*6;y<=bottom+180;y+=6)add(ribbonX(y,width),y,ribbonSlope(y,width),y/ribbonExtent);}
  // Clear the entire navigation side. On phones the ribbon runs horizontally,
  // so the text stays on its content side (below the ribbon).
  const first=far[0],last=far[far.length-1];
  const outside=phone?[[last[0],-180],[first[0],-180]]:[[-width,last[1]],[-width,first[1]]];
  const path=new Path2D();far.concat(outside).forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();return path;
 }
 function buildStrip(top){
  stats.stripBuilds++;
  const previousTop=stripTop;
  stripHeight=Math.min(height,Math.ceil((innerHeight+512)/128)*128);
  top=Math.min(top,Math.max(0,height-stripHeight));
  top=Math.round(top*ratio)/ratio;
  stripTop=top;
  const pixelWidth=Math.ceil(width*ratio),pixelHeight=Math.ceil(stripHeight*ratio);
  const delta=Math.round((top-previousTop)*ratio);
  const reuse=!needsMask&&rest.width===pixelWidth&&rest.height===pixelHeight&&Math.abs(delta)<pixelHeight;
  if(rest.width!==pixelWidth||rest.height!==pixelHeight){rest.width=pixelWidth;rest.height=pixelHeight;}
  rest.style.width=pixelWidth/ratio+'px';rest.style.height=pixelHeight/ratio+'px';rest.style.transform=`translate3d(0,${top}px,0)`;
  restContext.setTransform(1,0,0,1,0,0);
  let pixelTop=0,paintHeight=pixelHeight;
  if(reuse){
   if(!delta)return;
   // Reuse exact native pixels on scroll; rasterize only the new exposed band.
   restContext.globalCompositeOperation='copy';
   restContext.drawImage(rest,0,Math.max(0,delta),pixelWidth,pixelHeight-Math.abs(delta),0,Math.max(0,-delta),pixelWidth,pixelHeight-Math.abs(delta));
   restContext.globalCompositeOperation='source-over';
   pixelTop=delta>0?pixelHeight-delta:0;paintHeight=Math.abs(delta);
  }
  restContext.clearRect(0,pixelTop,pixelWidth,paintHeight);
  restContext.save();restContext.beginPath();restContext.rect(0,pixelTop,pixelWidth,paintHeight);restContext.clip();
  const paintTop=top+pixelTop/ratio,paintBottom=paintTop+paintHeight/ratio;
  restContext.setTransform(ratio,0,0,ratio,0,-top*ratio);
  restContext.save();restContext.fillStyle='#fff';
  restContext.font=`800 ${fontSize}px "Glow Source Code"`;restContext.textBaseline='alphabetic';
  restContext.letterSpacing=fontSize*.035+'px';
  // Draw font outlines into their final pixels: no low-resolution texture,
  // enlarged glyphs, or rotated bitmap resampling between the font and screen.
  for(let row=Math.floor(paintTop/lineHeight)-1;row<=Math.ceil(paintBottom/lineHeight);row++){
   const entry=textRows[((row%textRows.length)+textRows.length)%textRows.length];
   restContext.wordSpacing='0px';
   for(let column=0;column<=Math.floor(width/entry.width);column++){
    restContext.fillText(entry.text,column*entry.width,row*lineHeight+fontSize*.86);
   }
  }
  restContext.restore();
  if(typeof ribbonX==='function'){
   const path=ribbonPath(paintTop,paintBottom),fade=fontSize*5;
   restContext.globalCompositeOperation='destination-out';restContext.fillStyle='#000';restContext.strokeStyle='#000';restContext.lineJoin='round';
   let previous=0;
   for(let i=1;i<=24;i++){
    const t=i/25,darkness=1-Math.sin((1-t)*Math.PI/2);
    restContext.globalAlpha=(darkness-previous)/(1-previous);previous=darkness;
    restContext.lineWidth=2*fade*(1-t);restContext.stroke(path);
   }
   // The ribbon and navigation side are clear; the content-side feather is partial.
   restContext.globalAlpha=1;restContext.fill(path);restContext.globalCompositeOperation='source-over';
  }
  fadeWritings(paintTop,paintBottom);
  restContext.setTransform(1,0,0,1,0,0);
  tintRest();
  restContext.restore();
  needsMask=false;
 }
 function drawGlow(x,y){
  paintWordMask();
  stats.glowDraws++;
  const size=Math.ceil(radius*2),pixels=Math.ceil(size*ratio);
  if(lit.width!==pixels||lit.height!==pixels){lit.width=lit.height=pixels;lit.style.width=lit.style.height=pixels/ratio+'px';}
  const left=Math.round((x-radius)*ratio)/ratio,top=Math.round((y-radius)*ratio)/ratio;
  lit.style.transform=`translate3d(${left}px,${top}px,0)`;
  litContext.setTransform(1,0,0,1,0,0);litContext.clearRect(0,0,pixels,pixels);
  litContext.drawImage(rest,Math.round(left*ratio),Math.round((top-stripTop)*ratio),pixels,pixels,0,0,pixels,pixels);
  litContext.globalCompositeOperation='source-in';
  const gradient=litContext.createRadialGradient(pixels/2,pixels/2,0,pixels/2,pixels/2,pixels/2);
  for(const [stop,color] of (window.SiteOptions?.gradientStops()||[[0,'#f5f5f5'],[.22,'#e7e7e7'],[.48,'#d8d8d8a8'],[.72,'#c9c9c933'],[1,'#c9c9c900']]))gradient.addColorStop(stop,color);
  litContext.fillStyle=gradient;litContext.fillRect(0,0,pixels,pixels);
  litContext.globalCompositeOperation='destination-out';
  litContext.drawImage(wordMask,left,top-wordMaskTop,pixels/ratio,pixels/ratio,0,0,pixels,pixels);
  litContext.globalCompositeOperation='source-over';
 }
 function paint(time){
  frame=0;if(document.hidden)return;
  if(needsLayout)layout();
  const visibleTop=Math.max(0,scrollY-mainTop),visibleBottom=Math.min(height,scrollY-mainTop+innerHeight);
  if(visibleBottom<=0||visibleTop>=height)return;
  if(needsMask||visibleTop<stripTop+128&&stripTop>0||visibleBottom>stripTop+stripHeight-128&&stripTop+stripHeight<height){
   buildStrip(Math.max(0,Math.floor((visibleTop-192)/128)*128));
  }
  if(needsTint)tintRest();
  if(target){
   if(target.y+scrollY>=footerTop){layer.classList.add('is-over-footer');hide();return;}
   const amount=reduced.matches?1:1-Math.exp(-Math.min(50,time-lastTime)/45);lastTime=time;
   current.x+=(target.x-current.x)*amount;current.y+=(target.y-current.y)*amount;
   drawGlow(current.x-mainLeft,current.y+scrollY-mainTop);
   if(Math.hypot(target.x-current.x,target.y-current.y)>.3)schedule();
  }
  document.documentElement.dataset.lyricReady='true';
 }
 function point(x,y,direct=false){
  if(document.querySelector('dialog[open]:not(.options-panel)')||document.elementFromPoint(x,y)?.closest('.options-panel')){hide();return;}
  const overFooter=y+scrollY>=footerTop;
  layer.classList.toggle('is-over-footer',overFooter);
  if(overFooter){hide();return;}
  clearTimeout(touchTimer);target={x,y};if(!current||direct)current={x,y};
  if(!litActive){litActive=true;layer.classList.add('is-lit');}
  lastTime=performance.now()-16;schedule();
 }
 function hide(){clearTimeout(touchTimer);touchAnchor=null;target=current=null;litActive=false;layer.classList.remove('is-lit');}
 document.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')point(event.clientX,event.clientY);},{passive:true});
 document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'||event.target.closest('a,button,input,select,textarea'))return;point(event.clientX,event.clientY);touchTimer=setTimeout(hide,1600);},{passive:true});
 // Native touch events continue during scrolling after pointercancel. Keep all
 // listeners passive, so dragging still scrolls the page normally.
 document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){touchActive=false;touchId=null;hide();return;}
  if(event.target.closest('.sidebar,button,input,select,textarea,dialog'))return;
  const touch=event.touches[0];touchId=touch.identifier;touchActive=true;touchAnchor=null;
  point(touch.clientX,touch.clientY,true);
 },{passive:true});
 document.addEventListener('touchmove',event=>{
  if(!touchActive)return;
  if(event.touches.length!==1){touchActive=false;touchId=null;hide();return;}
  const touch=[...event.touches].find(t=>t.identifier===touchId);
  if(touch)point(touch.clientX,touch.clientY,true);
 },{passive:true});
 const releaseTouch=event=>{
  if(!touchActive||[...event.touches].some(t=>t.identifier===touchId))return;
  touchActive=false;touchId=null;
  if(target)touchAnchor={x:target.x,y:target.y+scrollY};
  clearTimeout(touchTimer);touchTimer=setTimeout(hide,450);
 };
 document.addEventListener('touchend',releaseTouch,{passive:true});
 document.addEventListener('touchcancel',()=>{touchActive=false;touchId=null;hide();},{passive:true});
 document.documentElement.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch'&&!touchActive)hide();});
 window.addEventListener('blur',hide);
 window.addEventListener('siteoptionsopen',hide);
 window.addEventListener('siteoptionschange',event=>{if(event.detail.keys.includes('radius'))needsLayout=true;if(event.detail.keys.some(key=>key==='backgroundOpacity'||key==='backgroundColor'))needsTint=true;schedule();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hide();cancelAnimationFrame(frame);frame=0;}else schedule();});
 window.addEventListener('scroll',()=>{
  if(touchAnchor&&!touchActive&&target){target=current={x:touchAnchor.x,y:touchAnchor.y-scrollY};}
  schedule();
 },{passive:true});
 window.addEventListener('resize',()=>{needsLayout=true;schedule();},{passive:true});
 main.addEventListener('load',event=>{if(event.target.matches?.('[data-glow-protect]')){needsLayout=true;schedule();}},true);
 phoneLayout.addEventListener('change',()=>{needsLayout=true;schedule();});
 let densityQuery;
 function watchDensity(){
  densityQuery?.removeEventListener('change',densityChanged);
  densityQuery=matchMedia(`(resolution: ${devicePixelRatio||1}dppx)`);
  densityQuery.addEventListener('change',densityChanged);
 }
 function densityChanged(){needsLayout=true;watchDensity();schedule();}
 watchDensity();
 new ResizeObserver(()=>{needsLayout=true;schedule();}).observe(main);
 new MutationObserver(()=>{needsLayout=true;schedule();}).observe(document.querySelector('.text-ribbon defs'),{childList:true,subtree:true,attributes:true});
 new MutationObserver(()=>{headingDirty=true;if(target)schedule();}).observe(main.querySelector('h1'),{childList:true,subtree:true,characterData:true});
 window.siteTextBackground={show:()=>point(innerWidth*.84,innerHeight*.45),hide,
  diagnostics:()=>({...stats,fontSize,lineHeight,radius,stripTop,stripHeight,ratio,pending:!!frame,canvasPixels:rest.width*rest.height+lit.width*lit.height+wordMask.width*wordMask.height})};
 schedule();
})().catch(error=>{console.error(error);document.documentElement.dataset.lyricError='true';});
