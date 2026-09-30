/* External destinations open separately; this site's pages and anchors stay here. */
(() => {
  function update(link) {
    const url = new URL(link.getAttribute('href'), document.baseURI);
    const internal = url.origin === location.origin || /^(www\.)?seriaura\.com$/i.test(url.hostname);
    if (internal) {
      link.removeAttribute('target');
    } else {
      link.target = '_blank';
      link.relList.add('noopener', 'noreferrer');
    }
  }
  function scan(root) {
    if (root.matches?.('a[href]')) update(root);
    root.querySelectorAll?.('a[href]').forEach(update);
  }
  scan(document);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') update(record.target);
      else record.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); });
    }
  }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
})();
