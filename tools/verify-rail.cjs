const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {createServer}=require('./serve.cjs');
const root=path.join(__dirname,'..');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'nationalrail/data',n),'utf8'));
(async()=>{
 const {normalise,oneEditApart,createMatcher,parseSave,SAVE_KEY}=await import(pathToFileURL(path.join(root,'nationalrail/matching.mjs')));
 const data=read('network.json'),tracks=read('tracks.json'),coverage=read('coverage.json'),ids=new Set(data.stations.map(s=>s.id)),lines=new Map(data.lines.map(l=>[l.id,l]));
 assert.equal(ids.size,data.stations.length,'Unique station IDs');assert.equal(lines.size,data.lines.length,'Unique line IDs');
 for(const s of data.stations){assert(Number.isFinite(s.lat)&&Number.isFinite(s.lon),s.name+' coordinates');assert(s.lat>49.8&&s.lat<61&&s.lon>-8.5&&s.lon<2,s.name+' UK extent');assert(s.name&&s.region&&s.points.length);for(const p of s.points)assert(p.every(Number.isFinite),s.name+' point');for(const l of s.lines)assert(lines.get(l)?.stationIds.includes(s.id),s.name+' reciprocal membership');}
 for(const l of lines.values())for(const id of l.stationIds)assert(ids.has(id),l.name+' station');
 for(const t of tracks){assert(t.coordinates.length>1);for(const p of t.coordinates)assert(p.every(Number.isFinite));for(const id of t.lines)assert(lines.has(id));}
 assert.equal(coverage.complete,false,'Do not silently certify incomplete coverage');assert.equal(coverage.checks.orr.missing.length,0);assert.equal(coverage.checks.northernIreland.missing.length,0);
 for(const l of data.lines.filter(l=>l.id.startsWith('tfl:')))assert(l.sourceRelations.length>0,l.name+' has geographic geometry');
 const match=createMatcher(data.stations);
 const {prepareRouteNames,routeTitle}=await import(pathToFileURL(path.join(root,'nationalrail/route-names.mjs')));
 const eurostar=data.lines.filter(line=>line.network==='Eurostar International Ltd');
 assert(eurostar.length>0);
 for(const line of eurostar)line.members=new Set(line.stationIds);
 prepareRouteNames(data.stations,eurostar);
 assert.deepEqual(match('London St Pancras').ids,['crs:STP']);
 for(const line of eurostar){
   assert(line.members.has('crs:STP')&&!line.members.has('osm:node:119274464'));
   assert.equal(routeTitle(line,new Set()),line.name.replace(/London St\. Pancras/,'[UNKNOWN]'));
   assert.equal(routeTitle(line,new Set(['crs:STP'])),line.name);
 }
 for(const input of ['Paddington','paddingtn','Paddnigton','London Paddington','PÁDDINGTON!'])assert.deepEqual(match(input).ids,['crs:PAD'],input);
 assert.equal(match('PAD').kind,'missing');assert.equal(match('PAX').kind,'missing','Unknown CRS gets no fuzzy correction');assert.deepEqual(match('Ely').ids,['crs:ELY']);assert.equal(normalise('St. Pancras Intl.'),normalise('Saint Pancras International'));
 assert(oneEditApart('station','staiton'));assert(!oneEditApart('paddington','pudington'));assert.deepEqual(parseSave('{broken',ids),{found:[],rejected:true});assert.deepEqual(parseSave(JSON.stringify({version:1,found:['crs:PAD','removed','crs:PAD']}),ids).found,['crs:PAD']);
 const pad=data.stations.find(s=>s.id==='crs:PAD');for(const l of ['bakerloo','circle','district','hammersmith-city','elizabeth'])assert(pad.lines.includes('tfl:'+l));
 assert(!data.stations.some(s=>s.name.includes('Bristol Brabazon')),'Future station excluded');
 assert.equal(data.stations.find(s=>s.id==='crs:LBG').name,'London Bridge');
 assert.equal(data.stations.find(s=>s.id==='crs:HHL').name,'Heath High Level');
 assert.equal(data.stations.find(s=>s.id==='crs:HLL').name,'Heath Low Level');
 const newbury=data.stations.find(s=>s.id==='crs:NRC');assert(Math.abs(newbury.lon+1.307)<.01&&Math.abs(newbury.lat-51.399)<.01,'Newbury Racecourse is in Berkshire');
 const net=data.lines.filter(l=>l.id.startsWith('net:'));assert.equal(new Set(net.flatMap(l=>l.stationIds)).size,50);for(const l of net)assert(l.stationIds.some(id=>data.stations.find(s=>s.id===id).name==='David Lane'));
 assert.equal(match('Highbury Vale').ids.length,1);assert.notDeepEqual(match('Alston').ids,match('Kirkhaugh').ids);
 assert(!data.stations.some(s=>s.name==='Greenway Halt'),'Explicitly closed OSM station excluded');
 assert(!data.stations.some(s=>['East Anglia','Yorkshire','London'].includes(s.region)),'Canonical region taxonomy');
 console.log(`Data and matching checks passed: ${data.stations.length} stations, ${data.lines.length} groups, ${tracks.length} track ways.`);
 if(!process.argv.includes('--browser'))return;
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.railReady==='true',null,{timeout:90000});
  const guess=async text=>{await page.locator('#station-input').fill(text);await page.locator('#guess-form').evaluate(form=>form.requestSubmit());};
  await page.goto(base+'/nationalrail');await ready();assert(new URL(page.url()).pathname==='/nationalrail');assert.equal(await page.locator('#total-found').textContent(),'0');assert(await page.locator('.rail-grid').count()===1);
  await guess('paddingtn');assert.equal(await page.locator('#total-found').textContent(),'1');assert.match(await page.locator('#notification').textContent(),/Paddington/);assert.equal(await page.locator('#station-input').inputValue(),'');
  for(const id of ['bakerloo','circle','district','hammersmith-city','elizabeth'])assert.match(await page.locator(`[data-group="tfl:${id}"] .progress-count`).textContent(),/^1 \/ /);
  await guess('Paddington');assert.match(await page.locator('#notification').textContent(),/already found/);assert.equal(await page.locator('#total-found').textContent(),'1');
  await guess('PAX');assert.equal(await page.locator('#total-found').textContent(),'1');
  await page.reload();await ready();assert.equal(await page.locator('#total-found').textContent(),'1');
  await page.locator('#regions-tab').click();assert(await page.locator('[data-group="region:Greater London"]').count());await page.locator('#progress-filter').fill('Scotland');assert.equal(await page.locator('.progress-row').count(),1);await page.locator('#progress-filter').fill('');
  await page.locator('#reset-button').click();await page.locator('#reset-dialog [data-close]').last().click();assert.equal(await page.locator('#total-found').textContent(),'1');
  await page.locator('#reset-button').click();await page.locator('#confirm-reset').click();assert.equal(await page.locator('#total-found').textContent(),'0');
  await page.locator('#lines-tab').click();await guess('London Waterloo');await guess('Bank');assert.match(await page.locator('#completion-message').textContent(),/Waterloo.*City.*complete/);
  const shots=path.join(root,'.preview-refresh');fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,'nationalrail-desktop.png')});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.locator('#toggle-progress').click();assert.equal(await page.locator('#toggle-progress').getAttribute('aria-expanded'),'true');assert(await page.locator('#sidebar').isVisible());await page.screenshot({path:path.join(shots,'nationalrail-mobile.png')});await page.locator('#toggle-progress').click();await guess('Edinburgh');assert.match(await page.locator('#notification').textContent(),/Edinburgh/);
  await page.locator('#toggle-progress').click();await page.locator('#help-button').click();assert(await page.locator('#help-dialog').isVisible());await page.keyboard.press('Escape');
  await page.evaluate(key=>localStorage.setItem(key,'broken'),SAVE_KEY);await page.reload();await ready();assert.match(await page.locator('#notification').textContent(),/Saved progress could not be read/);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY),'broken');
  assert.deepEqual(errors,[],'No browser exceptions');await context.close();
  const blocked=await browser.newContext({viewport:{width:800,height:700}});await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('Blocked storage')}});Object.defineProperty(Storage.prototype,'getItem',{value(){throw new Error('Blocked storage')}});});await blocked.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const bp=await blocked.newPage();await bp.goto(base+'/nationalrail/');await bp.waitForFunction(()=>document.documentElement.dataset.railReady==='true',null,{timeout:90000});await bp.locator('#station-input').fill('Paddington');await bp.locator('#guess-form').evaluate(f=>f.requestSubmit());assert.equal(await bp.locator('#total-found').textContent(),'1');assert.match(await bp.locator('#save-status').textContent(),/Saving unavailable/);await blocked.close();
  console.log('Browser checks passed: guesses, all Paddington lines, duplicate/CRS handling, reload, regions, completion, reset/cancel, responsive UI, dialogs, corrupt and unavailable storage, tile failure fallback.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
