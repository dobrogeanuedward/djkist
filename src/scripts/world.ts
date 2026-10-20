import {renderWorld} from './world-renderer';

/** World is a subscriber: the SoundCloud widget and session remain owned by experience.ts. */
const root=document.getElementById('kist-world');
const canvas=document.querySelector<HTMLCanvasElement>('#kist-world-canvas');
const context=canvas?.getContext('2d',{alpha:false});
if(root&&canvas&&context){
 document.body.classList.add('world-enabled');
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 const pause=document.querySelector<HTMLButtonElement>('#world-motion')!;
 const map=document.querySelector<HTMLElement>('#world-map')!;
 const mapToggle=document.querySelector<HTMLButtonElement>('#world-map-toggle')!;
 const labels=['L’arrivo','La centrale sonora','La piazza','Le connessioni','La terrazza','La prossima notte'];
 const ids=['home','sound','diary','places','about','contact'];
 let boundaries:number[]=[],activationInset=0,width=0,height=0,raf=0,last=0,lastPaint=0,elapsed=0,frames=0;
 let targetChapter=0,chapter=0,scroll=0,targetScroll=0,energy=0,playing=false,position=0,positionAt=0;
 let pointerX=0,pointerY=0,paused=false,initialized=false,lastDistrict=-1;
 try{paused=localStorage.getItem('kist:world-paused:v1')==='true'}catch{}
 const blocked=()=>document.hidden||Array.from(document.querySelectorAll('dialog[open]')).length>0;
 const staticWorld=()=>paused||motion.matches;
 function label(district:number){
  if(district===lastDistrict)return;lastDistrict=district;
  document.querySelector('[data-world-label]')!.textContent=labels[district];
  document.querySelectorAll<HTMLElement>('[data-world-route]').forEach((el,i)=>{if(i===district)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current')});
  document.querySelectorAll<HTMLElement>('[data-world-stop]').forEach((el,i)=>{el.classList.toggle('active',i===district);el.classList.toggle('visited',i<district)});
  root!.dataset.worldChapter=String(district);
 }
 function track(){
  const end=scrollY+innerHeight>=document.documentElement.scrollHeight-5;
  const y=end?boundaries[boundaries.length-1]+1:scrollY+activationInset;
  let index=0;while(index<boundaries.length-1&&y>=boundaries[index+1])index++;
  const span=(boundaries[index+1]??boundaries[index]+1)-boundaries[index];
  targetChapter=Math.min(5,index+Math.max(0,Math.min(1,(y-boundaries[index])/Math.max(1,span))));
  targetScroll=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);label(index);
  if(motion.matches&&!paused){chapter=targetChapter;scroll=targetScroll;paint()}
 }
 function measure(){
  // Anchor landings include both page scroll padding and section scroll margin.
  // Keep the map aligned with the reached section, including short viewports.
  const anchorInset=(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+Math.max(...ids.map(id=>parseFloat(getComputedStyle(document.getElementById(id)!).scrollMarginTop)||0));
  activationInset=Math.max(innerHeight*.22,anchorInset+4);
  boundaries=ids.map(id=>document.getElementById(id)!.getBoundingClientRect().top+scrollY);
  width=Math.round(innerWidth*Math.min(devicePixelRatio||1,1.25));height=Math.round(innerHeight*Math.min(devicePixelRatio||1,1.25));
  // Cap rendering cost on large monitors; CSS scales the coherent composition.
  const ratio=Math.min(1,1400/width);width=Math.round(width*ratio);height=Math.round(height*ratio);
  canvas!.width=width;canvas!.height=height;track();if(!initialized){chapter=targetChapter;scroll=targetScroll;initialized=true}paint();resume();
 }
 function paint(){
  const livePosition=playing?position+Math.min(2000,performance.now()-positionAt):position;
  renderWorld(context!,width,height,{time:motion.matches?0:elapsed,chapter,scroll,energy,musicPosition:livePosition,pointerX:motion.matches?0:pointerX,pointerY:motion.matches?0:pointerY,reduced:motion.matches});
  frames++;root!.dataset.worldFrame=String(frames);root!.dataset.worldReady='true';root!.dataset.worldProgress=chapter.toFixed(3);
 }
 function frame(now:number){
  raf=0;if(blocked()||staticWorld()){last=0;return}
  const dt=last?Math.min((now-last)/1000,.08):.016;last=now;elapsed+=dt;
  const easing=1-Math.exp(-dt*3.8);chapter+=(targetChapter-chapter)*easing;scroll+=(targetScroll-scroll)*easing;energy+=((playing?1:0)-energy)*Math.min(1,dt*2);
  if(now-lastPaint>1000/30){paint();lastPaint=now}
  raf=requestAnimationFrame(frame);
 }
 function stop(){cancelAnimationFrame(raf);raf=0;last=0}
 function resume(){if(!raf&&!blocked()&&!staticWorld())raf=requestAnimationFrame(frame)}
 function controls(){
  const frozen=staticWorld();root!.dataset.worldPaused=String(frozen);document.body.classList.toggle('world-still',frozen);
  pause.setAttribute('aria-pressed',String(frozen));pause.disabled=motion.matches;
  pause.setAttribute('aria-label',motion.matches?'Mondo statico: movimento ridotto attivo':paused?'Riprendi lo sfondo':'Metti in pausa lo sfondo');
  root!.dataset.worldAudio=playing?'playing':'quiet';
  document.querySelectorAll<HTMLElement>('.gate-character [data-kist-sprite]').forEach(sprite=>sprite.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:frozen}})));
 }
 pause.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('kist:world-paused:v1',String(paused))}catch{}controls();if(paused)stop();else resume()});
 const closeMap=()=>{map.hidden=true;mapToggle.setAttribute('aria-expanded','false')};
 mapToggle.addEventListener('click',()=>{map.hidden=!map.hidden;mapToggle.setAttribute('aria-expanded',String(!map.hidden))});
 map.querySelectorAll('a,button').forEach(el=>el.addEventListener('click',closeMap));
 document.addEventListener('pointerdown',event=>{if(!map.hidden&&event.target instanceof Node&&!document.querySelector('.world-dock')!.contains(event.target))closeMap()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!map.hidden){closeMap();mapToggle.focus()}});
 window.addEventListener('scroll',track,{passive:true});
 window.addEventListener('resize',measure,{passive:true});
 window.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||staticWorld())return;pointerX=(event.clientX/innerWidth-.5)*.7;pointerY=(event.clientY/innerHeight-.5)*.7},{passive:true});
 window.addEventListener('kist:audio',event=>{
  const detail=(event as CustomEvent<{playing:boolean;position?:number}>).detail;
  playing=detail.playing;if(Number.isFinite(detail.position)){position=detail.position!;positionAt=performance.now()}
  document.querySelector('[data-world-audio]')!.textContent=playing?'La città segue il tuo ascolto.':'La città aspetta il suono.';controls();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume()});
 motion.addEventListener('change',()=>{stop();controls();if(motion.matches){chapter=targetChapter;scroll=targetScroll;paint()}else resume()});
 const dialogObserver=new MutationObserver(()=>{if(blocked())stop();else resume()});
 document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
 new ResizeObserver(()=>{boundaries=ids.map(id=>document.getElementById(id)!.getBoundingClientRect().top+scrollY);track()}).observe(document.querySelector('main')!);
 controls();measure();
}
