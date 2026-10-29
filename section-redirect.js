/* Static hosts serve these entry points before the shared home document. */
(() => {
  const root = new URL('.', document.currentScript.src);
  const section = location.pathname.match(/\/(home|musings|thousings|writings)(?:\/index\.html|\/)?$/)?.[1];
  if (!section) return;
  // A client-side redirect turns a reload into a navigation in the destination.
  // Carry that signal forward so the shared sidebar draws fresh section names.
  try {
    if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
      sessionStorage.setItem('seriaura-section-reload', '1');
    } else {
      sessionStorage.removeItem('seriaura-section-reload');
    }
  } catch (_) { /* Redirects still work when browser storage is disabled. */ }
  const destination = new URL('index.html', root);
  destination.search = location.search;
  destination.hash = location.hash || section;
  location.replace(destination.href);
})();
