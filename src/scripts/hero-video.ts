const video=document.querySelector<HTMLVideoElement>('#hero-video');
const button=document.querySelector<HTMLButtonElement>('#slides-toggle[data-video-toggle]');
if(video&&button){
 const mobile=matchMedia('(max-width:700px)');
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 let userPaused=false,explicitMotion=false,inView=true;
 const blocked=()=>document.hidden||!inView||!!document.querySelector('dialog[open]');
 function controls(){
  const paused=video!.paused;
  button!.setAttribute('aria-pressed',String(paused));
  button!.setAttribute('aria-label',paused?'Riproduci il video di sfondo':'Metti in pausa il video di sfondo');
  button!.querySelector('.ui-icon')!.className='ui-icon '+(paused?'icon-play':'icon-pause');
  video!.dataset.videoState=paused?'paused':'playing';
 }
 function sync(){
  if(blocked()||userPaused||(motion.matches&&!explicitMotion)){video!.pause();controls();return;}
  video!.play().then(controls).catch(controls);
 }
 function source(){
  const key=mobile.matches?'mobile':'desktop';
  const next=video!.dataset[key];
  if(!next)return;
  video!.pause();video!.muted=true;video!.defaultMuted=true;
  video!.poster=video!.dataset[mobile.matches?'mobilePoster':'desktopPoster']||'';
  video!.preload=motion.matches?'none':'metadata';
  video!.src=next;video!.dataset.videoVersion=key;video!.load();sync();
 }
 button.addEventListener('click',()=>{
  if(video.paused){userPaused=false;explicitMotion=true;}else userPaused=true;
  sync();
 });
 video.addEventListener('playing',controls);
 video.addEventListener('pause',controls);
 video.addEventListener('loadeddata',()=>{video.dataset.videoReady='true';controls();});
 video.addEventListener('error',()=>{video.dataset.videoState='poster';controls();});
 mobile.addEventListener('change',source);
 motion.addEventListener('change',()=>{explicitMotion=false;if(motion.matches){video.pause();video.currentTime=0;}sync();});
 document.addEventListener('visibilitychange',sync);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.03}).observe(video.closest('.hero')!);
 const observer=new MutationObserver(sync);
 document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
 source();
}
