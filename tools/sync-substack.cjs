/* Import public RSS into ordinary static pages. Never run remote HTML as code. */
const fs = require('node:fs/promises');
const path = require('node:path');
const {XMLParser, XMLValidator} = require('fast-xml-parser');
const sanitize = require('sanitize-html');
const cheerio = require('cheerio');
const root = path.resolve(__dirname, '..');
const source = 'https://muhammedtariq.substack.com';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = iso => new Date(iso).toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'});

function trimLinkWhitespace(html) {
  const $ = cheerio.load(html, null, false);
  $('a').each((_, element) => {
    const texts = [];
    const visit = node => {
      if (node.type === 'text') texts.push(node);
      else (node.children || []).forEach(visit);
    };
    visit(element);
    let leading = '', trailing = '';
    for (const node of texts) {
      const space = node.data.match(/^\s*/)[0];
      leading += space; node.data = node.data.slice(space.length);
      if (node.data) break;
    }
    for (const node of [...texts].reverse()) {
      const space = node.data.match(/\s*$/)[0];
      trailing = space + trailing; node.data = node.data.slice(0, node.data.length - space.length);
      if (node.data) break;
    }
    $(element).before(escape(leading)).after(escape(trailing));
  });
  return $.html();
}

function cleanArticle(html, slugs) {
  const $ = cheerio.load(html, null, false);
  $('.subscription-widget-wrap, .subscription-widget, .button-wrapper, script, style, form, input, button').remove();
  // Use the site's hover/tap footnotes, with readable endnotes when JS is off.
  $('.footnote').each((_, element) => {
    const note = $(element), id = note.find('.footnote-number').attr('id');
    if (!id) return;
    const ref = $('a.footnote-anchor').filter((_, a) => $(a).attr('href') === '#' + id);
    if (!ref.length) return;
    const sup = $('<sup data-footnote></sup>');
    sup.append($('<template></template>').html(note.find('.footnote-content').html() || ''));
    sup.append($('<noscript></noscript>').append(ref.clone()));
    ref.replaceWith(sup);
    note.replaceWith($('<noscript></noscript>').append(note.clone()));
  });
  $('iframe').each((_, el) => {
    const src = $(el).attr('src');
    $(el).replaceWith(src ? $('<p class="blog-embed"></p>').append($('<a></a>').attr('href', src).text('Open embedded media')) : '');
  });
  $('a[href]').each((_, el) => {
    const a = $(el), href = a.attr('href');
    if (href.startsWith('#')) return;
    try {
      const url = new URL(href, source);
      const slug = url.pathname.match(/^\/p\/([^/]+)\/?$/)?.[1];
      if (url.origin === source && slugs.has(slug)) a.attr('href', '../' + slug + '/' + url.hash);
      else a.attr('href', url.href);
    } catch { a.removeAttr('href'); }
  });
  $('img').each((_, el) => {
    const img = $(el);
    img.attr('loading', 'lazy').attr('decoding', 'async');
    if (!img.attr('alt')) img.attr('alt', '');
  });
  return trimLinkWhitespace(sanitize($.html(), {
    allowedTags: [...sanitize.defaults.allowedTags, 'img', 'picture', 'source', 'figure', 'figcaption', 'sup', 'sub', 'template', 'noscript', 'audio', 'video'],
    allowedAttributes: {
      '*': ['id'], a: ['href', 'title'], img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
      source: ['src', 'type'], audio: ['src', 'controls'], video: ['src', 'controls', 'poster'],
      sup: ['data-footnote'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
      div: ['class'], span: ['class'], p: ['class']
    },
    allowedClasses: {div:['footnote', 'footnote-content'], span:['caption'], p:['blog-embed']},
    allowedSchemes: ['https', 'http', 'mailto'], allowProtocolRelative: false,
    allowedSchemesByTag: {img:['https'], source:['https'], audio:['https'], video:['https']}
  }));
}

function shell({title, description, body, depth, canonical}) {
  const base = '../'.repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#1b1b1b">
  <meta name="description" content="${escape(description)}">
  <title>${escape(title)} — Seriaura</title>
  <link rel="canonical" href="${escape(canonical)}">
  <link rel="alternate" type="application/rss+xml" title="Seriaura on Substack" href="${source}/feed">
  <link rel="icon" href="${base}assets/favicon.png">
  <link rel="preload" href="${base}assets/logo.png" as="image">
  <script src="${base}site-options.js"></script>
  <script src="${base}entrance.js"></script>
  <link rel="stylesheet" href="${base}style.css">
  <link rel="stylesheet" href="${base}mediaqueries.css">
  <link rel="stylesheet" href="${base}footer.css">
  <link rel="stylesheet" href="${base}footnotes.css">
  <link rel="stylesheet" href="${base}blog.css">
  <link rel="stylesheet" href="${base}article-arcs.css">
  <script src="${base}ribbon-renderer.js" defer></script>
  <script src="${base}article-arcs.js" defer></script>
  <link rel="stylesheet" href="${base}image-preview.css">
  <script src="${base}image-preview.js" defer></script>
  <script src="${base}footnotes.js" defer></script>
  <script src="${base}article-notes.js" defer></script>
  <script src="${base}footer.js" defer></script>
  <script src="${base}links.js" defer></script>
  <script src="${base}sidebar.js" defer></script>
  <link rel="stylesheet" href="${base}article-classes.css">
  <script src="${base}article-classes.js" defer></script>
</head>
<body class="blog-layout">
  <a class="skip-link" href="#main">Skip to the words</a>
  <aside class="sidebar" aria-label="Main navigation">
    <a class="brand" href="${base}index.html#home" aria-label="Seriaura — Home"><span class="brand-crop"><img class="logo sidebar-logo logo-white" src="${base}assets/logo.png" alt="セリアウラ" width="2000" height="2000"><img class="logo logo-orange" src="${base}assets/logo-orange.png" alt="" aria-hidden="true" width="2000" height="2000"></span></a>
    <nav aria-label="Main">
      <a href="${base}index.html#home"><span class="flower" aria-hidden="true"></span><span>Home</span></a>
      <a href="${base}index.html#musings"><span class="flower" aria-hidden="true"></span><span>Musings</span></a>
      <a href="${base}index.html#thousings"><span class="flower" aria-hidden="true"></span><span>Thousings</span></a>
      <a href="${base}index.html#writings" aria-current="true"><span class="flower" aria-hidden="true"></span><span>Writings</span></a>
    </nav>
  </aside>
  <main id="main" tabindex="-1" data-footnote-scope="writing">
    <div class="blog-column">
      ${body}
    </div>
  </main>
  <footer class="site-footer"></footer>
</body>
</html>
`;
}

const pinnedSlug = 'excellence-born-of-insecurity';
function selectHomePosts(posts) {
  const pinned = posts.find(post => post.slug === pinnedSlug);
  const latest = posts.filter(post => post.slug !== pinnedSlug).sort((a, b) => b.published.localeCompare(a.published)).slice(0, 3);
  return pinned ? [pinned, ...latest] : latest;
}
const growthIcons = Object.fromEntries(['seedling','budding','evergreen'].map(stage => {
  const svg = require('node:fs').readFileSync(path.join(root,'assets/icons/growth-'+stage+'.svg'),'utf8');
  return [stage,svg.slice(svg.indexOf('<svg')).trim()];
}));
function postFlower(slug) {
  const tier = slug === pinnedSlug ? 3 : slug === 'why-im-an-atheist' ? 2 : 1;
  const stage = ['seedling','budding','evergreen'][tier-1];
  return growthIcons[stage].replace('<svg ', '<svg class="post-flower post-flower-'+tier+'" data-growth="'+stage+'" aria-hidden="true" ');
}
function postImportance(slug, showLabel = true) {
  const label = slug === pinnedSlug ? 'Salient' : slug === 'why-im-an-atheist' ? 'Considerable' : 'Tangential';
  return '<span class="post-importance"'+(showLabel ? '' : ' role="img" aria-label="'+label+'"')+'>'+postFlower(slug)+(showLabel ? '<span>'+label+'</span>' : '')+'</span>';
}
function postMetadata(post, showLabel = true) {
  return '<div class="blog-meta"><span class="post-meta-details"><time datetime="'+post.published+'">'+date(post.published)+'</time><span class="meta-dot" aria-hidden="true">·</span><span>'+post.minutes+' min read</span></span>'+postImportance(post.slug,showLabel)+'</div>';
}
function renderPostHeader(post) {
  return '<header class="post-header">'+postMetadata(post)+'<h1>'+escape(post.title)+'</h1><p class="blog-deck">'+escape(post.description)+'</p></header>';
}
function postPin(slug) {
  return slug === pinnedSlug ? '<span class="post-pin" role="img" aria-label="Pinned"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3 8 0-1 6 4 4v2h-6v6l-1 2-1-2v-6H5v-2l4-4z"/></svg></span>' : '';
}
function renderHomeWritings(posts) {
  return '<ol class="post-list">' + selectHomePosts(posts).map(post => {
    return `<li><a class="post-link" href="writings/${post.slug}/"><div class="post-summary">${postMetadata(post,false)}<div class="post-title-row"><h3>${escape(post.title)}${postPin(post.slug)}</h3></div><p>${escape(post.description)}</p></div></a></li>`;
  }).join('\n') + '</ol>';
}
function updateHomeWritings(home, posts) {
  const region = /<!-- writings:start -->[\s\S]*?<!-- writings:end -->/;
  if (!region.test(home)) throw new Error('Home writings region missing; existing pages have been kept.');
  return home.replace(region, () => `<!-- writings:start -->\n${renderHomeWritings(posts)}\n          <!-- writings:end -->`);
}
const writingsRedirect = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Writings — Seriaura</title><link rel="canonical" href="https://seriaura.com/#writings"><meta http-equiv="refresh" content="0;url=../index.html#writings"></head>
<body><p>Writings now live on the <a href="../index.html#writings">home page</a>.</p></body>
</html>
`;

async function sync() {
  const from = process.argv.indexOf('--feed-file');
  let xml;
  if (from !== -1) xml = await fs.readFile(process.argv[from + 1], 'utf8');
  else {
    const response = await fetch(source + '/feed', {signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`Substack returned ${response.status}; existing pages have been kept.`);
    xml = await response.text();
  }
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid feed; existing pages have been kept.');
  const feed = new XMLParser({ignoreAttributes:false, processEntities:false}).parse(xml);
  let items = feed.rss?.channel?.item;
  if (!items) throw new Error('Empty or invalid RSS; existing pages have been kept.');
  if (!Array.isArray(items)) items = [items];
  const destination = path.join(root, 'writings');
  let previous = [];
  try { previous = JSON.parse(await fs.readFile(path.join(destination, 'posts.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const posts = new Map(previous.map(post => [post.slug, post]));
  const slugs = new Set([...posts.keys(), ...items.map(item => new URL(item.link).pathname.split('/').filter(Boolean).at(-1))]);
  for (const item of items) {
    const url = new URL(item.link), slug = url.pathname.match(/^\/p\/([a-z0-9-]+)$/)?.[1];
    if (url.origin !== source || !slug || !item['content:encoded'] || !item.title) throw new Error('Incomplete post; existing pages have been kept.');
    const html = cleanArticle(item['content:encoded'], slugs);
    const reading = cheerio.load(html);
    reading('noscript').remove(); // Fallback endnotes duplicate the template notes.
    const words = reading.text().trim().split(/\s+/).length;
    const decode = value => cheerio.load(String(value || ''), null, false).text();
    posts.set(slug, {slug, title:decode(item.title), description:decode(item.description), published:new Date(item.pubDate).toISOString(), source:url.href, minutes:Math.max(1, Math.ceil(words / 220)), html});
  }
  const sorted = [...posts.values()].sort((a, b) => b.published.localeCompare(a.published));
  const files = new Map();
  for (const [i, post] of sorted.entries()) {
    const adjacent = [sorted[i - 1], sorted[i + 1]].filter(Boolean).map(other => `<a href="../${other.slug}/"><span>${other.published > post.published ? 'Newer writing' : 'Older writing'}</span>${escape(other.title)}</a>`).join('');
    const body = `<article>
        ${renderPostHeader(post)}
        <div class="post-body body-copy">${post.html}</div>
        <p class="blog-source">Originally published on <a href="${post.source}">Substack</a>.</p>
      </article>
      <div class="blog-adjacent" aria-label="More writings">${adjacent}</div>`;
    files.set(`${post.slug}/index.html`, shell({title:post.title, description:post.description, body, depth:2, canonical:post.source}));
  }
  files.set('index.html', writingsRedirect);
  files.set('../index.html', updateHomeWritings(await fs.readFile(path.join(root, 'index.html'), 'utf8'), sorted));
  files.set('posts.json', JSON.stringify(sorted, null, 2) + '\n');
  // All network, parsing and validation finish before replacing any page.
  for (const [name, data] of files) {
    const file = path.join(destination, name);
    await fs.mkdir(path.dirname(file), {recursive:true});
    await fs.writeFile(file + '.tmp', data);
    await fs.rename(file + '.tmp', file);
  }
  console.log(`Imported ${items.length} public Substack posts; ${sorted.length} local posts available.`);
}
if (require.main === module) sync().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {cleanArticle, trimLinkWhitespace, selectHomePosts, postFlower, postImportance, renderPostHeader, postPin, renderHomeWritings, updateHomeWritings, writingsRedirect};
