import {createMatcher,parseSave,SAVE_KEY} from './matching.mjs';

const $=id=>document.getElementById(id);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let data,stations,lines,found=new Set(),matcher,map,overlay,tab='lines',selected=null,saveAvailable=true,notificationTimer,completionTimer;
const byId=new Map(),byLine=new Map(),regions=new Map();
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>n.toLocaleString('en-GB');
function notify(message,kind='info',duration=4500){clearTimeout(notificationTimer);const el=$('notification');el.textContent=message;el.dataset.kind=kind;el.hidden=false;notificationTimer=setTimeout(()=>{el.hidden=true},duration);}
function completed(message){clearTimeout(completionTimer);$('completion-message').textContent=message;$('completion-message').hidden=false;completionTimer=setTimeout(()=>$('completion-message').hidden=true,9000);}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,found:[...found],updatedAt:new Date().toISOString()}));saveAvailable=true;$('save-status').textContent='Saved on this device';}catch{saveAvailable=false;$('save-status').textContent='Saving unavailable — this session only';}}
function updateProgress(){const pct=100*found.size/stations.length;$('total-found').textContent=number(found.size);$('total-count').textContent=number(stations.length);$('total-percent').textContent=pct.toFixed(1);$('overall-progress').value=pct;$('overall-progress').textContent=pct.toFixed(1)+'%';renderList();overlay?.schedule();}
function getGroups(){return tab==='lines'?lines:[...regions.values()];}
function renderList(){if(!data)return;const filter=$('progress-filter').value.trim().toLowerCase();const groups=getGroups().filter(g=>(g.name+' '+g.network).toLowerCase().includes(filter));const fragment=document.createDocumentFragment();let heading='';
 for(const g of groups){if(tab==='lines'&&g.network!==heading){heading=g.network;const title=document.createElement('h2');title.className='progress-group-heading';title.textContent=heading;fragment.append(title);}
 const count=g.stationIds.filter(id=>found.has(id)).length,total=g.stationIds.length;const row=document.createElement('button');row.type='button';row.className='progress-row'+(selected?.id===g.id?' is-selected':'')+(count===total?' is-complete':'');row.style.setProperty('--line-color',g.color);row.dataset.group=g.id;row.setAttribute('aria-pressed',String(selected?.id===g.id));row.setAttribute('aria-label',`${g.name}: ${count} of ${total} stations found. Show on map.`);
 row.innerHTML=`<span class="line-dot" aria-hidden="true"></span><span class="progress-name">${escapeHTML(g.name)}</span><span class="progress-count">${count===total?'✓ ':''}${count} / ${total}</span><span class="progress-track" aria-hidden="true"><span class="progress-fill" style="display:block;width:${100*count/total}%"></span></span>`;
 row.addEventListener('click',()=>{selected=selected?.id===g.id?null:g;renderList();if(selected){const bounds=L.latLngBounds(g.stationIds.map(id=>byId.get(id)).map(s=>[s.lat,s.lon]));map.flyToBounds(bounds,{padding:[40,90],maxZoom:13,animate:!reducedMotion.matches,duration:.9});}overlay.schedule();if(innerWidth<=700)toggleSidebar(false);});fragment.append(row);}
 if(!groups.length){const p=document.createElement('p');p.className='empty-state';p.textContent='No matching '+(tab==='lines'?'lines':'regions')+'.';fragment.append(p);}$('progress-list').replaceChildren(fragment);
}
function setTab(next){tab=next;selected=null;overlay?.schedule();for(const type of ['lines','regions']){const b=$(type+'-tab');b.setAttribute('aria-selected',String(type===next));b.tabIndex=type===next?0:-1;}$('progress-list').setAttribute('aria-labelledby',next+'-tab');$('progress-filter').placeholder=next==='lines'?'Find a line.':'Find a region.';$('progress-filter').value='';renderList();}
function toggleSidebar(open){$('sidebar').classList.toggle('is-open',open);$('toggle-progress').setAttribute('aria-expanded',String(open));}
function accept(ids,kind){const all=ids.map(id=>byId.get(id)),fresh=all.filter(s=>!found.has(s.id));$('station-input').value='';$('station-input').focus({preventScroll:true});if(!fresh.length){notify(`${all.map(s=>s.name).join(', ')} — already found.`);return;}
 const touched=new Set(fresh.flatMap(s=>s.lines)),previousComplete=new Set([...touched].filter(id=>byLine.get(id).stationIds.every(s=>found.has(s))));for(const s of fresh)found.add(s.id);save();updateProgress();
 const won=[...touched].map(id=>byLine.get(id)).filter(l=>l.id!=='unassigned'&&!previousComplete.has(l.id)&&l.stationIds.every(id=>found.has(id)));
 const names=fresh.map(s=>s.name).join(', ');notify(`${names}${kind==='fuzzy'?' — typo accepted':''}. ${fresh.length>1?fresh.length+' stations found.':'Found!'}`,'success');
 if(won.length)completed(`${won.map(l=>l.name).join(' · ')} complete! All stations in the loaded line inventory found.`);
 if(found.size===stations.length)completed('Every station in this dataset found. A remarkable railway memory!');
 const s=fresh[0];overlay.highlight=s.id;map.stop();map.flyTo([s.lat,s.lon],Math.max(12,Math.min(map.getZoom(),15)),{duration:reducedMotion.matches?0:1.15,animate:!reducedMotion.matches});
}
function guess(event){event.preventDefault();if(!matcher)return;const input=$('station-input').value,result=matcher(input);if(result.kind==='empty')return;if(!result.ids.length){notify('No match yet. Try the full station name or an exact CRS code.');$('station-input').select();return;}
 const candidates=result.ids.map(id=>byId.get(id));
 // A shared name at genuinely different places is a choice, not free credit.
 if(candidates.length>1){const el=$('notification');clearTimeout(notificationTimer);el.replaceChildren();el.hidden=false;const label=document.createElement('span');label.textContent='Which station did you mean? ';el.append(label);for(const s of candidates){const button=document.createElement('button');button.type='button';button.className='station-choice';button.textContent=`${s.name} · ${s.region}${s.crs.length?' ('+s.crs[0]+')':''}`;button.addEventListener('click',()=>accept([s.id],result.kind));el.append(button);}return;}
 accept(result.ids,result.kind);
}

