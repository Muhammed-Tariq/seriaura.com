/* Static hosts serve these entry points before the shared home document. */
(() => {
  const root = new URL('.', document.currentScript.src);
  const section = location.pathname.match(/\/(home|musings|thousings|writings)(?:\/index\.html|\/)?$/)?.[1];
  if (!section) return;
  const destination = new URL('index.html', root);
  destination.search = location.search;
  destination.hash = location.hash || section;
  location.replace(destination.href);
})();
