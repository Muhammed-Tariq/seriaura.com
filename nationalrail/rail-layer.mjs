// Each railway tile uses the same origin, size and animated Leaflet grid as the basemap.
const NS = 'http://www.w3.org/2000/svg';
const cells = 256;
function index(items) {
  const buckets = new Map();
  for (const item of items) {
    for (let y = Math.floor(item.bounds[1]*cells); y <= Math.floor(item.bounds[3]*cells); y++) {
      for (let x = Math.floor(item.bounds[0]*cells); x <= Math.floor(item.bounds[2]*cells); x++) {
        const key = y*cells+x;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(item);
      }
    }
  }
  return (left, top, right, bottom) => {
    const visible = new Set();
    for (let y=Math.floor(top*cells); y<=Math.floor(bottom*cells); y++) {
      for (let x=Math.floor(left*cells); x<=Math.floor(right*cells); x++) {
        for(const item of buckets.get(y*cells+x)||[]) {
          const [w,n,e,s]=item.bounds;
          if(e>=left && w<=right && s>=top && n<=bottom) visible.add(item);
        }
      }
    }
    return visible;
  };
}
function svg(tag, attrs) {
  const node=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  return node;
}
export function createRailLayer(map, stations, byLine, state) {
  const project=(lat,lon)=>map.project([lat,lon],0).divideBy(256);
  const stops=index(stations.map(s=>{
    const p=project(s.lat,s.lon);
    return {s,p,bounds:[p.x,p.y,p.x,p.y]};
  }));
  let tracks=index([]);
  const overviewCache=new Map();
  let cacheSize=0;
  const layer=L.gridLayer({noWrap:true,updateWhenZooming:true,updateWhenIdle:true,
    keepBuffer:2,pane:'overlayPane',bounds:[[49,-9],[61,3]],className:'rail-grid'});
  const tileCoords=new WeakMap();
  layer.createTile=({x,y,z})=>{
    const tile=svg('svg',{width:256,height:256,viewBox:'0 0 256 256','aria-hidden':'true'});
    const scale=256*2**z, left=x*256,top=y*256;
    const visible=(find,pad)=>find((left-pad)/scale,(top-pad)/scale,(left+256+pad)/scale,(top+256+pad)/scale);
    const {selected}=state();
    const isLine=selected && !selected.id.startsWith('region:');
    const cacheKey=!isLine&&z<10?z+'/'+x+'/'+y:null;
    const cached=overviewCache.get(cacheKey);
    if(cached){
      tile.append(cached.group.cloneNode(true));
      tileCoords.set(tile,{x,y,z});paintStops(tile,{x,y,z});return tile;
    }
    const detail=Math.max(0,Math.min(1,(z-10)/2)),width=.8+.9*Math.max(0,Math.min(1,(z-6)/7));
    const batches=new Map();
    for(const t of visible(tracks,8)){
      if(z<t.minZoom)continue;
      const active=!isLine || t.lines.includes(selected.id);
      const palette=isLine&&active?[selected.color]:t.colours;
      const count=detail?palette.length:1;
      for(let k=0;k<count;k++){
        const offset=(k-(count-1)/2)*(width+.35)*detail;
        const colour=palette[k], opacity=(active?(t.lines.length?.78:.38):.1)*(k?detail:1);
        const key=colour+' '+opacity;
        let path='',lastX,lastY;
        for(let i=0;i<t.points.length;i++){
          const p=t.points[i];let px=p.x*scale-left,py=p.y*scale-top;
          if(i && i<t.points.length-1 && Math.abs(px-lastX)+Math.abs(py-lastY)<.45)continue;
          lastX=px;lastY=py;
          if(offset){
            const a=t.points[Math.max(0,i-1)],b=t.points[Math.min(t.points.length-1,i+1)];
            const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
            px-=dy/len*offset;py+=dx/len*offset;
          }
          path+=(i?'L':'M')+px.toFixed(2)+' '+py.toFixed(2);
        }
        if(!batches.has(key))batches.set(key,{colour,opacity,paths:[]});
        batches.get(key).paths.push(path);
      }
    }
    const group=svg('g',{});tile.append(group);
    for(const {colour,opacity,paths} of batches.values())group.append(svg('path',{
      d:paths.join(''),fill:'none',stroke:colour,'stroke-opacity':opacity,'stroke-width':width,
      'stroke-linejoin':'round','stroke-linecap':'round','vector-effect':'non-scaling-stroke'}));
    if(cacheKey&&batches.size){
      const size=Array.from(group.children,path=>path.getAttribute('d').length).reduce((a,b)=>a+b,0);
      overviewCache.set(cacheKey,{group:group.cloneNode(true),size});cacheSize+=size;
      while(cacheSize>4000000||overviewCache.size>128){
        const oldest=overviewCache.keys().next().value;
        cacheSize-=overviewCache.get(oldest).size;overviewCache.delete(oldest);
      }
    }
    tileCoords.set(tile,{x,y,z});
    paintStops(tile,{x,y,z});
    return tile;
  };
  function paintStops(tile,{x,y,z}){
    const {found,selected}=state();
    const group=svg('g',{class:'station-layer'});
    const scale=256*2**z,left=x*256,top=y*256;
    const pad=z>=11?256:12;
    const candidates=stops((left-pad)/scale,(top-pad)/scale,(left+256+pad)/scale,(top+256+pad)/scale);
    const dots=new Map(),labels=[];
    for(const {s,p} of candidates){
      const px=p.x*scale-left,py=p.y*scale-top,known=found.has(s.id);
      if(known&&z>=11)labels.push({s,px,py});
      if(px < -12 || px>268 || py < -12 || py>268)continue;
      const key=(known?'found':'unknown')+(selected&&!selected.members.has(s.id)?' dim':'');
      if(!dots.has(key))dots.set(key,[]);
      dots.get(key).push('M'+px.toFixed(2)+' '+py.toFixed(2)+'h.001');
    }
    // Each tile level supplies its inverse scale to keep these diameters in screen pixels.
    for(const [cls,paths] of dots){
      const diameter=cls.startsWith('found')?7:5;
      const marks=svg('g',{class:'rail-stop '+cls});
      const common={d:paths.join(''),fill:'none','stroke-linecap':'round'};
      marks.append(svg('path',{...common,class:'rim',style:'stroke-width:calc('+ (diameter+1) +'px * var(--rail-inverse,1))'}));
      marks.append(svg('path',{...common,class:'centre',style:'stroke-width:calc('+ (diameter-1) +'px * var(--rail-inverse,1))'}));
      group.append(marks);
    }
    const occupied=[];
    const isOtherLine=s=>!!selected&&!selected.id.startsWith('region:')&&!selected.members.has(s.id);
    labels.sort((a,b)=>Number(isOtherLine(a.s))-Number(isOtherLine(b.s))||a.s.id.localeCompare(b.s.id));
    for(const {s,px,py} of labels){
      const width=s.name.length*7.5+4;
      const positions=[[8,4],[-width-8,4],[8,-10],[8,19]];
      let box,position;
      for(const [dx,dy] of positions){
        const candidate=[px+dx,py+dy-13,px+dx+width,py+dy+4];
        if(occupied.some(b=>b[0]<candidate[2]&&b[2]>candidate[0]&&b[1]<candidate[3]&&b[3]>candidate[1]))continue;
        box=candidate;position=[dx,dy];break;
      }
      if(!box)continue;
      occupied.push(box);
      if(box[2]<0||box[0]>256||box[3]<0||box[1]>256)continue;
      const anchor=svg('g',{transform:'translate('+px+' '+py+')'});
      const label=svg('text',{x:position[0],y:position[1],class:isOtherLine(s)?'rail-label is-muted':'rail-label'});label.textContent=s.name;anchor.append(label);group.append(anchor);
    }
    const old=tile.querySelector('.station-layer');
    if(old)old.replaceWith(group);else tile.append(group);
  }
  let tracksChanged=false,lastLine=null;
  layer.setTracks=async raw=>{
    const projected=[];
    let sliceStart=performance.now();
    for(const t of raw){
      const bounds=[Infinity,Infinity,-Infinity,-Infinity];
      const points=t.coordinates.map(([lat,lon])=>{
        const p=project(lat,lon);
        bounds[0]=Math.min(bounds[0],p.x);bounds[1]=Math.min(bounds[1],p.y);
        bounds[2]=Math.max(bounds[2],p.x);bounds[3]=Math.max(bounds[3],p.y);return p;
      });
      const colours=[...new Set(t.lines.map(id=>byLine.get(id)?.color).filter(Boolean))].slice(0,4);
      projected.push({points,bounds,lines:t.lines,minZoom:t.minZoom||0,colours:colours.length?colours:['#8393aa']});
      if(projected.length%256===0&&performance.now()-sliceStart>12){
        if(globalThis.scheduler?.yield)await globalThis.scheduler.yield();
        else await new Promise(resolve=>setTimeout(resolve,0));
        sliceStart=performance.now();
      }
    }
    tracks=index(projected);overviewCache.clear();cacheSize=0;
    tracksChanged=true;layer.schedule();
  };
  let frame=0;
  layer.schedule=()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const selected=state().selected;
      const line=selected&&!selected.id.startsWith('region:')?selected.id:null;
      if(tracksChanged||lastLine!==line){lastLine=line;tracksChanged=false;layer.redraw();return;}
      for(const tile of layer.getContainer().querySelectorAll('svg.leaflet-tile')){
        const coords=tileCoords.get(tile);if(coords)paintStops(tile,coords);
      }
    });
  };
  // Tile levels overlap during zoom. Measure each level's actual on-screen scale
  // so both generations of station marks and type have the same pixel size.
  let sizingFrame=0,zooming=false;
  function sizeMarks(){
    sizingFrame=0;
    const levels=layer.getContainer()?.children||[];
    for(const level of levels){
      const tile=level.firstElementChild;
      if(!tile)continue;
      const width=tile.getBoundingClientRect().width;
      if(!width)continue;
      const inverse=(256/width).toFixed(5);
      if(level.style.getPropertyValue('--rail-inverse')!==inverse)level.style.setProperty('--rail-inverse',inverse);
    }
    if(zooming)sizingFrame=requestAnimationFrame(sizeMarks);
  }
  function queueSizing(){if(!sizingFrame)sizingFrame=requestAnimationFrame(sizeMarks);}
  map.on('zoomstart',()=>{zooming=true;queueSizing();});
  map.on('zoomend',()=>{zooming=false;queueSizing();});
  layer.on('tileload',queueSizing);
  return layer.addTo(map);
}
