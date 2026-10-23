import {renderWorld} from './world-renderer';

/** A local scroll passage subscribes to the existing SoundCloud player. */
const gate=document.getElementById('frequency-break');
const root=gate?.querySelector<HTMLElement>('#kist-world');
const canvas=gate?.querySelector<HTMLCanvasElement>('#kist-world-canvas');
const context=canvas?.getContext('2d',{alpha:true});
if(gate&&root&&canvas&&context){
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 // One scroll clock works with touch inertia, wheels, trackpads and keyboards.
 // Keep a complete 90ms running frame visible without a long idle tail.
 const runHold=120;
 const art=Array.from(root.querySelectorAll<HTMLImageElement>('[data-world-art]'));
 const foreground=gate.querySelector<HTMLImageElement>('[data-world-foreground]')!;
 const character=gate.querySelector<HTMLElement>('.gate-character')!;
 const poses=Array.from(character.querySelectorAll<HTMLElement>('[data-gate-pose]'));
 const clamp=(n:number)=>Math.max(0,Math.min(1,n));
 const smooth=(n:number)=>{const x=clamp(n);return x*x*(3-2*x)};
 let width=0,height=0,raf=0,last=0,lastPaint=0,elapsed=0,frames=0;
 let progress=.5,targetProgress=.5,energy=0,playing=false,position=0,positionAt=0;
 const scrollPosition=()=>Math.max(0,Math.min(scrollY,Math.max(0,document.documentElement.scrollHeight-innerHeight)));
 let pointerX=0,pointerY=0,inView=false,initialized=false,lastScrollAt=-Infinity,lastScrollSampleAt=-Infinity,lastScrollY=scrollPosition(),scrollDistance=0;
 let gateTop=0,gateHeight=1,gateWidth=1,characterWidth=0,lastPose='',lastPosePause:boolean|undefined;
 let idleTimer:ReturnType<typeof setTimeout>|undefined;
 let dialogOpen=document.querySelector('dialog[open]')!==null;
 const blocked=()=>document.hidden||!inView||dialogOpen;
 const staticWorld=()=>motion.matches;
 const artOpacity=[-1,-1,-1],artTransform=['','',''];
 art.forEach(image=>{image.decode().then(()=>{image.dataset.loaded='true';root!.dataset.worldArtReady=String(art.filter(item=>item.dataset.loaded==='true').length)}).catch(()=>{image.dataset.failed='true'})});
 function syncCharacter(now:number){
  const frozen=staticWorld()||blocked();
  if(frozen){clearTimeout(idleTimer);idleTimer=undefined;lastScrollAt=-Infinity;lastScrollSampleAt=-Infinity;scrollDistance=0;lastScrollY=scrollPosition()}
  const walking=!frozen&&now-lastScrollAt<runHold;
  const pose=walking?'run':'groove';
  if(pose!==lastPose){poses.forEach(element=>element.hidden=element.dataset.gatePose!==pose);character.dataset.pose=pose;lastPose=pose;lastPosePause=undefined}
  if(frozen!==lastPosePause){poses.forEach(element=>element.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:frozen||element.hidden}})));lastPosePause=frozen}
 }
 function track(){
  targetProgress=clamp((innerHeight-gateTop+scrollY)/(innerHeight+gateHeight));
  inView=gateTop<scrollY+innerHeight&&gateTop+gateHeight>scrollY;
  root!.dataset.worldVisible=String(inView);
 }
 function bounds(){
  const rect=gate!.getBoundingClientRect();gateTop=rect.top+scrollY;gateHeight=Math.max(1,rect.height);gateWidth=Math.max(1,rect.width);
  track();
 }
 function measure(){
  bounds();characterWidth=character.offsetWidth;height=180;width=Math.max(1,Math.round(gateWidth/gateHeight*height));
  if(canvas!.width!==width)canvas!.width=width;if(canvas!.height!==height)canvas!.height=height;
  if(!initialized){progress=motion.matches?.5:targetProgress;initialized=true}
  paint();resume();
 }
 function paint(){
  const chapter=progress*5,livePosition=playing?position+Math.min(2000,performance.now()-positionAt):position;
  renderWorld(context!,width,height,{time:motion.matches?0:elapsed,chapter,scroll:progress,energy,musicPosition:livePosition,pointerX:motion.matches?0:pointerX,pointerY:motion.matches?0:pointerY,reduced:motion.matches});
  const environment=progress<.5?smooth(progress*2):1+smooth((progress-.5)*2);
  art.forEach((image,i)=>{
   const opacity=clamp(1-Math.abs(environment-i));
   if(Math.abs(opacity-artOpacity[i])>.001){image.style.opacity=opacity.toFixed(4);image.style.visibility=opacity>.001?'visible':'hidden';artOpacity[i]=opacity}
   const x=motion.matches?0:Math.round(((.5-progress)*12-pointerX*4)/2)*2;
   const y=motion.matches?0:Math.round(((progress-.5)*4-pointerY*2)/2)*2;
   const transform=`translate3d(${x}px,${y}px,0)`;
   if(transform!==artTransform[i]){image.style.transform=transform;artTransform[i]=transform}
  });
  const nearRange=Math.min(14,gateWidth*.025),frontX=motion.matches?0:Math.round(((.5-progress)*nearRange*2-pointerX*nearRange*.3)/2)*2;
  foreground.style.transform=`translate3d(${frontX}px,0,0)`;
  const x=clamp((progress-.12)/.76)*Math.max(0,gateWidth-characterWidth-24)+12;
  character.style.setProperty('--gate-x',`${Math.round(x/2)*2}px`);character.dataset.routeProgress=progress.toFixed(3);syncCharacter(performance.now());
  frames++;root!.dataset.worldFrame=String(frames);root!.dataset.worldReady='true';root!.dataset.worldProgress=chapter.toFixed(3);root!.dataset.worldEnvironment=environment.toFixed(3);root!.dataset.worldChapter=String(Math.min(5,Math.floor(chapter)));
 }
 function frame(now:number){
  raf=0;if(blocked()||staticWorld()){last=0;syncCharacter(now);return}
  const dt=last?Math.min((now-last)/1000,.08):.016;last=now;elapsed+=dt;
  progress=targetProgress;energy+=((playing?1:0)-energy)*Math.min(1,dt*2);
  syncCharacter(now);
  if(now-lastPaint>1000/24){paint();lastPaint=now}
  raf=requestAnimationFrame(frame);
 }
 function stop(){cancelAnimationFrame(raf);raf=0;last=0}
 function resume(){if(!raf&&!blocked()&&!staticWorld())raf=requestAnimationFrame(frame)}
 function syncMotionState(){
  root!.dataset.worldPaused=String(staticWorld());root!.dataset.worldAudio=playing?'playing':'quiet';syncCharacter(performance.now());
 }
 window.addEventListener('scroll',()=>{
  const nextY=scrollPosition(),delta=nextY-lastScrollY,now=performance.now();lastScrollY=nextY;track();
  if(!staticWorld()&&!blocked()){
   if(now-lastScrollSampleAt>runHold||delta*scrollDistance<0)scrollDistance=0;
   lastScrollSampleAt=now;
   scrollDistance+=delta;
   // Accumulate fractional/one-pixel movement instead of dropping slow gestures.
   if(Math.abs(scrollDistance)>=.5){
    lastScrollAt=now;character.style.setProperty('--gate-facing',scrollDistance>0?'1':'-1');character.dataset.facing=scrollDistance>0?'right':'left';scrollDistance=0;syncCharacter(now);
    // Do not wait for the next canvas frame to stop on slower devices.
    clearTimeout(idleTimer);idleTimer=setTimeout(()=>{idleTimer=undefined;syncCharacter(performance.now())},runHold+1);
   }
  }
  resume();
 },{passive:true});
 window.addEventListener('resize',measure,{passive:true});
 gate.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||staticWorld())return;const rect=gate.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5},{passive:true});
 window.addEventListener('kist:audio',event=>{
  const detail=(event as CustomEvent<{playing:boolean;position?:number}>).detail;
  playing=detail.playing;if(Number.isFinite(detail.position)){position=detail.position!;positionAt=performance.now()}syncMotionState();resume();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();syncCharacter(performance.now())}else resume()});
 motion.addEventListener('change',()=>{stop();syncMotionState();if(motion.matches){progress=.5;paint()}else resume()});
 const dialogObserver=new MutationObserver(()=>{dialogOpen=document.querySelector('dialog[open]')!==null;if(blocked()){stop();syncCharacter(performance.now())}else resume()});
 document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
 // Observer entries can describe the previous layout during a rotation. Read the
 // current bounds, shared with scroll/resize, rather than restoring stale visibility.
 new IntersectionObserver(()=>{bounds();if(inView)resume();else{stop();syncCharacter(performance.now())}},{threshold:0}).observe(gate);
 new ResizeObserver(measure).observe(gate);
 new ResizeObserver(()=>{bounds();if(!inView)stop();else resume()}).observe(document.querySelector('main')!);
 new MutationObserver(()=>{lastPosePause=undefined;syncCharacter(performance.now())}).observe(character,{subtree:true,attributes:true,attributeFilter:['data-kist-bound']});
 syncMotionState();measure();
}

