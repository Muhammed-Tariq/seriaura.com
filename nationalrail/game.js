import {createRailLayer} from './rail-layer.mjs';
import {prepareRouteNames,routeTitle} from './route-names.mjs';
import {configureTheme,buildRegions,regionMatches,regionMask} from './interface.mjs';
import {normalise,createMatcher,parseSave,SAVE_KEY} from './matching.mjs';

const $=id=>document.getElementById(id);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let data,stations,lines,found=new Set(),matcher,map,overlay,tab='lines',selected=null,saveAvailable=true,notificationTimer,completionTimer;
const byId=new Map(),byLine=new Map();
let regions,boundaryRequest,shade,shadeRenderer,challenge;
const openRegions=new Set(),expandedLines=new Set();
const address=window.location;
if(['/nationalrail/','/nationalrail/index.html'].includes(address.pathname)){
 window.history.replaceState(window.history.state,'','/nationalrail'+address.search+address.hash);
}
function updateLineContents(panel,group){
 const names=group.stationIds.filter(id=>found.has(id)).map(id=>byId.get(id).name).sort((a,b)=>a.localeCompare(b,'en-GB'));
 panel.textContent=names.join(' · ');
 const remaining=group.stationIds.length-names.length;
 if(remaining){const unknown=document.createElement('span');unknown.className='unnamed-count';unknown.textContent=(names.length?' · ':'')+remaining+' unnamed';panel.append(unknown);}
}
function appendLine(parent,row,group){
 const section=document.createElement('div');section.className='line-section';
 const header=document.createElement('div');header.className='line-header';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='line-toggle';
 const panel=document.createElement('div');panel.className='line-stations';panel.id='stations-'+group.id;
 const fold=document.createElement('div');fold.className='line-fold';
 const clip=document.createElement('div');clip.className='line-clip';clip.append(panel);fold.append(clip);
 toggle.setAttribute('aria-controls',panel.id);
 function sync(){
  const open=expandedLines.has(group.id);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',(open?'Collapse ':'Expand ')+row.querySelector('.progress-name').textContent+' stations');
  fold.inert=!open;fold.classList.toggle('is-open',open);if(open)updateLineContents(panel,group);
 }
 toggle.onclick=()=>{if(expandedLines.has(group.id))expandedLines.delete(group.id);else expandedLines.add(group.id);sync();};
 sync();header.append(row,toggle);section.append(header,fold);parent.append(section);
}
configureTheme($('theme'));
$('appearance-button').addEventListener('click',()=>$('appearance-dialog').showModal());
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayTitle=name=>escapeHTML(name).replaceAll('[UNKNOWN]','<span class="unknown-name">[UNKNOWN]</span>');
const number=n=>n.toLocaleString('en-GB');
function notify(message,kind='info',duration=kind==='success'?1800:4500){
 clearTimeout(notificationTimer);
 const el=$('notification');el.classList.remove('toast-enter','toast-leave');
 el.textContent=message;el.dataset.kind=kind;el.hidden=false;
 if(!reducedMotion.matches){void el.offsetWidth;el.classList.add('toast-enter');}
 notificationTimer=setTimeout(()=>{
  if(reducedMotion.matches){el.hidden=true;return;}
  el.classList.replace('toast-enter','toast-leave');
  notificationTimer=setTimeout(()=>{el.hidden=true;},130);
 },duration);
}
function completed(message){clearTimeout(completionTimer);$('completion-message').textContent=message;$('completion-message').hidden=false;completionTimer=setTimeout(()=>$('completion-message').hidden=true,9000);}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,found:[...found],updatedAt:new Date().toISOString()}));saveAvailable=true;$('save-status').hidden=true;}catch{saveAvailable=false;$('save-status').hidden=false;$('save-status').textContent='Saving unavailable — this session only';}}
function refreshCounts(){
 const list=$('progress-list');
 if(!$('progress-filter').value && list.querySelector('.progress-row')){
  for(const row of list.querySelectorAll('.progress-row')){
   const g=tab==='lines'?byLine.get(row.dataset.group):regions.get(row.dataset.group.slice(7));
   if(!g)continue;
   const count=g.stationIds.reduce((sum,id)=>sum+found.has(id),0);
   if(count===Number(row.dataset.count)&&!g.titleParts)continue;
   const name=g.titleParts?routeTitle(g,found):g.name;
   if(count===Number(row.dataset.count)&&row.querySelector('.progress-name').textContent===name)continue;
   const panel=row.closest('.line-section')?.querySelector('.line-stations');
   if(panel){const open=expandedLines.has(g.id);if(open)updateLineContents(panel,g);row.nextElementSibling.setAttribute('aria-label',(open?'Collapse ':'Expand ')+name+' stations');}
   row.dataset.count=count;row.classList.toggle('is-complete',count===g.stationIds.length);
   row.querySelector('.progress-name').innerHTML=displayTitle(name);
   row.querySelector('.progress-count').textContent=count+' / '+g.stationIds.length;
   row.querySelector('.progress-fill').style.width=100*count/g.stationIds.length+'%';
   row.setAttribute('aria-label',name+' — '+count+' of '+g.stationIds.length+' stations found. Show on map.');
  }
 }else renderList();
}
function updateProgress(){const pct=100*found.size/stations.length;$('total-found').textContent=number(found.size);$('total-count').textContent=number(stations.length);$('total-percent').textContent=pct.toFixed(1);$('overall-progress').value=pct;$('overall-progress').textContent=pct.toFixed(1)+'%';refreshCounts();overlay?.schedule();}
let shadeVersion=0;
async function setSelection(group){
 selected=group;overlay?.schedule();
 const version=++shadeVersion,pane=map?.getPane('regionShade');
 if(!pane)return;
 if(shade){
  pane.style.opacity='0';
  if(!reducedMotion.matches)await new Promise(resolve=>setTimeout(resolve,135));
  if(version!==shadeVersion)return;
  shade.remove();shade=null;
 }
 if(!group?.id.startsWith('region:'))return;
 try{
  boundaryRequest??=getJSON('data/regions.json').then(collection=>new Map(collection.features.map(f=>[f.properties.name,f])));
  const features=await boundaryRequest;
  if(version!==shadeVersion)return;
  shade=regionMask(map,features.get(group.name),shadeRenderer);
  pane.getBoundingClientRect();
  pane.style.opacity='1';
 }catch{boundaryRequest=null;if(selected===group)notify('Could not load the region boundary. Select it again to retry.');}
}
function renderList(){
 if(!data||!regions)return;
 const filter=$('progress-filter').value.trim().toLowerCase();
 const list=document.createDocumentFragment(),containers=new Map();let heading='';
 const groups=tab==='lines'?lines:[...regions.values()].sort((a,b)=>Number(!!a.parent)-Number(!!b.parent)||a.name.localeCompare(b.name));
 for(const g of groups){
  const name=g.titleParts?routeTitle(g,found):g.name;
  const isParent=g.name==='England'&&tab==='regions';
  const matches=(name+' '+g.network+' '+(g.parent||'')).toLowerCase().includes(filter);
  if(!matches&&!(isParent&&groups.some(child=>child.parent===g.name&&child.name.toLowerCase().includes(filter))))continue;
  let parent=containers.get(g.parent)||list;
  if(isParent){
   const details=document.createElement('details');details.className='region-children';
   details.open=!!filter||openRegions.has(g.name);
   details.addEventListener('toggle',()=>{if(!filter){if(details.open)openRegions.add(g.name);else openRegions.delete(g.name);}});
   const summary=document.createElement('summary');summary.textContent='English regions';details.append(summary);
   containers.set(g.name,details);g.details=details;
  }
  if(tab==='lines'&&heading!==g.network){heading=g.network;const title=document.createElement('h2');title.className='progress-group-heading';title.textContent=heading;list.append(title);}
  const count=g.stationIds.reduce((n,id)=>n+found.has(id),0),total=g.stationIds.length;
  const row=document.createElement('button');row.type='button';row.className='progress-row'+(selected===g?' is-selected':'')+(count===total?' is-complete':'');
  row.style.setProperty('--line-color',g.color);row.dataset.group=g.id;row.dataset.count=count;row.setAttribute('aria-pressed',String(selected===g));
  row.setAttribute('aria-label',name+' — '+count+' of '+total+' stations found. Show on map.');
  row.innerHTML='<span class="line-dot" aria-hidden="true"></span><span class="progress-name">'+displayTitle(name)+'</span><span class="progress-count">'+count+' / '+total+'</span><span class="progress-track"><span class="progress-fill" style="display:block;width:'+100*count/total+'%"></span></span>';
  row.onclick=()=>{setSelection(selected===g?null:g);renderList();if(selected){map.flyToBounds(L.latLngBounds(g.stationIds.map(id=>byId.get(id)).map(s=>[s.lat,s.lon])),{padding:[40,90],maxZoom:13,animate:!reducedMotion.matches,duration:.9});}if(innerWidth<=700)toggleSidebar(false);};
  if(tab==='lines')appendLine(parent,row,g);else parent.append(row);if(isParent)parent.append(g.details);
 }
 if(!list.childElementCount){const p=document.createElement('p');p.className='empty-state';p.textContent='No matching '+(tab==='lines'?'lines':'regions')+'.';list.append(p);}
 $('progress-list').replaceChildren(list);
}
function setTab(next){tab=next;setSelection(null);for(const type of ['lines','regions']){const b=$(type+'-tab');b.setAttribute('aria-selected',String(type===next));b.tabIndex=type===next?0:-1;}$('progress-list').setAttribute('aria-labelledby',next+'-tab');$('progress-filter').placeholder=next==='lines'?'Find a line.':'Find a region.';$('progress-filter').value='';renderList();}
function toggleSidebar(open){$('sidebar').classList.toggle('is-open',open);$('toggle-progress').setAttribute('aria-expanded',String(open));}
function accept(ids,kind){const all=ids.map(id=>byId.get(id)),fresh=all.filter(s=>!found.has(s.id));$('station-input').value='';$('station-input').focus({preventScroll:true});if(!fresh.length){notify(`${all.map(s=>s.name).join(', ')} — already found.`);return;}
 const touched=new Set(fresh.flatMap(s=>s.lines)),previousComplete=new Set([...touched].filter(id=>byLine.get(id).stationIds.every(s=>found.has(s))));for(const s of fresh)found.add(s.id);save();updateProgress();
 const won=[...touched].map(id=>byLine.get(id)).filter(l=>l.id!=='unassigned'&&!previousComplete.has(l.id)&&l.stationIds.every(id=>found.has(id)));
 const names=fresh.map(s=>s.name).join(', ');notify(`${names}${kind==='fuzzy'?' — typo accepted':''}. ${fresh.length>1?fresh.length+' stations found.':'Found!'}`,'success');
 if(won.length)completed(`${won.map(l=>routeTitle(l,found)).join(' · ')} complete! All stations in the loaded line inventory found.`);
 if(found.size===stations.length)completed('Every station in this dataset found. A remarkable railway memory!');
 const s=fresh[0];stopArrival();map.stop();armArrival(s);map.flyTo([s.lat,s.lon],Math.max(12,Math.min(map.getZoom(),15)),{duration:reducedMotion.matches?0:.55,animate:!reducedMotion.matches});
}
let arrivalHandler,arrivalMarker,arrivalTimer;
function stopArrival(){
 if(arrivalHandler)map.off('moveend',arrivalHandler);
 arrivalHandler=null;clearTimeout(arrivalTimer);arrivalMarker?.remove();arrivalMarker=null;
}
function armArrival(s){
 if(reducedMotion.matches)return;
 arrivalHandler=()=>{
  if(!map.getBounds().contains([s.lat,s.lon]))return;
  stopArrival();
  arrivalMarker=L.marker([s.lat,s.lon],{interactive:false,keyboard:false,icon:L.divIcon({className:'arrival-marker',html:'<i></i>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map);
  arrivalTimer=setTimeout(stopArrival,480);
 };
 map.on('moveend',arrivalHandler);
 arrivalTimer=setTimeout(arrivalHandler,650);
}
function clearChallenge(){
 challenge=null;$('cancel-location').hidden=true;const field=$('station-input');field.placeholder='Name a station.';field.setAttribute('aria-label','Station name');
 $('input-hint').textContent='';$('input-hint').hidden=true;
}
// Districts distinguish the remaining identical names within a single region.
const districtByStation={
 'osm:node:308477670':'Manchester','osm:node:5398592880':'Westmorland and Furness',
 'osm:node:9561021168':'East Devon','osm:node:12920314580':'Mid Devon',
 'osm:node:11037354553':'Dorset','osm:node:13568075899':'Swindon'
};
const questions={
 region:['Which region is this station in?','Enter the region.'],
 name:['What is the full station name, including its qualifier?','Enter the full station name.'],
 district:['Which local authority district is this station in?','Enter the district.']
};
function ask(candidates,stage,kind){
 challenge={candidates,stage,kind};$('cancel-location').hidden=false;
 const [prompt,placeholder]=questions[stage];
 const field=$('station-input');field.value='';field.placeholder=placeholder;
 $('input-hint').hidden=false;field.setAttribute('aria-label',prompt);$('input-hint').textContent=prompt+' · Esc to cancel';
 $('notification').hidden=true;
}
function guess(event){
 event.preventDefault();if(!matcher)return;
 const field=$('station-input'),input=field.value;
 if(challenge){
  const {stage,candidates,kind}=challenge;
  const answer=normalise(input);
  const matches=candidates.filter(s=>{
    if(stage==='region')return regionMatches(s.region,input);
    if(stage==='district')return normalise(districtByStation[s.id]||'')===answer&&answer.length>0;
    return normalise(s.name)===answer;
  });
  if(!matches.length){notify('That answer does not match. Try again.');field.select();return;}
  if(matches.length>1){
    const sameName=matches.every(s=>normalise(s.name)===normalise(matches[0].name));
    ask(matches,sameName?'district':'name',kind);return;
  }
  clearChallenge();accept([matches[0].id],kind);return;
 }
 const result=matcher(input);if(result.kind==='empty')return;
 if(!result.ids.length){notify('No match yet. Try a station name.');field.select();return;}
 if(result.ids.length>1){ask(result.ids.map(id=>byId.get(id)),'region',result.kind);return;}
 accept(result.ids,result.kind);
}
async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url} (${r.status})`);return r.json();}
async function start(){try{
 if(!window.L)throw Error('The map library could not load.');
 map=L.map('map',{maxBounds:[[46,-15],[64,9]],maxBoundsViscosity:1,zoomControl:true,minZoom:4,maxZoom:18,zoomSnap:.25,preferCanvas:true,zoomAnimation:!reducedMotion.matches,fadeAnimation:!reducedMotion.matches,attributionControl:true});map.fitBounds([[49.85,-8.25],[59.5,1.8]],{padding:[20,25]});
 map.createPane('regionShade').style.cssText='z-index:455;pointer-events:none';shadeRenderer=L.svg({pane:'regionShade'});
 map.createPane('geography');map.getPane('geography').style.zIndex=150;
 map.attributionControl.addAttribution('Railway data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>');
 getJSON('data/basemap.json').then(base=>L.geoJSON(base,{pane:'geography',renderer:L.canvas({pane:'geography'}),interactive:false,attribution:'Geography: <a href="https://www.naturalearthdata.com/">Natural Earth</a>',style:f=>f.properties.kind==='land'?{color:'#c4d1e7',weight:.7,fillColor:'#dce5f5',fillOpacity:1}:f.properties.kind==='river'?{color:'#b3c7e7',weight:1,opacity:.8}:{color:'#bdcee8',weight:.5,fillColor:'#c3d3ec',fillOpacity:1}}).addTo(map)).catch(()=>{});
 
const CARTO_KEY = 'cb1_59o7_1_3b3169b0f692de61e95efeb4';

const tiles = L.tileLayer(
  `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
  {
    noWrap:true,
    subdomains: 'abcd',
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ' +
      '© <a href="https://carto.com/attributions">CARTO</a>'
  }
).addTo(map);

 let tileErrors=0;tiles.on('tileerror',()=>{if(++tileErrors===4){map.removeLayer(tiles);notify('Using the local coastline map. Railway data and guesses still work.', 'info',8000);}});
 data=await getJSON('data/network.json');stations=data.stations;lines=data.lines.sort((a,b)=>a.network==='Transport for London'&&b.network!=='Transport for London'?-1:b.network==='Transport for London'&&a.network!=='Transport for London'?1:a.network.localeCompare(b.network)||a.name.localeCompare(b.name));
 regions=buildRegions(stations);
 for(const s of stations)byId.set(s.id,s);
 for(const l of lines){byLine.set(l.id,l);l.members=new Set(l.stationIds);}
 prepareRouteNames(stations,lines);
 let restored;try{restored=parseSave(localStorage.getItem(SAVE_KEY),new Set(byId.keys()));}catch{restored={found:[],rejected:false};saveAvailable=false;}$('save-status').hidden=saveAvailable;found=new Set(restored.found);if(restored.rejected)notify('Saved progress could not be read. Your old save has not been overwritten.', 'info',10000);
 matcher=createMatcher(stations);updateProgress();$('station-input').disabled=false;$('guess-submit').disabled=false;
 // Station guessing is ready before the larger track geometry download finishes.
 overlay=createRailLayer(map,stations,byLine,()=>({found,selected,highlight:overlay?.highlight}));
 await overlay.setTracks(await getJSON('data/tracks.json'));$('map-loading').hidden=true;
 document.documentElement.dataset.railReady='true';
 getJSON('data/coverage.json').then(report=>{$('coverage-summary').textContent=`${number(report.counts.stations)} stations in this snapshot. All ${number(report.checks.orr.expected)} stations in the ORR ${report.checks.orr.asOf} inventory are represented. Full UK coverage, heritage coverage and service assignments remain under audit. See the detailed report for missing or unverified records.`;}).catch(()=>{});
 }catch(error){console.error(error);$('map-loading').hidden=true;const box=$('map-error');box.hidden=false;box.textContent='The railway map could not finish loading. ';const retry=document.createElement('button');retry.textContent='Try again';retry.addEventListener('click',()=>location.reload());box.append(retry);}}

