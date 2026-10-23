document.documentElement.classList.add('enhanced');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader=document.querySelector<HTMLCanvasElement>('.entrance-waves');
if(loader&&!reduced){
 const ctx=loader.getContext('2d'),started=performance.now(),w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
 loader.width=w*dpr;loader.height=h*dpr;ctx?.scale(dpr,dpr);
 function wave(now:number){
  if(!ctx)return;
  const t=(now-started)/1000;
  ctx.clearRect(0,0,w,h);
  ctx.globalCompositeOperation='lighter';
  for(let band=0;band<28;band++){
   ctx.beginPath();ctx.strokeStyle=`hsla(${(band*12+t*50)%360},100%,65%,.4)`;ctx.lineWidth=1.5;
   for(let x=0;x<=w;x+=5){
    const envelope=Math.exp(-Math.pow((x-w*.5)/(w*.36),2));
    const y=h*.5+Math.sin(x*.009+t*3+band*.17)*envelope*(50+band*6)+Math.cos(x*.004-t*2)*35;
    x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
   }
   ctx.stroke();
  }
  if(t<3.2)requestAnimationFrame(wave);
 }
 requestAnimationFrame(wave);
}
document.querySelector('.session-watch')?.addEventListener('click',()=>{widget?.pause();const mount=document.querySelector('.session-media')!;const frame=document.createElement('iframe');frame.src='https://www.instagram.com/reel/DbbEcZJt6uv/embed/';frame.title='KIST — Fifteen Frames';frame.allow='autoplay; encrypted-media; fullscreen';frame.style.cssText='width:100%;height:600px;border:0';mount.replaceChildren(frame)});
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
type Sound={title?:string;artwork_url?:string;permalink_url?:string};
type Widget = {play:()=>void;pause:()=>void;seekTo:(milliseconds:number)=>void;setVolume:(volume:number)=>void;getDuration:(callback:(duration:number)=>void)=>void;getPosition:(callback:(position:number)=>void)=>void;getCurrentSound:(callback:(sound:Sound)=>void)=>void;bind:(event:string,callback:(data?:{currentPosition:number})=>void)=>void};
declare global {interface Window {SC?:{Widget: ((iframe:HTMLIFrameElement)=>Widget)&{Events:{READY:string;PLAY:string;PAUSE:string;ERROR:string;FINISH:string;PLAY_PROGRESS:string}}}}}
let widget:Widget|undefined;
let loadedUrl='';
const invitation=document.querySelector<HTMLElement>('.sound-invitation')!;
const choices: {title:string;url:string;artwork?:string}[]=JSON.parse(invitation.dataset.mixes||'[]');
function showTrack(sound:Sound){
 if(sound.title){
  invitation.querySelector('strong')!.textContent=sound.title;
  document.querySelector('.player-copy p')!.textContent=sound.title;
  document.getElementById('track-detail-title')!.textContent=sound.title;
  document.querySelectorAll<HTMLElement>('[data-track-title]').forEach(el=>{el.textContent=sound.title!;el.title=sound.title!});
  document.querySelectorAll('[data-track-open]').forEach(button=>button.setAttribute('aria-label','Apri i dettagli di '+sound.title));
  document.getElementById('track-detail-cover')!.setAttribute('alt','Copertina di '+sound.title);
 }
 if(sound.permalink_url?.startsWith('https://soundcloud.com/')){
  invitation.dataset.url=sound.permalink_url;
  document.querySelectorAll<HTMLAnchorElement>('.player-source,.track-detail-source').forEach(link=>link.href=sound.permalink_url!);
 }
 if(sound.artwork_url&&(sound.artwork_url.startsWith('https://')||sound.artwork_url.startsWith('/media/'))){
  const cover=sound.artwork_url.replace('-large.','-t500x500.');
  document.querySelectorAll<HTMLImageElement>('.mini-record img,.vinyl-art img,[data-track-cover],#track-detail-cover').forEach(img=>img.src=cover);
  invitation.style.setProperty('--cover-art',`url("${cover.replace(/["\\]/g,'')}")`);
 }
}
type PlayerSession={version:1;url:string;position:number;playing:boolean};
const sessionKey='kist:player-session:v1';
let session:PlayerSession|undefined;
try{const saved=JSON.parse(localStorage.getItem(sessionKey)||'null');if(saved?.version===1&&choices.some(m=>m.url===saved.url)&&Number.isFinite(saved.position)&&saved.position>=0)session=saved}catch{}
const restoreOnEntry=!!session;
let position=session?.position||0,lastSave=0,duration=0;
if(choices.length){const selected=choices.find(m=>m.url===session?.url)||choices[Math.floor(Math.random()*choices.length)];showTrack({title:selected.title,permalink_url:selected.url,artwork_url:selected.artwork})}
function saveSession(force=false){if(!loadedUrl)return;const now=Date.now();if(!force&&now-lastSave<350)return;lastSave=now;session={version:1,url:loadedUrl,position,playing};try{localStorage.setItem(sessionKey,JSON.stringify(session))}catch{}}
window.addEventListener('pagehide',()=>saveSession(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveSession(true)});
let playing=false;
const dock=document.querySelector<HTMLDivElement>('.audio-dock')!;
const status=document.getElementById('audio-status')!;
const toggle=document.getElementById('dock-toggle')!;
const heroButton=document.getElementById('hero-play') as HTMLButtonElement;

