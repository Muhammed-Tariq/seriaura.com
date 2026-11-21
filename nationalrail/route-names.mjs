import {normalise} from './matching.mjs';

const overseasEurostarTermini=new Set(['Bruxelles','Paris Gare du Nord','Amsterdam Centraal']);

// Parse once. Render and search the same masked text, including accessible labels.
export function prepareRouteNames(stations,lines) {
  const index=new Map(), spellings=new Set();
  for(const s of stations){
    for(const name of [s.name,...s.aliases]){
      for(const text of [name,name.replace(/^London /i,''),name.replace(/\s*\([^)]*\)\s*$/,'')]){
        const key=normalise(text);if(!key)continue;
        if(!index.has(key))index.set(key,new Set());index.get(key).add(s.id);spellings.add(text);
      }
    }
  }
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp('(?<![\\p{L}\\p{N}])(?:'+[...spellings].filter(Boolean).sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![\\p{L}\\p{N}])','giu');
  const byId=new Map(stations.map(station=>[station.id,station]));
  for(const line of lines){
    const parts=[];
    function token(text,endpoint,lookup=text){
      const aliases=index.get(normalise(lookup))||index.get(normalise(lookup.replace(/^London /i,'')));
      const local=aliases?[...aliases].filter(id=>line.members.has(id)):[];
      let ids=local.length?local:[...(aliases||[])];
      if(endpoint&&!ids.length){
        // Some services give just the town, e.g. Belfast for Belfast Grand Central.
        const prefix=lookup.toLowerCase()+' ';
        ids=line.stationIds.filter(id=>byId.get(id).name.toLowerCase().startsWith(prefix));
      }
      parts.push({text,ids});
    }
    function words(text){
      let last=0;
      for(const m of text.matchAll(pattern)){parts.push(text.slice(last,m.index));token(m[0],false);last=m.index+m[0].length;}
      parts.push(text.slice(last));
    }
    const looseEndpoint={
      'London Kings X':"London King’s Cross",'Newcastle Central':'Newcastle','Stoke':'Stoke-on-Trent',
      'Windsor+Eton Riverside':'Windsor and Eton Riverside','Wolvrhampton Station':'Wolverhampton Station',
      'Wolvrhampton St Georges':'Wolverhampton St Georges','intu Trafford Centre':'The Trafford Centre',
      'Glasgow High Street':'High Street (Glasgow)','St Albans':'St Albans City','Ashford (Kent)':'Ashford International'
    };
    function endpoint(text){
      if(line.network==='Eurostar International Ltd'&&overseasEurostarTermini.has(text)){
        parts.push(text);return;
      }
      if(index.has(normalise(text))){token(text,true);return;}
      const clean=text.replace(/ Station$/i,'').replace(/^Whistlestop Valley /,'');
      if(looseEndpoint[text]||index.has(normalise(clean))){token(text,true,looseEndpoint[text]||clean);return;}
      const split=text.split(/( via | and | & | \(via | \(|\))/i).filter(Boolean);
      if(split.length>1){
        for(const part of split){
          if(/^(?: via | and | & | \(via | \(|\))$/i.test(part))parts.push(part);
          else if(/ Line$/.test(part))words(part);
          else token(part,true,looseEndpoint[part]||part);
        }
        return;
      }
      token(text,true);
    }
    const chunks=line.name.split(/(\s*(?:↔|→|<->|->|=>|\bto\b| – | - )\s*)/i);
    if(chunks.length>1){
      chunks.forEach((chunk,i)=>{
        if(i%2){parts.push(chunk);return;}
        const prefix=chunk.match(/^(Line \d+ · |Train: )/i);
        if(prefix){parts.push(prefix[0]);chunk=chunk.slice(prefix[0].length);}
        endpoint(chunk);
      });
    }else if(/^(?:Belfast-|Coleraine-|Ashford-|Ramsgate-|London Bridge-|Marlow–)/.test(line.name)){
      const tokens=line.name.split(/([/–-])/);
      tokens.forEach((t,i)=>i%2?parts.push(t):endpoint(t));
    }else words(line.name);
    line.titleParts=parts;
  }
}
export function routeTitle(line,found){
  return line.titleParts.map(part=>{
    if(typeof part==='string')return part;
    return part.ids.some(id=>found.has(id))?part.text:'[UNKNOWN]';
  }).join('');
}
