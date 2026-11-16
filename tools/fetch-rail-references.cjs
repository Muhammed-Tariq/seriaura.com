const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {XMLParser} = require('fast-xml-parser');
const cache=path.join(__dirname,'../.tooling/rail');
fs.mkdirSync(cache,{recursive:true});
const source = 'https://dataportal.orr.gov.uk/media/ootlf0cn/table-6329-station-attributes-for-all-mainline-stations.ods';
function zipEntry(b, name) {
  for(let p=0;p<b.length-4;p++) {
    if(b.readUInt32LE(p)!==0x02014b50) continue;
    const n=b.toString('utf8',p+46,p+46+b.readUInt16LE(p+28));
    if(n!==name) continue;
    const off=b.readUInt32LE(p+42),size=b.readUInt32LE(p+20),start=off+30+b.readUInt16LE(off+26)+b.readUInt16LE(off+28);
    return zlib.inflateRawSync(b.subarray(start,start+size)).toString();
  }
  throw Error('Entry missing: '+name);
}
function value(v) {
  if(typeof v==='object' && v!==null) return Array.isArray(v)?v.map(value).join(' '):Object.entries(v).filter(([k])=>!k.startsWith('@_')).map(([,x])=>value(x)).join(' ');
  return String(v??'');
}
(async()=>{
  const res=await fetch(source); if(!res.ok)throw Error(res.status);
  const b=Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(cache,'orr-stations.ods'),b);
  const j=new XMLParser({ignoreAttributes:false}).parse(zipEntry(b,'content.xml'));
  const tables=j['office:document-content']['office:body']['office:spreadsheet']['table:table'];
  let stations=[];
  for(const table of Array.isArray(tables)?tables:[tables]) {
    for(const row of [table['table:table-row']].flat()) {
      const cells=[row['table:table-cell']].flat();
      const vals=[];
      for(const cell of cells){const n=Math.min(30,Number(cell?.['@_table:number-columns-repeated']||1));for(let i=0;i<n;i++)vals.push(value(cell?.['text:p']));}
      if(!/^[A-Z]{3}$/.test(vals[2]||'')) continue;
      stations.push({name:vals[0],nlc:vals[1],crs:vals[2],region:vals[3],localAuthority:vals[4],county:vals[5],combinedAuthority:vals[6],constituency:vals[7],subRegion:vals[8],easting:Number(vals[10]),northing:Number(vals[11]),stationFacilityOwner:vals[12]});
    }
  }
  fs.writeFileSync(path.join(cache,'orr-stations.json'),JSON.stringify({source,asOf:'2026-03-31',retrievedAt:new Date().toISOString(),notes:'Station facility owner is not the predominant train operator. Temporarily suspended stations included; indefinitely suspended and permanently closed stations excluded by ORR.',stations},null,2));
  console.log('ORR',stations.length,stations.slice(0,2));
  const names=['Derry~Londonderry','Bellarena','Castlerock','Coleraine','Ballymoney','Cullybackey','Ballymena','Antrim','Mossley West','York Street','Dhu Varren','University','Portrush','Larne Harbour','Larne Town','Glynn','Magheramorne','Ballycarry','Whitehead','Downshire','Carrickfergus','Clipperstown','Trooperslane','Greenisland','Jordanstown','Whiteabbey','Titanic Quarter','Sydenham','Holywood','Marino','Cultra','Seahill',"Helen’s Bay",'Carnalea','Bangor West','Bangor','Belfast Grand Central','City Hospital','Botanic','Lanyon Place','Adelaide','Balmoral','Finaghy','Dunmurry','Derriaghy','Lambeg','Hilden','Lisburn','Moira','Lurgan','Portadown','Scarva','Poyntzpass','Newry'];
  fs.writeFileSync(path.join(cache,'ni-stations.json'),JSON.stringify({source:'https://www.translink.co.uk/getmedia/bd00b3e0-0309-429c-ae33-59ebb14d0b60/NIR-schematic-map-portrait-Grand-Central-%286%29.pdf',asOf:'retrieved 2026-11-15; map has no explicit publication date',notes:'Manually transcribed from official Translink network map. Republic of Ireland stops omitted; UK mainline Northern Ireland only, excludes heritage.',stations:names.map(name=>({name,region:'Northern Ireland'}))},null,2));
  console.log('NI',names.length);
})().catch(e=>{console.error(e);process.exitCode=1});