$('cancel-location').onclick=()=>{clearChallenge();$('station-input').value='';$('notification').hidden=true;$('station-input').focus();};
$('guess-form').addEventListener('submit',guess);
$('progress-filter').addEventListener('input',renderList);
for(const t of ['lines','regions']){$(t+'-tab').addEventListener('click',()=>setTab(t));$(t+'-tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'lines':e.key==='End'?'regions':tab==='lines'?'regions':'lines';setTab(next);$(next+'-tab').focus();}});}
$('toggle-progress').addEventListener('click',()=>toggleSidebar(!$('sidebar').classList.contains('is-open')));
$('fit-map').addEventListener('click',()=>{setSelection(null);renderList();map?.flyToBounds([[49.85,-8.25],[59.5,1.8]],{padding:[20,25],animate:!reducedMotion.matches});toggleSidebar(false);});
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());$('reset-button').addEventListener('click',()=>$('reset-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('confirm-reset').addEventListener('click',()=>{if(!data)return;stopArrival();clearChallenge();found.clear();save();updateProgress();$('reset-dialog').close();$('completion-message').hidden=true;if(overlay)overlay.highlight=null;notify('Progress reset. A fresh railway awaits.');$('station-input').focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(challenge){clearChallenge();$('station-input').value='';$('notification').hidden=true;return;}toggleSidebar(false);setSelection(null);renderList();overlay?.schedule();}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('station-input').focus();}});
window.addEventListener('storage',e=>{if(e.key!==SAVE_KEY||!data)return;const state=parseSave(e.newValue,new Set(byId.keys()));if(!state.rejected){found=new Set(state.found);updateProgress();}});
start();