// One canvas for the entire network avoids tens of thousands of DOM elements.
// Track vertices retain their mapped shape; station names are drawn only after discovery.
const project=(lat,lon)=>{const sin=Math.sin(Math.max(-85,Math.min(85,lat))*Math.PI/180);return [(lon+180)/360,(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))];};
class NetworkCanvas {
 constructor(map,tracks){this.map=map;this.canvas=document.createElement('canvas');this.canvas.className='network-canvas';this.canvas.setAttribute('aria-hidden','true');map.getContainer().append(this.canvas);this.ctx=this.canvas.getContext('2d');this.pending=false;this.highlight=null;
 this.tracks=tracks.map(t=>{const points=t.coordinates.map(([lat,lon])=>project(lat,lon));const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {...t,points,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),colours:[...new Set(t.lines.map(id=>byLine.get(id)?.color).filter(Boolean))].slice(0,4)};});
 // Cache overview geometry in projected coordinates. One stroke per colour avoids
 // rebuilding and stroking 100,000 individual track paths on every zoom frame.
 this.overview=[];const batches=new Map(),tolerance=.3/(256*2**10);
 for(const track of this.tracks){
  if(track.minZoom&&track.minZoom>=11)continue;
  const colour=track.colours[0]||'#8393aa',opacity=track.lines.length?.78:.38,key=colour+':'+opacity+':'+(track.minZoom||0);
  let batch=batches.get(key);if(!batch){batch={path:new Path2D(),colour,opacity,minZoom:track.minZoom};batches.set(key,batch);}
  const points=track.points;if(!points.length)continue;let last=points[0];batch.path.moveTo(last[0],last[1]);
  for(let i=1;i<points.length;i++){const point=points[i];if(i===points.length-1||Math.abs(point[0]-last[0])+Math.abs(point[1]-last[1])>=tolerance){batch.path.lineTo(point[0],point[1]);last=point;}}
 }
 this.overview=[...batches.values()];
 this.stations=stations.map(s=>({...s,projected:[project(s.lat,s.lon)]}));this.onMove=()=>this.schedule();
 // An invisible proxy follows Leaflet's exact CSS easing. Redraw vectors at its
 // current camera each frame rather than magnifying a bitmap. The proxy must
 // live inside mapPane: Leaflet puts its zoom animation class on that pane,
 // not on the map container. Otherwise its computed transform jumps instantly.
 this.zoomProxy=document.createElement('div');this.zoomProxy.className='leaflet-zoom-animated';
 this.zoomProxy.style.cssText='position:absolute;width:1px;height:1px;visibility:hidden;pointer-events:none;transform-origin:0 0';map.getPane('mapPane').append(this.zoomProxy);
 this.onZoomAnim=event=>{
  if(!this.view)return;
  this.animating=true;cancelAnimationFrame(this.zoomFrame);const start={...this.view};
  const scale=map.getZoomScale(event.zoom,this.view.zoom),size=map.getSize(),center=project(event.center.lat,event.center.lng),world=256*2**this.view.zoom;
  const offset=L.point(size.x/2-(center[0]*world-this.view.left)*scale,size.y/2-(center[1]*world-this.view.top)*scale);
  this.zoomProxy.style.transition='none';L.DomUtil.setTransform(this.zoomProxy,L.point(0,0),1);
  void this.zoomProxy.offsetWidth;this.zoomProxy.style.transition='';L.DomUtil.setTransform(this.zoomProxy,offset,scale);
  const frame=()=>{if(!this.animating)return;const matrix=new DOMMatrixReadOnly(getComputedStyle(this.zoomProxy).transform);
   this.draw({zoom:start.zoom+Math.log2(matrix.a),left:start.left*matrix.a-matrix.e,top:start.top*matrix.a-matrix.f});
   this.zoomFrame=requestAnimationFrame(frame);
  };this.zoomFrame=requestAnimationFrame(frame);
 };
 this.onZoomEnd=()=>{this.animating=false;cancelAnimationFrame(this.zoomFrame);this.draw();};
 map.on('move zoom resize',this.onMove);map.on('zoomanim',this.onZoomAnim);map.on('zoomend',this.onZoomEnd);this.schedule();
 }
 schedule(){if(!this.pending){this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.draw()});}}
 draw(camera){if(this.animating&&!camera)return;const size=this.map.getSize(),dpr=devicePixelRatio||1,c=this.canvas,ctx=this.ctx,w=size.x,h=size.y;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.width=w+'px';c.style.height=h+'px';}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const zoom=camera?.zoom??this.map.getZoom(),scale=256*2**zoom,center=this.map.getCenter(),p=project(center.lat,center.lng),left=camera?.left??p[0]*scale-w/2,top=camera?.top??p[1]*scale-h/2,minX=(left-20)/scale,maxX=(left+w+20)/scale,minY=(top-20)/scale,maxY=(top+h+20)/scale,chosen=selected&&new Set(selected.stationIds);
 if(!camera)this.view={zoom,left,top};
 const smooth=(a,b)=>{const t=Math.max(0,Math.min(1,(zoom-a)/(b-a)));return t*t*(3-2*t);},detail=smooth(10,12),width=.8+.9*smooth(6,13);
 ctx.lineCap='round';ctx.lineJoin='round';
 if(zoom<10&&!selected){
  ctx.setTransform(dpr*scale,0,0,dpr*scale,-left*dpr,-top*dpr);
  ctx.lineWidth=width/scale;
  for(const batch of this.overview){const visibility=batch.minZoom?smooth(batch.minZoom-.5,batch.minZoom+.5):1;if(!visibility)continue;ctx.globalAlpha=batch.opacity*visibility;ctx.strokeStyle=batch.colour;ctx.stroke(batch.path);}
  ctx.setTransform(dpr,0,0,dpr,0,0);
 }else for(const t of this.tracks){if(t.maxX<minX||t.minX>maxX||t.maxY<minY||t.minY>maxY)continue;const visibility=t.minZoom?smooth(t.minZoom-.5,t.minZoom+.5):1;if(!visibility)continue;const active=!selected||(tab==='lines'?t.lines.includes(selected.id):true);const opacity=(active?(t.lines.length?.78:.38):.10)*visibility;ctx.globalAlpha=opacity;const colours=t.colours.length?t.colours:['#8393aa'];const display=selected&&selected.id.startsWith('region:')===false&&t.lines.includes(selected.id)?[selected.color]:colours;
 for(let k=0;k<display.length;k++){ctx.globalAlpha=opacity*(k===0?1:detail);if(!ctx.globalAlpha)continue;const offset=(k-(display.length-1)/2)*(width+.35)*detail;ctx.beginPath();for(let i=0;i<t.points.length;i++){const pt=t.points[i],prev=t.points[Math.max(0,i-1)],next=t.points[Math.min(t.points.length-1,i+1)],dx=next[0]-prev[0],dy=next[1]-prev[1],length=offset?(Math.hypot(dx,dy)||1):1;const x=pt[0]*scale-left-dy/length*offset,y=pt[1]*scale-top+dx/length*offset;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=display[k];ctx.lineWidth=width;ctx.stroke();}}
 const radius=1.6+1.8*smooth(6,13);const labels=[];
 for(const s of this.stations){const isFound=found.has(s.id);ctx.globalAlpha=!chosen||chosen.has(s.id)?1:.16;for(const pt of s.projected){const x=pt[0]*scale-left,y=pt[1]*scale-top;if(x<-8||x>w+8||y<-8||y>h+8)continue;ctx.beginPath();ctx.arc(x,y,radius+(isFound?.8:0),0,2*Math.PI);ctx.fillStyle=isFound?'#34876c':'#fff';ctx.fill();ctx.strokeStyle=isFound?'#1a5e4b':'#58677b';ctx.lineWidth=isFound?1.2:.7;ctx.stroke();if(s.id===this.highlight){ctx.beginPath();ctx.arc(x,y,radius+6,0,2*Math.PI);ctx.strokeStyle='#34876c99';ctx.lineWidth=2;ctx.stroke();}if(isFound&&zoom>=11&&pt===s.projected[0])labels.push({x,y,name:s.name});}}
 ctx.globalAlpha=1;ctx.font='500 11px "Space Grotesk", sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#ffffffee';ctx.fillStyle='#245e4c';const occupied=[];for(const l of labels){const width=ctx.measureText(l.name).width,box=[l.x+7,l.y-8,width,14];if(occupied.some(b=>box[0]<b[0]+b[2]&&box[0]+box[2]>b[0]&&box[1]<b[1]+b[3]&&box[1]+box[3]>b[1]))continue;ctx.strokeText(l.name,l.x+7,l.y+3);ctx.fillText(l.name,l.x+7,l.y+3);occupied.push(box);}
 }
}

