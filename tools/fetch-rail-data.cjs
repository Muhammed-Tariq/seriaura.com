/* Download source snapshots into an ignored cache. No credentials required. */
const fs = require('node:fs');
const path = require('node:path');
const cache = path.join(__dirname, '../.tooling/rail');
fs.mkdirSync(cache, {recursive:true});
const agent = 'SeriauraRailMemory/1.0 (https://seriaura.com/nationalrail; open-data station game)';
async function download(name, url, options = {}) {
  const file = path.join(cache, name);
  if (fs.existsSync(file)) return console.log('Cached', name);
  const res = await fetch(url, {headers:{'User-Agent':agent}, signal:AbortSignal.timeout(300000), ...options});
  if (!res.ok) throw Error(`${name}: ${res.status} ${(await res.text()).slice(0,300)}`);
  const data = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, data);
  console.log('Downloaded', name, data.length);
}
async function overpass(name, query) {
  return download(name, process.env.RAIL_OVERPASS || 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', {method:'POST', headers:{'User-Agent':agent,'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query)});
}
const jobs = {
  rail: () => download('naptan-rail.xml','https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=xml&atcoAreaCodes=910'),
  metro: () => download('naptan-metro.xml','https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=xml&atcoAreaCodes=940'),
  stops: () => overpass('stations-osm.json','[out:json][timeout:180];area["ISO3166-1"="GB"][admin_level=2]->.uk;nwr[railway~"^(station|halt|tram_stop)$"](area.uk);out center tags;'),
  routes: () => overpass('routes-osm.json','[out:json][timeout:240];rel[type=route][route~"^(train|subway|light_rail|tram|monorail|funicular)$"](49.8,-8.3,60.9,2.0)->.routes;.routes out body;way(r.routes)[railway~"^(rail|subway|light_rail|tram|monorail|funicular|narrow_gauge|miniature)$"];out geom;node(r.routes);out body;'),
  tracks: () => overpass('all-tracks-osm.json','[out:json][timeout:240];area["ISO3166-1"="GB"][admin_level=2]->.uk;way[railway~"^(rail|subway|light_rail|tram|monorail|funicular|narrow_gauge|miniature)$"](area.uk);out geom;'),
  tfl: async () => {
    await download('tfl-lines.json','https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line,tram/Route');
    for (const line of JSON.parse(fs.readFileSync(path.join(cache,'tfl-lines.json')))) {
      await download(`tfl-${line.id}.json`,`https://api.tfl.gov.uk/Line/${line.id}/StopPoints`);
    }
  },
  nptg: () => download('nptg.xml','https://naptan.api.dft.gov.uk/v1/nptg'),
  basemap: async () => {for(const name of ['admin_0_countries','rivers_lake_centerlines','lakes'])await download('ne-'+name+'.json','https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_'+name+'.geojson');},
};
Promise.allSettled((process.argv.slice(2).length?process.argv.slice(2):Object.keys(jobs)).map(k=>jobs[k]())).then(results=>{
  for(const r of results) if(r.status==='rejected'){console.error(r.reason.message);process.exitCode=1;}
});
