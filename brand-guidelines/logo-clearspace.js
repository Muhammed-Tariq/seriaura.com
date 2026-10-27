/* Hover and keyboard focus reveal guides; touch can toggle the same view. */
(() => {
  const previews=[...document.querySelectorAll('.logo-preview')];
  let pointerType='';
  previews.forEach(preview=>{
    preview.addEventListener('pointerdown',event=>{pointerType=event.pointerType;});
    preview.addEventListener('click',()=>{
      if(pointerType==='touch'||matchMedia('(hover:none)').matches){
        const show=preview.getAttribute('aria-pressed')!=='true';
        previews.forEach(button=>button.setAttribute('aria-pressed',String(button===preview&&show)));
      }
    });
  });
  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('.logo-preview'))previews.forEach(button=>button.setAttribute('aria-pressed','false'));
  });
})();
