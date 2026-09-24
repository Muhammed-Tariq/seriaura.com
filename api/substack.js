// Vercel's same-origin endpoint avoids browser CORS restrictions on Substack RSS.
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const fallback = require('../assets/substack-posts.json');
const feedURL = 'https://muhammedtariq.substack.com/feed';
let cached = null;
let updatedAt = 0;
let pending = null;

function parseFeed(xml) {
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid RSS');
  const feed = new XMLParser({ ignoreAttributes: true, processEntities: true }).parse(xml);
  const items = feed.rss?.channel?.item;
  if (!Array.isArray(items)) throw new Error('Missing posts');
  const posts = items.map(item => {
    const url = new URL(item.link);
    if (url.protocol !== 'https:' || url.hostname !== 'muhammedtariq.substack.com') return null;
    const date = new Date(item.pubDate);
    if (!item.title || !Number.isFinite(date.getTime())) return null;
    const excerpt = String(item.description || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return {
      title: String(item.title), url: url.href, date: date.toISOString(),
      excerpt: excerpt.length > 240 ? excerpt.slice(0, 237).replace(/\s+\S*$/, '') + '…' : excerpt
    };
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (posts.length !== 3) throw new Error('Incomplete feed');
  return { publication: fallback.publication, posts };
}

async function getPosts() {
  if (cached && Date.now() - updatedAt < 300000) return cached;
  if (!pending) pending = (async () => {
    const response = await fetch(feedURL, {
      signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Seriaura website RSS reader' }
    });
    if (!response.ok) throw new Error('Substack unavailable');
    const posts = parseFeed(await response.text());
    cached = posts;
    updatedAt = Date.now();
    return posts;
  })().finally(() => { pending = null; });
  return pending;
}

async function handler(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    response.statusCode = 405; return response.end();
  }
  let posts;
  try {
    posts = await getPosts();
    response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  } catch {
    posts = cached || fallback;
    response.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');
  }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.statusCode = 200;
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify(posts));
}
module.exports = handler;
module.exports.parseFeed = parseFeed;
