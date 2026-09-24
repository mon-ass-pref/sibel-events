const menuButton = document.querySelector('.menu-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); }
menuButton.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

// The site remains portable: interactions run locally, without a service or database.
const eventTabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  eventTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
eventTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % eventTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + eventTabs.length) % eventTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = eventTabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(eventTabs[next]); eventTabs[next].focus(); }
  });
});

// Progressive reveal leaves every section readable if JavaScript is unavailable.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    });
  }, {threshold:.08});
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
}

// Open the photographic frame as it enters the viewport. Native page scrolling stays untouched.
const photoScenes = [...document.querySelectorAll('.photo-reveal')];
let photoFrame = 0;
function updatePhotos() {
  photoFrame = 0;
  photoScenes.forEach(scene => {
    if (scene.hidden) return;
    const rect = scene.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const progress = Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight*.85)));
    scene.style.setProperty('--frame',`${(1-progress)*7}%`);
    scene.style.setProperty('--round',`${(1-progress)*65}px`);
    scene.style.setProperty('--zoom',String(1.14-progress*.14));
  });
}
function queuePhotos() { if(!photoFrame && !reducedMotion.matches) photoFrame=requestAnimationFrame(updatePhotos); }
addEventListener('scroll',queuePhotos,{passive:true});
addEventListener('resize',queuePhotos,{passive:true});
document.querySelectorAll('[role=tab]').forEach(tab => tab.addEventListener('click',queuePhotos));
queuePhotos();

// Anchor navigation shows its destination immediately, including animated content.
function revealDestination(hash) {
  if (!hash || hash.length < 2) return;
  const section = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!section) return;
  section.classList.add('anchor-arrival');
  section.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
  if (section.matches('.reveal')) section.classList.add('visible');
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link) revealDestination(link.getAttribute('href'));
});
addEventListener('hashchange', () => revealDestination(location.hash));
revealDestination(location.hash);

const track = document.querySelector('#faq-track');
const cards = [...track.querySelectorAll('.faq-card')];
const pauseButton = document.querySelector('#faq-pause');
let userPaused = reducedMotion.matches;
let hovered = false, focused = false, inView = false, drag = null;
let direction = 1, position = 0, lastTime = 0, frameId = 0, holdUntil = 0;
function updatePause(){
  pauseButton.setAttribute('aria-pressed',String(userPaused));
  pauseButton.textContent=userPaused?'Reprendre le défilement':'Mettre en pause';
}
function canMove(){return inView&&!document.hidden&&!userPaused&&!hovered&&!focused&&!drag;}
function animateQuestions(now){
  frameId=0;
  if(!canMove()){lastTime=0;return;}
  const dt=lastTime?Math.min(now-lastTime,60):0;lastTime=now;
  const max=Math.max(0,track.scrollWidth-track.clientWidth);
  if(now>=holdUntil && max>0){
    position=Math.max(0,Math.min(max,position+direction*dt*.014));
    track.scrollLeft=position;
    if((position>=max && direction>0)||(position<=0 && direction<0)){direction*=-1;holdUntil=now+2500;}
  }
  frameId=requestAnimationFrame(animateQuestions);
}
function syncMotion(){
  if(canMove()&&!frameId){position=track.scrollLeft;lastTime=0;frameId=requestAnimationFrame(animateQuestions);}
  else if(!canMove()&&frameId){cancelAnimationFrame(frameId);frameId=0;lastTime=0;}
}
pauseButton.addEventListener('click',()=>{userPaused=!userPaused;updatePause();syncMotion();});
track.addEventListener('mouseenter',()=>{hovered=true;syncMotion();});
track.addEventListener('mouseleave',()=>{hovered=false;syncMotion();});
track.addEventListener('focusin',()=>{focused=true;syncMotion();});
track.addEventListener('focusout',()=>{focused=false;syncMotion();});
track.addEventListener('wheel',()=>{userPaused=true;updatePause();syncMotion();},{passive:true});
track.addEventListener('pointerdown',event=>{
  userPaused=true;updatePause();syncMotion();
  if(event.pointerType!=='mouse'||event.button!==0)return;
  drag={x:event.clientX,left:track.scrollLeft};track.classList.add('dragging');track.setPointerCapture(event.pointerId);
});
track.addEventListener('pointermove',event=>{if(drag){event.preventDefault();track.scrollLeft=drag.left+drag.x-event.clientX;}});
function endDrag(){drag=null;track.classList.remove('dragging');position=track.scrollLeft;}
track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);
track.addEventListener('keydown',event=>{
  const step=cards[0].getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap);
  let next;
  if(event.key==='ArrowRight')next=track.scrollLeft+step;
  if(event.key==='ArrowLeft')next=track.scrollLeft-step;
  if(event.key==='Home')next=0;
  if(event.key==='End')next=track.scrollWidth-track.clientWidth;
  if(next!==undefined){event.preventDefault();userPaused=true;updatePause();syncMotion();track.scrollLeft=next;}
});
if('IntersectionObserver' in window){
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncMotion();},{threshold:.25}).observe(track);
}else{inView=true;syncMotion();}
document.addEventListener('visibilitychange',syncMotion);
reducedMotion.addEventListener('change',()=>{userPaused=reducedMotion.matches;updatePause();syncMotion();});
addEventListener('resize',()=>{position=Math.min(track.scrollLeft,track.scrollWidth-track.clientWidth);},{passive:true});
updatePause();


