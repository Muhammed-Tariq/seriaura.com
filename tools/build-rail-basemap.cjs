// Natural Earth 1:10m public-domain geography; no tile service, API key or labels.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),cache=path.join(root,'.tooling/rail');
const inside=([x,y])=>x>=-13&&x<=12&&y>=46&&y<=64;
const coordsNear=c=>typeof c[0]==='number'?inside(c):c.some(coordsNear);
const rounded=c=>typeof c[0]==='number'?c.map(n=>+n.toFixed(5)):c.map(rounded);
const features=[];
for(const [file,kind] of [['admin_0_countries','land'],['rivers_lake_centerlines','river'],['lakes','lake']]){
 const source=JSON.parse(fs.readFileSync(path.join(cache,'ne-'+file+'.json'),'utf8'));
 for(const f of source.features){if(!coordsNear(f.geometry.coordinates))continue;const geometry=structuredClone(f.geometry);if(['MultiPolygon','MultiLineString'].includes(geometry.type))geometry.coordinates=geometry.coordinates.filter(coordsNear);geometry.coordinates=rounded(geometry.coordinates);features.push({type:'Feature',properties:{kind},geometry});}
}
fs.writeFileSync(path.join(root,'nationalrail/data/basemap.json'),JSON.stringify({type:'FeatureCollection',features}));
console.log('Local basemap:',features.length,'features');
