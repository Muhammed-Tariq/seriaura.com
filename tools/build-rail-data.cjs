const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {XMLParser}=require('fast-xml-parser');
const proj4=require('./vendor/proj4.cjs');
const osgb='+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs';
const gridPosition=(e,n)=>{const [lon,lat]=proj4(osgb,'WGS84',[e,n]);return {Latitude:lat,Longitude:lon};};
const root=path.join(__dirname,'..'), cache=path.join(root,'.tooling/rail'), out=path.join(root,'nationalrail/data');
fs.mkdirSync(out,{recursive:true});
const read=n=>JSON.parse(fs.readFileSync(path.join(cache,n),'utf8'));
const xml=n=>new XMLParser({ignoreAttributes:false}).parse(fs.readFileSync(path.join(cache,n),'utf8'));
const array=v=>v==null?[]:Array.isArray(v)?v:[v];
const text=v=>typeof v==='object'?v?.['#text']:v;
const key=n=>String(n||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]/g,'');
const clean=n=>String(n||'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s*\([^)]*(?:railway|tram|metro|lines?|for excel)[^)]*\)\s*/gi,' ').replace(/\s+(?:SPT )?(?:Rail|Railway|Underground|Overground|DLR|Tram|Metrolink|Subway|Metro)\s+(?:Station|Stop)$/i,'').replace(/^(Glasgow Central|Glasgow Queen Street|Liverpool Lime Street|Lichfield Trent Valley|Retford|Tamworth|London St Pancras International) (?:High Level|Low Level|LL)$/i,'$1').replace(/^London (Paddington|Euston|Victoria|Waterloo|Waterloo East|Liverpool Street|King's Cross|Kings Cross|St Pancras International|Marylebone|Fenchurch Street|Charing Cross|Cannon Street|Blackfriars)$/i,'$1').trim();
const canonicalRegion=name=>({'London':'Greater London','East Anglia':'East of England','Yorkshire':'Yorkshire and The Humber'}[name]||name);
const distance=(a,b)=>Math.hypot((a.lat-b.lat)*111320,(a.lon-b.lon)*111320*Math.cos(a.lat*Math.PI/180));
const round=n=>+Number(n).toFixed(6);
const palette={bakerloo:'#B36305',central:'#E32017',circle:'#D8B900',district:'#00782A','hammersmith-city':'#D799AF',jubilee:'#868F98',metropolitan:'#9B0056',northern:'#26282A',piccadilly:'#003688',victoria:'#0098D4','waterloo-city':'#66BEB2',dlr:'#00A4A7',elizabeth:'#6950A1',lioness:'#C99F19',mildmay:'#2774AE',windrush:'#D54B40',weaver:'#823B74',suffragette:'#579B4A',liberty:'#687775',tram:'#66A637'};
const operatorColours=[[/Great Western|GWR/i,'#006a57'],[/Northern/i,'#273d82'],[/ScotRail/i,'#3b7baa'],[/South Western/i,'#2999ab'],[/Southeastern/i,'#3972bb'],[/Southern/i,'#568b4b'],[/Thameslink/i,'#a7468b'],[/Great Northern/i,'#705b99'],[/Greater Anglia/i,'#bf3145'],[/West Midlands|London Northwestern/i,'#7c588b'],[/East Midlands/i,'#754a8b'],[/LNER|London North Eastern/i,'#bd293a'],[/Avanti/i,'#197c89'],[/CrossCountry/i,'#943c58'],[/TransPennine/i,'#bd6a34'],[/Wales|TfW/i,'#b6424a'],[/Merseyrail/i,'#bf980c'],[/c2c/i,'#a83d92'],[/Hull Trains/i,'#b7509c'],[/Grand Central/i,'#bb6128'],[/Lumo/i,'#2a6caa'],[/Caledonian/i,'#2d6566'],[/NI Rail|NIR|Translink/i,'#3571a2']];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
const color=s=>/Great Northern/i.test(s)?'#705b99':operatorColours.find(([p])=>p.test(s))?.[1]||`hsl(${parseInt(hash(s).slice(0,4),16)%360} 42% 43%)`;
const stations=[],byAtco=new Map(),byCrs=new Map(),byOsm=new Map(),lines=new Map(),excluded=[],coordinateConflicts=[];
const sourceHashes={};
for(const n of fs.readdirSync(cache).filter(n=>/^(naptan.*xml|nptg.xml|orr-stations.json|ni-stations.json|stations-osm.json|routes-osm.json|tfl-.*json)$/.test(n)))sourceHashes[n]=crypto.createHash('sha256').update(fs.readFileSync(path.join(cache,n))).digest('hex');
const orr=read('orr-stations.json'),ni=read('ni-stations.json'),osm=read('stations-osm.json');
if(osm.remark)throw Error('Incomplete OSM station query: '+osm.remark);
const nptg=xml('nptg.xml').NationalPublicTransportGazetteer;
const areaRegions=new Map();
for(const r of nptg.Regions.Region)for(const a of array(r.AdministrativeAreas?.AdministrativeArea))areaRegions.set(String(a.AdministrativeAreaCode),canonicalRegion(text(r.Name)));
const localities=nptg.NptgLocalities.NptgLocality;
const localityRegions=new Map(localities.map(l=>[l.NptgLocalityCode,areaRegions.get(String(l.AdministrativeAreaRef))]));
const localityGrid=new Map();
for(const l of localities){const p=l.Location?.Translation;if(!p)continue;const k=`${Math.floor(p.Latitude*5)},${Math.floor(p.Longitude*5)}`;if(!localityGrid.has(k))localityGrid.set(k,[]);localityGrid.get(k).push({lat:p.Latitude,lon:p.Longitude,region:localityRegions.get(l.NptgLocalityCode)});}
function regionAt(p){if(p.lon<-5.4&&p.lat>54&&p.lat<55.5)return 'Northern Ireland';let best,d=Infinity;const x=Math.floor(p.lat*5),y=Math.floor(p.lon*5);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const q of localityGrid.get(`${x+i},${y+j}`)||[]){const dd=distance(p,q);if(q.region&&dd<d){best=q.region;d=dd}}return best||'Region unverified';}
function add(s){s.aliases=new Set(s.aliases||[]);s.crs=new Set(s.crs||[]);s.lines=new Set();s.sources=new Set(s.sources||[]);s.points=[[s.lat,s.lon]];s.region=s.region||regionAt(s);s.regionMethod=s.regionMethod||'nearest NPTG locality';stations.push(s);return s;}
function merge(s,p){if(Number.isFinite(p.lat)&&distance(s,p)>1500){coordinateConflicts.push({station:s.id,name:s.name,source:p.sources,lat:p.lat,lon:p.lon,distanceMetres:Math.round(distance(s,p))});return s;}for(const a of p.aliases||[])if(a)s.aliases.add(a);if(p.name)s.aliases.add(p.name);for(const c of p.crs||[])if(/^[A-Y][A-Z]{2}$/.test(c)){s.crs.add(c);byCrs.set(c,s);}for(const src of p.sources||[])s.sources.add(src);if(Number.isFinite(p.lat)&&!s.points.some(([lat,lon])=>distance({lat,lon},p)<60))s.points.push([p.lat,p.lon]);return s;}
function nearby(p,name,limit=650){const k=key(clean(name).replace(/^Highbury Vale [AB]$/,'Highbury Vale'));return stations.find(s=>distance(s,p)<limit&&[s.name,...s.aliases].some(n=>key(clean(n).replace(/^Highbury Vale [AB]$/,'Highbury Vale'))===k));}
function addLine(id,name,network,colour,kind='rail'){if(!lines.has(id))lines.set(id,{id,name,network,color:colour,kind,stationIds:new Set(),sourceRelations:[]});return lines.get(id);}
function member(line,s){if(!line||!s)return;line.stationIds.add(s.id);s.lines.add(line.id);}
const nr=xml('naptan-rail.xml').NaPTAN.StopPoints.StopPoint,met=xml('naptan-metro.xml').NaPTAN.StopPoints.StopPoint;
function naptanPosition(n){let p=n.Place.Location.Translation||n.Place.Location;if(Number.isFinite(p.Latitude))return p;if(Number.isFinite(p.Easting)&&Number.isFinite(p.Northing))return gridPosition(p.Easting,p.Northing);return null;}
const naptanByCrs=new Map();for(const r of nr){const c=r.StopClassification.OffStreet?.Rail?.AnnotatedRailRef?.CrsRef;if(c&&!naptanByCrs.has(c))naptanByCrs.set(c,r);}
for(const r of orr.stations){const n=naptanByCrs.get(r.crs);const p=gridPosition(r.easting,r.northing);if(!p||!Number.isFinite(p.Latitude))throw Error('No coordinate for ORR station '+r.crs);const s=add({id:'crs:'+r.crs,name:clean(r.name),lat:round(p.Latitude),lon:round(p.Longitude),crs:[r.crs],aliases:[r.name,clean(n.Descriptor.CommonName)],region:canonicalRegion(r.region),regionMethod:'ORR station attributes',sources:['ORR','NaPTAN']});byCrs.set(r.crs,s);byAtco.set(n.AtcoCode,s);}
const inactive=t=>t.closed==='yes'||t.disused==='yes'||t.abandoned==='yes'||t.proposed==='yes'||t.construction==='yes'||t.railway==='construction'||t['railway:disused']==='yes'||t['opening_date']>'2026-11-15';
for(const e of osm.elements){const t=e.tags||{},p=e.center||e;if(!t.name||!Number.isFinite(p.lat)||inactive(t)||/Bristol Brabazon/i.test(t.name)){excluded.push({id:`${e.type}/${e.id}`,name:t.name||null,reason:'unnamed, inactive or not open on snapshot date'});continue;}
 const pos={lat:round(p.lat),lon:round(p.lon)},atcos=(t['naptan:AtcoCode']||'').split(';'),cs=(t['ref:crs']||'').split(';').filter(c=>/^[A-Y][A-Z]{2}$/.test(c)&&naptanByCrs.has(c));
 let s=atcos.map(a=>byAtco.get(a)).find(Boolean)||cs.map(c=>byCrs.get(c)).find(s=>s&&distance(s,pos)<1500)||nearby(pos,t.name);
 const aliases=[t.name,t.alt_name,t.short_name,t['name:en'],t['name:cy'],t['name:gd'],t['name:ga']].filter(Boolean).flatMap(a=>a.split(';'));
 if(!s)s=add({id:`osm:${e.type}:${e.id}`,name:clean(t.name),...pos,aliases,crs:cs,sources:['OSM'],networkHint:t.network||t.operator||'',kind:t.railway==='tram_stop'?'tram':t.station==='subway'?'metro':/heritage|preserved|miniature/i.test(JSON.stringify(t))?'heritage':'rail'});
 merge(s,{...pos,name:clean(t.name),aliases,crs:cs,sources:['OSM']});
 byOsm.set(`${e.type}/${e.id}`,s);for(const a of atcos)if(a)byAtco.set(a,s);
}
// NaPTAN adds identifiers and exact regional references; uncorroborated active
// entries outside the independently audited mainline inventory stay in the audit.
const unmatchedNaptan=[];
for(const n of [...nr,...met]){if(n['@_Status']!=='active'||!['RLY','MET'].includes(n.StopClassification.StopType))continue;
 const p=naptanPosition(n);if(!p)continue;const pos={lat:round(p.Latitude),lon:round(p.Longitude)},crs=n.StopClassification.OffStreet?.Rail?.AnnotatedRailRef?.CrsRef;
 const candidate=crs&&byCrs.get(crs);let s=byAtco.get(n.AtcoCode)||(candidate&&distance(candidate,pos)<1500?candidate:null)||nearby(pos,n.Descriptor.CommonName);
 if(s){merge(s,{...pos,aliases:[clean(n.Descriptor.CommonName)],crs:crs?[crs]:[],sources:['NaPTAN']});byAtco.set(n.AtcoCode,s);if(s.regionMethod!=='ORR station attributes'){s.region=localityRegions.get(n.Place.NptgLocalityRef)||s.region;s.regionMethod='NaPTAN / NPTG locality';}}
 else unmatchedNaptan.push({id:n.AtcoCode,name:n.Descriptor.CommonName,crs:crs||null,lat:pos.lat,lon:pos.lon});
}
const tflChecks=[];
for(const l of read('tfl-lines.json')){const line=addLine('tfl:'+l.id,l.id==='elizabeth'?'Elizabeth line':l.name,'Transport for London',palette[l.id]||'#667788',l.modeName);
 const feed=read('tfl-'+l.id+'.json');const ids=new Set();
 for(const p of feed){if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;const name=clean(p.commonName),pos={lat:round(p.lat),lon:round(p.lon)};
 let s=byAtco.get(p.naptanId)||byAtco.get(p.naptanId.replace(/^940G/,'9400'))||nearby(pos,name);
 if(!s)s=add({id:'tfl:'+p.naptanId,name,...pos,aliases:[name],sources:['TfL'],kind:l.modeName});
 merge(s,{...pos,aliases:[name],sources:['TfL']});byAtco.set(p.naptanId,s);member(line,s);ids.add(s.id);
 }tflChecks.push({line:line.name,sourceStopPoints:feed.length,uniqueStations:ids.size,missing:0});
}
// Known geographic name variants do not merge different stations.
for(const s of stations){if(/^Highbury Vale [AB]$/.test(s.name)){s.aliases.add(s.name);s.name='Highbury Vale';}s.aliases.add(s.name.replace(/\s*\([^)]*\)\s*/g,' ').trim());if(s.name==='Belfast Lanyon Place')s.aliases.add('Lanyon Place');if(/St Pancras International/.test(s.name))s.aliases.add('St Pancras');if(/Derry|Londonderry/.test(s.name)){s.aliases.add('Derry');s.aliases.add('Londonderry');}if(/Heathrow Terminal 4/.test(s.name))s.aliases.add('Heathrow T4');if(/Heathrow Terminal 5/.test(s.name))s.aliases.add('Heathrow T5');}
const routeFile=path.join(cache,'routes-osm.json');
const trackMap=new Map(),unmatchedRouteStops=[];
if(!fs.existsSync(routeFile))throw Error('Route geometry snapshot missing; refusing to fabricate track lines.');
const routeData=read('routes-osm.json');if(routeData.remark)throw Error('Incomplete OSM route query: '+routeData.remark);
const ways=new Map(routeData.elements.filter(e=>e.type==='way').map(e=>[e.id,e]));
const nodes=new Map(routeData.elements.filter(e=>e.type==='node').map(e=>[e.id,e]));
const tflNames=read('tfl-lines.json');
function identifyRoute(t){let id;
 if(t.network==='NET')return addLine('net:'+t.ref,'Line '+t.ref+' · '+[t.from,t.to].sort().join(' ↔ '),'Nottingham Express Transit',t.colour||'#007858','tram');
 if(t.network==='Glasgow Subway'||t.operator==='Glasgow Subway')return addLine('glasgow-subway','Glasgow Subway','Glasgow Subway','#e27620','subway');
 const tflNetwork=/Transport for London|London Underground|London Overground|Docklands|DLR|Elizabeth/i.test([t.network,t['network:metro'],t.operator,t.brand].join(' '));
 if(/Docklands Light Railway/.test(t.network||''))return lines.get('tfl:dlr');
 for(const l of tflNames){if(l.id==='tram'||!tflNetwork)continue;if(l.modeName==='tube'&&t.route!=='subway')continue;const tokens=[l.id.replaceAll('-',' '),l.name];if(tokens.some(n=>key(t.ref)===key(n)||key(t.line)===key(n)||key(t.name).startsWith(key(n)+'line'))){id=l.id;break}}
 if(!id&&t.route==='tram'&&/London Trams|Croydon Tramlink/i.test([t.network,t.name].join(' ')))id='tram';
 if(id)return lines.get('tfl:'+id);
 const op=(t.brand&&t.brand!=='Transport for London'?t.brand:null)||t.operator||t.network||'Operator unverified';
 let name=t.name||[t.from,t.to].filter(Boolean).join(' – ')||t.ref||'Unnamed service';
 const endpoints=[t.from,t.to].filter(Boolean).sort();
 const identity=endpoints.length===2?endpoints.join(' / '):(t.ref||name.replace(/\s*[→⇒].*$/,''));
 const lineId='osm-line:'+hash(op+'|'+t.route+'|'+identity);
 if(endpoints.length===2)name=endpoints.join(' ↔ ');
 return addLine(lineId,name,op,t.route!=='train'&&/^#[0-9a-f]{6}$/i.test(t.colour||'')?t.colour:color(op),t.route);
}
for(const r of routeData.elements.filter(e=>e.type==='relation')){const t=r.tags||{};if(t.service==='freight'||inactive(t))continue;const line=identifyRoute(t);const stops=[];
 for(const m of r.members||[]){if(!/stop|platform/.test(m.role||'')&&!byOsm.has(`${m.type}/${m.ref}`))continue;let s=byOsm.get(`${m.type}/${m.ref}`);
 const n=m.type==='node'?nodes.get(m.ref):null;if(!s&&n){s=byAtco.get(n.tags?.['naptan:AtcoCode'])||nearby(n,n.tags?.name||'',900);if(!s){let best=280;for(const q of stations){const d=Math.min(distance(q,n),...q.points.map(([lat,lon])=>distance({lat,lon},n)));if(d<best){best=d;s=q;}}}}
 if(s)stops.push(s);else if(n&&n.lat>49.8&&n.lat<60.9)unmatchedRouteStops.push({relation:r.id,ref:m.ref,name:n.tags?.name||null,lat:n.lat,lon:n.lon});
 }
 // OSM supplies geometry; TfL remains authoritative for TfL memberships.
 if(!line.id.startsWith('tfl:'))for(const s of stops){
   // The Eurostar relation's London stop can resolve to the nearby Underground station.
   if(line.network==='Eurostar International Ltd'&&s.id==='osm:node:119274464'){
     const terminus=stations.find(station=>station.id==='crs:STP');
     terminus.aliases.add('London St Pancras');
     member(line,terminus);
   }else member(line,s);
 }
 if(!line.stationIds.size)continue;
 line.sourceRelations.push(r.id);
 for(const m of r.members||[]){if(m.type!=='way'||/platform/.test(m.role||''))continue;const w=ways.get(m.ref);if(!w?.geometry?.length)continue;
 if(!trackMap.has(w.id))trackMap.set(w.id,{id:w.id,coordinates:w.geometry.map(p=>[round(p.lat),round(p.lon)]),lines:new Set()});trackMap.get(w.id).lines.add(line.id);
 }
}
const davidLane=stations.find(s=>s.name==='David Lane'&&s.region==='East Midlands');
if(!davidLane)throw Error('Missing independently checked NET station: David Lane');
for(const id of ['net:1','net:2'])member(lines.get(id),davidLane);
davidLane.sources.add('NET operator timetable');
const niMissing=ni.stations.filter(n=>!stations.some(s=>s.region==='Northern Ireland'&&[s.name,...s.aliases].some(a=>key(a)===key(n.name))));
const orphanStations=stations.filter(s=>!s.lines.size);
// Inventory-only records remain playable, with a clearly named unassigned group.
const inventory=addLine('unassigned','Service assignment unverified','Coverage audit','#87909c','unverified');
for(const s of orphanStations)member(inventory,s);
const data={schemaVersion:1,snapshotDate:'2026-11-15',stations:stations.map(s=>({...s,aliases:[...s.aliases].filter(a=>a&&a!==s.name),crs:[...s.crs],lines:[...s.lines],sources:[...s.sources]})),lines:[...lines.values()].filter(l=>l.stationIds.size).map(l=>({...l,stationIds:[...l.stationIds]}))};
// Keep real track geometry even when no usable service relation describes it.
// Such tracks are neutral grey, never assigned an operator by station ownership.
const physical=read('all-tracks-osm.json');if(physical.remark)throw Error('Incomplete physical-track query: '+physical.remark);
sourceHashes['all-tracks-osm.json']=crypto.createHash('sha256').update(fs.readFileSync(path.join(cache,'all-tracks-osm.json'))).digest('hex');
const ukWays=new Set(physical.elements.map(w=>w.id));
for(const w of physical.elements){if(trackMap.has(w.id)||!w.geometry?.length||inactive(w.tags||{}))continue;trackMap.set(w.id,{id:w.id,coordinates:w.geometry.map(p=>[round(p.lat),round(p.lon)]),lines:new Set(),minZoom:w.tags?.service||w.tags?.usage==='industrial'?12:0});}
const tracks=[...trackMap.values()].filter(w=>ukWays.has(w.id)).map(w=>({...w,lines:[...w.lines]}));
const missingOrr=orr.stations.filter(r=>!data.stations.some(s=>s.crs.includes(r.crs)));
const coverage={schemaVersion:1,generatedAt:new Date().toISOString(),snapshotDate:data.snapshotDate,complete:false,scope:'UK passenger rail, metro, tram, mapped heritage, miniature and funicular boarding locations. Excludes proposed and disused records where identified; Crown Dependencies excluded.',counts:{stations:stations.length,lines:data.lines.length,trackWays:tracks.length,osmSourceRecords:osm.elements.length,unassignedStations:orphanStations.length},checks:{orr:{asOf:orr.asOf,expected:orr.stations.length,matched:orr.stations.length-missingOrr.length,missing:missingOrr},northernIreland:{expected:ni.stations.length,matched:ni.stations.length-niMissing.length,missing:niMissing},tfl:tflChecks},limitations:['Heritage, miniature, private and funicular completeness has no single authoritative inventory and is NOT certified.','OSM service relations and track ways may be missing or outdated; membership uses mapped stops, with nearby-platform reconciliation.','Route colours identify mapped operators. Predominant operator by actual service frequency is NOT verified; no timetable-based dominance is asserted.','NaPTAN active status can include future or closed stops. Uncorroborated records are retained in the audit, not silently treated as active.','Some regional assignments for OSM-only stations use the nearest NPTG locality, not a boundary intersection.','Completion percentages refer to this versioned dataset, not a claim of every UK railway station.'],unassignedStations:orphanStations.map(s=>({id:s.id,name:s.name,region:s.region})),unmatchedNaptan,unmatchedRouteStops,coordinateConflicts,excluded,sourceHashes,sources:{orr:orr.source,northernIreland:ni.source,naptan:'https://naptan.api.dft.gov.uk/',tfl:'https://api.tfl.gov.uk/',osm:'https://www.openstreetmap.org/copyright',osmTimestamp:osm.osm3s.timestamp_osm_base,routeTimestamp:routeData.osm3s.timestamp_osm_base}};
fs.writeFileSync(path.join(out,'network.json'),JSON.stringify(data));
fs.writeFileSync(path.join(out,'tracks.json'),JSON.stringify(tracks));
fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify(coverage,null,2));
console.log(JSON.stringify({counts:coverage.counts,orr:coverage.checks.orr,northernIreland:coverage.checks.northernIreland,tfl:tflChecks,unmatchedNaptan:unmatchedNaptan.length,unmatchedRouteStops:unmatchedRouteStops.length},null,2));

