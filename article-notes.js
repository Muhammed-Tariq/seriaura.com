/* Articles use margin notes when there is room and the shared popups otherwise. */
(() => {
  function setup() {
    const body = document.querySelector('.blog-layout .post-body');
    if (!body) return;
    const wide = matchMedia('(min-width:1600px)');
    const notes = [];
    let frame;
    const hasMargin = () => wide.matches && (window.visualViewport?.width || innerWidth) >= 1600;
    function balanceParagraphs(content) {
      if (!Intl.Segmenter) return;
      if (!content.querySelector('p,div,ul,ol,blockquote,figure')) {
        const paragraph = document.createElement('p');
        paragraph.append(...content.childNodes);
        content.append(paragraph);
      }
      const segmenter = new Intl.Segmenter('en-GB',{granularity:'sentence'});
      content.querySelectorAll('p').forEach(paragraph => {
        const text = paragraph.textContent;
        if (text.trim().split(/\s+/).length < 90) return;
        const cuts = [0];
        let words = 0;
        for (const sentence of segmenter.segment(text)) {
          words += sentence.segment.trim().split(/\s+/).length;
          const end = sentence.index + sentence.segment.length;
          if (words >= 45 && text.slice(end).trim().split(/\s+/).length >= 25) {
            cuts.push(end); words = 0;
          }
        }
        if (cuts.length === 1) return;
        cuts.push(text.length);
        const walker = document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT), nodes = [];
        let offset = 0;
        while(walker.nextNode()) {
          const node = walker.currentNode;
          nodes.push({node,start:offset,end:offset+node.length});
          offset += node.length;
        }
        const parts = cuts.slice(1).map((end,i) => {
          const first = nodes.find(node=>node.end>cuts[i]);
          const last = nodes.find(node=>node.end>=end);
          const range = document.createRange();
          range.setStart(first.node,cuts[i]-first.start);
          range.setEnd(last.node,end-last.start);
          const part = document.createElement('p');
          part.append(range.cloneContents());
          return part;
        });
        paragraph.replaceWith(...parts);
      });
    }
    function layout() {
      frame = null;
      const margin = hasMargin();
      const changed = document.body.classList.contains('article-margin-notes') !== margin;
      document.body.classList.toggle('article-margin-notes',margin);
      if (changed) document.dispatchEvent(new Event('articlefootnotemodechange'));
      body.style.paddingBottom = '0px';
      notes.forEach(({button,note,popup}) => {
        note.hidden = !margin;
        button.setAttribute('aria-controls',margin ? note.id : popup.id);
        if (margin) {
          button.removeAttribute('aria-expanded');
          button.removeAttribute('aria-describedby');
        } else {
          if (!button.hasAttribute('aria-expanded')) button.setAttribute('aria-expanded','false');
          button.setAttribute('aria-describedby',popup.id);
        }
        note.style.top = '';
      });
      if (!margin) return;
      const bounds = body.getBoundingClientRect();
      let bottom = 0;
      for (const {button,note} of notes) {
        const y = Math.max(button.getBoundingClientRect().top-bounds.top-3,bottom);
        note.style.top = `${y}px`;
        bottom = y + note.getBoundingClientRect().height + 20;
      }
      body.style.paddingBottom = `${Math.max(0,Math.ceil(bottom-body.offsetHeight))}px`;
    }
    function scheduleLayout() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    }
    body.querySelectorAll('[data-footnote]').forEach((reference,index) => {
      const number = index+1, template = reference.querySelector('template');
      reference.id = `footnote-writing-${number}`;
      const button = reference.querySelector('.footnote-trigger');
      const popup = document.getElementById(button.getAttribute('aria-controls'));
      const note = document.createElement('aside');
      note.className = 'article-sidenote';
      note.id = `article-note-${number}`;
      note.setAttribute('role','note');
      note.setAttribute('aria-label',`Footnote ${number}`);
      note.tabIndex = -1;
      const backlink = document.createElement('a');
      backlink.className = 'sidenote-number';
      backlink.href = `#${button.id}`;
      backlink.setAttribute('aria-label',`Back to footnote ${number} in the article`);
      backlink.textContent = number;
      const content = document.createElement('div');
      content.className = 'sidenote-content';
      if (template) content.append(template.content.cloneNode(true));
      else content.textContent = reference.dataset.footnote;
      balanceParagraphs(content);
      popup.replaceChildren(content.cloneNode(true));
      const popupBacklink = backlink.cloneNode(true);
      popupBacklink.className = 'popup-note-number';
      popup.prepend(popupBacklink);
      popup.querySelectorAll('a[href]').forEach(link=>{link.tabIndex=0;});
      note.append(backlink,content);
      body.append(note);
      notes.push({button,note,popup});
      // The pair remains highlighted whether reading the reference or the note,
      // with the same feedback for a mouse and keyboard navigation.
      const hovered = new Set();
      function highlight() {
        const active = hovered.size > 0 || [button,note,popup].some(element=>element.contains(document.activeElement));
        note.classList.toggle('is-reference-hovered',active);
        button.classList.toggle('is-note-active',active);
      }
      [button,note,popup].forEach(element=>{
        element.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered.add(element);highlight();}});
        element.addEventListener('pointerleave',()=>{hovered.delete(element);highlight();});
        element.addEventListener('focusin',highlight);
        element.addEventListener('focusout',()=>queueMicrotask(highlight));
      });
      function returnToReference(event) {
        event.preventDefault();
        button.focus({preventScroll:true});
        button.scrollIntoView({block:'center',behavior:'instant'});
        document.dispatchEvent(new Event('footnotereturn'));
        hovered.delete(popup);
        highlight();
      }
      backlink.addEventListener('click',returnToReference);
      popupBacklink.addEventListener('click',returnToReference);
      button.addEventListener('click',()=>{
        const target=hasMargin()?backlink:popupBacklink;
        target.focus({preventScroll:true});
        target.scrollIntoView({block:'nearest',behavior:'instant'});
      });
    });
    wide.addEventListener('change',scheduleLayout);
    window.addEventListener('resize',scheduleLayout);
    window.visualViewport?.addEventListener('resize',scheduleLayout);
    body.addEventListener('load',scheduleLayout,true);
    document.fonts.ready.then(scheduleLayout);
    // Reflow notes after image, font, or embedded media size changes, without
    // observing the body's own padding and creating a resize feedback loop.
    const observer = new ResizeObserver(scheduleLayout);
    body.querySelectorAll('img,video,figure,.article-sidenote').forEach(element => observer.observe(element));
    layout();
  }
  document.addEventListener('DOMContentLoaded',setup,{once:true});
})();
