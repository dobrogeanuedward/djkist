/** Original Canvas2D starfield. Visual research: https://reactbits.dev/backgrounds/galaxy
 * Independent renderer: cached nebula, square-light sprites and stable depth planes. */
type SkyStar={x:number;y:number;depth:number;radius:number;alpha:number;phase:number;speed:number;tint:number;flare:boolean};
const skyControllers=new Set<()=>void>();
const palette=['211,205,255','134,222,245','247,239,255'];
const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
function randomSource(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}}
function hash(x:number,y:number){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295}
function noise(x:number,y:number){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return(hash(ix,iy)*(1-sx)+hash(ix+1,iy)*sx)*(1-sy)+(hash(ix,iy+1)*(1-sx)+hash(ix+1,iy+1)*sx)*sy}
function nebulaTexture(width:number,height:number){
 const texture=document.createElement('canvas');texture.width=Math.min(360,Math.max(110,Math.round(width/3)));texture.height=Math.min(720,Math.max(100,Math.round(texture.width*height/width)));
 const context=texture.getContext('2d')!;const pixels=context.createImageData(texture.width,texture.height);
 for(let y=0;y<texture.height;y++)for(let x=0;x<texture.width;x++){
  const u=x/texture.width,v=y/texture.height,spine=.8-u*.66+Math.sin(u*6.4)*.07;
  const band=Math.exp(-Math.pow((v-spine)/.185,2));
  const cloud=noise(u*4.8+3,v*5.2+8)*.55+noise(u*11.5+23,v*13.6)*.29+noise(u*29.2+14,v*30.5+17)*.16;
  const filaments=Math.pow(clamp((cloud-.3)*1.6),1.35),quietCenter=.5+.5*Math.min(1,Math.abs(u-.52)*2.8);
  const light=band*filaments*quietCenter,cyan=clamp(u*.92+noise(u*3,v*4)*.4-.18);
  const i=(y*texture.width+x)*4;
  pixels.data[i]=Math.round(116-cyan*73);pixels.data[i+1]=Math.round(55+cyan*97);pixels.data[i+2]=Math.round(195+cyan*17);pixels.data[i+3]=Math.round(light*200);
 }
 context.putImageData(pixels,0,0);
 // Fine, stable dust belongs to the distant nebula, rather than a shower over the page.
 const random=randomSource(74419),dust=Math.round(clamp(width*height/3200,100,420));
 context.globalCompositeOperation='screen';
 for(let i=0;i<dust;i++){
  const u=random(),spine=.8-u*.66+Math.sin(u*6.4)*.07,v=spine+(random()+random()-1)*.16;
  context.fillStyle=`rgba(191,163,245,${.08+random()*.3})`;context.fillRect(u*texture.width,v*texture.height,.35+random()*.5,.35+random()*.5);
 }
 return texture;
}
function starTexture(tint:number,flare:boolean){
 const texture=document.createElement('canvas');texture.width=texture.height=96;const context=texture.getContext('2d')!,color=palette[tint];
 const halo=context.createRadialGradient(48,48,0,48,48,47);halo.addColorStop(0,'rgba(255,255,255,1)');halo.addColorStop(.025,'rgba(255,255,255,.98)');halo.addColorStop(.07,`rgba(${color},.72)`);halo.addColorStop(.2,`rgba(${color},.24)`);halo.addColorStop(.5,`rgba(${color},.045)`);halo.addColorStop(1,`rgba(${color},0)`);context.fillStyle=halo;context.fillRect(0,0,96,96);
 if(flare){
  const ray=context.createLinearGradient(4,0,92,0);ray.addColorStop(0,`rgba(${color},0)`);ray.addColorStop(.43,`rgba(${color},.2)`);ray.addColorStop(.5,'rgba(255,255,255,.95)');ray.addColorStop(.57,`rgba(${color},.2)`);ray.addColorStop(1,`rgba(${color},0)`);
  context.fillStyle=ray;context.fillRect(4,47.5,88,1);context.translate(48,48);context.rotate(Math.PI/2);context.translate(-48,-48);context.fillRect(4,47.5,88,1);context.setTransform(1,0,0,1,0,0);
 }
 return texture;
}
function initNightSkies(){
 document.querySelectorAll<HTMLElement>('[data-night-sky]').forEach(root=>{
  if(root.dataset.skyBound)return;
  const canvas=root.querySelector<HTMLCanvasElement>('[data-night-sky-canvas]'),button=root.querySelector<HTMLButtonElement>('[data-night-sky-toggle]'),host=root.parentElement;
  const context=canvas?.getContext('2d',{alpha:true});if(!canvas||!context||!button||!host)return;
  root.dataset.skyBound='true';
  const motion=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)'),forcedColors=matchMedia('(forced-colors:active)');
  const sprites=palette.map((_,index)=>[starTexture(index,false),starTexture(index,true)]);
  let stars:SkyStar[]=[],nebula:HTMLCanvasElement|undefined,width=0,height=0,ratio=1,sectionTop=0,visible=false,paused=false,disposed=false;
  let raf=0,last=0,lastPaint=0,elapsed=0,frames=0,targetX=0,targetY=0,cameraX=0,cameraY=0,scroll=.5,targetScroll=.5;
  const blocked=()=>document.hidden||!visible||forcedColors.matches||!!document.querySelector('dialog[open]');
  const still=()=>paused||motion.matches;
  function track(){targetScroll=clamp((innerHeight-sectionTop+scrollY)/(innerHeight+height))}
  function controls(){
   const frozen=still();root.dataset.skyPaused=String(frozen);button!.setAttribute('aria-pressed',String(frozen));
   const label=frozen?'Riprendi il cielo stellato':'Metti in pausa il cielo stellato';button!.setAttribute('aria-label',label);button!.title=label;
   button!.querySelector('[data-night-sky-icon]')?.setAttribute('d',frozen?'M7 4.5 14 10l-7 5.5Z':'M7 5v10 M13 5v10');
  }
  function render(){
   if(!width||!height)return;
   if(!nebula)nebula=nebulaTexture(width,height);
   context!.setTransform(ratio,0,0,ratio,0,0);context!.clearRect(0,0,width,height);context!.globalCompositeOperation='source-over';context!.globalAlpha=1;
   const x=motion.matches?0:cameraX,y=motion.matches?0:cameraY;
   context!.drawImage(nebula,-48+x*.12,-48+y*.12,width+96,height+96);
   context!.globalCompositeOperation='screen';
   for(const star of stars){
    const sx=star.x*(width+100)-50+x*star.depth,sy=star.y*(height+140)-70+y*star.depth;
    const twinkle=motion.matches?1:.88+.12*Math.sin(elapsed*star.speed+star.phase);
    context!.globalAlpha=star.alpha*twinkle;
    if(star.radius>1.1){
     const size=star.flare?34+star.radius*7:star.radius*15;
     context!.drawImage(sprites[star.tint][star.flare?1:0],sx-size/2,sy-size/2,size,size);
    }else{context!.fillStyle=`rgb(${palette[star.tint]})`;context!.fillRect(sx,sy,star.radius,star.radius)}
   }
   context!.globalAlpha=1;context!.globalCompositeOperation='source-over';
   frames++;root.dataset.skyFrame=String(frames);root.dataset.skyReady='true';root.dataset.skyCameraX=cameraX.toFixed(2);root.dataset.skyCameraY=cameraY.toFixed(2);root.dataset.skyScroll=scroll.toFixed(3);
  }
  function stop(){cancelAnimationFrame(raf);raf=0;last=0}
  function frame(now:number){
   raf=0;if(disposed||blocked()||still()){last=0;return}
   const dt=last?Math.min((now-last)/1000,.06):1/60;last=now;elapsed+=dt;
   const follow=1-Math.exp(-dt*4.6);scroll+=(targetScroll-scroll)*follow;
   const desiredX=targetX*Math.min(34,width*.04)+(scroll-.5)*18,desiredY=targetY*24+(scroll-.5)*100;
   cameraX+=(desiredX-cameraX)*follow;cameraY+=(desiredY-cameraY)*follow;
   if(now-lastPaint>1000/30){render();lastPaint=now}
   raf=requestAnimationFrame(frame);
  }
  function wake(){if(!raf&&!disposed&&!blocked()&&!still())raf=requestAnimationFrame(frame)}
  function resize(){
   const rect=host!.getBoundingClientRect(),nextWidth=Math.max(1,Math.round(rect.width)),nextHeight=Math.max(1,Math.round(rect.height));sectionTop=rect.top+scrollY;
   if(nextWidth===width&&nextHeight===height){track();return;}
   width=nextWidth;height=nextHeight;ratio=Math.min(devicePixelRatio||1,1.35,Math.sqrt(2400000/(width*height)));
   canvas!.width=Math.max(1,Math.round(width*ratio));canvas!.height=Math.max(1,Math.round(height*ratio));nebula=undefined;
   const random=randomSource(29912026),count=Math.round(clamp(width*height/1900,width<700?220:420,width<700?360:850));stars=[];
   for(let i=0;i<count;i++){
    const layer=random(),depth=layer<.55?.2:layer<.88?.55:1,size=random();
    stars.push({x:random(),y:random(),depth,radius:depth===1?1.2+size*1.5:depth===.55?.65+size*.75:.4+size*.6,alpha:depth===1?.56+random()*.4:.22+random()*.48,phase:random()*Math.PI*2,speed:.3+random()*.48,tint:Math.floor(random()*3),flare:depth===1&&size>.9});
   }
   // Deliberately composed bright stars frame the content, rather than tracing a grid.
   for(const [x,y,tint] of [[.045,.2,0],[.94,.16,1],[.965,.48,2],[.055,.69,1],[.9,.85,0],[.68,.08,2]] as const)stars.push({x,y,depth:1,radius:2.4,alpha:.88,phase:x*8,speed:.35,tint,flare:true});
   root.dataset.skyStars=String(stars.length);track();if(motion.matches){scroll=.5;cameraX=cameraY=0}else if(!frames)scroll=targetScroll;
   visible=rect.bottom>0&&rect.top<innerHeight;
   // Build the nebula lazily when Notti is visible; hidden sections do no frame work.
   if(!blocked())render();wake();
  }
  function onScroll(){
   if(!visible||still()||document.hidden)return;sectionTop=host!.getBoundingClientRect().top+scrollY;track();wake();
  }
  function onPointer(event:PointerEvent){
   if(event.pointerType!=='mouse'||!fine.matches||still()||blocked())return;
   const rect=host!.getBoundingClientRect();targetX=clamp((event.clientX-rect.left)/width)*2-1;targetY=clamp(event.clientY/innerHeight)*2-1;wake();
  }
  function leave(){targetX=targetY=0;wake()}
  function onVisibility(){if(blocked())stop();else{track();if(!nebula||motion.matches)render();wake()}}
  function onMotion(){stop();targetX=targetY=0;if(motion.matches){scroll=.5;cameraX=cameraY=0;if(!blocked())render()}else{track();wake()}controls()}
  function onPause(){paused=!paused;controls();if(paused)stop();else{track();wake()}}
  button.addEventListener('click',onPause);host.addEventListener('pointermove',onPointer,{passive:true});host.addEventListener('pointerleave',leave,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',onVisibility);motion.addEventListener('change',onMotion);forcedColors.addEventListener('change',onVisibility);
  const observer=new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;root.dataset.skyVisible=String(visible);
   if(visible){sectionTop=host!.getBoundingClientRect().top+scrollY;track();if(!blocked()&&!nebula)render();wake()}else stop();
  },{threshold:0});observer.observe(host);
  const dimensions=new ResizeObserver(resize);dimensions.observe(host);
  const dialogs=new MutationObserver(onVisibility);document.querySelectorAll('dialog').forEach(dialog=>dialogs.observe(dialog,{attributes:true,attributeFilter:['open']}));
  const dispose=()=>{disposed=true;stop();observer.disconnect();dimensions.disconnect();dialogs.disconnect();button.removeEventListener('click',onPause);host.removeEventListener('pointermove',onPointer);host.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);motion.removeEventListener('change',onMotion);forcedColors.removeEventListener('change',onVisibility);delete root.dataset.skyBound;skyControllers.delete(dispose)};
  skyControllers.add(dispose);controls();resize();
 });
}
initNightSkies();
document.addEventListener('astro:page-load',initNightSkies);
document.addEventListener('astro:before-swap',()=>{for(const dispose of [...skyControllers])dispose()});
