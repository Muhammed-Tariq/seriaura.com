/* Exercise the production pager while animation promises are still pending. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const animations=new Set();
function element(){
  const attributes=new Map(),listeners=new Map();
  const el={children:[],dataset:{},className:'',innerHTML:'',parent:null,
    setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),hasAttribute:k=>attributes.has(k),
    addEventListener:(name,fn)=>listeners.set(name,fn),fire:name=>listeners.get(name)?.(),
    remove(){if(this.parent){const list=this.parent.children;list.splice(list.indexOf(this),1);this.parent=null;}},
    append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}},
    insertBefore(node,before){node.remove();node.parent=this;this.children.splice(this.children.indexOf(before),0,node);},
    querySelector(){return this.icon;},
    querySelectorAll(){return this.children.filter(child=>!child.className.includes('social-page'));}
  };
  el.icon={animate(){let finish,reject;const finished=new Promise((resolve,r)=>{finish=resolve;reject=r;});const animation={finished,finish(){animations.delete(animation);finish();},cancel(){animations.delete(animation);reject(new Error('cancelled'));}};animations.add(animation);return animation;}};
  return el;
}
const grid=element(),motion={matches:false,addEventListener(name,fn){this.changed=fn;}};
const source=fs.readFileSync('footer.js','utf8');
const section=source.slice(source.indexOf('  const pages = [];'),source.indexOf('  let statusTimer;'));
const scope={document:{createElement:element,addEventListener(){}},profiles:Array.from({length:16},(_,i)=>i),grid,
  createControl(profile){const node=element();node.profile=profile;node.className='social-link';return node;},
  footer:{querySelector:()=>({})},matchMedia:()=>motion,getComputedStyle:()=>({transform:'none'}),shapeStops:new Set()};
vm.runInNewContext(section,scope);
const pager=grid.children[4];
async function settle(){for(let phase=0;phase<2;phase++){for(const animation of [...animations])animation.finish();await new Promise(resolve=>setImmediate(resolve));}}
async function run(){
 for(let burst=0;burst<10;burst++){
  for(let i=0;i<101;i++)pager.fire('click');
  assert.equal(animations.size,9,'Spam leaves one intact outgoing fade');
  await settle();
  const page=(burst+1)%2;
  assert.equal(grid.dataset.page,String(page+1));
  assert.deepEqual(grid.children.filter(node=>node!==pager).map(node=>node.profile),Array.from({length:8},(_,j)=>page*8+j));
  assert.equal(grid.hasAttribute('aria-busy'),false);
 }
 pager.fire('click');motion.matches=true;motion.changed();
 assert.equal(animations.size,0);assert.equal(grid.dataset.page,'2');
 pager.fire('click');assert.equal(grid.dataset.page,'1');
 console.log('Passed 1,010 rapid clicks across ten cooldowns, alternating pages, matching links, both fades and reduced motion.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
