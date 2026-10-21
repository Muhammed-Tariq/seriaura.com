// Build interactive SVG parts from the existing local artwork. Source icon
// attributions remain in assets/icons (Font Awesome CC BY 4.0 / Simple Icons).
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'assets/icons',name+'.svg'),'utf8');
const shape=name=>read(name).match(/<path[^>]* d="([^"]+)"/)[1];
const part=(name,d)=>`<path class="social-piece ${name}" d="${d}"/>`;
const group=(name,body)=>`<g class="social-piece ${name}">${body}</g>`;
const art={};
const add=(name,box,body)=>{art[name]=`<svg class="social-icon" data-social-icon="${name}" viewBox="${box}" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;};
const cut='class="social-cutout"';
const envelope=shape('envelope').split(/(?=M0 196)/);
add('envelope','0 0 512 512',part('mail-body',envelope[1])+part('mail-flap',envelope[0]));
const linked=shape('linkedin-in').split(/(?=M)/).filter(Boolean);
add('linkedin-in','0 0 448 512',part('linkedin-stem',linked[0])+part('linkedin-dot',linked[1])+part('linkedin-n',linked[2]));
add('globe','0 0 24 24','<g fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"><circle cx="12" cy="12" r="10.7"/><path class="globe-back" opacity=".18"/><path class="globe-front"/></g>');
const stack=shape('substack').split(/(?=M)/).filter(Boolean);
add('substack','0 0 24 24',part('stack-middle',stack[0])+part('stack-page',stack[1])+part('stack-top',stack[2]));
// Split the original X into its two actual strokes, retaining the source
// coordinates and the outlined stroke's open centre.
const thin='M20.905 0H22.977L2.33 24H.258z';
const thick='M.258 0H7.251L23.742 24H16.749z';
const thickHole='M11.397 13.461l-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z';
const bird=`<path transform="translate(1.2 1.2) scale(.0421875)" d="${shape('twitter')}"/>`;
add('x','0 0 24 24',
 // Masks allow a transformed group; clipPath only accepts direct shape children.
 '<defs><mask id="social-x-bird" maskUnits="userSpaceOnUse" x="-24" y="-24" width="72" height="72" style="mask-type:alpha">'+group('x-bird-shape',bird)+'</mask></defs>'+
 group('x-bird',group('x-bird-shape',bird))+
 group('x-thin',`<path class="social-piece x-spear" d="${thin}" stroke="currentColor"/>`)+
 // Only the intersection inside the bird is dark; the exposed spear has no border.
 group('x-pierce','<g mask="url(#social-x-bird)">'+group('x-thin',`<path class="social-piece x-spear social-cutout social-cutout-stroke" d="${thin}"/>`)+'</g>')+
 group('x-bold',`<path class="social-cutout" d="${thick}"/><path fill-rule="evenodd" d="${thick+thickHole}"/>`));
add('instagram','0 0 24 24','<rect x="1.2" y="1.2" width="21.6" height="21.6" rx="6.1" fill="none" stroke="currentColor" stroke-width="2.2"/>'+group('camera-lens','<circle cx="12" cy="12" r="5.1" fill="none" stroke="currentColor" stroke-width="2.1"/>')+'<circle class="social-piece camera-flash" cx="18.3" cy="5.7" r="1.4"/>');
add('discord','0 0 24 24',part('discord-body',shape('discord').split('M8.02')[0])+group('discord-eyes',`<ellipse ${cut} cx="8.02" cy="12.91" rx="2.16" ry="2.42"/><ellipse ${cut} cx="15.99" cy="12.91" rx="2.16" ry="2.42"/>`));
add('strava','0 0 24 24',part('strava-summit','M10.463 8.229l2.836 5.598h4.172L10.463 0l-7 13.828h4.169z')+part('strava-trail','M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066z'));
add('goodreads','0 0 24 24',part('goodreads-letter',shape('goodreads')));
// Convert this artwork's outline to absolute coordinates so every point
// can bend continuously. There is no clipped upper/lower join in the ghost.
function ghostPath(wind=0){
 const tokens=shape('snapchat').match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g);
 let i=0,command='',x=0,y=0;const output=[];
 const point=(px,py)=>{const t=Math.max(0,Math.min(1,(py-9)/14)),weight=t*t*(3-2*t);return [(px+wind*1.3*weight*Math.sin((py-9)*.22)).toFixed(3),(py+wind*.55*weight*Math.sin(px*.4)).toFixed(3)].join(' ');};
 while(i<tokens.length){
  if(/[a-zA-Z]/.test(tokens[i]))command=tokens[i++];
  if(command==='z'||command==='Z'){output.push('Z');continue;}
  const kind=command.toLowerCase();
  if(!['m','c','l','h','v'].includes(kind))throw new Error('Unsupported ghost command: '+command);
  const count=kind==='c'?6:['h','v'].includes(kind)?1:2,values=tokens.slice(i,i+count).map(Number);i+=count;
  if(values.some(v=>!Number.isFinite(v)))throw new Error('Invalid ghost coordinates');
  const relative=command===command.toLowerCase(),points=[];
  if(kind==='h')points.push([values[0]+(relative?x:0),y]);
  else if(kind==='v')points.push([x,values[0]+(relative?y:0)]);
  else for(let j=0;j<count;j+=2)points.push([values[j]+(relative?x:0),values[j+1]+(relative?y:0)]);
  output.push((['h','v'].includes(kind)?'L':command.toUpperCase())+points.map(p=>point(...p)).join(' '));[x,y]=points.at(-1);
 }
 return output.join(' ');
}
add('snapchat','0 0 24 24',`<path class="snapchat-shape" d="${ghostPath()}" data-morph-a="${ghostPath(1)}" data-morph-b="${ghostPath(-1)}"/>`);
add('youtube','0 0 24 24','<rect class="social-piece youtube-screen" x="0" y="3.55" width="24" height="16.9" rx="5"/>'+group('youtube-play',`<path ${cut} d="M9.545 8.432 15.818 12l-6.273 3.568z"/>`));
add('spotify','0 0 24 24','<circle cx="12" cy="12" r="12"/>'+`<g fill="none" class="social-cutout-stroke" stroke-linecap="round"><path class="social-piece bass-one" d="M4.8 8.5Q12 6.3 19.5 9.7" stroke-width="2"/><path class="social-piece bass-two" d="M5.8 12.1Q12 10.3 18.2 13.5" stroke-width="1.8"/><path class="social-piece bass-three" d="M6.7 16Q12 14.8 17 17" stroke-width="1.5"/></g>`);
const letterboxd=shape('letterboxd').split(/(?=M320)|(?=m-201\.3)/);
add('letterboxd','0 0 640 512',part('reel-right',letterboxd[0])+part('reel-middle',letterboxd[1])+part('reel-left',letterboxd[2].replace('m-201.3 0','M118.7 128')));
add('steam','0 0 24 24',part('steam-mark',shape('steam')));
const github=shape('github');
const leftEar=github.replace('-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23','-.135-.303-.54-.023.105-1.676 0 0 1.005-.322 3.3-.27');
const rightEar=github.replace('2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176','2.28-.052 3.285.27 3.285.27.645.153.24 1.373.12 1.676');
if(leftEar===github||rightEar===github)throw new Error('GitHub ear source geometry changed');
add('github','0 0 24 24',`<path class="github-shape" d="${github}" data-morph-a="${leftEar}" data-morph-b="${rightEar}"/>`);
const osu=shape('osu').split('M12 0');
add('osu','0 0 24 24',part('osu-word',osu[0])+part('osu-ring','M12 0'+osu[1])+'<circle class="social-piece osu-echo" cx="12" cy="12" r="11.4" fill="none" stroke="currentColor" stroke-width=".7"/>');
const file=path.join(root,'footer.js');let source=fs.readFileSync(file,'utf8');
const generated=`  // social-art:start\n  // Local icon geometry; regenerated with node tools/build-social-icons.cjs.\n  const socialIconArt = ${JSON.stringify(art,null,2)};\n  // social-art:end`;
source=source.includes('// social-art:start')?source.replace(/  \/\/ social-art:start[\s\S]*?  \/\/ social-art:end/,generated):source.replace('  const profiles = [',generated+'\n  const profiles = [');
fs.writeFileSync(file,source);
console.log(`Built ${Object.keys(art).length} social icons from local SVG artwork.`);
