/* Device-local preferences, loaded before the page's animation scripts. */
(() => {
  const root=new URL('.',document.currentScript.src),key='seriaura-options-v1';
  const defaults=Object.freeze({radius:22,strength:22,core:'#f5f5f5',inner:'#e7e7e7',outer:'#d8d8d8',edge:'#c9c9c9',spread:48,feather:1,ribbonSpeed:1,backgroundOpacity:100,headingSpeed:1});
  const glowKeys=['radius','strength','core','inner','outer','edge','spread','feather'];
  const amber={radius:22,strength:85,core:'#ffd089',inner:'#ff961f',outer:'#ff6510',edge:'#f24700',spread:48,feather:1};
  const limits={radius:[8,38],strength:[0,100],spread:[20,75],feather:[.4,2.5],ribbonSpeed:[0,3],backgroundOpacity:[0,100],headingSpeed:[0,3]};
  const colors=['core','inner','outer','edge'];
  function validate(input){
    const result={...defaults};
    if(!input||typeof input!=='object')return result;
    for(const name of Object.keys(defaults)){
      const value=input[name];
      if(colors.includes(name)){if(typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value))result[name]=value.toLowerCase();}
      else if(typeof value==='number'&&Number.isFinite(value))result[name]=Math.max(limits[name][0],Math.min(limits[name][1],value));
    }
    return result;
  }
  let values={...defaults},saved=true;
  try{values=validate(JSON.parse(localStorage.getItem(key))?.values);}catch(_){}
  const rgba=(hex,alpha)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${alpha})`;
  function stops(){const middle=values.spread/100;return [[0,values.core],[middle*22/48,values.inner],[middle,rgba(values.outer,.66**values.feather)],[middle+(1-middle)*24/52,rgba(values.edge,.2**values.feather)],[1,rgba(values.edge,0)]];}
  function apply(){
    document.documentElement.style.setProperty('--text-glow-opacity',values.strength/100);
    document.documentElement.style.setProperty('--text-background-opacity',values.backgroundOpacity/100);
  }
  function update(patch,persist=true){
    const next=validate({...values,...patch}),keys=Object.keys(defaults).filter(k=>next[k]!==values[k]);values=next;apply();
    if(persist){try{localStorage.setItem(key,JSON.stringify({version:1,values}));saved=true;}catch(_){saved=false;}}
    if(keys.length)window.dispatchEvent(new CustomEvent('siteoptionschange',{detail:{keys}}));
    refresh?.();
  }
  let refresh;
  window.SiteOptions={get:()=>({...values}),defaults:()=>({...defaults}),set:update,reset:name=>update(name?{[name]:defaults[name]}:defaults),gradientStops:stops};
  apply();
  window.addEventListener('storage',event=>{if(event.key===key){try{update(validate(JSON.parse(event.newValue)?.values),false);}catch(_){update(defaults,false);}}});
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('site-options.css',root);document.head.append(style);
  function mount(){
    const footer=document.querySelector('.footer-bottom');if(!footer)return;
    const trigger=document.createElement('button');trigger.type='button';trigger.className='footer-options';trigger.textContent='Options';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','site-options');
    const links=document.createElement('div');links.className='footer-utilities';const credits=footer.querySelector('.footer-credits');links.append(trigger);if(credits)links.append(credits);footer.append(links);
    const dialog=document.createElement('dialog');dialog.id='site-options';dialog.className='options-panel';dialog.setAttribute('aria-labelledby','options-title');
    const range=(name,label,min,max,step,description='')=>`<div class="option-control"><div class="option-label"><label for="option-${name}">${label}</label><output for="option-${name}" data-value="${name}"></output><button type="button" class="option-reset" data-reset="${name}" aria-label="Reset ${label.toLowerCase()} to default">Reset</button></div><input id="option-${name}" data-option="${name}" type="range" min="${min}" max="${max}" step="${step}">${description?`<p class="option-help">${description}</p>`:''}</div>`;
    dialog.innerHTML=`<header class="options-header"><div><p class="options-eyebrow">Make yourself at home</p><h2 id="options-title">Options</h2></div><button type="button" class="options-close" aria-label="Close options">×</button></header>
      <div class="options-body"><section class="options-section" aria-labelledby="glow-title"><div class="options-section-heading"><h3 id="glow-title">Text glow</h3><button type="button" class="option-reset" data-reset-glow>Reset glow</button></div>
      <div class="glow-preview" aria-label="Live preview of your text glow"><div class="preview-text" aria-hidden="true">For progeny and posterity / For the things worth keeping / Somewhere between thought and possibility / A little room for wonder / For progeny and posterity / For the things worth keeping / Somewhere between thought and possibility / A little room for wonder / For progeny and posterity / For the things worth keeping / Somewhere between thought and possibility / A little room for wonder</div></div>
      <div class="glow-presets"><button type="button" data-preset="white"><span class="preset-dot preset-white"></span>Soft white <small>Default</small></button><button type="button" data-preset="amber"><span class="preset-dot preset-amber"></span>Amber <small>Original</small></button></div>
      ${range('radius','Radius',8,38,1)}${range('strength','Intensity',0,100,1)}
      <details class="gradient-editor"><summary>Shape your gradient</summary><div class="gradient-strip" aria-hidden="true"></div><div class="gradient-stops" role="group" aria-label="Choose a gradient colour">${colors.map((color,i)=>`<button type="button" data-color="${color}" aria-pressed="${i===0}"><span></span>${['Centre','Inner','Outer','Edge'][i]}</button>`).join('')}</div>
      <div class="color-editor"><div class="wheel-wrap"><canvas class="color-wheel" width="300" height="300" tabindex="0" role="slider" aria-label="Colour wheel: left and right change hue, up and down change saturation" aria-valuemin="0" aria-valuemax="360" aria-valuenow="0"></canvas><span class="wheel-point" aria-hidden="true"></span></div><div class="color-fields"><label for="glow-hex">Selected colour</label><div class="hex-row"><input type="color" id="glow-picker" aria-label="Choose selected gradient colour"><input id="glow-hex" spellcheck="false" maxlength="7" aria-label="Hex colour"></div><label for="glow-value">Brightness</label><input type="range" id="glow-value" min="0" max="100" step="1"><button type="button" class="option-reset" data-reset-color>Reset this colour</button></div></div>
      ${range('spread','Gradient spread',20,75,1)}${range('feather','Edge softness',.4,2.5,.05)}</details></section>
      <section class="options-section" aria-labelledby="motion-title"><h3 id="motion-title">Motion & texture</h3>${range('ribbonSpeed','Ribbon speed',0,3,.05,'Includes the flowing text in article arcs. Zero pauses movement.')}${range('backgroundOpacity','Background visibility',0,100,1,'The faint lettering when it is not lit by the glow.')}${range('headingSpeed','“For progeny and X” speed',0,3,.05,'Changes both the pause between words and the scramble speed. Zero pauses it.')}<p class="option-help">Your device’s reduced-motion preference still takes priority.</p></section></div>
      <footer class="options-actions"><p class="options-save-status" role="status">Saved on this device.</p><button type="button" class="options-restore">Restore all defaults</button></footer>`;
    document.body.append(dialog);
    let active='core',hue=0,saturation=0,brightness=1,statusTimer;
    const wheel=dialog.querySelector('.color-wheel'),ctx=wheel.getContext('2d'),marker=dialog.querySelector('.wheel-point');
    function hsv(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;let h=0;if(d){const i=rgb.indexOf(max);h=i===0?((rgb[1]-rgb[2])/d)%6:i===1?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;}return [(h*60+360)%360,max?d/max:0,max];}
    function hex(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,parts=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+parts.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');}
    // Draw once; moving the marker never regenerates the colour wheel.
    const pixels=ctx.createImageData(300,300);
    for(let y=0;y<300;y++)for(let x=0;x<300;x++){const dx=x-150,dy=y-150,r=Math.hypot(dx,dy)/148;if(r>1)continue;const c=hex((Math.atan2(dy,dx)*180/Math.PI+360)%360,r,1),i=(y*300+x)*4;pixels.data[i]=parseInt(c.slice(1,3),16);pixels.data[i+1]=parseInt(c.slice(3,5),16);pixels.data[i+2]=parseInt(c.slice(5,7),16);pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
    const format=(name,value)=>name.endsWith('Speed')?(value===0?'Paused':`${Number(value.toFixed(2))}×`):name==='feather'?`${Number(value.toFixed(2))}×`:`${Math.round(value)}%`;
    refresh=()=>{
      for(const input of dialog.querySelectorAll('[data-option]')){input.value=values[input.dataset.option];dialog.querySelector(`[data-value="${input.dataset.option}"]`).textContent=format(input.dataset.option,+input.value);}
      dialog.querySelectorAll('[data-reset]').forEach(b=>b.disabled=values[b.dataset.reset]===defaults[b.dataset.reset]);
      for(const b of dialog.querySelectorAll('[data-preset]')){const p=b.dataset.preset==='amber'?amber:defaults;b.setAttribute('aria-pressed',glowKeys.every(k=>values[k]===p[k]));}
      for(const b of dialog.querySelectorAll('[data-color]')){b.setAttribute('aria-pressed',b.dataset.color===active);b.querySelector('span').style.background=values[b.dataset.color];}
      [hue,saturation,brightness]=hsv(values[active]);
      const angle=hue*Math.PI/180;marker.style.left=(50+Math.cos(angle)*saturation*49.3)+'%';marker.style.top=(50+Math.sin(angle)*saturation*49.3)+'%';marker.style.background=values[active];
      wheel.setAttribute('aria-valuenow',Math.round(hue));wheel.setAttribute('aria-valuetext',`${values[active]}, saturation ${Math.round(saturation*100)} percent`);
      dialog.querySelector('#glow-hex').value=values[active];dialog.querySelector('#glow-picker').value=values[active];dialog.querySelector('#glow-value').value=brightness*100;
      const gradient=stops().map(([p,c])=>`${c} ${p*100}%`).join(',');
      dialog.querySelector('.preview-text').style.backgroundImage=`radial-gradient(ellipse ${values.radius*2.2}% 110% at 50% 50%,${gradient})`;dialog.querySelector('.preview-text').style.opacity=values.strength/100;
      dialog.querySelector('.gradient-strip').style.background=`linear-gradient(90deg,${gradient})`;
      clearTimeout(statusTimer);statusTimer=setTimeout(()=>{dialog.querySelector('.options-save-status').textContent=saved?'Saved on this device.':'Applied for this visit. Your browser is not allowing saved preferences.';},350);
    };
    trigger.addEventListener('click',()=>{refresh();dialog.showModal();window.dispatchEvent(new Event('siteoptionsopen'));});
    dialog.querySelector('.options-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}));
    dialog.querySelectorAll('[data-option]').forEach(input=>input.addEventListener('input',()=>update({[input.dataset.option]:+input.value})));
    dialog.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>update({[b.dataset.reset]:defaults[b.dataset.reset]})));
    dialog.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>update(Object.fromEntries(glowKeys.map(k=>[k,(b.dataset.preset==='amber'?amber:defaults)[k]])))));
    dialog.querySelector('[data-reset-glow]').addEventListener('click',()=>update(Object.fromEntries(glowKeys.map(k=>[k,defaults[k]]))));
    dialog.querySelector('.options-restore').addEventListener('click',()=>update(defaults));
    dialog.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.color;refresh();}));
    dialog.querySelector('[data-reset-color]').addEventListener('click',()=>update({[active]:defaults[active]}));
    dialog.querySelector('#glow-picker').addEventListener('input',e=>update({[active]:e.target.value}));
    dialog.querySelector('#glow-hex').addEventListener('change',e=>{if(/^#[a-f\d]{6}$/i.test(e.target.value))update({[active]:e.target.value});else refresh();});
    dialog.querySelector('#glow-value').addEventListener('input',e=>update({[active]:hex(hue,saturation,+e.target.value/100)}));
    const pick=event=>{const box=wheel.getBoundingClientRect(),x=(event.clientX-box.left)/box.width*300-150,y=(event.clientY-box.top)/box.height*300-150;update({[active]:hex((Math.atan2(y,x)*180/Math.PI+360)%360,Math.min(1,Math.hypot(x,y)/148),brightness)});};
    wheel.addEventListener('pointerdown',event=>{wheel.setPointerCapture(event.pointerId);pick(event);});
    wheel.addEventListener('pointermove',event=>{if(wheel.hasPointerCapture(event.pointerId))pick(event);});
    wheel.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const h=(hue+(event.key==='ArrowLeft'?-3:event.key==='ArrowRight'?3:0)+360)%360,s=Math.max(0,Math.min(1,saturation+(event.key==='ArrowUp'?.03:event.key==='ArrowDown'?-.03:0)));update({[active]:hex(h,s,brightness)});});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
