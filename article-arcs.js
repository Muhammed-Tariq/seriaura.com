/* Two bounded meshes reuse the Home ribbon renderer. Geometry/font work happens
   only on resize; visible animation updates only a clock uniform on the GPU. */
(() => {
  const root=new URL('.',document.currentScript.src);
  const main=document.querySelector('.blog-layout main'),header=main?.querySelector('.post-header'),source=main?.querySelector('.blog-source');
  if(!header||!source) return;
  const ns='http://www.w3.org/2000/svg',motion=matchMedia('(prefers-reduced-motion: reduce)');
  const records=[];let frame=0,layoutFrame=0,lastTime=0,lastPaint=0,seconds=0,builds=0,paints=0;
  const classification=header.querySelector('.post-importance')?.textContent.trim();
  let lastReduced=motion.matches;
  function paintArc(r,time){
    const {width,centre,half,depth,base}=r.geometry;
    const progress=Math.min(1,(time%10)/8.5),reverse=Math.floor(time/10)%2===1;
    const travel=-.23+1.46*progress;
    const x=width*(classification==='Considerable'&&reverse?1-travel:travel);
    const y=x=>base+depth*(r.down?1-((x-centre)/half)**2:((x-centre)/half)**2);
    const active=!motion.matches&&classification!=='Tangential'&&['Salient','Considerable'].includes(classification);
    r.graphics.glow={centers:[x,y(x),width-x,y(width-x)],radius:width*.22,first:active?1:0,second:active&&classification==='Salient'?1:0,baseOpacity:.42};
    r.graphics.aura=classification==='Salient'?{centre,half,depth:r.down?-depth:depth,base:base+(r.down?depth:0),halfHeight:Math.max(44,Math.min(144,width*.09))/2}:null;
    r.graphics.paint(time,0,r.height);
  }
  const svgElement=name=>document.createElementNS(ns,name);
  function sync(){
    if(lastReduced!==motion.matches){
      lastReduced=motion.matches;
      if(lastReduced)records.forEach(r=>{if(r.graphics&&!r.failed)paintArc(r,0);});
    }
    if(document.hidden||motion.matches||(window.SiteOptions?.get().ribbonSpeed??1)===0||!records.some(r=>r.visible&&r.graphics&&!r.failed)){
      cancelAnimationFrame(frame);frame=0;lastTime=0;lastPaint=0;return;
    }
    if(!frame) frame=requestAnimationFrame(tick);
  }
  function tick(time){
    frame=0;
    if(lastTime) seconds+=Math.min(50,time-lastTime)/1000*(window.SiteOptions?.get().ribbonSpeed??1);
    lastTime=time;
    if(!lastPaint||time-lastPaint>=1000/60-.5){
      records.forEach(r=>{if(r.visible&&r.graphics&&!r.failed){paintArc(r,seconds);paints++;}});
      lastPaint=time;
    }
    sync();
  }
  const intersection=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{const r=records.find(r=>r.host===entry.target);if(r)r.visible=entry.isIntersecting;});sync();
  });
  window.addEventListener('siteoptionschange',event=>{if(event.detail.keys.includes('ribbonSpeed'))sync();});
  function layout(){
    layoutFrame=0;
    const bounds=main.getBoundingClientRect(),width=main.clientWidth;
    const fontSize=Math.max(5.5,Math.min(10,width/1920*9));
    const spacing=fontSize*1.3,band=spacing*2+fontSize*1.5,padding=8;
    // Narrow layouts get a shallower arc to leave room for the mobile title.
    const depth=width<=1100?Math.max(14,width*.04):Math.min(180,width*.085);
    const height=Math.ceil(depth+band+padding*2);
    const probe=document.createElement('canvas').getContext('2d');probe.font=`800 ${fontSize}px "Source Code Pro"`;
    const advance=probe.measureText('M').width;
    for(const r of records){
      const anchor=r.anchor.getBoundingClientRect(),centre=anchor.left+anchor.width/2-bounds.left;
      const half=Math.max(centre,width-centre);
      r.geometry={width,centre,half,depth,base:padding+band/2};
      if(!r.down)r.anchor.style.setProperty('--arc-credit-clearance',`${Math.ceil(depth*(anchor.width/2/half)**2+band/2+20)}px`);
      r.height=height;
      r.host.style.height=`${height}px`;
      r.host.style.top=`${r.down?anchor.bottom-bounds.top-height+10:anchor.top-bounds.top-padding-band/2}px`;
      const key=[width,centre,fontSize,depth].join(':');
      if(key===r.key) continue;
      r.key=key;builds++;
      const points=[];
      let total=0,previous;
      for(let x=-24;x<=width+24;x+=2){
        const t=(x-centre)/half;
        const y=padding+band/2+depth*(r.down?1-t*t:t*t);
        const slope=(r.down?-1:1)*2*depth*t/half,norm=Math.hypot(1,slope);
        const point={x,y,nx:-slope/norm,ny:1/norm,swell:1,glyphScale:1};
        if(previous)total+=Math.hypot(x-previous.x,y-previous.y);
        points.push({...point,distance:total});previous=point;
      }
      const frameAt=distance=>{
        let lo=0,hi=points.length-1;
        while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].distance<distance)lo=mid;else hi=mid;}
        const a=points[lo],b=points[hi],t=Math.max(0,Math.min(1,(distance-a.distance)/(b.distance-a.distance)));
        return Object.fromEntries(['x','y','nx','ny','swell','glyphScale'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
      };
      const position=(p,offset)=>({x:p.x+p.nx*offset,y:p.y+p.ny*offset});
      const rows=r.letters.map((letters,i)=>({letters,offset:(i-1)*spacing,direction:-1,speed:5+i*.6}));
      // A small, static SVG fallback also covers disabled/lost WebGL contexts.
      r.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);r.svg.replaceChildren();
      const defs=svgElement('defs');r.svg.append(defs);
      rows.forEach((row,i)=>{
        const path=svgElement('path');path.id=`article-arc-${r.down?'top':'bottom'}-${i}`;
        path.setAttribute('d',points.filter((_,j)=>j%4===0).map((p,j)=>{const q=position(p,row.offset);return `${j?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`;}).join(' '));defs.append(path);
        const text=svgElement('text'),textPath=svgElement('textPath');text.style.fontSize=`${fontSize}px`;
        textPath.setAttribute('href',`#${path.id}`);textPath.textContent=row.letters.slice(0,Math.ceil(total/advance)+20).join('');text.append(textPath);r.svg.append(text);
      });
      try{
        if(!r.failed){
          r.graphics ||= new RibbonGraphics(r.svg,restored=>{
            r.host.dataset.renderer='svg';r.failed=!restored;r.key='';
            if(restored)r.graphics=null;
            scheduleLayout();sync();
          });
          r.graphics.build({width,documentTop:0,fontSize,advance,total,rows,frameAt,position,isPhone:width<=1100});
          r.graphics.cache?.remove(); // These short arcs don't need document-scroll tiles.
          paintArc(r,motion.matches?0:seconds);r.host.dataset.renderer='webgl';
        }
      }catch(error){
        r.failed=true;r.host.dataset.renderer='svg';if(r.graphics)r.graphics.canvas.hidden=true;
      }
    }
    sync();
  }
  function scheduleLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(layout);}
  Promise.all([fetch(new URL('assets/text-art.txt',root)).then(r=>{if(!r.ok)throw new Error('Text artwork unavailable');return r.text();}),document.fonts.load('800 10px "Source Code Pro"')]).then(([raw])=>{
    const text=raw.replace(/\s*\/+\s*/g,' / ').replace(/\s+/g,' ').trim()+' ';
    if(!text.trim())return;
    for(const [anchor,down] of [[header,true],[source,false]]){
      const host=document.createElement('div');host.className='article-arc';host.dataset.arc=down?'top':'bottom';host.setAttribute('aria-hidden','true');
      const svg=svgElement('svg');svg.setAttribute('focusable','false');host.append(svg);main.append(host);
      host.classList.toggle('has-aura',classification==='Salient');
      const letters=Array.from({length:3},(_,row)=>Array.from({length:4096},(_,i)=>text[(i+row*4096+(down?0:12288))%text.length]));
      records.push({host,svg,anchor,down,letters,visible:false});intersection.observe(host);
    }
    document.documentElement.classList.add('article-arcs-ready');
    const observer=new ResizeObserver(scheduleLayout);
    [main,header,source,main.querySelector('.post-body')].forEach(el=>observer.observe(el));
    window.addEventListener('resize',scheduleLayout);document.addEventListener('visibilitychange',sync);
    motion.addEventListener('change',sync);
    layout();
    window.articleArcArt={diagnostics:()=>({builds,paints,running:!!frame,seconds,classification,reduced:motion.matches,arcs:records.map(r=>({renderer:r.host.dataset.renderer,failed:!!r.failed,visible:r.visible,height:r.height,glow:r.graphics?.glow,pixels:r.graphics?r.graphics.canvas.width*r.graphics.canvas.height:0}))})};
  }).catch(()=>{}); // Keep the ordinary dividers if the artwork cannot load.
})();
