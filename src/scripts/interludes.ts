/** Pixel harmonics follow the character; only visible interludes consume frames. */
const stops=new Set<()=>void>();
function initInterludes(){
 document.querySelectorAll<HTMLElement>('[data-arcade-interlude]').forEach(root=>{
  if(root.dataset.arcadeBound)return;
  root.dataset.arcadeBound='true';
  const canvas=root.querySelector<HTMLCanvasElement>('.arcade-harmonics');
  const character=root.querySelector<HTMLElement>('.arcade-character');
  const ctx=canvas?.getContext('2d');
  if(!canvas||!character||!ctx)return;
  const run=root.dataset.kind==='run',motion=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0,inView=false,elapsed=0,last=0,lastPaint=0,width=0,height=0,characterWidth=0,dead=false;
  const pixel=3;
  function draw(){
   if(!width||!height)return;
   const phase=motion.matches?0:elapsed/1000;
   const progress=motion.matches ? .49 : (.32+elapsed/6500)%1;
   const left=run?progress*(width+characterWidth*2)-characterWidth:(width-characterWidth)/2;
   if(run)character!.style.setProperty('--run-x',`${Math.round(left)}px`);
   const w=canvas!.width,h=canvas!.height,origin=(left+characterWidth*.42)/pixel;
   ctx!.clearRect(0,0,w,h);
   ctx!.imageSmoothingEnabled=false;
   const colors=['#77e5ff','#976cff','#ff87c7'];
   // The low resolution is intentional: each harmonic is made of square pixels.
   for(let band=0;band<3;band++){
    const center=h*.57+(band-1)*3;
    ctx!.fillStyle=colors[band];
    for(let x=0;x<w;x+=2){
     const envelope=Math.sin(Math.PI*x/w);
     const y=center+Math.sin(x/(17-band*3)-phase*(2.2+band*.45)+band*.9)*(8+band*2)*envelope;
     ctx!.globalAlpha=.12;
     ctx!.fillRect(x,Math.round(y),2,1);
    }
    const trail=Math.min(140,w*.65),end=run?origin:w*.78,start=Math.max(0,end-trail);
    for(let x=start;x<Math.min(w,end);x+=2){
     const distance=(end-x)/trail;
     const energy=Math.sin(Math.PI*Math.max(0,Math.min(1,1-distance)));
     const y=center+Math.sin((x-end)/(12-band*2)-phase*(5+band)+band*.85)*(9+band*4)*energy;
     ctx!.globalAlpha=(.6-band*.1)*Math.max(0,1-distance);
     ctx!.fillRect(Math.round(x),Math.round(y),2,2);
    }
   }
   ctx!.globalAlpha=1;
   root.dataset.arcadeReady='true';
   root.dataset.arcadePosition=String(Math.round(left));
  }
  function frame(now:number){
   if(dead||!inView||document.hidden||motion.matches){raf=0;last=0;return;}
   if(last)elapsed+=Math.min(now-last,100);
   last=now;
   if(now-lastPaint>40){draw();lastPaint=now;}
   raf=requestAnimationFrame(frame);
  }
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function start(){if(!raf&&inView&&!document.hidden&&!motion.matches&&!dead)raf=requestAnimationFrame(frame);}
  function resize(){width=root.clientWidth;height=root.clientHeight;characterWidth=character!.offsetWidth;canvas!.width=Math.ceil(width/pixel);canvas!.height=Math.ceil(height/pixel);draw();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(root);
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView){resize();start();}else stop();},{rootMargin:'60px'});
  observer.observe(root);
  function onMotion(){stop();draw();start();}
  function onVisibility(){document.hidden?stop():start();}
  motion.addEventListener('change',onMotion);document.addEventListener('visibilitychange',onVisibility);
  const dispose=()=>{dead=true;stop();observer.disconnect();resizeObserver.disconnect();motion.removeEventListener('change',onMotion);document.removeEventListener('visibilitychange',onVisibility);stops.delete(dispose);delete root.dataset.arcadeBound;};
  stops.add(dispose);
 });
}
initInterludes();
document.addEventListener('astro:page-load',initInterludes);
document.addEventListener('astro:before-swap',()=>{for(const stop of [...stops])stop();});
