import {renderWorld} from './world-renderer';

/** The city subscribes to the existing player. Its widget, controls and session have one owner. */
const root=document.getElementById('kist-world');
const canvas=document.querySelector<HTMLCanvasElement>('#kist-world-canvas');
const context=canvas?.getContext('2d',{alpha:true});
if(root&&canvas&&context){
 document.body.classList.add('world-enabled');
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 const pause=document.querySelector<HTMLButtonElement>('#world-motion')!;
 const map=document.querySelector<HTMLElement>('#world-map')!;
 const mapToggle=document.querySelector<HTMLButtonElement>('#world-map-toggle')!;
 const art=Array.from(root.querySelectorAll<HTMLImageElement>('[data-world-art]'));
 const foreground=root.querySelector<HTMLImageElement>('[data-world-foreground]')!;
 const gate=document.getElementById('frequency-break')!;
 const character=gate.querySelector<HTMLElement>('.gate-character')!;
 const poses=Array.from(character.querySelectorAll<HTMLElement>('[data-gate-pose]'));
 const labels=['L’arrivo','Il suono','La piazza','Le connessioni','La terrazza','La prossima notte'];
 const ids=['home','sound','diary','places','about','contact'];
 const clamp=(n:number)=>Math.max(0,Math.min(1,n));
 const smooth=(n:number)=>{const x=clamp(n);return x*x*(3-2*x)};
 let boundaries:number[]=[],activationInset=0,width=0,height=0,raf=0,last=0,lastPaint=0,elapsed=0,frames=0;
 let targetChapter=0,chapter=0,scroll=0,targetScroll=0,energy=0,playing=false,position=0,positionAt=0;
 let pointerX=0,pointerY=0,paused=false,initialized=false,lastDistrict=-1,lastScrollAt=0,lastScrollY=scrollY;
 let gateTop=0,gateHeight=1,gateWidth=1,gateProgress=.1,targetGateProgress=.1,lastPose='',lastPosePause:boolean|undefined;
 try{paused=localStorage.getItem('kist:world-paused:v1')==='true'}catch{}
 const blocked=()=>document.hidden||document.querySelector('dialog[open]')!==null;
 const staticWorld=()=>paused||motion.matches;
 const artOpacity=[-1,-1,-1],artTransform=['','',''];
 art.forEach(image=>{image.decode().then(()=>{image.dataset.loaded='true';root!.dataset.worldArtReady=String(art.filter(item=>item.dataset.loaded==='true').length)}).catch(()=>{image.dataset.failed='true'})});
 function label(district:number){
  if(district===lastDistrict)return;lastDistrict=district;
  document.querySelector('[data-world-label]')!.textContent=labels[district];
  document.querySelectorAll<HTMLElement>('[data-world-route]').forEach((el,i)=>{if(i===district)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current')});
  document.querySelectorAll<HTMLElement>('[data-world-stop]').forEach((el,i)=>{el.classList.toggle('active',i===district);el.classList.toggle('visited',i<district)});
  root!.dataset.worldChapter=String(district);
 }
 function syncCharacter(now:number){
  const visible=gateTop-scrollY<innerHeight&&gateTop+gateHeight-scrollY>0;
  const walking=visible&&!staticWorld()&&now-lastScrollAt<190;
  const pose=playing&&!walking?'groove':'run';
  const frozen=staticWorld()||blocked()||(!walking&&!playing);
  if(pose!==lastPose){poses.forEach(element=>element.hidden=element.dataset.gatePose!==pose);character.dataset.pose=pose;lastPose=pose;lastPosePause=undefined}
  if(frozen!==lastPosePause){poses.forEach(element=>element.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:frozen||element.hidden}})));lastPosePause=frozen}
 }
 function track(){
  const end=scrollY+innerHeight>=document.documentElement.scrollHeight-5;
  const y=end?boundaries[boundaries.length-1]+1:scrollY+activationInset;
  let index=0;while(index<boundaries.length-1&&y>=boundaries[index+1])index++;
  const span=(boundaries[index+1]??boundaries[index]+1)-boundaries[index];
  targetChapter=Math.min(5,index+clamp((y-boundaries[index])/Math.max(1,span)));
  targetScroll=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);
  targetGateProgress=clamp((innerHeight-gateTop+scrollY)/(innerHeight+gateHeight));label(index);
  if(motion.matches&&!paused){chapter=targetChapter;scroll=targetScroll;gateProgress=targetGateProgress;paint()}
 }
 function bounds(){
  boundaries=ids.map(id=>document.getElementById(id)!.getBoundingClientRect().top+scrollY);
  gateTop=gate.getBoundingClientRect().top+scrollY;gateHeight=gate.clientHeight;gateWidth=gate.clientWidth;
 }
 function measure(){
  const anchorInset=(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+Math.max(...ids.map(id=>parseFloat(getComputedStyle(document.getElementById(id)!).scrollMarginTop)||0));
  activationInset=Math.max(innerHeight*.22,anchorInset+4);bounds();
  height=180;width=Math.max(1,Math.round(innerWidth/innerHeight*height));
  canvas!.width=width;canvas!.height=height;track();
  if(!initialized){chapter=targetChapter;scroll=targetScroll;gateProgress=targetGateProgress;initialized=true}
  paint();resume();
 }
 function paint(){
  const livePosition=playing?position+Math.min(2000,performance.now()-positionAt):position;
  renderWorld(context!,width,height,{time:motion.matches?0:elapsed,chapter,scroll,energy,musicPosition:livePosition,pointerX:motion.matches?0:pointerX,pointerY:motion.matches?0:pointerY,reduced:motion.matches});
  const environment=chapter<2.5?smooth((chapter-.8)/1.7):1+smooth((chapter-3.1)/1.7);
  art.forEach((image,i)=>{
   const opacity=clamp(1-Math.abs(environment-i));
   if(Math.abs(opacity-artOpacity[i])>.001){image.style.opacity=opacity.toFixed(4);image.style.visibility=opacity>.001?'visible':'hidden';artOpacity[i]=opacity}
   const x=motion.matches?0:Math.round(((.5-scroll)*12-pointerX*4)/2)*2;
   const y=motion.matches?0:Math.round(((scroll-.5)*4-pointerY*2)/2)*2;
   const transform=`translate3d(${x}px,${y}px,0)`;
   if(transform!==artTransform[i]){image.style.transform=transform;artTransform[i]=transform}
  });
  const nearRange=Math.min(14,innerWidth*.025);
  const frontX=motion.matches?0:Math.round(((.5-scroll)*nearRange*2-pointerX*nearRange*.3)/2)*2;
  foreground.style.transform=`translate3d(${frontX}px,0,0)`;
  const x=clamp((gateProgress-.12)/.76)*Math.max(0,gateWidth-character.offsetWidth-24)+12;
  character.style.setProperty('--gate-x',`${Math.round(x/2)*2}px`);
  character.dataset.routeProgress=gateProgress.toFixed(3);syncCharacter(performance.now());
  frames++;root!.dataset.worldFrame=String(frames);root!.dataset.worldReady='true';root!.dataset.worldProgress=chapter.toFixed(3);root!.dataset.worldEnvironment=environment.toFixed(3);
 }
 function frame(now:number){
  raf=0;if(blocked()||staticWorld()){last=0;syncCharacter(now);return}
  const dt=last?Math.min((now-last)/1000,.08):.016;last=now;elapsed+=dt;
  const easing=1-Math.exp(-dt*3.8);chapter+=(targetChapter-chapter)*easing;scroll+=(targetScroll-scroll)*easing;gateProgress+=(targetGateProgress-gateProgress)*easing;energy+=((playing?1:0)-energy)*Math.min(1,dt*2);
  if(now-lastPaint>1000/24){paint();lastPaint=now}
  raf=requestAnimationFrame(frame);
 }
 function stop(){cancelAnimationFrame(raf);raf=0;last=0}
 function resume(){if(!raf&&!blocked()&&!staticWorld())raf=requestAnimationFrame(frame)}
 function controls(){
  const frozen=staticWorld();root!.dataset.worldPaused=String(frozen);document.body.classList.toggle('world-still',frozen);
  pause.setAttribute('aria-pressed',String(frozen));pause.disabled=motion.matches;
  pause.setAttribute('aria-label',motion.matches?'Mondo statico: movimento ridotto attivo':paused?'Riprendi lo sfondo':'Metti in pausa lo sfondo');
  root!.dataset.worldAudio=playing?'playing':'quiet';syncCharacter(performance.now());
 }
 pause.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('kist:world-paused:v1',String(paused))}catch{}controls();if(paused)stop();else resume()});
 const closeMap=()=>{map.hidden=true;mapToggle.setAttribute('aria-expanded','false')};
 mapToggle.addEventListener('click',()=>{map.hidden=!map.hidden;mapToggle.setAttribute('aria-expanded',String(!map.hidden))});
 map.querySelectorAll('a').forEach(el=>el.addEventListener('click',closeMap));
 document.addEventListener('pointerdown',event=>{if(!map.hidden&&event.target instanceof Node&&!document.querySelector('.world-dock')!.contains(event.target))closeMap()});
 document.addEventListener('focusin',event=>{if(!map.hidden&&event.target instanceof Node&&!document.querySelector('.world-dock')!.contains(event.target))closeMap()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!map.hidden){closeMap();mapToggle.focus()}});
 window.addEventListener('scroll',()=>{
  const delta=scrollY-lastScrollY;lastScrollY=scrollY;
  if(Math.abs(delta)>.5&&!staticWorld()&&!blocked()){
   lastScrollAt=performance.now();character.style.setProperty('--gate-facing',delta>0?'1':'-1');character.dataset.facing=delta>0?'right':'left';syncCharacter(lastScrollAt);
  }
  track();resume();
 },{passive:true});
 window.addEventListener('resize',measure,{passive:true});
 window.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||staticWorld())return;pointerX=(event.clientX/innerWidth-.5)*.7;pointerY=(event.clientY/innerHeight-.5)*.7},{passive:true});
 window.addEventListener('kist:audio',event=>{
  const detail=(event as CustomEvent<{playing:boolean;position?:number}>).detail;
  playing=detail.playing;if(Number.isFinite(detail.position)){position=detail.position!;positionAt=performance.now()}
  document.querySelector('[data-world-audio]')!.textContent=playing?'La città segue il tuo ascolto.':'La città aspetta il suono.';controls();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();syncCharacter(performance.now())}else resume()});
 motion.addEventListener('change',()=>{stop();controls();if(motion.matches){chapter=targetChapter;scroll=targetScroll;gateProgress=targetGateProgress;paint()}else resume()});
 const dialogObserver=new MutationObserver(()=>{if(blocked()){stop();syncCharacter(performance.now())}else resume()});
 document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
 new ResizeObserver(()=>{bounds();track()}).observe(document.querySelector('main')!);
 new MutationObserver(()=>{lastPosePause=undefined;syncCharacter(performance.now())}).observe(character,{subtree:true,attributes:true,attributeFilter:['data-kist-bound']});
 controls();measure();
}
