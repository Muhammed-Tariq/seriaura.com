(() => {
  const names = ['Field manual','Editorial','Specimen board','Catalogue','Poster'];
  const query = new URLSearchParams(location.search);
  let selected = Math.min(5,Math.max(1,Number(query.get('layout')) || 1));
  if (!Number.isInteger(selected)) selected = 1;
  let size = query.get('size') === 'phone' || (!query.has('size') && innerWidth < 650) ? 'phone' : 'desktop';
  const frame = document.getElementById('layout-preview');
  const wrapper = document.querySelector('.preview-frame');
  const stage = document.querySelector('.preview-stage');
  function resize() {
    const style = getComputedStyle(stage);
    const available = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = size === 'phone' ? 390 : 1440;
    const scale = Math.min(1,available / width);
    wrapper.style.width = width * scale + 'px';
    wrapper.style.height = height + 'px';
    frame.style.width = width + 'px';
    frame.style.height = height / scale + 'px';
    frame.style.transform = `scale(${scale})`;
    wrapper.classList.toggle('phone', size === 'phone');
  }
  function render(load = true) {
    const url = `preview.html?layout=${selected}`;
    if (load) frame.src = url;
    frame.title = names[selected - 1] + ' layout preview';
    document.getElementById('open-preview').href = url;
    document.getElementById('preview-label').textContent = `0${selected} / ${names[selected - 1]}`;
    document.querySelectorAll('[data-layout]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.layout) === selected)));
    document.querySelectorAll('[data-size]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
    const address = new URL(location.href);
    address.searchParams.set('layout', selected);
    address.searchParams.set('size', size);
    history.replaceState(null,'',address);
    resize();
  }
  document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => { selected = Number(button.dataset.layout); render(); }));
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => { size = button.dataset.size; render(false); }));
  new ResizeObserver(resize).observe(stage);
  render();
})();
