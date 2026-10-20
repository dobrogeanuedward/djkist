/**
 * An imaginary Bologna on KIST's frequency. One piazza, six changes of light.
 * This module only paints: its owner controls motion, visibility and the audio widget.
 */
export type WorldFrame = {
 time: number;
 chapter: number;
 scroll: number;
 energy: number;
 musicPosition: number;
 pointerX: number;
 pointerY: number;
 reduced: boolean;
};

type RGB = readonly [number, number, number];
type Palette = {sky: RGB; horizon: RGB; brick: RGB; stone: RGB; light: RGB; second: RGB};
const palettes: readonly Palette[] = [
 {sky:[7,9,21],horizon:[30,21,47],brick:[61,35,54],stone:[15,18,34],light:[112,221,239],second:[153,113,230]},
 {sky:[8,10,25],horizon:[31,24,64],brick:[65,37,64],stone:[17,20,40],light:[165,233,181],second:[158,124,247]},
 {sky:[9,8,23],horizon:[49,22,55],brick:[87,39,61],stone:[22,17,37],light:[242,135,188],second:[120,221,241]},
 {sky:[6,13,26],horizon:[18,40,57],brick:[50,40,66],stone:[14,23,39],light:[104,226,226],second:[171,142,246]},
 {sky:[12,11,27],horizon:[42,29,62],brick:[75,44,66],stone:[23,23,43],light:[185,163,243],second:[126,214,228]},
 {sky:[19,14,34],horizon:[71,42,67],brick:[109,59,71],stone:[37,28,46],light:[210,247,145],second:[243,161,181]},
];
const starSeeds = [
 [.05,.09], [.13,.3], [.22,.12], [.31,.05], [.43,.21], [.57,.09], [.67,.15],
 [.79,.06], [.9,.19], [.97,.34], [.06,.43], [.16,.48], [.28,.35], [.73,.4],
 [.86,.44], [.95,.07], [.48,.04], [.6,.36],
] as const;
const roofSeeds = [
 [-.03,.12,.075], [.075,.08,.058], [.145,.115,.05], [.215,.064,.048], [.275,.09,.05],
 [.335,.055,.052], [.66,.064,.045], [.718,.09,.048], [.875,.11,.058], [.947,.074,.07],
] as const;
const clamp = (n:number,min=0,max=1) => Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
const smooth = (n:number) => {const x=clamp(n);return x*x*(3-2*x);};
const lerp = (a:number,b:number,t:number) => a+(b-a)*t;
const rgb = (a:RGB,b:RGB,t:number):RGB => [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const ink = (color:RGB,alpha=1) => `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${clamp(alpha)})`;

/** chapter is continuous from 0 to 5; dimensions are canvas backing-store pixels. */
export function renderWorld(ctx:CanvasRenderingContext2D,width:number,height:number,state:WorldFrame):void {
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)return;
 const w=width,h=height,chapter=clamp(state.chapter,0,5),index=Math.min(4,Math.floor(chapter));
 const mix=smooth(chapter-index),a=palettes[index],b=palettes[index+1];
 const p:Palette={sky:rgb(a.sky,b.sky,mix),horizon:rgb(a.horizon,b.horizon,mix),brick:rgb(a.brick,b.brick,mix),stone:rgb(a.stone,b.stone,mix),light:rgb(a.light,b.light,mix),second:rgb(a.second,b.second,mix)};
 const t=state.reduced?0:Math.max(0,state.time||0),energy=clamp(state.energy),scroll=clamp(state.scroll);
 const px=state.reduced?0:clamp(state.pointerX,-.5,.5),py=state.reduced?0:clamp(state.pointerY,-.5,.5);
 const music=state.reduced?0:Math.max(0,state.musicPosition||0)/1000;
 const horizon=h*.728,depth=Math.min(w,h),line=Math.max(.6,w/1100);
 const cameraX=px*depth*.012+Math.sin(scroll*Math.PI)*depth*.018;
 const cameraY=py*depth*.007;
 const weights=palettes.map((_,i)=>Math.max(0,1-Math.abs(chapter-i)));
 const intensity=state.reduced?.35:.5+.5*Math.sin(music*.32+t*.12);
 const light=.36+energy*(.3+intensity*.12);

 ctx.save();
 ctx.setTransform(1,0,0,1,0,0);
 ctx.globalCompositeOperation='source-over';
 ctx.globalAlpha=1;ctx.lineWidth=line;ctx.lineCap='butt';ctx.lineJoin='miter';
 const sky=ctx.createLinearGradient(0,0,0,h);
 sky.addColorStop(0,ink(p.sky));sky.addColorStop(.64,ink(rgb(p.sky,p.horizon,.45)));sky.addColorStop(1,ink(p.horizon));
 ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

 // The light behind the towers changes; the place never cuts to another background.
 const glow=ctx.createRadialGradient(w*.83,h*.64,0,w*.83,h*.64,depth*.72);
 glow.addColorStop(0,ink(p.second,.15+energy*.045));glow.addColorStop(1,ink(p.second,0));
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 const dawn=weights[5];
 if(dawn>.001){
  const warm=ctx.createLinearGradient(0,h*.4,0,h*.85);
  warm.addColorStop(0,'rgba(246,145,147,0)');warm.addColorStop(.74,`rgba(246,145,147,${dawn*.075})`);warm.addColorStop(1,'rgba(246,145,147,0)');
  ctx.fillStyle=warm;ctx.fillRect(0,h*.4,w,h*.45);
 }

 // A few fixed stars, at different depths. No full-screen particle confetti.
 for(let i=0;i<starSeeds.length;i++){
  const [x,y]=starSeeds[i],size=i%7===0?Math.max(1,w/800):Math.max(.75,w/1400);
  const twinkle=state.reduced?1:.85+.15*Math.sin(t*.45+i*2.1);
  ctx.fillStyle=ink(i%3===0?p.light:p.second,(.18+(i%4)*.035)*(1-dawn*.45)*twinkle);
  ctx.fillRect(Math.round(x*w-cameraX*.12),Math.round(y*h-cameraY*.1),size,size);
 }

 // The disc is both a moon and the label of an enormous distant record.
 const moonX=w*.83-cameraX*.18,moonY=h*lerp(.23,.48,smooth(chapter/5))-cameraY*.2;
 const moonRadius=depth*lerp(.085,.13,weights[1]+weights[5]*.6);
 ctx.fillStyle=ink(p.second,.055+dawn*.04);ctx.beginPath();ctx.arc(moonX,moonY,moonRadius,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=ink(p.light,.13+energy*.055);ctx.lineWidth=line;
 ctx.beginPath();ctx.arc(moonX,moonY,moonRadius,Math.PI*1.12,Math.PI*2.8);ctx.stroke();
 ctx.strokeStyle=ink(p.second,.13);
 ctx.beginPath();ctx.ellipse(moonX,moonY,moonRadius*1.22,moonRadius*.23,-.34,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle=ink(p.sky,.8);ctx.beginPath();ctx.arc(moonX+moonRadius*.2,moonY-moonRadius*.08,moonRadius*.73,0,Math.PI*2);ctx.fill();
 for(let i=0;i<5;i++){
  const y=moonY+moonRadius*(.35+i*.11),span=Math.sqrt(Math.max(0,moonRadius*moonRadius-(y-moonY)**2));
  ctx.fillStyle=ink(p.second,.16);ctx.fillRect(Math.round(moonX-span),Math.round(y),span*2,Math.max(1,line));
 }

 // Colli and a tiny San Luca silhouette: a memory of Bologna, not an exact map.
 ctx.fillStyle=ink(rgb(p.sky,p.horizon,.56));
 ctx.beginPath();ctx.moveTo(0,horizon-h*.04);
 ctx.bezierCurveTo(w*.09,horizon-h*.09,w*.15,horizon-h*.145,w*.25,horizon-h*.055);
 ctx.bezierCurveTo(w*.36,horizon-h*.01,w*.46,horizon-h*.07,w*.57,horizon-h*.025);
 ctx.bezierCurveTo(w*.72,horizon-h*.1,w*.82,horizon-h*.055,w,horizon-h*.1);
 ctx.lineTo(w,horizon+h*.03);ctx.lineTo(0,horizon+h*.03);ctx.closePath();ctx.fill();
 const sanctuaryX=w*.15-cameraX*.2,sanctuaryY=horizon-h*.095,sanctuaryW=Math.max(10,w*.026);
 ctx.fillStyle=ink(rgb(p.brick,p.sky,.4));
 ctx.fillRect(sanctuaryX-sanctuaryW*.75,sanctuaryY,sanctuaryW*1.5,h*.014);
 ctx.beginPath();ctx.arc(sanctuaryX,sanctuaryY,sanctuaryW*.34,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillRect(sanctuaryX-sanctuaryW*.08,sanctuaryY-sanctuaryW*.43,sanctuaryW*.16,sanctuaryW*.22);

 // Terracotta roofline. Modules keep their identity as light and depth change.
 const cityBase=horizon+h*.022;
 for(let i=0;i<roofSeeds.length;i++){
  const [nx,nh,nw]=roofSeeds[i],x=nx*w-cameraX*.36,bw=nw*w;
  const bh=h*(nh+.018*(weights[2]-weights[4])),y=cityBase-bh;
  ctx.fillStyle=ink(rgb(p.brick,p.sky,.43));
  ctx.beginPath();ctx.moveTo(x,y+h*.008);ctx.lineTo(x+bw*.48,y-h*.014);ctx.lineTo(x+bw,y+h*.008);
  ctx.lineTo(x+bw,cityBase);ctx.lineTo(x,cityBase);ctx.closePath();ctx.fill();
  ctx.strokeStyle=ink(p.brick,.55);ctx.beginPath();ctx.moveTo(x,y+h*.008);ctx.lineTo(x+bw*.48,y-h*.014);ctx.lineTo(x+bw,y+h*.008);ctx.stroke();
  if(i%2===0){
   ctx.fillStyle=ink(p.light,.1+energy*.15);
   ctx.fillRect(Math.round(x+bw*.24),Math.round(y+bh*.39),Math.max(1,bw*.065),Math.max(2,bh*.13));
   ctx.fillRect(Math.round(x+bw*.68),Math.round(y+bh*.6),Math.max(1,bw*.065),Math.max(2,bh*.12));
  }
 }

 // Due Torri: asymmetric height, the smaller tower visibly but gently inclined.
 function tower(x:number,bottom:number,bw:number,bh:number,lean:number){
  const top=bottom-bh,shift=lean*bh;
  ctx.fillStyle=ink(rgb(p.brick,p.sky,.16));
  ctx.beginPath();ctx.moveTo(x,bottom);ctx.lineTo(x+shift,top);ctx.lineTo(x+bw+shift,top);ctx.lineTo(x+bw,bottom);ctx.closePath();ctx.fill();
  ctx.fillStyle=ink(rgb(p.brick,p.second,.16),.72);ctx.beginPath();ctx.moveTo(x+bw*.72,bottom);ctx.lineTo(x+bw*.72+shift,top);ctx.lineTo(x+bw+shift,top);ctx.lineTo(x+bw,bottom);ctx.closePath();ctx.fill();
  ctx.strokeStyle=ink(p.second,.4);ctx.beginPath();ctx.moveTo(x+shift-1,top);ctx.lineTo(x+bw+shift+1,top);ctx.stroke();
  ctx.fillStyle=ink(p.sky,.9);
  for(let i=1;i<4;i++)ctx.fillRect(Math.round(x+bw*.34+shift*(1-i/5)),Math.round(top+bh*i*.2),Math.max(1,bw*.23),Math.max(2,bh*.035));
  ctx.strokeStyle=ink(p.light,.12+energy*.19);ctx.beginPath();ctx.moveTo(x+bw*.73,bottom);ctx.lineTo(x+bw*.73+shift,top+bh*.12);ctx.stroke();
 }
 const towerW=Math.max(7,Math.min(w*.021,depth*.04));
 tower(w*.785-cameraX*.42,cityBase,towerW,h*.265,-.006);
 tower(w*.755-cameraX*.42,cityBase,towerW*1.08,h*.148,.064);

 // One piazza continues under every chapter. Perspective is calm and consistent.
 const floor=ctx.createLinearGradient(0,horizon,0,h);
 floor.addColorStop(0,ink(p.stone,.82));floor.addColorStop(1,ink(rgb(p.stone,p.sky,.55)));
 ctx.fillStyle=floor;ctx.fillRect(0,horizon+h*.018,w,h);
 const vanishX=w*.52+cameraX*.25,vanishY=horizon+h*.018;
 ctx.strokeStyle=ink(p.second,.065+energy*.035);ctx.lineWidth=line;
 for(let i=-5;i<=5;i++){
  ctx.beginPath();ctx.moveTo(vanishX+i*w*.016,vanishY);ctx.lineTo(vanishX+i*w*.19,h);ctx.stroke();
 }
 for(let i=1;i<6;i++){
  const distance=(i/6)**2,y=vanishY+(h-vanishY)*distance;
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
 }
 // The route has three parallel traces: the three frequencies collected in the game.
 const routeLight=weights[3]*.55+weights[1]*.22+weights[5]*.28;
 if(routeLight>.005){
  for(let lane=0;lane<3;lane++){
   const ox=(lane-1)*depth*.012;
   ctx.strokeStyle=ink(lane===1?p.light:p.second,routeLight*(.22+energy*.13));
   ctx.beginPath();ctx.moveTo(w*.08+ox,h*.97);ctx.lineTo(w*.3+ox,h*.84);ctx.lineTo(w*.68+ox,h*.84);ctx.lineTo(w*.86+ox,h*.76);ctx.stroke();
  }
  for(const [x,y] of [[.14,.935],[.41,.84],[.77,.8]]){
   const radius=Math.max(2,depth*.005);
   ctx.fillStyle=ink(p.light,routeLight*.55);ctx.beginPath();ctx.ellipse(x*w,y*h,radius*1.7,radius*.6,0,0,Math.PI*2);ctx.fill();
  }
 }

 // Portici frame the content rather than sitting behind its main reading column.
 function portico(right:boolean){
  const sign=right?-1:1,start=right?w:0,scale=right?.81:1;
  const x=(fraction:number)=>start+sign*fraction*w-cameraX*(right?.7:1);
  const topNear=h*.55+cameraY,topFar=h*.685+cameraY*.3,baseNear=h*.91,baseFar=h*.78;
  ctx.fillStyle=ink(rgb(p.brick,p.sky,.32),.98);
  ctx.beginPath();ctx.moveTo(x(-.03),topNear);ctx.lineTo(x(.265*scale),topFar);ctx.lineTo(x(.265*scale),baseFar);ctx.lineTo(x(-.03),baseNear);ctx.closePath();ctx.fill();
  ctx.strokeStyle=ink(p.brick,.85);ctx.lineWidth=Math.max(1,line*1.4);
  ctx.beginPath();ctx.moveTo(x(-.03),topNear);ctx.lineTo(x(.265*scale),topFar);ctx.stroke();
  ctx.strokeStyle=ink(p.light,.11+light*.18);ctx.lineWidth=line;
  ctx.beginPath();ctx.moveTo(x(-.03),topNear+h*.013);ctx.lineTo(x(.265*scale),topFar+h*.009);ctx.stroke();
  for(let i=0;i<4;i++){
   const f=i/4,n=(i+1)/4;
   const left=lerp(.007,.245*scale,f),rightEdge=lerp(.007,.245*scale,n)-.007;
   const y=lerp(topNear+h*.045,topFar+h*.024,f),bottom=lerp(baseNear-h*.015,baseFar-h*.008,f);
   const cx=(x(left)+x(rightEdge))/2,archWidth=Math.abs(x(rightEdge)-x(left)),rise=archWidth*.52;
   ctx.fillStyle=ink(p.sky,.97);
   ctx.beginPath();ctx.moveTo(cx-archWidth*.5,bottom);ctx.lineTo(cx-archWidth*.5,y+rise);
   ctx.bezierCurveTo(cx-archWidth*.5,y+rise*.18,cx+archWidth*.5,y+rise*.18,cx+archWidth*.5,y+rise);
   ctx.lineTo(cx+archWidth*.5,bottom);ctx.closePath();ctx.fill();
   ctx.strokeStyle=ink(i%2===0?p.second:p.light,.13+energy*.17);ctx.lineWidth=line;
   ctx.beginPath();ctx.moveTo(cx-archWidth*.5,bottom);ctx.lineTo(cx-archWidth*.5,y+rise);
   ctx.bezierCurveTo(cx-archWidth*.5,y+rise*.18,cx+archWidth*.5,y+rise*.18,cx+archWidth*.5,y+rise);
   ctx.lineTo(cx+archWidth*.5,bottom);ctx.stroke();
  }
 }
 portico(false);portico(true);

 // A record portal becomes a sound garden, a venue entrance, then a dawn console.
 const portalWeight=.3+weights[0]*.38+weights[1]*.35+weights[2]*.25+weights[5]*.28;
 const portalX=w*.88-cameraX*.85,portalY=h*.69,portalR=depth*(.055+weights[1]*.023+weights[5]*.012);
 for(let ring=0;ring<3;ring++){
  const radius=portalR*(1-ring*.21);
  ctx.strokeStyle=ink(ring===1?p.light:p.second,portalWeight*(.18+energy*.13));ctx.lineWidth=ring===0?line*1.6:line;
  ctx.beginPath();ctx.ellipse(portalX,portalY,radius*.58,radius,-.04,0,Math.PI*2);ctx.stroke();
 }
 ctx.fillStyle=ink(p.light,.14+energy*.15);ctx.beginPath();ctx.ellipse(portalX,portalY+portalR*1.1,portalR*.95,portalR*.12,0,0,Math.PI*2);ctx.fill();
 if(weights[1]>.01){
  const garden=weights[1];
  for(let i=0;i<3;i++){
   const cx=w*(.09+i*.046)-cameraX*.7,cy=h*(.72-i*.013),r=depth*(.014+i*.003);
   ctx.strokeStyle=ink(i===1?p.light:p.second,garden*(.3+energy*.16));
   ctx.beginPath();ctx.moveTo(cx,cy-r*2);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r*.6);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.stroke();
   ctx.beginPath();ctx.moveTo(cx,cy-r*2);ctx.lineTo(cx,cy+r*.6);ctx.stroke();
  }
 }
 // The last chapter's console shares the portal's footprint: a real destination.
 if(weights[5]>.01){
  const c=weights[5],cw=depth*.1,ch=depth*.024,x=portalX-cw*.5,y=portalY+portalR*.63;
  ctx.fillStyle=ink(p.stone,c);ctx.fillRect(x,y,cw,ch);
  ctx.strokeStyle=ink(p.light,c*(.35+energy*.22));ctx.strokeRect(x,y,cw,ch);
  ctx.beginPath();ctx.ellipse(x+cw*.23,y+ch*.4,ch*.27,ch*.2,0,0,Math.PI*2);ctx.ellipse(x+cw*.77,y+ch*.4,ch*.27,ch*.2,0,0,Math.PI*2);ctx.stroke();
 }

 // Reflections stay low; content remains the brightest, sharpest layer.
 const reflection=ctx.createLinearGradient(0,h*.84,0,h);
 reflection.addColorStop(0,ink(p.light,0));reflection.addColorStop(.7,ink(p.light,.015+energy*.018));reflection.addColorStop(1,ink(p.light,0));
 ctx.fillStyle=reflection;ctx.beginPath();ctx.moveTo(portalX-w*.025,h*.84);ctx.lineTo(portalX+w*.025,h*.84);ctx.lineTo(portalX+w*.095,h);ctx.lineTo(portalX-w*.095,h);ctx.closePath();ctx.fill();
 const quiet=ctx.createRadialGradient(w*.5,h*.39,depth*.05,w*.5,h*.42,Math.max(w*.52,h*.57));
 quiet.addColorStop(0,ink(p.sky,.77));quiet.addColorStop(.5,ink(p.sky,.42));quiet.addColorStop(1,ink(p.sky,0));
 ctx.fillStyle=quiet;ctx.fillRect(0,0,w,h);
 const floorShade=ctx.createLinearGradient(0,h*.91,0,h);
 floorShade.addColorStop(0,ink(p.sky,0));floorShade.addColorStop(1,ink(p.sky,.55));
 ctx.fillStyle=floorShade;ctx.fillRect(0,h*.91,w,h*.09);
 ctx.restore();
}
