const {test} = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/substack');
const item = (id, title = 'A title &amp; a thought') => `<item><title>${title}</title><link>https://muhammedtariq.substack.com/p/post-${id}</link><pubDate>Wed, ${String(id).padStart(2,'0')} Jul 2026 00:28:25 GMT</pubDate><description><![CDATA[A short <em>excerpt</em>.]]></description></item>`;
const feed = `<rss><channel>${[1,4,3,2].map(id=>item(id)).join('')}</channel></rss>`;
test('RSS cards contain the newest three posts, decoded titles, and plain excerpts', () => {
  const result = handler.parseFeed(feed);
  assert.deepEqual(result.posts.map(p=>p.url.split('-').at(-1)), ['4','3','2']);
  assert.equal(result.posts[0].title, 'A title & a thought');
  assert.equal(result.posts[0].excerpt, 'A short excerpt.');
});
test('Unusable feeds cannot replace the saved snapshot', () => {
  for (const xml of ['<html>error</html>', '<rss>', '<rss><channel>'+item(1)+'</channel></rss>', feed.replaceAll('https://muhammedtariq.substack.com','https://unrelated.example')]) {
    assert.throws(()=>handler.parseFeed(xml));
  }
});
test('Endpoint serves fallback on failure and recovers, caching successful requests', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  const call = async method => {
    const response = {headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body}};
    await handler({method}, response);
    return response;
  };
  try {
    global.fetch = async () => { calls++; throw new Error('Offline'); };
    const fallback = await call('GET');
    assert.equal(fallback.statusCode,200);
    assert.equal(JSON.parse(fallback.body).posts.length,3);
    global.fetch = async () => { calls++; return {ok:true,text:async()=>feed}; };
    const live = await call('GET');
    assert.equal(JSON.parse(live.body).posts[0].title,'A title & a thought');
    assert.match(live.headers['Cache-Control'],/s-maxage=300/);
    await call('GET');
    assert.equal(calls,2);
    assert.equal((await call('HEAD')).body,undefined);
    assert.equal((await call('POST')).statusCode,405);
  } finally { global.fetch = originalFetch; }
});
