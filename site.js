// Interações independentes da quantidade de banners cadastrada no CMS.
(() => {
  const banner=document.querySelector('.banner');
  const slides=[...document.querySelectorAll('.slide')],dots=[...document.querySelectorAll('.dot')];
  if(banner && slides.length>1){
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let current=0,paused=media.matches || banner.dataset.auto!=='true',timer;
    const control=document.getElementById('pause');
    const stop=()=>clearInterval(timer);
    const show=i=>{current=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.hidden=n!==current);dots.forEach((d,n)=>d.setAttribute('aria-current',String(n===current)));};
    const start=()=>{stop();if(!paused&&!document.hidden&&!banner.matches(':hover')&&!banner.contains(document.activeElement))timer=setInterval(()=>show(current+1),Math.max(3,Number(banner.dataset.interval)||7)*1000);};
    const update=()=>{control.textContent=paused?control.dataset.play:control.dataset.pause;control.setAttribute('aria-label',control.textContent);};
    control.onclick=()=>{paused=!paused;update();start();};
    document.getElementById('prev').onclick=()=>{show(current-1);start();};
    document.getElementById('next').onclick=()=>{show(current+1);start();};
    dots.forEach((d,i)=>d.onclick=()=>{show(i);start();});
    banner.addEventListener('mouseenter',stop);banner.addEventListener('mouseleave',start);
    banner.addEventListener('focusin',stop);banner.addEventListener('focusout',()=>setTimeout(start,0));
    document.addEventListener('visibilitychange',start);
    media.addEventListener('change',()=>{if(media.matches){paused=true;update();stop();}});
    update();start();
  }
  function revealHash(hash){
    if(!/^#[\w-]+$/.test(hash))return;
    const target=document.getElementById(hash.slice(1));if(!target)return;
    const panel=target.matches('details')?target:target.closest('details');if(panel)panel.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
  }
  document.addEventListener('click',event=>{const a=event.target.closest('a[href^="#"]');if(a)revealHash(a.getAttribute('href'));});
  window.addEventListener('hashchange',()=>revealHash(location.hash));
  if(location.hash)revealHash(location.hash);
})();
