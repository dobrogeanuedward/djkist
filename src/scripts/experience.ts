document.documentElement.classList.add('enhanced');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader=document.querySelector<HTMLCanvasElement>('.entrance-waves');
if(loader&&!reduced){const ctx=loader.getContext('2d');const started=performance.now();const w=innerWidth,h=innerHeight;loader.width=w;loader.height=h;function wave(now:number){if(!ctx)return;const t=(now-started)/1000;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';for(let band=0;band<28;band++){ctx.beginPath();ctx.strokeStyle=`hsla(${(band*12+t*50)%360},100%,65%,.4)`;ctx.lineWidth=1.5;for(let x=0;x<w;x+=5){const envelope=Math.exp(-Math.pow((x-w*.5)/(w*.36),2));const y=h*.5+Math.sin(x*.009+t*3+band*.17)*envelope*(50+band*6)+Math.cos(x*.004-t*2)*35; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}if(t<2.6)requestAnimationFrame(wave)}requestAnimationFrame(wave)}
document.querySelector('.session-watch')?.addEventListener('click',()=>{const mount=document.querySelector('.session-media')!;const frame=document.createElement('iframe');frame.src='https://www.instagram.com/reel/DbbEcZJt6uv/embed/';frame.title='KIST — Fifteen Frames';frame.allow='autoplay; encrypted-media; fullscreen';frame.style.cssText='width:100%;height:600px;border:0';mount.replaceChildren(frame)});
if(reduced) document.querySelectorAll('video').forEach(v=>v.pause());
const observer = new IntersectionObserver(entries => entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('waiting');observer.unobserve(entry.target)}}),{threshold:.08});
if(!reduced) document.querySelectorAll('.section-heading,.about-copy,.event,.mix').forEach(el=>{el.classList.add('reveal','waiting');observer.observe(el)});
const dialog = document.querySelector<HTMLDialogElement>('#media-dialog')!;
const content = document.querySelector<HTMLDivElement>('#dialog-content')!;
document.querySelector('.close-dialog')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{content.replaceChildren()});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
document.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(button=>button.addEventListener('click',()=>{const img=new Image();img.src=button.dataset.photo!;img.alt=button.getAttribute('aria-label')||'';const caption=document.createElement('p');caption.textContent=button.dataset.caption||'';content.replaceChildren(img,caption);dialog.showModal()}));
document.querySelectorAll<HTMLButtonElement>('[data-youtube]').forEach(button=>button.addEventListener('click',()=>{widget?.pause();const iframe=document.createElement('iframe');iframe.className='dialog-video';iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(button.dataset.youtube!)+'?autoplay=1';iframe.title=button.getAttribute('aria-label')||'KIST video';iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';iframe.allowFullscreen=true;content.replaceChildren(iframe);dialog.showModal()}));
document.querySelectorAll<HTMLButtonElement>('[data-events]').forEach(button=>button.addEventListener('click',()=>{const past=button.dataset.events==='past';document.querySelectorAll('[data-events]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));document.getElementById('past-events')!.hidden=!past;document.getElementById('future-events')!.hidden=past}));
type Widget = {play:()=>void;pause:()=>void;bind:(event:string,callback:(data?:{currentPosition:number})=>void)=>void};
declare global {interface Window {SC?:{Widget: ((iframe:HTMLIFrameElement)=>Widget)&{Events:{READY:string;PLAY:string;PAUSE:string;ERROR:string;FINISH:string;PLAY_PROGRESS:string}}}}}
let widget:Widget|undefined;
let playing=false;
const dock=document.querySelector<HTMLDivElement>('.audio-dock')!;
const status=document.getElementById('audio-status')!;
const toggle=document.getElementById('dock-toggle')!;
const heroButton=document.getElementById('hero-play') as HTMLButtonElement;
let apiPromise:Promise<void>|undefined;
function api(){return apiPromise ||=new Promise<void>((resolve,reject)=>{if(window.SC){resolve();return}const script=document.createElement('script');let done=false;const timer=setTimeout(()=>fail(),12000);function fail(){if(done)return;done=true;clearTimeout(timer);apiPromise=undefined;script.remove();reject(new Error('SoundCloud non disponibile'))}script.src='https://w.soundcloud.com/player/api.js';script.onload=()=>{if(done)return;done=true;clearTimeout(timer);resolve()};script.onerror=fail;document.head.append(script)})}
let connecting=false,readyTimer:ReturnType<typeof setTimeout>|undefined;
function transport(active:boolean){playing=active;toggle.querySelector('.transport-label')!.textContent=active?'Pausa':'Riprendi';toggle.querySelector('.ui-icon')!.className='ui-icon '+(active?'icon-pause':'icon-play');toggle.setAttribute('aria-label',active?'Metti in pausa il set':'Riprendi il set');window.dispatchEvent(new CustomEvent('kist:audio',{detail:{playing:active}}))}
function retry(message:string){clearTimeout(readyTimer);connecting=false;heroButton.disabled=false;popupPlay.disabled=false;transport(false);widget=undefined;status.textContent=message;popupPlay.querySelector('.button-label')!.textContent='Riprova';popupPlay.setAttribute('aria-label','Riprova la connessione a SoundCloud')}
async function start(url:string){if(!url||connecting)return;if(widget){playing?widget.pause():widget.play();return}connecting=true;heroButton.disabled=true;popupPlay.disabled=true;status.textContent='Connessione a SoundCloud…';try{await api();const frame=document.createElement('iframe');frame.title='SoundCloud — KIST';frame.allow='autoplay';frame.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(url)+'&auto_play=false&color=%23c9ff52&show_comments=false&show_reposts=false&hide_related=true';document.getElementById('player-mount')!.replaceChildren(frame);const current=window.SC!.Widget(frame);widget=current;const events=window.SC!.Widget.Events;readyTimer=setTimeout(()=>retry('SoundCloud impiega troppo. Riprova o apri il set dal link qui sotto.'),15000);current.bind(events.READY,()=>{if(widget!==current)return;clearTimeout(readyTimer);connecting=false;heroButton.disabled=false;popupPlay.disabled=false;status.textContent='Premi play per entrare con il suono.';dock.hidden=false;current.play()});current.bind(events.PLAY,()=>{if(widget!==current)return;transport(true);status.textContent='In ascolto.'});current.bind(events.PAUSE,()=>{if(widget!==current)return;transport(false);status.textContent='In pausa.'});current.bind(events.PLAY_PROGRESS,data=>{if(data&&widget===current&&playing)window.dispatchEvent(new CustomEvent('kist:audio',{detail:{playing:true,position:data.currentPosition}}))});current.bind(events.FINISH,()=>{transport(false);status.textContent='Set concluso.'});current.bind(events.ERROR,()=>retry('Set non disponibile. Riprova o ascolta su SoundCloud.'));}catch{retry('SoundCloud non raggiungibile. Riprova o apri il set dal link qui sotto.')}}
const soundDialog=document.getElementById('sound-dialog') as HTMLDialogElement;
const popupPlay=document.getElementById('popup-play') as HTMLButtonElement;
let playerOpener:HTMLElement|undefined;
function openPlayer(){if(!soundDialog.open){playerOpener=document.activeElement instanceof HTMLElement?document.activeElement:undefined;soundDialog.showModal()}}
function closePlayer(){soundDialog.close()}
soundDialog.addEventListener('close',()=>{(playerOpener&&playerOpener!==document.body?playerOpener:document.getElementById('hero-listen'))?.focus({preventScroll:true})});
function heroTransport(){if(widget&&!connecting){playing?widget.pause():widget.play()}else openPlayer()}
heroButton?.addEventListener('click',heroTransport);
document.getElementById('hero-listen')?.addEventListener('click',heroTransport);
document.getElementById('player-dismiss')?.addEventListener('click',closePlayer);
document.getElementById('popup-quiet')?.addEventListener('click',()=>{widget?.pause();closePlayer()});
soundDialog.addEventListener('click',e=>{if(e.target===soundDialog)closePlayer()});
popupPlay.addEventListener('click',()=>{if(widget){playing?widget.pause():widget.play()}else start(document.querySelector<HTMLElement>('.sound-invitation')!.dataset.url||'')});
const musicHeader=document.getElementById('header-music') as HTMLButtonElement;
musicHeader.addEventListener('click',openPlayer);
window.addEventListener('kist:audio',e=>{const active=(e as CustomEvent<{playing:boolean}>).detail.playing;heroButton.querySelector('.mini-label')!.textContent=active?'Pausa':'Riproduci';heroButton.querySelector('.ui-icon')!.className='ui-icon '+(active?'icon-pause':'icon-play');heroButton.setAttribute('aria-label',active?'Metti in pausa il set di KIST':'Riproduci il set di KIST');const hero=document.getElementById('hero-listen')!;hero.querySelector('span')!.textContent=active?'Pausa':'Riproduci';hero.setAttribute('aria-label',active?'Metti in pausa la musica':'Apri il player di KIST')});
let enterWithMusic=false;
popupPlay.addEventListener('click',()=>{enterWithMusic=!playing});
window.addEventListener('kist:audio',e=>{const active=(e as CustomEvent<{playing:boolean}>).detail.playing;musicHeader.setAttribute('aria-pressed',String(active));musicHeader.setAttribute('aria-label',active?'Apri il player, musica in ascolto':'Attiva la musica');document.body.classList.toggle('sound-active',active);if(active&&enterWithMusic){enterWithMusic=false;closePlayer()}});
document.getElementById('dock-open')?.addEventListener('click',openPlayer);
window.addEventListener('kist:audio',e=>{const active=(e as CustomEvent<{playing:boolean}>).detail.playing;soundDialog.classList.toggle('is-playing',active);const icon=popupPlay.querySelector('.ui-icon');if(icon)icon.className='ui-icon '+(active?'icon-pause':'icon-play');const label=popupPlay.querySelector('.button-label');if(label)label.textContent=active?'Pausa':'Riprendi il set';popupPlay.setAttribute('aria-label',active?'Metti in pausa il set':'Riprendi il set');heroButton.classList.toggle('is-playing',active)});
new MutationObserver(()=>{document.getElementById('popup-status')!.textContent=status.textContent}).observe(status,{childList:true,characterData:true,subtree:true});
if(document.querySelector<HTMLElement>('.sound-invitation')?.dataset.url)setTimeout(openPlayer,reduced?200:1800);
document.querySelectorAll<HTMLButtonElement>('[data-mix]').forEach(button=>button.addEventListener('click',()=>{openPlayer();start(button.dataset.mix!)}));
toggle.addEventListener('click',()=>{playing?widget?.pause():widget?.play()});
document.getElementById('dock-close')?.addEventListener('click',()=>{widget?.pause();dock.hidden=true});
const headerSlot=document.querySelector('.header-transport-slot')!;
const social=document.querySelector<HTMLElement>('.listen-social')!;
let beyondHero=false;
function dockPlacement(){if(beyondHero){headerSlot.append(dock)}else document.body.append(dock);dock.classList.toggle('in-header',beyondHero);social.hidden=beyondHero&&!dock.hidden}
new IntersectionObserver(entries=>{const hero=entries[0];beyondHero=!hero.isIntersecting&&hero.boundingClientRect.bottom<90;dockPlacement()},{rootMargin:'-90px 0px 0px 0px',threshold:0}).observe(document.querySelector('.hero')!);
new MutationObserver(dockPlacement).observe(dock,{attributes:true,attributeFilter:['hidden']});
document.getElementById('quiet')?.addEventListener('click',()=>{widget?.pause();status.textContent='Continua a esplorare. Il suono può aspettare.';document.getElementById('sound')?.scrollIntoView({behavior:reduced?'auto':'smooth'})});

const slides=Array.from(document.querySelectorAll<HTMLElement>('.hero-slide'));
const slideToggle=document.getElementById('slides-toggle');
let slideIndex=0,slidePaused=reduced,slideTimer:ReturnType<typeof setTimeout>|undefined;
function scheduleSlide(){clearTimeout(slideTimer);if(slides.length<2||slidePaused||document.hidden)return;slideTimer=setTimeout(()=>{const next=(slideIndex+1)%slides.length;const image=slides[next].querySelector('img')!;image.loading='eager';image.decode().catch(()=>{}).then(()=>{slides[slideIndex].classList.remove('active');slideIndex=next;slides[slideIndex].classList.add('active');const count=document.getElementById('slide-count');if(count)count.textContent=String(slideIndex+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');scheduleSlide()})},6500)}
slideToggle?.addEventListener('click',()=>{slidePaused=!slidePaused;slideToggle.setAttribute('aria-pressed',String(slidePaused));slideToggle.setAttribute('aria-label',slidePaused?'Riprendi lo slideshow':'Metti in pausa lo slideshow');slideToggle.querySelector('.ui-icon')?.setAttribute('class','ui-icon '+(slidePaused?'icon-play':'icon-pause'));scheduleSlide()});
document.addEventListener('visibilitychange',scheduleSlide);
if(reduced&&slideToggle){slideToggle.setAttribute('aria-pressed','true');slideToggle.querySelector('.ui-icon')?.setAttribute('class','ui-icon icon-play');slideToggle.setAttribute('aria-label','Riprendi lo slideshow')}
scheduleSlide();

document.querySelectorAll<HTMLElement>('.event-viewer').forEach(viewer=>{
 const cards=Array.from(viewer.querySelectorAll<HTMLElement>('.event-slide'));if(cards.length<1)return;let index=0;
 function show(next:number){index=(next+cards.length)%cards.length;cards.forEach((card,i)=>card.hidden=i!==index);viewer.querySelectorAll<HTMLButtonElement>('.event-thumb').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));const count=viewer.querySelector('.event-current');if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0')}
 viewer.querySelector('.event-prev')?.addEventListener('click',()=>show(index-1));
 viewer.querySelector('.event-next')?.addEventListener('click',()=>show(index+1));
 viewer.querySelectorAll<HTMLButtonElement>('.event-thumb').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.index))));
 let swipeX=0,swipeY=0;viewer.querySelector('.event-stage')?.addEventListener('touchstart',event=>{const e=event as TouchEvent;swipeX=e.touches[0].clientX;swipeY=e.touches[0].clientY},{passive:true});viewer.querySelector('.event-stage')?.addEventListener('touchend',event=>{const e=event as TouchEvent;const dx=e.changedTouches[0].clientX-swipeX,dy=e.changedTouches[0].clientY-swipeY;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1))},{passive:true});
 if(!reduced&&matchMedia('(pointer:fine)').matches)viewer.querySelectorAll<HTMLElement>('.event-art').forEach(art=>{const cover=art.querySelector<HTMLElement>('.event-cover')!;art.addEventListener('pointermove',e=>{const r=art.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;cover.style.transform='rotateY('+x*16+'deg) rotateX('+(-y*12)+'deg) translateZ(25px)'});art.addEventListener('pointerleave',()=>cover.style.transform='')});
});
