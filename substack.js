/* Cached live feed with a local snapshot; no heavy embeds or CORS proxy. */
(() => {
  const container = document.querySelector('.media-cards');
  if (!container) return;
  let lastContent = '';
  let pending = false;
  async function refresh() {
    if (pending || document.hidden) return;
    pending = true;
    try {
      let data;
      // Show the bundled snapshot immediately, then refresh from the Vercel API.
      if (!lastContent) {
        const snapshot = await fetch('assets/substack-posts.json');
        if (snapshot.ok) render(await snapshot.json());
      }
      // A plain static development server has no serverless functions.
      if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return;
      const response = await fetch('api/substack', { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Feed unavailable');
      data = await response.json();
      render(data);
    } catch {
      // Keep previously rendered posts on intermittent or offline connections.
      if (!container.children.length) {
        const link = document.createElement('a');
        link.href = 'https://muhammedtariq.substack.com/';
        link.textContent = 'Read the latest posts on Substack ↗';
        container.append(link);
      }
    } finally { pending = false; }
  }
  function render(data) {
      const posts = data.posts?.slice(0, 3);
      if (posts?.length !== 3 || posts.some(post => {
        const url = new URL(post.url);
        return url.protocol !== 'https:' || url.hostname !== 'muhammedtariq.substack.com' || !post.title;
      })) throw new Error('Invalid feed');
      const signature = JSON.stringify(posts);
      if (signature === lastContent) return;
      const cards = posts.map(post => {
        const card = document.createElement('a');
        card.className = 'media-card substack-card';
        card.href = post.url;
        if (post.image && new URL(post.image, location.href).protocol === 'https:') {
          const picture = document.createElement('img');
          picture.className = 'post-image'; picture.src = post.image;
          picture.alt = ''; picture.width = 600; picture.height = 315;
          picture.decoding = 'async';
          picture.addEventListener('error', () => { picture.hidden = true; window.dispatchEvent(new Event('postsupdated')); }, {once:true});
          card.append(picture);
        }
        const source = document.createElement('span');
        source.className = 'post-source'; source.textContent = 'Substack';
        const title = document.createElement('h2'); title.textContent = post.title;
        const excerpt = document.createElement('p'); excerpt.textContent = post.excerpt;
        const date = document.createElement('time'); date.dateTime = post.date;
        date.textContent = new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        card.append(source, title, excerpt, date);
        return card;
      });
      container.replaceChildren(...cards);
      lastContent = signature;
      window.dispatchEvent(new Event('postsupdated'));
  }
  refresh();
  setInterval(refresh, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
