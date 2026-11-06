/* External destinations open separately; this site's pages and anchors stay here. */
(() => {
  function update(link) {
    const url = new URL(link.getAttribute('href'), document.baseURI);
    const internal = url.origin === location.origin || /^(www\.)?seriaura\.com$/i.test(url.hostname);
    const action = link.matches('[download], [data-copy], .bard-email, .pronunciation') || /\.(?:zip|pdf|png|jpe?g|svg|webp|mp3|wav)$/i.test(url.pathname) || !/^https?:$/.test(url.protocol);
    const navigation = link.closest('nav,.sidebar,.social-links,.footer-utilities,.blog-adjacent,.post-list') ||
      link.matches('.back-home,.brand,.skip-link,.event-logo,.post-link,[data-image-preview-trigger]') ||
      (link.querySelector('img') && !link.textContent.trim());
    link.dataset.linkKind = navigation ? 'navigation' : 'hyperlink';
    const subpage = !navigation && internal && !action && url.pathname.replace(/\/$/,'') !== location.pathname.replace(/\/$/,'');
    const arrow=link.querySelector(':scope > .subpage-indicator');
    if(subpage&&!arrow){
      const indicator=document.createElement('span');indicator.className='subpage-indicator';indicator.setAttribute('aria-hidden','true');
      indicator.innerHTML='\u2060<svg viewBox="0 0 16 16" data-glow-outline><path d="M2.5 13.5 12 4M4 4h8v8"/></svg>';
      link.append(indicator);
    }else if(!subpage&&arrow)arrow.remove();
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
  }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['href','download','data-copy']});
})();