async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url} (${r.status})`);return r.json();}
async function start(){try{
 if(!window.L)throw Error('The map library could not load.');
 map=L.map('map',{zoomControl:true,minZoom:4,maxZoom:18,zoomSnap:.25,preferCanvas:true,zoomAnimation:!reducedMotion.matches,fadeAnimation:!reducedMotion.matches,attributionControl:true});map.fitBounds([[49.85,-8.25],[59.5,1.8]],{padding:[20,25]});
 map.createPane('geography');map.getPane('geography').style.zIndex=150;
 map.attributionControl.addAttribution('Railway data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>');
 getJSON('data/basemap.json').then(base=>L.geoJSON(base,{pane:'geography',renderer:L.canvas({pane:'geography'}),interactive:false,attribution:'Geography: <a href="https://www.naturalearthdata.com/">Natural Earth</a>',style:f=>f.properties.kind==='land'?{color:'#c4d1e7',weight:.7,fillColor:'#dce5f5',fillOpacity:1}:f.properties.kind==='river'?{color:'#b3c7e7',weight:1,opacity:.8}:{color:'#bdcee8',weight:.5,fillColor:'#c3d3ec',fillOpacity:1}}).addTo(map)).catch(()=>{});
 
const CARTO_KEY = 'cb1_59o7_1_3b3169b0f692de61e95efeb4';

const tiles = L.tileLayer(
  `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
  {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ' +
      '© <a href="https://carto.com/attributions">CARTO</a>'
  }
).addTo(map);

 let tileErrors=0;tiles.on('tileerror',()=>{if(++tileErrors===4){map.removeLayer(tiles);notify('Using the local coastline map. Railway data and guesses still work.', 'info',8000);}});
 [data]=await Promise.all([getJSON('data/network.json')]);stations=data.stations;lines=data.lines.sort((a,b)=>a.network==='Transport for London'&&b.network!=='Transport for London'?-1:b.network==='Transport for London'&&a.network!=='Transport for London'?1:a.network.localeCompare(b.network)||a.name.localeCompare(b.name));
 for(const s of stations){byId.set(s.id,s);const id='region:'+s.region;if(!regions.has(s.region))regions.set(s.region,{id,name:s.region,network:'Regions',color:'#6f8c70',stationIds:[]});regions.get(s.region).stationIds.push(s.id);}for(const l of lines)byLine.set(l.id,l);
 let restored;try{restored=parseSave(localStorage.getItem(SAVE_KEY),new Set(byId.keys()));}catch{restored={found:[],rejected:false};saveAvailable=false;}$('save-status').textContent=saveAvailable?'Progress saves on this device':'Saving unavailable — this session only';found=new Set(restored.found);if(restored.rejected)notify('Saved progress could not be read. Your old save has not been overwritten.', 'info',10000);
 matcher=createMatcher(stations);updateProgress();$('station-input').disabled=false;$('guess-submit').disabled=false;
 // Station guessing is ready before the larger track geometry download finishes.
 overlay=new NetworkCanvas(map,[]);const tracks=await getJSON('data/tracks.json');map.off('move zoom resize',overlay.onMove);map.off('zoomanim',overlay.onZoomAnim);map.off('zoomend',overlay.onZoomEnd);cancelAnimationFrame(overlay.zoomFrame);overlay.zoomProxy.remove();overlay.canvas.remove();overlay=new NetworkCanvas(map,tracks);$('map-loading').hidden=true;
 document.documentElement.dataset.railReady='true';
 getJSON('data/coverage.json').then(report=>{$('coverage-summary').textContent=`${number(report.counts.stations)} stations in this snapshot. All ${number(report.checks.orr.expected)} stations in the ORR ${report.checks.orr.asOf} inventory are represented. Full UK coverage, heritage coverage and service assignments remain under audit. See the detailed report for missing or unverified records.`;}).catch(()=>{});
 }catch(error){console.error(error);$('map-loading').hidden=true;const box=$('map-error');box.hidden=false;box.textContent='The railway map could not finish loading. ';const retry=document.createElement('button');retry.textContent='Try again';retry.addEventListener('click',()=>location.reload());box.append(retry);}}

