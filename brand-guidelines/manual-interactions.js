/* The official wording has some unofficial footnotes. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Keep punctuation attached to the visible wording, including in a wider slot.
  document.querySelectorAll('.copy-swap').forEach(button => {
    const next = button.nextSibling;
    let punctuation = '';
    if (next?.nodeType === Node.ELEMENT_NODE && next.matches('.swap-ending')) {
      punctuation = next.textContent; next.remove();
    } else if (next?.nodeType === Node.TEXT_NODE && /^[,.!?;:]/.test(next.textContent)) {
      punctuation = next.textContent[0]; next.textContent = next.textContent.slice(1);
    }
    if (punctuation) button.querySelectorAll('.swap-original,.swap-alternative').forEach(phrase => {
      if (!phrase.textContent.endsWith(punctuation)) phrase.textContent += punctuation;
    });
  });
  const paragraphs = [...new Set([...document.querySelectorAll('.copy-swap')].map(button => button.closest('p')))];
  const running = new WeakMap();
  const finish = paragraph => {
    running.get(paragraph)?.forEach(animation => animation.cancel());
    running.delete(paragraph);
    paragraph.querySelector('.phrase-ghost')?.remove();
    paragraph.style.height = '';
  };
  paragraphs.forEach(paragraph => {
    const live = document.createElement('span');
    live.className = 'phrase-live';
    live.append(...paragraph.childNodes);
    paragraph.append(live);
    paragraph.classList.add('phrase-paragraph');
  });
  function transition(button, active, immediate = false) {
    if (button.getAttribute('aria-pressed') === String(active)) return;
    const paragraph = button.closest('p');
    finish(paragraph);
    const live = paragraph.querySelector('.phrase-live');
    const original = button.querySelector('.swap-original');
    const alternative = button.querySelector('.swap-alternative');
    const oldHeight = paragraph.getBoundingClientRect().height;
    const ghost = !immediate && !reducedMotion.matches ? live.cloneNode(true) : null;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', (active ? alternative : original).textContent);
    original.hidden = active;
    alternative.hidden = !active;
    original.setAttribute('aria-hidden', String(active));
    alternative.setAttribute('aria-hidden', String(!active));
    if (immediate || reducedMotion.matches) return;
    const duration = 200;
    const options = {duration, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'both'};
    const animations = [];
    const animate = (element, frames) => animations.push(element.animate(frames, options));
    const newHeight = paragraph.getBoundingClientRect().height;
    if (Math.abs(oldHeight - newHeight) > .5) animate(paragraph, [{height: `${oldHeight}px`}, {height: `${newHeight}px`}]);
    ghost.className = 'phrase-live phrase-ghost';
    ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    ghost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    paragraph.append(ghost);
    animate(ghost, [{opacity: 1}, {opacity: 0}]);
    animate(live, [{opacity: 0}, {opacity: 1}]);
    running.set(paragraph, animations);
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (running.get(paragraph) === animations) finish(paragraph);
    });
  }
  document.querySelectorAll('.copy-swap').forEach(button => {
    button.setAttribute('aria-label', button.querySelector('.swap-original').textContent);
    let hovered = false, pinned = false, dismissed = false, pointerX, pointerY, pointerType;
    const render = () => transition(button, !dismissed && (hovered || pinned || button.matches(':focus-visible')));
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX; pointerY = event.clientY;
      dismissed = false; hovered = true; render();
    });
    button.addEventListener('pointermove', event => { pointerX = event.clientX; pointerY = event.clientY; });
    button.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      // Layout moving away from a still pointer isn't a deliberate hover exit.
      if (event.clientX === pointerX && event.clientY === pointerY) return;
      hovered = false; render();
    });
    button.addEventListener('focus', () => { dismissed = false; render(); });
    button.addEventListener('blur', () => { pinned = false; render(); });
    button.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
    button.addEventListener('click', event => {
      // Mouse clicks never pin a hover reveal. Touch and keyboard can toggle it.
      if (event.detail !== 0 && pointerType !== 'touch') return;
      pinned = !pinned; dismissed = !pinned; render();
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click(); }
      if (event.key === 'Escape') { dismissed = true; pinned = hovered = false; render(); }
    });
    document.addEventListener('pointerdown', event => {
      if (!button.contains(event.target)) { pinned = hovered = false; dismissed = true; render(); }
    });
  });
  document.addEventListener('pointermove', event => {
    // A real movement outside the active phrase ends a geometry-held reveal.
    document.querySelectorAll('.phrase-live:not(.phrase-ghost) .copy-swap[aria-pressed=true]').forEach(button => {
      if (!button.contains(event.target) && !button.matches(':focus-visible')) {
        button.dispatchEvent(new PointerEvent('pointerleave', {pointerType:event.pointerType, clientX:event.clientX, clientY:event.clientY}));
      }
    });
  });
  window.addEventListener('resize', () => paragraphs.forEach(finish));
  reducedMotion.addEventListener('change', () => paragraphs.forEach(finish));

  async function buildParody(figure, before) {
    const ns = 'http://www.w3.org/2000/svg';
    const node = (tag,attrs={}) => {
      const element = document.createElementNS(ns,tag);
      Object.entries(attrs).forEach(([key,value])=>element.setAttribute(key,value));
      return element;
    };
    const piece = (element,kind,index,delay=0) => {
      const group=node('g',{class:`parody-piece ${kind}`});
      group.style.setProperty('--part-delay',`${delay}s`);
      group.style.setProperty('--drift',`${(index%2?-1:1)*(50+index*12)}px`);
      group.style.setProperty('--spin',`${(index%2?-1:1)*(80+index*35)}deg`);
      group.append(element);return group;
    };
    try {
      const response=await fetch('../assets/brand/parody.svg');
      if(!response.ok)throw new Error('Parody artwork unavailable');
      const parsed=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
      const scene=document.importNode(parsed.documentElement,true);
      scene.setAttribute('class','parody-scene');scene.setAttribute('aria-hidden','true');
      scene.removeAttribute('role');scene.removeAttribute('aria-label');
      before.replaceChildren(scene);
      // Split live SVG text at its measured glyph positions, preserving kerning.
      for(const text of [...scene.querySelectorAll('text')]){
        const small=text.textContent.includes('SEWIAUWA');
        const letters=[...text.textContent];
        const positions=letters.map((_,i)=>text.getStartPositionOfChar(i));
        const group=node('g');
        letters.forEach((letter,i)=>{
          const glyph=text.cloneNode(false);glyph.textContent=letter;
          glyph.setAttribute('x','0');glyph.setAttribute('y','0');glyph.setAttribute('letter-spacing','0');
          const anchor=node('g',{transform:`translate(${positions[i].x} ${positions[i].y})`});
          const kind=small?'piece-caption':`piece-auwa piece-auwa-${i}`;
          anchor.append(piece(glyph,kind,i,small?.18+i*.026:.05+i*.055));group.append(anchor);
        });
        text.replaceWith(group);
      }
      for(const image of [...scene.querySelectorAll('image')]){
        const partner=image.getAttribute('width')==='474';
        const bounds=partner?[[0,100],[125,214],[260,376],[396,506],[535,640],[669,778],[800,904],[937,1018],[1067,1178],[1198,1307]]:[[0,375],[375,735]];
        const group=node('g');
        bounds.forEach(([left,right],i)=>{
          const scale=partner?474/1307:1;
          const anchor=node('g',{transform:`translate(${left*scale} ${partner?0:107})`});
          const glyph=node('image',{href:partner?`../assets/brand/partner-glyph-${i}.png`:`../assets/brand/glyph-${i?'ri':'se'}.png`,width:(right-left)*scale,height:partner?80:367});
          if(!partner)glyph.setAttribute('filter','url(#parody-effects)');
          anchor.append(piece(glyph,partner?'piece-partner':`piece-japanese piece-japanese-${i}`,i,partner?.08+i*.032:i*.07));
          group.append(anchor);
        });
        image.replaceWith(group);
      }
      const paths=[...scene.children].filter(element=>element.tagName==='path');
      paths.slice(0,2).forEach(path=>path.classList.add('parody-scenery'));
      const heart=paths[2];scene.append(piece(heart,'piece-heart',0,.08));
      const fx=node('g',{class:'parody-fx',transform:'translate(600 165)'});
      // Layered, stepped fire clouds: hot cores, orange flame and sooty smoke.
      // Each lobe expands separately; the original characters are still thrown out.
      const cloud='M-25-80H20V-65H55V-40H80V-10H95V25H70V55H35V75H-5V85H-40V65H-65V35H-85V0H-75V-35H-55V-60H-25Z';
      const inner='M-15-55H20V-40H45V-15H65V15H45V40H15V55H-20V45H-45V20H-55V-10H-35V-35H-15Z';
      for(let i=0;i<7;i++){
        const smoke=node('path',{class:'blast-smoke',d:cloud});
        smoke.style.setProperty('--blast-x',`${(i-3)*65}px`);
        smoke.style.setProperty('--blast-y',`${-35-(i%3)*30}px`);
        smoke.style.setProperty('--part-delay',`${.3+i*.04}s`);fx.append(smoke);
      }
      const ring=node('ellipse',{class:'blast-wave',rx:75,ry:40});fx.append(ring);
      [[0,0,1.35],[-100,-35,1], [100,-45,1.15],[-155,30,.85],[155,25,.9],[-55,55,1],[65,55,.9],[-35,-85,.85]].forEach(([x,y,size],i)=>{
        const flame=node('g',{class:'blast-flame'});
        flame.style.setProperty('--blast-x',`${x}px`);flame.style.setProperty('--blast-y',`${y}px`);
        flame.style.setProperty('--blast-size',size);flame.style.setProperty('--part-delay',`${.035+i*.025}s`);
        flame.append(node('path',{d:cloud,fill:'#c74712'}),node('path',{d:cloud,fill:'#ff7912',transform:'scale(.88)'}),node('path',{d:inner,fill:'#ffca35'}),node('path',{d:inner,fill:'#fff4a0',transform:'scale(.55)'}));
        fx.append(flame);
      });
      fx.append(node('path',{class:'blast-core',d:inner}));
      for(let i=0;i<18;i++){
        const angle=i*Math.PI/9;
        const ember=node('path',{class:'blast-ember',d:i%2?'M-7-3H7V3H-7Z':'M-4-4H4V4H-4Z'});
        ember.style.setProperty('--spark-x',`${Math.cos(angle)*(220+i%3*95)}px`);
        ember.style.setProperty('--spark-y',`${Math.sin(angle)*(130+i%3*55)}px`);
        ember.style.setProperty('--part-delay',`${.08+i*.009}s`);fx.append(ember);
      }
      scene.append(fx);figure.classList.add('parody-ready');
    } catch(error) {
      // The static artwork and normal hover correction remain usable offline.
      console.warn(error.message);
    }
  }

  const correctionTargets = [];
  document.querySelectorAll('.example').forEach(figure => {
    if (!figure.querySelector('.verdict.bad') || !figure.querySelector('.example-art')?.children.length) return;
    const art = figure.querySelector('.example-art');
    const before = document.createElement('div'), after = document.createElement('div');
    before.className = 'misuse-before'; after.className = 'misuse-after';
    after.setAttribute('aria-hidden', 'true');
    before.append(...art.childNodes);
    if (figure.classList.contains('space-bad')) {
      after.append(document.querySelector('.space-good .clearspace-pair').cloneNode(true));
    } else if (figure.classList.contains('partner-unequal')) {
      document.querySelectorAll('#partners .partner-equal .example-art > img').forEach(image => after.append(image.cloneNode(true)));
    } else {
      const image = document.createElement('img');
      image.src = '../assets/brand/logo.png'; image.alt = ''; image.width = 1886; image.height = 474;
      image.className = 'specimen-mark'; after.append(image);
    }
    if (figure.matches('.cut-aura, .missing-hearts')) {
      const cutAura = figure.classList.contains('cut-aura');
      const hearts = [595,699,803,907,1011,1115,1219].map((x,index) => {
        const missing = !cutAura || index < 2 || index > 4;
        const order = cutAura ? [0,1,0,0,0,2,3][index] : index;
        return `<img class="rebuild-heart${missing?' new-heart':''}" src="../assets/brand/heart-${index+1}.png" alt="" width="72" height="72" style="left:${x/1886*100}%;--pop-delay:${(cutAura?.14:0)+order*.045}s">`;
      }).join('');
      const letters = cutAura ? [['a',735,410],['u',1145,375],['ra',1520,366]].map(([name,x,width],index) =>
        `<img class="typed-glyph" src="../assets/brand/glyph-${name}.png" alt="" width="${width}" height="367" style="left:${x/1886*100}%;width:${width/1886*100}%;--type-delay:${.13+index*.09}s">`).join('') : '';
      before.innerHTML = `<div class="logo-rebuild"><img class="rebuild-word" src="../assets/brand/logo.png" alt="Seriaura lettering" width="1886" height="474">${letters}${hearts}</div>`;
    }
    if (figure.classList.contains('recolouring')) {
      after.querySelector('img').src = '../assets/brand/logo-orange.png';
    }
    art.append(before, after);
    if (figure.classList.contains('parody')) buildParody(figure, before);
    figure.classList.add('correctable');
    figure.setAttribute('role', 'button'); figure.tabIndex = 0;
    figure.setAttribute('aria-label', `Preview correction: ${figure.querySelector('figcaption').textContent.replace('×','').trim()}`);
    const verdict = figure.querySelector('.verdict');
    verdict.setAttribute('aria-hidden','true');
    verdict.innerHTML = '<svg viewBox="0 0 24 24"><path class="verdict-cross" d="M6 6 18 18M18 6 6 18"/><path class="verdict-tick" d="m4 12 5 5L20 6"/></svg>';
    correctionTargets.push(figure);
  });
  const correctNames = ['Seriaura', 'Seri', 'Seriaura', 'Seri'];
  document.querySelectorAll('.name-list:last-child p').forEach((name,index) => {
    const before = document.createElement('span'), after = document.createElement('span');
    before.className = 'name-before'; before.textContent = name.textContent;
    after.className = 'name-after'; after.textContent = correctNames[index]; after.setAttribute('aria-hidden','true');
    name.replaceChildren(before,after); name.classList.add('correctable-name');
    name.setAttribute('role','button'); name.tabIndex = 0;
    name.setAttribute('aria-label', `${before.textContent}: correct spelling ${correctNames[index]}`);
    correctionTargets.push(name);
  });
  correctionTargets.forEach(target => {
    let hovered = false, pinned = false, dismissed = false, pointerType;
    const render = () => {
      const active = !dismissed && (hovered || pinned || target.matches(':focus-visible'));
      target.classList.toggle('is-corrected',active); target.setAttribute('aria-pressed',String(active));
      const verdict = target.querySelector('.verdict');
      if (verdict) { verdict.dataset.state = active ? 'correct' : 'incorrect'; verdict.classList.toggle('good',active); verdict.classList.toggle('bad',!active); }
    };
    render();
    target.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;hovered=true;dismissed=false;render();});
    target.addEventListener('pointerleave',()=>{hovered=false;render();});
    target.addEventListener('focus',()=>{dismissed=false;render();});
    target.addEventListener('blur',()=>{pinned=false;render();});
    target.addEventListener('pointerdown',event=>{pointerType=event.pointerType;});
    target.addEventListener('click',event=>{if(event.detail && pointerType!=='touch')return;pinned=!pinned;dismissed=!pinned;render();});
    target.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();target.click();}
      if(event.key==='Escape'){pinned=hovered=false;dismissed=true;render();}
    });
  });

  const trigger = document.querySelector('.bard-email');
  const warning = document.querySelector('#bard-warning');
  const sirenAudio = document.createElement('audio');
  sirenAudio.className = 'warning-audio';
  sirenAudio.src = '../assets/brand/missile-alert-original-light.wav';
  sirenAudio.volume = .6;
  sirenAudio.loop = true;
  sirenAudio.preload = 'none';
  document.body.append(sirenAudio);
  let warningFrame;
  const syncWarning = () => {
    const on = reducedMotion.matches || (!sirenAudio.paused && (window.BARD_ALARM_CUES || []).some(([start,end]) => sirenAudio.currentTime >= start && sirenAudio.currentTime < end));
    warning.dataset.pulse = on ? 'on' : 'off';
    if (warning.open) warningFrame = requestAnimationFrame(syncWarning);
  };
  function silence() {
    cancelAnimationFrame(warningFrame); warning.dataset.pulse = 'off';
    sirenAudio.pause(); sirenAudio.currentTime = 0;
  }
  function siren() {
    sirenAudio.currentTime = 0;
    sirenAudio.play().catch(error => {
      if (error.name !== 'AbortError') { silence(); warning.dataset.pulse = 'on'; }
    });
  }
  trigger.addEventListener('click', event => {
    event.preventDefault();
    if (warning.open) return;
    warning.showModal();
    siren();
    syncWarning();
  });
  // The copy affordance is the joke; it never writes to the clipboard or opens mail.
  ['copy', 'cut', 'dragstart', 'contextmenu'].forEach(type => trigger.addEventListener(type, event => event.preventDefault()));
  document.addEventListener('copy', event => {
    if (window.getSelection()?.containsNode(trigger, true)) event.preventDefault();
  });
  warning.addEventListener('click', event => {
    if (!event.target.closest('.warning-panel')) warning.close();
  });
  // Keep the viewport, scrollbar and font measurements exactly as they were.
  // Consume scroll gestures in the overlay instead of changing root overflow.
  warning.addEventListener('wheel', event => event.preventDefault(), {passive:false});
  warning.addEventListener('touchmove', event => event.preventDefault(), {passive:false});
  warning.addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) event.preventDefault();
  });
  warning.addEventListener('close', () => {
    silence(); trigger.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silence();
    else if (warning.open) { siren(); syncWarning(); }
  });
  window.addEventListener('pagehide', silence);
})();
