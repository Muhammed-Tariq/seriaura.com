const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cheerio=require('cheerio');
const {frameAt}=require('../brighton-showcase.js');
assert.equal(frameAt(1800).logo,1);assert.equal(frameAt(10000).timer,1);
assert.equal(frameAt(3300).wipe,0);assert.equal(frameAt(3700).wipe,1);
assert(frameAt(3500).wipe>0&&frameAt(3500).wipe<1,'The directional transition has a soft moving boundary');
assert.equal(frameAt(1350).reels.every(v=>v===1),true);
assert.equal(frameAt(1350).flap,0,'The flap follows the final settled letter');
assert(frameAt(1700).flap>0&&frameAt(1700).flap<1);
assert.equal(frameAt(0).logo,1,'Reel entrances do not use a group fade');
assert.equal(frameAt(80).reels[1],0,'The letters start individually from left to right');
assert.equal(frameAt(19400).timer,1);assert(frameAt(19700).timer<1&&frameAt(19700).timer>0);
assert.equal(frameAt(19700).wipe,1,'The timer fades uniformly before replay');
assert.deepEqual(frameAt(20000),frameAt(0));

function environment(markup){
 const $=cheerio.load(markup),cache=new WeakMap(),frames=new Map(),docEvents=new Map(),observers=[];
 let now=0,next=0;
 const listen=(map,name,fn)=>{if(!map.has(name))map.set(name,new Set());map.get(name).add(fn);};
 function wrap(node){
  if(!node)return null;if(cache.has(node))return cache.get(node);
  const events=new Map(),el={node,style:{setProperty(k,v){this[k]=String(v);}},
   get className(){return $(node).attr('class')||'';},set className(v){$(node).attr('class',v);},
   get innerHTML(){return $(node).html();},set innerHTML(v){$(node).html(v);},
   querySelector:s=>wrap($(node).find(s)[0]),querySelectorAll:s=>$(node).find(s).toArray().map(wrap),
   classList:{add:n=>$(node).addClass(n),remove:n=>$(node).removeClass(n),contains:n=>$(node).hasClass(n),toggle:(n,on)=>$(node).toggleClass(n,on)},
   dataset:{},setAttribute:(k,v)=>$(node).attr(k,String(v)),
   addEventListener:(n,fn)=>listen(events,n,fn),removeEventListener:(n,fn)=>events.get(n)?.delete(fn),
   dispatch:(n,event={})=>events.get(n)?.forEach(fn=>fn(event)),
   append:child=>$(node).append(child.node),before:child=>$(node).before(child.node),remove:()=>$(node).remove(),
   getBoundingClientRect:()=>({left:10,top:20,width:300,height:75}),matches:()=>true
  };cache.set(node,el);return el;
 }
 const document={currentScript:{src:'http://localhost/brighton-showcase.js'},hidden:false,querySelectorAll:s=>$(s).toArray().map(wrap),createElement:tag=>wrap($('<'+tag+'>')[0]),addEventListener:(n,fn)=>listen(docEvents,n,fn),removeEventListener:(n,fn)=>docEvents.get(n)?.delete(fn)};
 const motionEvents=new Set(),motion={matches:false,addEventListener:(n,fn)=>motionEvents.add(fn),removeEventListener:(n,fn)=>motionEvents.delete(fn)};
 const scope={window:{},document,URL,matchMedia:()=>motion,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},ResizeObserver:class{observe(){}}};
 return {$,scope,frames,observers,wrap,advance(ms){const until=now+ms;while(now<until){now=Math.min(until,now+16);const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}},motion(value){motion.matches=value;motionEvents.forEach(fn=>fn());},hidden(value){document.hidden=value;docEvents.get('visibilitychange')?.forEach(fn=>fn());}};
}
const e=environment('<div class="countdown-event"><h3><a class="event-logo"><img></a></h3><div class="countdown-values"></div></div>');
vm.runInNewContext(fs.readFileSync('brighton-showcase.js','utf8'),e.scope);
const row=e.wrap(e.$('.countdown-event')[0]),link=row.querySelector('.event-logo');
assert.equal(e.scope.window.BrightonShowcase.mount(row,{id:'ironman'}),null);
const show=e.scope.window.BrightonShowcase.mount(row,{id:'brighton'});
assert.equal(e.$('.brighton-slot').length,8);assert.equal(e.$('.brighton-reel svg').length,32);
e.$('.brighton-reel').each((i,node)=>assert.equal(e.$(node).children().eq(i%2?3:0).find('use').length,0,'Every reel begins in an empty slot'));
assert.equal(e.frames.size,0);e.observers[0].fn([{isIntersecting:true}]);e.advance(3500);
assert.match(row.style['--brighton-logo-mask'],/to left,#000 38%,transparent 62%/);
assert.match(row.style['--brighton-timer-mask'],/to left,transparent 38%,#000 62%/);
e.advance(4000);assert.equal(row.dataset.brightonView,'timer');
e.hidden(true);assert.equal(e.frames.size,0);e.advance(40000);e.hidden(false);assert.equal(row.dataset.brightonView,'timer');
show.setPaused(true);assert.equal(e.frames.size,0);show.setPaused(false);
link.dispatch('focus');assert.equal(row.dataset.brightonView,'logo');assert.equal(e.frames.size,1,'Keyboard reveal also plays the individual reel entrances');e.advance(2200);assert.equal(e.frames.size,0);link.dispatch('blur');e.advance(2000);assert.equal(row.dataset.brightonView,'timer');
e.motion(true);assert.equal(e.frames.size,0);assert(!row.classList.contains('brighton-showcase'));e.motion(false);
for(let i=0;i<50;i++)show.setPaused(i%2===0);assert.equal(e.frames.size,1);
show.destroy();assert.equal(e.frames.size,0);assert.equal(e.$('.brighton-identity').length,0);assert(e.observers[0].disconnected);

const r=environment('<a class="brand"><span class="brand-crop"><img class="logo-white"><img class="logo-orange"></span></a><div class="primary-specimen"><img class="specimen-mark"><img class="specimen-mark primary-orange"></div>');
vm.runInNewContext(fs.readFileSync('brand-reveal.js','utf8'),r.scope);
assert.equal(r.$('.radial-brand').length,2);
const brand=r.wrap(r.$('.brand')[0]),crop=brand.querySelector('.brand-crop'),ink=brand.querySelector('.radial-ink'),base=brand.querySelector('.radial-base');
const enter=()=>crop.dispatch('pointerenter',{pointerType:'mouse',clientX:40,clientY:35});
enter();r.advance(200);assert.match(ink.style.maskImage,/at 10% 20%/);
const midway=ink.style.maskImage;crop.dispatch('pointerleave');assert.equal(ink.style.maskImage,midway,'No jump on leave');
r.advance(64);assert.notEqual(ink.style.maskImage,midway);const retreat=ink.style.maskImage;
crop.dispatch('pointerenter',{pointerType:'mouse',clientX:300,clientY:70});
crop.dispatch('pointermove',{pointerType:'mouse',clientX:160,clientY:57.5});
assert.match(ink.style.maskImage,/at 50% 50%/,'The reveal follows pointer movement');
assert.match(base.style.maskImage,/at 50% 50%, transparent/,'The white layer retreats through the same radial mask');
for(let i=0;i<50;i++){if(i%2)crop.dispatch('pointerleave');else enter();r.advance(8);assert(r.frames.size<=1);}
crop.dispatch('pointerleave');r.advance(800);assert.equal(ink.style.opacity,'0');assert.equal(r.frames.size,0);
enter();r.motion(true);assert.equal(ink.style.opacity,'1');assert.equal(base.style.opacity,'0','No white artwork remains under the revealed orange');assert.equal(r.frames.size,0);
crop.dispatch('pointerleave');assert.equal(ink.style.opacity,'0');
brand.dispatch('focus');assert.match(ink.style.maskImage,/at 50% 50%/);assert.equal(ink.style.opacity,'1');brand.dispatch('blur');assert.equal(ink.style.opacity,'0');
console.log('Passed Brighton reel/flap sequence, cycle, pause/focus/reduced-motion/teardown; radial origin, rapid reversals, keyboard and reduced motion.');
