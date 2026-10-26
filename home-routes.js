/* Keep section URLs clean while the home page remains one continuous document. */
(() => {
  const root = new URL('.', document.currentScript.src);
  const sections = ['home', 'musings', 'thousings', 'writings'];
  function section(url = new URL(location.href)) {
    if (url.origin !== root.origin) return null;
    const path = url.pathname.slice(root.pathname.length);
    if (!url.pathname.startsWith(root.pathname)) return null;
    if (path === '' || path === 'index.html' || sections.includes(path)) {
      if (sections.includes(url.hash.slice(1))) return url.hash.slice(1);
      return sections.includes(path) ? path : 'home';
    }
    return null;
  }
  const href = id => new URL(id, root).pathname;
  function normalize() {
    const id = section();
    if (!id) return;
    const hash = sections.includes(location.hash.slice(1)) ? '' : location.hash;
    history.replaceState(history.state, '', href(id) + location.search + hash);
  }
  window.HomeRoutes = {section, href, normalize};
  // Section navigation restores its own target after Back/Forward.
  history.scrollRestoration = 'manual';
  normalize();
})();