$('guess-form').addEventListener('submit',guess);
$('progress-filter').addEventListener('input',renderList);
for(const t of ['lines','regions']){$(t+'-tab').addEventListener('click',()=>setTab(t));$(t+'-tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'lines':e.key==='End'?'regions':tab==='lines'?'regions':'lines';setTab(next);$(next+'-tab').focus();}});}
$('toggle-progress').addEventListener('click',()=>toggleSidebar(!$('sidebar').classList.contains('is-open')));
$('fit-map').addEventListener('click',()=>{selected=null;renderList();map?.flyToBounds([[49.85,-8.25],[59.5,1.8]],{padding:[20,25],animate:!reducedMotion.matches});toggleSidebar(false);});
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());$('reset-button').addEventListener('click',()=>$('reset-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('confirm-reset').addEventListener('click',()=>{if(!data)return;found.clear();save();updateProgress();$('reset-dialog').close();$('completion-message').hidden=true;if(overlay)overlay.highlight=null;notify('Progress reset. A fresh railway awaits.');$('station-input').focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleSidebar(false);selected=null;renderList();overlay?.schedule();}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('station-input').focus();}});
window.addEventListener('storage',e=>{if(e.key!==SAVE_KEY||!data)return;const state=parseSave(e.newValue,new Set(byId.keys()));if(!state.rejected){found=new Set(state.found);updateProgress();$('save-status').textContent='Updated from another tab';}});
start();
