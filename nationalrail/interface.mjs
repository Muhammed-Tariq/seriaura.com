import {normalise} from './matching.mjs';

export function configureTheme(choices) {
  const key='seriaura:rail-theme',system=matchMedia('(prefers-color-scheme: dark)');
  let choice='system';
  function apply(){
    for(const input of choices?.querySelectorAll('input')||[])input.checked=input.value===choice;
    document.documentElement.dataset.theme=choice==='system'?(system.matches?'dark':'light'):choice;
  }
  function restore(){
    try{const saved=localStorage.getItem(key);choice=['dark','light'].includes(saved)?saved:'system';}catch{}
    apply();
  }
  choices?.addEventListener('change',event=>{
    if(!['system','light','dark'].includes(event.target.value))return;
    choice=event.target.value;apply();try{localStorage.setItem(key,choice);}catch{}
  });
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null)restore();});
  window.addEventListener('pageshow',event=>{if(event.persisted)restore();});
  system.addEventListener('change',apply);restore();
}

export function buildRegions(stations) {
  const regions=new Map();
  function add(name,id){
    if(!regions.has(name))regions.set(name,{name,id:'region:'+name,network:'Regions',color:'#6f8c70',stationIds:[],members:new Set()});
    const group=regions.get(name);group.stationIds.push(id);group.members.add(id);
    return group;
  }
  const countries=new Set(['Scotland','Wales','Northern Ireland']);
  for(const s of stations){
    const group=add(s.region,s.id);
    if(!countries.has(s.region)){group.parent='England';add('England',s.id);}
  }
  return regions;
}

export function regionMatches(region,text){
  const answer=normalise(text);
  const simplified=r=>normalise(r).replace(/^greater/,'').replace(/andthehumber$/,'');
  return [normalise(region),simplified(region),simplified(region)+'england'].includes(answer);
}

// The world ring is shaded, with each selected polygon cut out by the even-odd fill rule.
export function regionMask(map,feature,renderer){
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const rings=[[[-85,-179],[-85,179],[85,179],[85,-179]]];
  for(const polygon of polygons)for(const ring of polygon)rings.push(ring.map(([lon,lat])=>[lat,lon]));
  return L.polygon(rings,{pane:'regionShade',renderer,interactive:false,stroke:false,fill:true,fillColor:'#848990',fillOpacity:.73,fillRule:'evenodd',smoothFactor:.5}).addTo(map);
}
