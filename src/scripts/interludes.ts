/** Scroll-driven original KIST worlds. Audio transport adds light, not beat detection. */
const stops = new Set<() => void>();
function initInterludes() {
 document.querySelectorAll<HTMLElement>('[data-arcade-interlude]').forEach(root => {
  if(root.dataset.arcadeBound)return;
  root.dataset.arcadeBound='true';
  const canvas=root.querySelector<HTMLCanvasElement>('.arcade-harmonics'),character=root.querySelector<HTMLElement>('.arcade-character'),pause=root.querySelector<HTMLButtonElement>('.world-pause');
  const ctx=canvas?.getContext('2d');if(!canvas||!character||!ctx)return;
  const run=root.dataset.kind==='run',motion=matchMedia('(prefers-reduced-motion: reduce)'),colors=['#77e5ff','#976cff','#ff87c7','#c9ff52'];
  let raf=0,visible=false,elapsed=0,last=0,lastPaint=0,width=0,height=0,dead=false,paused=false,progress=.2,light=0;
  const still=()=>motion.matches||paused;
  function rect(x:number,y:number,w:number,h:number,color:string,alpha=1){ctx!.globalAlpha=alpha;ctx!.fillStyle=color;ctx!.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function draw(){
   if(!width||!height)return;
   const w=canvas!.width,h=canvas!.height,ground=h-47/3,t=motion.matches ? 0 : elapsed/1000,p=motion.matches ? .2 : progress;
   const act=run?Math.min(2,Math.floor(p*3)):2,drift=p*w*.65+t*1.8;
   root.dataset.worldAct=String(act);
   light+=((document.body.classList.contains('sound-active')?.7:.15)-light)*.08;
   ctx!.clearRect(0,0,w,h);rect(0,0,w,h,'#090b17');
   for(let i=0;i<52;i++)rect(((i*79.13-drift*.12)%w+w)%w,(i*31.71)%(ground*.83),i%9===0?2:1,1,colors[i%3],.15+(i%5)*.055);
   const mx=w*.77-p*7,my=h*.25,r=Math.min(h*.16,24);
   for(let row=-r;row<=r;row+=2){const span=Math.sqrt(Math.max(0,r*r-row*row));rect(mx-span,my+row,span*2,1,act===1?'#ff87c7':'#976cff',.18+light*.12);}
   for(let i=-2;i<w/14+3;i++){
    const x=i*14-drift*.24%14,tower=7+((i+80)*17%23);
    rect(x,ground-tower-12,10,tower+12,'#16152c');rect(x,ground-tower-12,10,1,'#77659f',.3);
    for(let k=0;k<tower/5;k++)rect(x+3,ground-k*5-17,2,1,colors[(i+80)%4],.22);
   }
   if(act===0){
    const spacing=Math.max(60,w/4);
    for(let i=-1;i<6;i++){const x=i*spacing-drift%spacing,y=ground-17-(i+6)%3*13;rect(x,y,30,2,'#77e5ff',.6);rect(x+2,y+2,26,7,'#242143');for(let k=0;k<5;k++)rect(x+k*6,y+4,3,1,'#976cff',.45);}
    const gx=w*.72-p*17;
    for(let radius=24;radius>8;radius-=5){ctx!.globalAlpha=.22+light*.14;ctx!.strokeStyle=radius%2?'#77e5ff':'#976cff';ctx!.lineWidth=1;ctx!.beginPath();ctx!.ellipse(gx,ground-35,radius*.57,radius,-.12,0,Math.PI*2);ctx!.stroke();}
   }else if(act===1){
    const patterns=[[[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[1,1]]],unit=Math.max(4,Math.min(7,w/60));
    for(let i=0;i<14;i++){const x=((i*37-drift*.45)%(w+30)+w+30)%(w+30)-15,y=((i*19+t*(1+i%3))%Math.max(25,ground-26))+5;for(const [dx,dy] of patterns[i%3]){rect(x+dx*unit,y+dy*unit,unit-1,unit-1,colors[i%4],.23+light*.15);rect(x+dx*unit,y+dy*unit,unit-1,1,colors[i%4],.65);}}
   }else{
    const unit=11,offset=drift*.2%(unit*5);
    for(let row=0;row<Math.ceil((ground-12)/unit);row++)for(let col=-1;col<w/(unit*5)+1;col++){
     const x=col*unit*5-offset+(row%2)*18,y=row*unit+12;
     rect(x,y,unit*3,1,'#976cff',.35+light*.12);rect(x,y,1,unit,'#976cff',.35);rect(x+unit*3,y,1,unit*.5,'#77e5ff',.25);
     if((row+col+90)%3===0)rect(x+unit*4,y+5,1,1,'#c9ff52',.6);
    }
   }
   rect(0,ground,w,1,'#77e5ff',.45);
   for(let x=-12;x<w+12;x+=12){const gx=x-drift%12;rect(gx,ground+4,7,1,'#976cff',.4);rect(gx+3,ground+7,1,3,'#976cff',.18);}
   for(let i=0;i<36;i++){const bar=2+Math.abs(Math.sin(i*.65-t*2.3))*(6+light*8);rect(w*.53+i*3,ground-bar-2,1,bar,colors[i%4],.14+light*.3);}
   const left=run?(motion.matches?width*.28:width*.28+Math.sin(t*.37)*width*.15+p*width*.13):(width-character!.offsetWidth)/2;
   if(run)character!.style.setProperty('--run-x',`${Math.round(left)}px`);
   ctx!.globalAlpha=1;root.dataset.arcadeReady='true';root.dataset.arcadePosition=String(Math.round(left));
  }
  function frame(now:number){if(dead||!visible||document.hidden||still()){raf=0;last=0;return;}if(last)elapsed+=Math.min(now-last,100);last=now;if(now-lastPaint>41){draw();lastPaint=now;}raf=requestAnimationFrame(frame);}
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function start(){if(!raf&&visible&&!document.hidden&&!still()&&!dead)raf=requestAnimationFrame(frame);}
  function updateScroll(){if(!visible||still())return;const box=root.getBoundingClientRect();progress=Math.max(0,Math.min(.999,(innerHeight-box.top)/(innerHeight+box.height)));}
  function resize(){width=root.clientWidth;height=root.clientHeight;canvas!.width=Math.ceil(width/3);canvas!.height=Math.ceil(height/3);updateScroll();draw();}
  function changeMotion(){stop();updateScroll();draw();start();}
  function visibility(){document.hidden?stop():start();}
  function togglePause(){paused=!paused;pause!.setAttribute('aria-pressed',String(paused));pause!.setAttribute('aria-label',paused?'Riprendi lo sfondo animato':'Metti in pausa lo sfondo animato');pause!.querySelector('span')!.textContent=paused?'▷':'Ⅱ';root.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused}}));changeMotion();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(root);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){resize();start();}else stop();},{rootMargin:'60px'});observer.observe(root);
  pause?.addEventListener('click',togglePause);motion.addEventListener('change',changeMotion);document.addEventListener('visibilitychange',visibility);window.addEventListener('scroll',updateScroll,{passive:true});
  const dispose=()=>{dead=true;stop();observer.disconnect();resizeObserver.disconnect();pause?.removeEventListener('click',togglePause);motion.removeEventListener('change',changeMotion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('scroll',updateScroll);stops.delete(dispose);delete root.dataset.arcadeBound;};stops.add(dispose);
 });
}
initInterludes();document.addEventListener('astro:page-load',initInterludes);document.addEventListener('astro:before-swap',()=>{for(const stop of [...stops])stop();});
