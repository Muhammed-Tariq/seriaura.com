const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const cheerio=require('cheerio'),{Text}=require('domhandler');
const {countdownEffect}=require('../time.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync('content.js','utf8'),context);
const config=context.window.siteContent.time;
for(const event of config.events.filter(event=>event.effects)){
  const {glow,ripple,combined}=event.effects,day=86400000;
  for(const [remaining,effect] of [[glow*day+1,'original'],[glow*day,'glow'],[ripple*day,'ripple'],[combined*day,'combined'],[0,'original']])assert.equal(countdownEffect(remaining,event.effects),effect,event.id);
}
const $=cheerio.load(fs.readFileSync('countdowns/index.html','utf8')),cache=new WeakMap();
function wrap(node){
  if(!node)return null;if(cache.has(node))return cache.get(node);
  const el={node,style:{setProperty(){}},addEventListener(){},pause(){},
    get className(){return $(node).attr('class')||'';},set className(value){$(node).attr('class',value);},
    get textContent(){return $(node).text();},set textContent(value){$(node).text(value);},
    get innerHTML(){return $(node).html();},set innerHTML(value){$(node).html(value);},
    get hidden(){return $(node).attr('hidden')!==undefined;},set hidden(value){if(value)$(node).attr('hidden','');else $(node).removeAttr('hidden');},
    get children(){return $(node).children().toArray().map(wrap);},get parentElement(){return wrap(node.parent);},
    querySelector:s=>wrap($(node).find(s)[0]),querySelectorAll:s=>$(node).find(s).toArray().map(wrap),
    getAttribute:key=>$(node).attr(key)??null,setAttribute:(key,value)=>$(node).attr(key,String(value)),
    append:(...items)=>items.forEach(item=>$(node).append(item.node)),prepend:item=>$(node).prepend(item.node),
    insertBefore:(item,before)=>before?$(before.node).before(item.node):$(node).append(item.node),
    replaceWith:item=>$(node).replaceWith(item.node),remove:()=>$(node).remove(),
    classList:{add:name=>$(node).addClass(name),remove:name=>$(node).removeClass(name),toggle:(name,on)=>$(node).toggleClass(name,on)},
    dataset:new Proxy({},{get:(_,key)=>$(node).attr('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())),set:(_,key,value)=>{$(node).attr('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),String(value));return true;}})
  };
  for(const key of ['src','poster','value','href'])Object.defineProperty(el,key,{get:()=>$(node).attr(key),set:value=>$(node).attr(key,String(value))});
  cache.set(node,el);return el;
}
const listeners={};
const doc={hidden:false,documentElement:{clientWidth:390},currentScript:{src:'http://localhost/time.js'},querySelector:s=>wrap($(s)[0]),createElement:tag=>wrap($('<'+tag+'>')[0]),createTextNode:value=>wrap(new Text(value)),addEventListener:(name,fn)=>{listeners[name]=fn;}};
const win={siteContent:{time:config},location:{search:''},addEventListener(){}};
let now=Date.parse('2026-11-13T12:00:00Z');
class TestDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
new Function('document','window','navigator','matchMedia','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','performance','Date','clearTimeout',fs.readFileSync('time.js','utf8'))(doc,win,{},()=>({matches:true,addEventListener(){}}),class{observe(){}disconnect(){}},()=>0,()=>{},{now:()=>0},TestDate,()=>{});
const current=()=>$('.is-next').attr('data-event');
assert.equal(current(),'bath');assert.equal($('video.event-film').length,1);
now=Date.parse('2027-03-15T12:00:00Z');listeners.visibilitychange();assert.equal(current(),'brighton');assert.equal($('.completed-events [data-event=bath]').length,1);
now=Date.parse('2027-04-05T12:00:00Z');listeners.visibilitychange();assert.equal(current(),'ironman');assert.equal($('.completed-events [data-event=brighton]').length,1);
assert.equal($('.event-film').length,1,'Only the featured event has a film');
now=Date.parse('2027-09-13T12:00:00Z');listeners.visibilitychange();assert.equal($('.is-next').length,0);assert.equal($('.event-film').length,0);
assert.equal($('.completed-events .countdown-event').length,4);
console.log('Passed: event-specific effect boundaries; Bath → Brighton → Nice rollover; single film lifecycle; all completed.');
