document.documentElement.classList.add('enhanced');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
type Widget = {play:()=>void;pause:()=>void;bind:(event:string,callback:()=>void)=>void};
declare global {interface Window {SC?:{Widget: ((iframe:HTMLIFrameElement)=>Widget)&{Events:{READY:string;PLAY:string;PAUSE:string;ERROR:string;FINISH:string}}}}}
let widget:Widget|undefined;
let playing=false;
const dock=document.querySelector<HTMLDivElement>('.audio-dock')!;
const status=document.getElementById('audio-status')!;
const toggle=document.getElementById('dock-toggle')!;
const heroButton=document.getElementById('hero-play') as HTMLButtonElement;
let apiPromise:Promise<void>|undefined;
function api(){return apiPromise ||=new Promise<void>((resolve,reject)=>{if(window.SC){resolve();return}const script=document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';script.onload=()=>resolve();script.onerror=()=>{apiPromise=undefined;reject(new Error('SoundCloud non disponibile'))};document.head.append(script)})}
async function start(url:string){if(!url)return;heroButton.disabled=true;status.textContent='Connessione a SoundCloud…';try{await api();widget?.pause();const frame=document.createElement('iframe');frame.title='SoundCloud — KIST';frame.allow='autoplay';frame.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(url)+'&auto_play=false&color=%23c9ff52&show_comments=false&show_reposts=false&hide_related=true';document.getElementById('player-mount')!.replaceChildren(frame);widget=window.SC!.Widget(frame);const events=window.SC!.Widget.Events;widget.bind(events.READY,()=>{heroButton.disabled=false;status.textContent='Premi play per entrare con il suono.';dock.hidden=false;widget!.play()});widget.bind(events.PLAY,()=>{playing=true;toggle.textContent='Pausa';heroButton.textContent='Ⅱ';status.textContent='In ascolto.'});widget.bind(events.PAUSE,()=>{playing=false;toggle.textContent='Riprendi';heroButton.textContent='▶';status.textContent='In pausa.'});widget.bind(events.ERROR,()=>{status.textContent='Set non disponibile. Riprova più tardi.';heroButton.disabled=false});}catch{status.textContent='SoundCloud non raggiungibile. Riprova.';heroButton.disabled=false}}
heroButton?.addEventListener('click',()=>{if(widget){playing?widget.pause():widget.play()}else start(document.querySelector<HTMLElement>('.sound-invitation')!.dataset.url||'')});
document.querySelectorAll<HTMLButtonElement>('[data-mix]').forEach(button=>button.addEventListener('click',()=>{start(button.dataset.mix!);document.querySelector('.sound-invitation')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'})}));
toggle.addEventListener('click',()=>{playing?widget?.pause():widget?.play()});
document.getElementById('dock-close')?.addEventListener('click',()=>{widget?.pause();dock.hidden=true});
document.getElementById('quiet')?.addEventListener('click',()=>{widget?.pause();status.textContent='Continua a esplorare. Il suono può aspettare.';document.getElementById('sound')?.scrollIntoView({behavior:reduced?'auto':'smooth'})});