const seekInputs=Array.from(document.querySelectorAll<HTMLInputElement>('[data-audio-seek]'));
function clock(milliseconds:number){const seconds=Math.max(0,Math.floor(milliseconds/1000));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')}
function syncTimeline(){
 const safePosition=Math.max(0,Math.min(duration||position,position));
 seekInputs.forEach(input=>{input.disabled=!duration||connecting;input.max=String(duration||1);input.value=String(safePosition);input.setAttribute('aria-valuetext',clock(safePosition)+(duration?' di '+clock(duration):''));input.style.setProperty('--seek-progress',(duration?safePosition/duration*100:0)+'%')});
 document.querySelectorAll<HTMLOutputElement>('[data-audio-elapsed]').forEach(output=>output.textContent=clock(safePosition));
 document.querySelectorAll<HTMLElement>('[data-audio-duration]').forEach(output=>output.textContent=duration?clock(duration):'–:––');
}
seekInputs.forEach(input=>input.addEventListener('input',()=>{
 if(!widget||connecting||!duration)return;
 position=Math.max(0,Math.min(duration,Number(input.value)));widget.seekTo(position);syncTimeline();saveSession(true);
}));

const volumeKey='kist:player-volume:v1';
const volumeInputs=Array.from(document.querySelectorAll<HTMLInputElement>('[data-audio-volume]'));
const volumeButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-audio-mute]'));
const trackButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-audio-prev],[data-audio-next]'));
// Embedded HTML audio on iOS uses the device's hardware volume.
const deviceVolume=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const volumePanels=Array.from(document.querySelectorAll<HTMLElement>('.audio-volume-popover'));
const volumeOpeners=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-volume-open]'));
volumeOpeners.forEach(button=>button.hidden=deviceVolume);
volumeInputs.forEach(input=>input.disabled=deviceVolume);
function closeVolume(){volumePanels.forEach(panel=>{if(panel.matches(':popover-open'))panel.hidePopover()})}
volumePanels.forEach(panel=>{
 const opener=volumeOpeners.find(button=>button.getAttribute('popovertarget')===panel.id)!;
 function placeVolume(){
  const box=opener.getBoundingClientRect(),width=64,height=206;
  panel.style.left=Math.max(8,Math.min(innerWidth-width-8,box.left+box.width/2-width/2))+'px';
  panel.style.top=(box.top>height+12?box.top-height-8:Math.min(innerHeight-height-8,box.bottom+8))+'px';
 }
 panel.addEventListener('beforetoggle',event=>{
  const open=(event as ToggleEvent).newState==='open';opener.setAttribute('aria-expanded',String(open));
  if(!open)return;
  placeVolume();
 });
 panel.addEventListener('toggle',()=>{const open=panel.matches(':popover-open');opener.setAttribute('aria-expanded',String(open));if(open&&!deviceVolume)panel.querySelector<HTMLInputElement>('[data-audio-volume]')?.focus({preventScroll:true})});
 window.addEventListener('scroll',()=>{
  if(!panel.matches(':popover-open'))return;
  const box=opener.getBoundingClientRect();
  if(!box.height||box.bottom<0||box.top>innerHeight)panel.hidePopover();else placeVolume();
 },{passive:true});
});
window.addEventListener('resize',closeVolume,{passive:true});
let volume=80,lastAudibleVolume=80;
try{const saved=localStorage.getItem(volumeKey);if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(100,Number(saved)))}catch{}
if(volume>0)lastAudibleVolume=volume;
function syncVolume(){
 volumeInputs.forEach(input=>{input.value=String(volume);input.setAttribute('aria-valuetext',volume===0?'Audio disattivato':volume+'%');input.style.setProperty('--volume-progress',volume+'%')});
 document.querySelectorAll<HTMLOutputElement>('[data-audio-volume-value]').forEach(output=>output.textContent=volume+'%');
 volumeButtons.forEach(button=>{const muted=volume===0,label=muted?'Riattiva audio':'Disattiva audio';button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',label);button.title=label;button.querySelector<SVGElement>('[data-volume-audible]')!.toggleAttribute('hidden',muted);button.querySelector<SVGElement>('[data-volume-muted]')!.toggleAttribute('hidden',!muted)});
}
function setVolume(value:number){
 volume=Math.round(Math.max(0,Math.min(100,value)));if(volume>0)lastAudibleVolume=volume;
 widget?.setVolume(volume);syncVolume();try{localStorage.setItem(volumeKey,String(volume))}catch{}
}
volumeInputs.forEach(input=>input.addEventListener('input',()=>setVolume(Number(input.value))));
volumeButtons.forEach(button=>button.addEventListener('click',()=>setVolume(volume===0?lastAudibleVolume:0)));
syncVolume();
function connectionState(busy:boolean){
 document.querySelector<HTMLElement>('[data-player-feedback]')!.hidden=true;
 heroButton.disabled=busy;popupPlay.disabled=busy;
 trackButtons.forEach(button=>button.disabled=busy||choices.length<2);
 document.querySelectorAll<HTMLButtonElement>('[data-audio-play]').forEach(button=>button.disabled=busy);
 invitation.setAttribute('aria-busy',String(busy));
 invitation.dataset.connection=busy?'loading':'ready';
 heroButton.setAttribute('aria-label',busy?'Connessione al set in corso':(playing?'Metti in pausa il set di KIST':'Riproduci il set di KIST'));
 syncTimeline();
}
function changeTrack(direction:number){
 if(connecting||choices.length<2)return;
 const current=choices.findIndex(track=>track.url===(loadedUrl||invitation.dataset.url));
 const next=choices[((current<0?0:current)+direction+choices.length)%choices.length];
 entryInvitation=false;enterWithMusic=false;start(next.url);
}
trackButtons.forEach(button=>button.addEventListener('click',()=>changeTrack(button.hasAttribute('data-audio-prev')?-1:1)));
document.querySelectorAll<HTMLButtonElement>('[data-audio-play]').forEach(button=>button.addEventListener('click',heroTransport));

let apiPromise:Promise<void>|undefined;
function api(){return apiPromise ||=new Promise<void>((resolve,reject)=>{if(window.SC){resolve();return}const script=document.createElement('script');let done=false;const timer=setTimeout(()=>fail(),12000);function fail(){if(done)return;done=true;clearTimeout(timer);apiPromise=undefined;script.remove();reject(new Error('SoundCloud non disponibile'))}script.src='https://w.soundcloud.com/player/api.js';script.onload=()=>{if(done)return;done=true;clearTimeout(timer);resolve()};script.onerror=fail;document.head.append(script)})}
let connecting=false,readyTimer:ReturnType<typeof setTimeout>|undefined;
function transport(active:boolean){playing=active;toggle.querySelector('.transport-label')!.textContent=active?'Pausa':'Riprendi';toggle.querySelector('.ui-icon')!.className='ui-icon '+(active?'icon-pause':'icon-play');toggle.setAttribute('aria-label',active?'Metti in pausa il set':'Riprendi il set');toggle.title=active?'Metti in pausa':'Riprendi il set';document.querySelector('[data-track-status]')!.textContent=active?'IN ASCOLTO':'IN PAUSA';window.dispatchEvent(new CustomEvent('kist:audio',{detail:{playing:active}}))}
function retry(message:string){clearTimeout(readyTimer);connecting=false;connectionState(false);const failed=widget;widget=undefined;failed?.pause();transport(false);invitation.dataset.connection='error';heroButton.setAttribute('aria-label','Riprova la connessione al set');status.textContent=message;const feedback=document.querySelector<HTMLElement>('[data-player-feedback]')!;feedback.textContent='SoundCloud non disponibile. Premi play per riprovare.';feedback.hidden=false;popupPlay.querySelector('.button-label')!.textContent='Riprova';popupPlay.setAttribute('aria-label','Riprova la connessione a SoundCloud')}
async function start(url:string){
 if(!url||connecting)return;
 if(widget&&loadedUrl===url){widget.play();return}
 const resumable=session?.url===url;
 const resumePosition=resumable?session!.position:0;
 const randomEntry=!restoreOnEntry&&!loadedUrl;
 if(widget){const previousWidget=widget;widget=undefined;previousWidget.pause()}
 transport(false);
 loadedUrl=url;position=resumePosition;duration=0;
 const selected=choices.find(m=>m.url===url);
 if(selected)showTrack({title:selected.title,permalink_url:selected.url,artwork_url:selected.artwork});
 connecting=true;connectionState(true);status.textContent='Connessione a SoundCloud…';
 try{
  await api();const frame=document.createElement('iframe');
  frame.title='SoundCloud — KIST';frame.allow='autoplay';
  frame.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(url)+'&auto_play=false&color=%23c9ff52&show_comments=false&show_reposts=false&hide_related=true';
  document.getElementById('player-mount')!.replaceChildren(frame);
  const current=window.SC!.Widget(frame);widget=current;
  const events=window.SC!.Widget.Events;
  readyTimer=setTimeout(()=>retry('SoundCloud impiega troppo. Riprova o apri il set dal link qui sotto.'),15000);
  current.bind(events.READY,()=>{
   if(widget!==current)return;
   clearTimeout(readyTimer);connecting=false;connectionState(false);current.setVolume(volume);dock.hidden=false;
   status.textContent='Avvio del set…';
   // Seek precedes play. A persisted position always wins over the initial random excerpt.
   current.getDuration(trackDuration=>{
    if(widget!==current)return;
    duration=Number.isFinite(trackDuration)&&trackDuration>0?trackDuration:0;
    const end=Math.max(0,duration-1500);
    position=Math.min(end,randomEntry?Math.round(duration*(.05+Math.random()*.65)):resumePosition);
    current.seekTo(position);syncTimeline();saveSession(true);current.play();
   });
  });
  current.bind(events.PLAY,()=>{
   if(widget!==current)return;
   transport(true);saveSession(true);status.textContent='In ascolto.';
   current.getCurrentSound(sound=>{if(widget===current)showTrack(sound)});
  });
  current.bind(events.PAUSE,()=>{
   if(widget!==current)return;
   transport(false);saveSession(true);status.textContent='In pausa.';
   current.getPosition(p=>{if(widget===current&&Number.isFinite(p)){position=p;syncTimeline();saveSession(true)}});
  });
  current.bind(events.PLAY_PROGRESS,data=>{
   if(!data||widget!==current)return;
   if(!Number.isFinite(data.currentPosition))return;
   position=data.currentPosition;syncTimeline();saveSession();
   document.body.dataset.audioPosition=String(Math.round(position));
   if(playing)window.dispatchEvent(new CustomEvent('kist:audio',{detail:{playing:true,position}}));
  });
  current.bind(events.FINISH,()=>{if(widget!==current)return;position=duration;syncTimeline();transport(false);saveSession(true);status.textContent='Set concluso.'});
  current.bind(events.ERROR,()=>{if(widget===current)retry('Set non disponibile. Riprova o ascolta su SoundCloud.')});
 }catch{retry('SoundCloud non raggiungibile. Riprova o apri il set dal link qui sotto.')}
}
const soundDialog=document.getElementById('sound-dialog') as HTMLDialogElement;
const popupPlay=document.getElementById('popup-play') as HTMLButtonElement;
let playerOpener:HTMLElement|undefined;
let entryInvitation=true;
function openPlayer(){if(!soundDialog.open){playerOpener=document.activeElement instanceof HTMLElement?document.activeElement:undefined;soundDialog.showModal()}}
function closePlayer(){entryInvitation=false;soundDialog.close()}
soundDialog.addEventListener('close',()=>{const target=[playerOpener,document.getElementById('dock-open'),heroButton,document.getElementById('header-nav-toggle')].find(element=>element?.isConnected&&element!==document.body&&element.getClientRects().length>0);target?.focus({preventScroll:true})});
function heroTransport(){
 if(connecting)return;
 entryInvitation=false;enterWithMusic=false;
 if(widget){playing?widget.pause():widget.play()}else start(invitation.dataset.url||'');
}
heroButton?.addEventListener('click',heroTransport);
document.getElementById('player-dismiss')?.addEventListener('click',closePlayer);
document.getElementById('popup-quiet')?.addEventListener('click',()=>{widget?.pause();closePlayer()});
soundDialog.addEventListener('click',e=>{if(e.target===soundDialog)closePlayer()});
popupPlay.addEventListener('click',()=>{enterWithMusic=entryInvitation||!playing;if(entryInvitation){widget?widget.play():start(invitation.dataset.url||'');return}if(widget){playing?widget.pause():widget.play()}else start(invitation.dataset.url||'')});
const musicHeader=document.getElementById('header-music') as HTMLButtonElement;
window.addEventListener('kist:audio',e=>{const active=(e as CustomEvent<{playing:boolean}>).detail.playing;heroButton.querySelector('.mini-label')!.textContent=active?'Pausa':'Riproduci';heroButton.querySelector('.ui-icon')!.className='ui-icon '+(active?'icon-pause':'icon-play');heroButton.setAttribute('aria-label',active?'Metti in pausa il set di KIST':'Riproduci il set di KIST')});
let enterWithMusic=false;
window.addEventListener('kist:audio',e=>{const active=(e as CustomEvent<{playing:boolean}>).detail.playing;document.body.classList.toggle('sound-active',active);if(active&&enterWithMusic){enterWithMusic=false;closePlayer()}});
window.addEventListener('kist:audio',e=>{const active=(e as CustomEvent<{playing:boolean}>).detail.playing;soundDialog.classList.toggle('is-playing',active);const icon=popupPlay.querySelector('.ui-icon');if(icon)icon.className='ui-icon '+(active?'icon-pause':'icon-play');const label=popupPlay.querySelector('.button-label');if(label)label.textContent=active?'Pausa':'Riprendi il set';popupPlay.setAttribute('aria-label',active?'Metti in pausa il set':'Riprendi il set');heroButton.classList.toggle('is-playing',active)});
new MutationObserver(()=>{document.getElementById('popup-status')!.textContent=status.textContent}).observe(status,{childList:true,characterData:true,subtree:true});
if(invitation.dataset.url){
 let invited=false;
 const entrance=document.querySelector<HTMLElement>('.entrance-refined');
 function invite(){if(invited)return;invited=true;if(entrance)entrance.hidden=true;if(!entryInvitation)return;openPlayer();if(session?.playing){enterWithMusic=true;start(invitation.dataset.url!)}}
 if(reduced)setTimeout(invite,200);
 else if(entrance){
  const onOpeningEnd=(event:AnimationEvent)=>{if(event.target!==entrance)return;entrance.removeEventListener('animationend',onOpeningEnd);invite();};
  entrance.addEventListener('animationend',onOpeningEnd);
  setTimeout(invite,3500);
 }else setTimeout(invite,1800);
}
document.querySelectorAll<HTMLButtonElement>('[data-mix]').forEach(button=>button.addEventListener('click',()=>{if(connecting)return;entryInvitation=false;enterWithMusic=false;if(widget&&loadedUrl===button.dataset.mix){playing?widget.pause():widget.play()}else start(button.dataset.mix!)}));
window.addEventListener('kist:audio',()=>{document.querySelectorAll<HTMLButtonElement>('[data-mix]').forEach(button=>{const active=playing&&button.dataset.mix===loadedUrl;button.classList.toggle('is-playing',active);button.setAttribute('aria-pressed',String(active));button.querySelector('.mix-action')!.textContent=active?'Pausa':'Riproduci';button.querySelector('.mix-play')!.className='mix-play ui-icon '+(active?'icon-pause':'icon-play')})});
toggle.addEventListener('click',heroTransport);
const trackDialog=document.getElementById('track-dialog') as HTMLDialogElement;
let trackOpener:HTMLElement|undefined;
document.querySelectorAll<HTMLButtonElement>('[data-track-open]').forEach(button=>button.addEventListener('click',()=>{
 entryInvitation=false;closeVolume();trackOpener=button;
 if(!trackDialog.open)trackDialog.showModal();
}));
trackDialog.querySelector('.track-detail-close')!.addEventListener('click',()=>trackDialog.close());
trackDialog.addEventListener('click',event=>{if(event.target===trackDialog)trackDialog.close()});
trackDialog.addEventListener('close',()=>{
 const target=[trackOpener,document.getElementById('header-nav-toggle'),heroButton].find(element=>element?.isConnected&&element.getClientRects().length>0);
 target?.focus({preventScroll:true});
});
document.getElementById('dock-close')?.addEventListener('click',()=>{widget?.pause();dock.hidden=true;queueMicrotask(()=>musicHeader.focus({preventScroll:true}))});
const headerSlot=document.querySelector('.header-transport-slot')!;
const social=document.querySelector<HTMLElement>('.listen-social')!;
function dockPlacement(){if(dock.parentElement!==headerSlot)headerSlot.append(dock);dock.classList.add('in-header');social.hidden=!dock.hidden;headerSlot.classList.toggle('has-transport',!dock.hidden)}
new MutationObserver(dockPlacement).observe(dock,{attributes:true,attributeFilter:['hidden']});
dockPlacement();

// The centered wordmark opens one panel containing navigation and the live transport.
const navigation=document.getElementById('site-navigation')!;
const navigationPanel=document.getElementById('header-panel')!;
const navToggle=document.getElementById('header-nav-toggle') as HTMLButtonElement;
const siteHeader=document.querySelector<HTMLElement>('.site-header')!;
let headerScrolled=scrollY>8;
function setNavigation(open:boolean,restoreFocus=false){
 navigationPanel.hidden=!open;
 navigation.hidden=!open;
 navToggle.hidden=false;
 navToggle.setAttribute('aria-expanded',String(open));
 navToggle.setAttribute('aria-controls','header-panel');
 navToggle.setAttribute('aria-label',open?'Chiudi menu e player':'Apri menu e player');
 siteHeader.classList.toggle('navigation-open',open);
 if(restoreFocus)navToggle.focus({preventScroll:true});
}
function syncNavigationMode(){
 const scrolled=scrollY>8;siteHeader.classList.toggle('is-scrolled',scrolled);
 if(scrolled===headerScrolled)return;
 const restoreFocus=!document.querySelector('dialog[open]')&&(navigationPanel.contains(document.activeElement)||document.activeElement===navToggle);
 headerScrolled=scrolled;setNavigation(false,restoreFocus);
}
navToggle.addEventListener('click',()=>{
 const open=navToggle.getAttribute('aria-expanded')!=='true';setNavigation(open);if(open)navigation.querySelector<HTMLAnchorElement>('a')?.focus({preventScroll:true});
});
navigationPanel.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
 setNavigation(false);
 const target=document.querySelector<HTMLElement>(link.hash);
 if(target)requestAnimationFrame(()=>{if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true})});
}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open],:popover-open')&&navToggle.getAttribute('aria-expanded')==='true'){event.preventDefault();setNavigation(false,true)}});
document.addEventListener('pointerdown',event=>{if(!document.querySelector('dialog[open]')&&navToggle.getAttribute('aria-expanded')==='true'&&event.target instanceof Node&&!siteHeader.contains(event.target))setNavigation(false)});
document.addEventListener('focusin',event=>{if(!document.querySelector('dialog[open]')&&navToggle.getAttribute('aria-expanded')==='true'&&event.target instanceof Node&&!siteHeader.contains(event.target))setNavigation(false)});
soundDialog.addEventListener('close',()=>{if(navigationPanel.hidden&&(document.activeElement===document.body||navigationPanel.contains(document.activeElement)||soundDialog.contains(document.activeElement)))navToggle.focus({preventScroll:true})});
setNavigation(false);
const navLinks=Array.from(navigation.querySelectorAll<HTMLAnchorElement>('a'));
let navigationFrame=0;
function markNavigation(){
 navigationFrame=0;
 syncNavigationMode();
 const threshold=siteHeader.offsetHeight+innerHeight*.15;
 let current:HTMLAnchorElement|undefined;
 for(const link of navLinks){const section=document.querySelector<HTMLElement>(link.hash);if(section&&section.getBoundingClientRect().top<=threshold)current=link;}
 if(scrollY+innerHeight>=document.documentElement.scrollHeight-5)current=navLinks[navLinks.length-1];
 navLinks.forEach(link=>{if(link===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
}
window.addEventListener('scroll',()=>{if(!navigationFrame)navigationFrame=requestAnimationFrame(markNavigation)},{passive:true});
window.addEventListener('resize',markNavigation,{passive:true});
markNavigation();
document.getElementById('quiet')?.addEventListener('click',()=>{widget?.pause();status.textContent='Continua a esplorare. Il suono può aspettare.';document.getElementById('sound')?.scrollIntoView({behavior:reduced?'auto':'smooth'})});

const slides=Array.from(document.querySelectorAll<HTMLElement>('.hero-slide'));
const slideMotion=matchMedia('(prefers-reduced-motion:reduce)');
let slideIndex=0,slidePaused=slideMotion.matches,slideTimer:ReturnType<typeof setTimeout>|undefined;
function scheduleSlide(){clearTimeout(slideTimer);if(slides.length<2||slidePaused||document.hidden)return;slideTimer=setTimeout(()=>{const next=(slideIndex+1)%slides.length;const image=slides[next].querySelector('img')!;image.loading='eager';image.decode().catch(()=>{}).then(()=>{slides[slideIndex].classList.remove('active');slideIndex=next;slides[slideIndex].classList.add('active');const count=document.getElementById('slide-count');if(count)count.textContent=String(slideIndex+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');scheduleSlide()})},6500)}
slideMotion.addEventListener('change',()=>{slidePaused=slideMotion.matches;scheduleSlide()});
document.addEventListener('visibilitychange',scheduleSlide);
scheduleSlide();

document.querySelectorAll<HTMLElement>('.night-viewer').forEach(viewer=>{
 const cards=Array.from(viewer.querySelectorAll<HTMLButtonElement>('.night-sleeve'));if(!cards.length)return;let index=0;
 function show(next:number){
  index=(next+cards.length)%cards.length;
  cards.forEach((card,i)=>{const delta=(i-index+cards.length)%cards.length;card.dataset.position=String(delta===0?0:delta===1?1:-1);card.setAttribute('aria-pressed',String(i===index))});
  viewer.querySelectorAll<HTMLElement>('[data-night-title],.night-details').forEach(el=>{const siblings=el.matches('[data-night-title]')?Array.from(viewer.querySelectorAll('[data-night-title]')):Array.from(viewer.querySelectorAll('.night-details'));el.hidden=siblings.indexOf(el)!==index});
  viewer.querySelector('.night-count')!.textContent=String(index+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
 }
 viewer.querySelector('.night-prev')?.addEventListener('click',()=>show(index-1));
 viewer.querySelector('.night-next')?.addEventListener('click',()=>show(index+1));
 cards.forEach((card,i)=>card.addEventListener('click',()=>show(i)));
 const stage=viewer.querySelector<HTMLElement>('.night-stage')!;let x=0,y=0;
 stage.addEventListener('touchstart',e=>{x=e.touches[0].clientX;y=e.touches[0].clientY},{passive:true});
 stage.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)show(index+(dx<0?1:-1))},{passive:true});
 stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));cards[index].focus()}});
});


