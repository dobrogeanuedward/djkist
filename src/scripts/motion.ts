const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections=document.querySelectorAll<HTMLElement>('.sound-section,.real-sessions,.about,.contact');
let audioEnergy=0;
window.addEventListener('kist:pulse',e=>{audioEnergy=.25+(e as CustomEvent<{pulse:number}>).detail.pulse});
window.addEventListener('kist:audio',e=>{audioEnergy=(e as CustomEvent<{playing:boolean}>).detail.playing?1:0});
sections.forEach((section,index)=>{
 const canvas=document.createElement('canvas');canvas.className='procedural-field';canvas.setAttribute('aria-hidden','true');section.prepend(canvas);
 const ctx=canvas.getContext('2d');if(!ctx)return;
 let visible=false,raf=0,last=0,w=1,h=1,energy=0;
 const colors=['151,108,255','119,229,255','255,135,199','45,75,10'];
 function resize(){const box=section.getBoundingClientRect();w=Math.max(1,Math.round(box.width));h=Math.max(1,Math.round(box.height));canvas.width=w;canvas.height=h;draw(performance.now())}
 function draw(now:number){if(now-last<50&&!reduce)return;last=now;energy+=(audioEnergy-energy)*.06;ctx!.clearRect(0,0,w,h);const t=reduce?0:now/2200;
  for(let line=0;line<22;line++){ctx!.beginPath();for(let x=0;x<=w;x+=18){const y=h*.52+Math.sin(x/w*6+t+line*.16+index)*h*.14+Math.cos(x/w*11-t*.7+line*.22)*h*(.025+energy*.025)+line*5;if(x===0)ctx!.moveTo(x,y);else ctx!.lineTo(x,y)}ctx!.strokeStyle='rgba('+colors[index]+','+(.025+line/650)+')';ctx!.lineWidth=1;ctx!.stroke()}
 }
 function loop(now:number){raf=0;if(!visible||document.hidden)return;draw(now);if(!reduce)raf=requestAnimationFrame(loop)}
 function resume(){if(visible&&!document.hidden&&!raf)raf=requestAnimationFrame(loop)}
 new ResizeObserver(resize).observe(section);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else{cancelAnimationFrame(raf);raf=0}}).observe(section);document.addEventListener('visibilitychange',resume);
});
const motionTargets=document.querySelectorAll<HTMLElement>('.frequency-sculpture,.session-stage,.event-viewer,.about-photo,.contact-orbits');
new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('motion-visible',e.isIntersecting)),{rootMargin:'80px'}).observe(document.querySelector('.hero')!);
const watcher=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('motion-visible',e.isIntersecting)),{rootMargin:'80px'});motionTargets.forEach(el=>watcher.observe(el));
export {};
