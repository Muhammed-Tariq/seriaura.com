/* Draw individual pen strokes, rather than revealing a typeset word. */
(() => {
  const title=document.querySelector('.brand-hero h1');
  if(!title)return;
  const replacement=title.querySelector('.marker-replacement');
  const ns='http://www.w3.org/2000/svg';
  // Lowercase marker lettering: slightly uneven heights and open joins.
  const letters={
    c:{width:43,paths:['M37 27 C23 14 6 25 5 42 C3 61 23 69 37 56']},
    o:{width:44,paths:['M25 22 C8 18 1 40 7 55 C14 71 35 62 38 43 C41 27 29 19 20 25']},
    r:{width:33,paths:['M7 63 L11 24 L9 43 C17 22 25 20 31 28']},
    p:{width:44,paths:['M9 28 L4 89','M10 37 C26 13 43 25 38 46 C34 62 19 67 8 54']},
    a:{width:44,paths:['M35 29 C21 11 5 28 5 48 C5 68 25 68 34 39','M37 24 L32 63 L40 60']},
    t:{width:32,paths:['M21 7 L14 51 Q11 68 27 60','M3 29 L31 25']},
    i:{width:23,paths:['M12 29 L8 61 L17 58','M15 11 L16 12']},
    s:{width:37,paths:['M32 27 C18 16 3 26 11 36 C17 43 33 41 29 54 C24 69 7 65 4 56']},
    n:{width:46,paths:['M6 62 L10 26 L8 47 C17 24 29 19 34 31 C39 41 29 60 40 62']}
  };
  let x=7;
  [...'corporatisation'].forEach((letter,index)=>{
    const glyph=letters[letter],group=document.createElementNS(ns,'g');
    group.setAttribute('transform',`translate(${x} ${[0,-2,1,0,2,-1][index%6]})`);
    glyph.paths.forEach(d=>{const path=document.createElementNS(ns,'path');path.setAttribute('d',d);group.append(path);});
    replacement.append(group);x+=glyph.width;
  });
  replacement.setAttribute('viewBox',`0 0 ${x+16} 100`);
  const strokes=[...title.querySelectorAll('.marker-strike path'),...replacement.querySelectorAll('path')];
  strokes.forEach(path=>{const length=path.getTotalLength();path.style.strokeDasharray=length;path.style.strokeDashoffset=length;});
  title.classList.add('marker-ready');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let finished=false,animations=[];
  function finish(){
    finished=true;animations.forEach(animation=>animation.cancel());animations=[];
    strokes.forEach(path=>path.style.strokeDashoffset='0');
    title.setAttribute('aria-label','For progeny and corporatisation.');
    title.dataset.marker='complete';
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
  async function write(){
    await document.fonts.ready;
    if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
    if(reduced.matches||finished){finish();return;}
    // Let the original phrase register before making the correction.
    await new Promise(resolve=>setTimeout(resolve,1000));
    if(finished)return;
    title.dataset.marker='writing';
    for(let i=0;i<strokes.length;i++){
      if(finished)return;
      const path=strokes[i],length=path.getTotalLength();
      const duration=i<2?(i===0?430:240):Math.max(65,Math.min(210,length*1.5));
      const animation=path.animate([{strokeDashoffset:length},{strokeDashoffset:0}],{duration,easing:'linear',fill:'forwards'});
      animations.push(animation);await animation.finished.catch(()=>{});
      if(i===1&&!finished)await new Promise(resolve=>setTimeout(resolve,180));
    }
    finish();
  }
  write();
})();
