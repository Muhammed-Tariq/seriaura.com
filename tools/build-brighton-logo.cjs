// Separate the supplied vector identity into reusable reels; retain its lettering.
const fs=require('node:fs'),cheerio=require('cheerio');
const $=cheerio.load(fs.readFileSync('assets/events/brighton.svg','utf8'),{xml:true});
const paths=$('svg>g>path').toArray(),starts=[0,97.915,198.466,299.026,399.608,500.189,600.75,701.312];
const glyphs=[8,15,9,10,11,12,14,13],letters='brighton';
const symbols=starts.map((x,i)=>`<symbol id="${letters[i]}" viewBox="${x} 0 97.689 121.245">${$.html(paths[i])}${$.html(paths[glyphs[i]])}</symbol>`);
// The film's flap says MARATHON, without WEEKEND, and hangs from the right.
symbols.push(`<symbol id="marathon" viewBox="132 124.66 283 46.34"><path fill="#9819CC" d="M132 124.66h283V171H132z"/>${paths.slice(24,32).map(p=>$.html(p).replace('fill="black"','fill="white"')).join('')}</symbol>`);
fs.writeFileSync('assets/events/brighton-reels.svg',`<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`);