const lightbox = document.querySelector('#lightbox');
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  lightbox.querySelector('img').src = button.dataset.image;
  lightbox.querySelector('img').alt = button.querySelector('img').alt;
  lightbox.querySelector('p').textContent = button.dataset.caption;
  lightbox.showModal();
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
});
document.querySelector('#privacy-button').addEventListener('click', () => document.querySelector('#privacy-dialog').showModal());
document.querySelector('#legal-button').addEventListener('click', () => document.querySelector('#legal-dialog').showModal());

const form = document.querySelector('#quote-form');
const eventType = document.querySelector('#event-type');
const checks = [...form.querySelectorAll('[name="options"]')];
function updateOptions() {
  document.querySelectorAll('[data-option]').forEach(button => {
    const chosen = checks.find(input => input.value === button.dataset.option).checked;
    button.classList.toggle('selected', chosen);
    button.setAttribute('aria-label', (chosen ? 'Option sélectionnée : ' : 'Demander un devis avec : ') + button.dataset.option);
    button.closest('.option-card').classList.toggle('selected',chosen);
  });
}
document.querySelectorAll('[data-option]').forEach(button => button.addEventListener('click', () => {
  const input = checks.find(input => input.value === button.dataset.option);
  input.checked = true;
  updateOptions();
}));
checks.forEach(input => input.addEventListener('change', updateOptions));
eventType.addEventListener('change', updateOptions);
document.querySelectorAll('[data-event]').forEach(link => link.addEventListener('click', () => {
  eventType.value = link.dataset.event;
  updateOptions();
}));
updateOptions();

const result = document.querySelector('#quote-result');
const quoteText = document.querySelector('#quote-text');
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const date = data.get('date') ? data.get('date').split('-').reverse().join('/') : 'À définir';
  const options = checks.filter(input => input.checked).map(input => input.value).join(', ') || 'Aucune pour le moment';
  const lines = ['Bonjour Sibel Events,', '', 'Nous souhaitons échanger avec vous au sujet de notre événement.', '', `Nom : ${data.get('name')}`, `E-mail : ${data.get('email')}`, `Événement : ${data.get('event')}`, `Date envisagée : ${date}`, `Lieu : ${data.get('location')}`, `Nombre d’invités : ${data.get('guests') || 'À définir'}`, `Options souhaitées : ${options}`];
  if (String(data.get('message')).trim()) lines.push('', `Nos envies : ${String(data.get('message')).trim()}`);
  lines.push('', 'Pouvez-vous nous confirmer votre disponibilité et nous proposer un devis ?');
  quoteText.textContent = lines.join('\n');
  form.hidden = true;
  result.hidden = false;
  result.focus({preventScroll:true});
  result.scrollIntoView({block:'start',behavior:'instant'});
});
document.querySelector('.edit-quote').addEventListener('click', () => {
  result.hidden = true;
  form.hidden = false;
  document.querySelector('#copy-status').textContent = '';
  form.querySelector('input').focus();
});
document.querySelector('#copy-quote').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(quoteText.textContent);
    status.textContent = 'Demande copiée. Vous pouvez la transmettre à Sibel Events.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(quoteText);
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = 'Le texte est sélectionné. Utilisez la commande Copier de votre appareil.';
  }
});

// Count only once when the actual figures enter view; leave truthful values without JS.
const counters=[...document.querySelectorAll('[data-count]')];
counters.forEach(el=>{if(el.dataset.since){el.dataset.count=String(new Date().getFullYear()-Number(el.dataset.since));el.textContent=el.dataset.count;}});
if('IntersectionObserver' in window && !reducedMotion.matches){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  observer.unobserve(entry.target);
  const el=entry.target,target=Number(el.dataset.count),suffix=el.dataset.suffix||'',start=performance.now();
  el.setAttribute('aria-label',target+suffix);el.classList.add('counting');
  function frame(now){const progress=Math.min((now-start)/1700,1);el.textContent=Math.round(target*(1-Math.pow(1-progress,3)))+suffix;if(progress<1)requestAnimationFrame(frame);else el.classList.remove('counting');}
  requestAnimationFrame(frame);
 }),{threshold:.6});
 counters.forEach(el=>observer.observe(el));
}
