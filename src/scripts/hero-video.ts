type HeroMoment={type:'video'|'photo';duration:number;desktop:string;mobile?:string;desktopPoster?:string;mobilePoster?:string;desktopPosition?:string;mobilePosition?:string};
const video=document.querySelector<HTMLVideoElement>('#hero-video');
const button=document.querySelector<HTMLButtonElement>('#slides-toggle[data-video-toggle]');
const photo=document.querySelector<HTMLImageElement>('#hero-sequence-photo');
const hero=video?.closest<HTMLElement>('.hero');
if(video&&button&&photo&&hero){
 const mobile=matchMedia('(max-width:700px)');
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 let sequence:HeroMoment[]=[];
 try{sequence=JSON.parse(video.dataset.heroSequence||'[]')}catch{}
 if(!sequence.length)sequence=[{type:'video',duration:5000,desktop:video.dataset.desktop||'',mobile:video.dataset.mobile,desktopPoster:video.dataset.desktopPoster,mobilePoster:video.dataset.mobilePoster}];
 let index=0,remaining=sequence[0].duration,startedAt=0,timer:ReturnType<typeof setTimeout>|undefined;
 let clockRunning=false,userPaused=false,explicitMotion=false,inView=true,photoRequest=0;
 const blocked=()=>document.hidden||!inView||!!document.querySelector('dialog[open]');
 const mayRun=()=>!blocked()&&!userPaused&&(!motion.matches||explicitMotion);
 const variant=()=>mobile.matches?'mobile':'desktop';
 const asset=(moment:HeroMoment)=>mobile.matches?(moment.mobile||moment.desktop):moment.desktop;
 function controls(){
  const paused=!mayRun();
  button!.setAttribute('aria-pressed',String(paused));
  button!.setAttribute('aria-label',paused?'Riprendi la sequenza visiva':'Metti in pausa la sequenza visiva');
  button!.querySelector('.ui-icon')!.className='ui-icon '+(paused?'icon-play':'icon-pause');
  video!.dataset.videoState=video!.error?'poster':video!.paused?'paused':'playing';
  hero!.dataset.heroPaused=String(paused);
 }
 function stopClock(){
  clearTimeout(timer);timer=undefined;
  if(clockRunning)remaining=Math.max(0,remaining-(performance.now()-startedAt));
  clockRunning=false;
 }
 function startClock(){
  if(clockRunning||!mayRun()||sequence.length<2)return;
  clockRunning=true;startedAt=performance.now();
  timer=setTimeout(()=>{
   clockRunning=false;timer=undefined;
   if(!mayRun()){remaining=0;return;}
   index=(index+1)%sequence.length;remaining=sequence[index].duration;activate();startClock();
  },remaining);
 }
 function revealVideo(){
  if(sequence[index].type==='video'&&video!.readyState>=2)hero!.classList.remove('is-photo');
 }
 function sync(){
  if(!mayRun()){stopClock();video!.pause();controls();return;}
  startClock();
  // Muted playback continues behind photos; the same lifecycle pauses both layers.
  video!.play().then(()=>{if(!mayRun())video!.pause();else revealVideo();controls()}).catch(controls);
  controls();
 }
 function source(videoIndex:number,restart=false){
  const moment=sequence[videoIndex],key=variant(),next=asset(moment);
  const poster=mobile.matches?(moment.mobilePoster||moment.desktopPoster):moment.desktopPoster;
  video!.style.objectPosition=(mobile.matches?moment.mobilePosition:moment.desktopPosition)||'center';
  video!.poster=poster||'';video!.muted=true;video!.defaultMuted=true;
  video!.preload=motion.matches&&!explicitMotion?'none':'metadata';
  if(video!.getAttribute('src')!==next){
   video!.pause();video!.dataset.videoReady='false';video!.src=next;video!.load();
  }else if(restart){try{video!.currentTime=0}catch{}}
  video!.dataset.videoVersion=key;video!.dataset.heroVideoIndex=String(videoIndex);
 }
 function showPhoto(moment:HeroMoment){
  const request=++photoRequest,next=asset(moment);
  photo!.style.objectPosition=(mobile.matches?moment.mobilePosition:moment.desktopPosition)||'center';
  photo!.src=next;
  photo!.decode().then(()=>{
   if(request===photoRequest&&sequence[index]===moment)hero!.classList.add('is-photo');
  }).catch(()=>{});
 }
 function activate(){
  const moment=sequence[index];
  hero!.dataset.heroIndex=String(index);video!.dataset.heroIndex=String(index);
  const count=document.getElementById('hero-sequence-count');
  if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(sequence.length).padStart(2,'0');
  if(moment.type==='photo')showPhoto(moment);
  else{photoRequest++;source(index,true);if(video!.readyState>=2)revealVideo()}
  sync();
 }
 function preloadPhotos(){
  sequence.filter(moment=>moment.type==='photo').forEach(moment=>{const image=new Image();image.src=asset(moment);image.decode().catch(()=>{})});
 }
 button.addEventListener('click',()=>{
  if(userPaused||(motion.matches&&!explicitMotion)){userPaused=false;explicitMotion=true}else userPaused=true;
  sync();
 });
 video.addEventListener('playing',()=>{if(!mayRun()){video.pause();controls();return;}revealVideo();controls()});
 video.addEventListener('pause',controls);
 video.addEventListener('loadeddata',()=>{video.dataset.videoReady='true';sync()});
 video.addEventListener('error',controls);
 mobile.addEventListener('change',()=>{
  // Keep the current moment and its remaining time when the viewport changes.
  if(sequence[index].type==='photo'){
   showPhoto(sequence[index]);
   const current=Number(video.dataset.heroVideoIndex);
   source(sequence[current]?.type==='video'?current:sequence.findIndex(moment=>moment.type==='video'));
  }else source(index);
  if(!motion.matches||explicitMotion)preloadPhotos();sync();
 });
 motion.addEventListener('change',()=>{
  explicitMotion=false;
  if(motion.matches){
   stopClock();index=0;remaining=sequence[0].duration;photoRequest++;activate();
   video.pause();try{video.currentTime=0}catch{}
  }else{preloadPhotos();sync()}
 });
 document.addEventListener('visibilitychange',sync);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.03}).observe(hero);
 const observer=new MutationObserver(sync);
 document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
 source(sequence.findIndex(moment=>moment.type==='video'));activate();if(!motion.matches)preloadPhotos();
}
