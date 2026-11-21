export function normalise(value) {
  return String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/&/g,' and ').replace(/[’']/g,'')
    .replace(/\b(st|saint)\.?\b/g,'saint').replace(/\bmt\.?\b/g,'mount')
    .replace(/\b(rd|road)\.?\b/g,'road').replace(/\b(intl|int|international)\.?\b/g,'international')
    .replace(/\b(jct|jn|junction)\.?\b/g,'junction')
    .replace(/\b(pkwy|parkway)\.?\b/g,'parkway')
    .replace(/\b(railway|rail|underground|overground|dlr|tram) station\b/g,'')
    .replace(/[^a-z0-9]/g,'');
}

export function oneEditApart(a,b) {
  if (Math.abs(a.length-b.length)>1) return false;
  if (a===b) return true;
  let i=0;
  while(i<a.length && i<b.length && a[i]===b[i]) i++;
  if(a.length===b.length) {
    if(a.slice(i+1)===b.slice(i+1)) return true;
    return a[i]===b[i+1] && a[i+1]===b[i] && a.slice(i+2)===b.slice(i+2);
  }
  return a.length>b.length ? a.slice(i+1)===b.slice(i) : a.slice(i)===b.slice(i+1);
}

export function createMatcher(stations) {
  const names=new Map();
  const add=(map,key,s)=>{if(!key)return;if(!map.has(key))map.set(key,new Set());map.get(key).add(s.id);};
  for(const s of stations) {
    for(const alias of [s.name,...(s.aliases||[])]) add(names,normalise(alias),s);
  }
  return input=>{
    const raw=input.trim(), key=normalise(raw);
    if(!key) return {kind:'empty',ids:[]};
    if(names.has(key)) return {kind:'exact',ids:[...names.get(key)]};
    if(key.length<=3) return {kind:'missing',ids:[]};
    const matches=new Set();
    for(const [name,ids] of names) if(name.length>=4 && oneEditApart(key,name)) for(const id of ids) matches.add(id);
    return {kind:matches.size?'fuzzy':'missing',ids:[...matches]};
  };
}

export const SAVE_KEY='seriaura:nationalrail:v1';
export function parseSave(raw,validIds) {
  if(!raw) return {found:[],rejected:false};
  try {
    const data=JSON.parse(raw);
    if(data.version!==1 || !Array.isArray(data.found) || !data.found.every(x=>typeof x==='string')) throw Error('Invalid save');
    return {found:[...new Set(data.found.filter(id=>validIds.has(id)))],rejected:false};
  } catch {return {found:[],rejected:true};}
}
