/** Optional Frequency Quest. The game never owns or pauses the SoundCloud transport. */
type Platform = {x:number;y:number;w:number;ground?:boolean};
type Signal = {x:number;y:number;label:string;found:boolean};
type GameState = 'ready'|'running'|'paused'|'won';

const disposers = new Set<() => void>();

function initFrequencyQuest() {
 const dialog = document.querySelector<HTMLDialogElement>('#kist-game');
 if (!dialog || dialog.dataset.gameBound) return;
 const canvas = dialog.querySelector<HTMLCanvasElement>('#kist-game-canvas');
 const ctx = canvas?.getContext('2d');
 if (!canvas || !ctx) return;
 dialog.dataset.gameBound = 'true';
 const startPanel = dialog.querySelector<HTMLElement>('[data-game-start]')!;
 const finishPanel = dialog.querySelector<HTMLElement>('[data-game-finish]')!;
 const message = dialog.querySelector<HTMLElement>('#game-message')!;
 const score = dialog.querySelector<HTMLElement>('#game-score')!;
 const pauseButton = dialog.querySelector<HTMLButtonElement>('[data-game-pause]')!;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const bindings: Array<() => void> = [];
 function listen(target:EventTarget,type:string,handler:EventListener,options?:AddEventListenerOptions) {
  target.addEventListener(type,handler,options);
  bindings.push(() => target.removeEventListener(type,handler,options));
 }

 const H=440, LENGTH=3900, GROUND=350;
 const platforms:Platform[] = [
  {x:0,y:GROUND,w:1000,ground:true},{x:1090,y:GROUND,w:1300,ground:true},{x:2480,y:GROUND,w:1420,ground:true},
  {x:390,y:295,w:180},{x:620,y:250,w:210},
  {x:1510,y:295,w:180},{x:1760,y:245,w:180},{x:1980,y:285,w:170},
  {x:2840,y:295,w:180},{x:3070,y:250,w:210},
 ];
 const signals:Signal[] = [
  {x:725,y:220,label:'Portici',found:false},
  {x:1850,y:215,label:'Torri',found:false},
  {x:3180,y:220,label:'Piazza',found:false},
 ];
 const player={x:75,y:GROUND-61,vx:0,vy:0,w:29,h:61,grounded:true,facing:1};
 const keys = new Set<string>();
 const touch = {left:false,right:false};
 const keyboardDirections = new Set<'left'|'right'>();
 let directionPulse: {side:'left'|'right';until:number}|undefined;
 const sprite = new Image(), poster = new Image();
 let spriteReady=false, posterReady=false;
 let W=900,dpr=1,camera=0,state:GameState='ready',started=false,raf=0,last=0,time=0;
 let coyote=.12,jumpBuffer=0,checkpoint=75,zone=-1,opener:HTMLElement|undefined,disposed=false;
 const colors=['#77e5ff','#976cff','#c9ff52'];
 const zoneNames=['SOTTO I PORTICI','TRA LE DUE TORRI','PIAZZA IN FREQUENZA'];
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 const count=()=>signals.filter(s=>s.found).length;

 function updateState(next:GameState) {
  state=next;dialog!.dataset.gameState=next;
  pauseButton.disabled=next==='ready'||next==='won';
  pauseButton.textContent=next==='paused'?'Riprendi':'Pausa';
  pauseButton.setAttribute('aria-pressed',String(next==='paused'));
  pauseButton.setAttribute('aria-label',next==='paused'?'Riprendi il gioco':'Metti in pausa il gioco');
  canvas!.dataset.collected=String(count());
  canvas!.dataset.playerX=String(Math.round(player.x));
 }
 function announce(text:string) {message.textContent=text;}
 function stop() {cancelAnimationFrame(raf);raf=0;last=0;keys.clear();touch.left=false;touch.right=false;keyboardDirections.clear();directionPulse=undefined;dialog!.querySelectorAll<HTMLElement>('[data-held]').forEach(button=>delete button.dataset.held);}
 function pause() {
  if(state!=='running')return;
  updateState('paused');stop();announce('In pausa. Riprendi quando vuoi.');draw();
 }
 function resume() {
  if(!dialog!.open||document.hidden||state==='won'||!started)return;
  updateState('running');announce(`${count()} frequenze su 3. Muoviti, salta e segui i segnali luminosi.`);
  canvas!.focus({preventScroll:true});last=0;if(!raf)raf=requestAnimationFrame(frame);
 }
 function reset() {
  stop();signals.forEach(s=>s.found=false);player.x=75;player.y=GROUND-player.h;
  player.vx=0;player.vy=0;player.grounded=true;player.facing=1;
  checkpoint=75;camera=0;time=0;coyote=.12;jumpBuffer=0;zone=-1;started=true;
  startPanel.hidden=true;finishPanel.hidden=true;score.textContent='0 / 3';
  announce('Prima frequenza: segui la luce azzurra, salta sulle piattaforme.');
  updateState('running');canvas!.focus({preventScroll:true});resize();raf=requestAnimationFrame(frame);
 }
 function requestJump() {if(state==='paused'){resume();return;}if(state==='running')jumpBuffer=.14;}
 function respawn() {
  player.x=checkpoint;player.y=GROUND-player.h;player.vx=0;player.vy=0;player.grounded=true;
  coyote=.12;jumpBuffer=0;
  announce('Di nuovo in pista. Le frequenze raccolte sono al sicuro.');
 }
 function win() {
  updateState('won');stop();finishPanel.hidden=false;
  announce('Console accesa. Tutte e tre le frequenze sono tue.');
  dialog!.querySelector<HTMLButtonElement>('[data-game-listen]')?.focus({preventScroll:true});
  draw();
 }
 function move(dt:number) {
  const pulse=directionPulse&&time<directionPulse.until?directionPulse.side:undefined;
  const direction=Number(keys.has('ArrowRight')||keys.has('KeyD')||touch.right||keyboardDirections.has('right')||pulse==='right')-Number(keys.has('ArrowLeft')||keys.has('KeyA')||touch.left||keyboardDirections.has('left')||pulse==='left');
  const desired=direction*310;
  const change=(direction?1800:2200)*dt;
  player.vx+=clamp(desired-player.vx,-change,change);
  if(direction)player.facing=direction;
  jumpBuffer=Math.max(0,jumpBuffer-dt);
  coyote=player.grounded?.12:Math.max(0,coyote-dt);
  if(jumpBuffer>0&&coyote>0){player.vy=-610;player.grounded=false;coyote=0;jumpBuffer=0;}
  const oldFeet=player.y+player.h;
  player.x=clamp(player.x+player.vx*dt,8,LENGTH-player.w-10);
  player.vy=Math.min(840,player.vy+1550*dt);player.y+=player.vy*dt;player.grounded=false;
  // One-way platforms let the character rise through and land reliably from above.
  if(player.vy>=0)for(const platform of platforms){
   if(player.x+player.w>platform.x+2&&player.x<platform.x+platform.w-2&&oldFeet<=platform.y+1&&player.y+player.h>=platform.y){
    player.y=platform.y-player.h;player.vy=0;player.grounded=true;break;
   }
  }
  if(player.y>H+100){respawn();return;}
  const z=Math.min(2,Math.floor(player.x/1300));
  if(z!==zone){zone=z;dialog!.dataset.gameZone=String(z);if(z>0)announce(`${zoneNames[z].replaceAll('_',' ')}. La prossima frequenza ti aspetta.`);}
   // Checkpoints sit on safe ground, never over a gap or an elevated platform.
  if(player.x>1150)checkpoint=Math.max(checkpoint,1150);
  if(player.x>2550)checkpoint=Math.max(checkpoint,2550);
  for(const signal of signals){
   if(signal.found)continue;
   const nx=clamp(signal.x,player.x,player.x+player.w),ny=clamp(signal.y,player.y,player.y+player.h);
   if(Math.hypot(nx-signal.x,ny-signal.y)<25){
    signal.found=true;score.textContent=`${count()} / 3`;canvas!.dataset.collected=String(count());
    announce(count()===3?'Tre frequenze raccolte. Raggiungi la console, più avanti.':`${signal.label}: frequenza raccolta. ${count()} su 3.`);
   }
  }
  if(player.x>3650&&player.grounded){
   if(count()===3){win();return;}
   if(message.textContent!=='La console aspetta tre frequenze. Puoi tornare indietro e cercare le luci rimaste.')announce('La console aspetta tre frequenze. Puoi tornare indietro e cercare le luci rimaste.');
  }
  // Direct camera movement under reduced motion avoids easing and decorative lag.
  const target=clamp(player.x-W*.31,0,Math.max(0,LENGTH-W));
  camera=reduced.matches?target:camera+(target-camera)*(1-Math.exp(-dt*7));
  canvas!.dataset.playerX=String(Math.round(player.x));
 }
 function rounded(x:number,y:number,w:number,h:number,r:number){ctx!.beginPath();ctx!.roundRect(x,y,w,h,r);}
 function line(x1:number,y1:number,x2:number,y2:number,color:string,width=1,alpha=1){ctx!.globalAlpha=alpha;ctx!.strokeStyle=color;ctx!.lineWidth=width;ctx!.beginPath();ctx!.moveTo(x1,y1);ctx!.lineTo(x2,y2);ctx!.stroke();ctx!.globalAlpha=1;}
 function draw() {
  canvas!.dataset.playerX=String(Math.round(player.x));
  canvas!.dataset.playerY=String(Math.round(player.y));
  canvas!.dataset.grounded=String(player.grounded);
  canvas!.dataset.checkpoint=String(checkpoint);
  canvas!.dataset.collected=String(count());
  ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.clearRect(0,0,W,H);
  const zoneProgress=clamp((camera+W*.4)/1300,0,2),current=Math.min(2,Math.floor(zoneProgress));
  const bg=ctx!.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#080b1d');bg.addColorStop(.7,current===1?'#17132c':'#10152b');bg.addColorStop(1,'#090c19');ctx!.fillStyle=bg;ctx!.fillRect(0,0,W,H);
  const parallax=reduced.matches?0:camera*.14;
  for(let i=0;i<65;i++){const x=((i*137.13-parallax)%(W+20)+W+20)%(W+20),y=(i*41.71)%255;ctx!.fillStyle=i%3?'#b4b2db55':'#c9ff5280';ctx!.fillRect(x,y,i%8?1:2,1);}
  const moonX=W*.74-(reduced.matches?0:camera*.025),moonY=96;
  const halo=ctx!.createRadialGradient(moonX,moonY,3,moonX,moonY,115);halo.addColorStop(0,'#976cff27');halo.addColorStop(1,'#976cff00');ctx!.fillStyle=halo;ctx!.fillRect(moonX-115,moonY-115,230,230);
  for(let row=-36;row<=36;row+=4){const span=Math.sqrt(Math.max(0,36*36-row*row));line(moonX-span,moonY+row,moonX+span,moonY+row,'#ab8de7',1,.26);}
  // Bologna's terracotta roof rhythm ties the districts together without scene cuts.
  for(let i=-1;i<W/30+2;i++){
   const x=i*30-((reduced.matches?0:camera*.25)%30),tower=22+((i+120)*43%85);
   ctx!.fillStyle='#1b1d39';ctx!.fillRect(x,GROUND-tower-18,23,tower+18);
   ctx!.fillStyle='#51324266';ctx!.beginPath();ctx!.moveTo(x-3,GROUND-tower-18);ctx!.lineTo(x+12,GROUND-tower-29);ctx!.lineTo(x+26,GROUND-tower-18);ctx!.closePath();ctx!.fill();
   line(x,GROUND-tower-18,x+23,GROUND-tower-18,'#605780',1,.45);
   for(let j=0;j<tower/15;j++)line(x+6,GROUND-28-j*15,x+10,GROUND-28-j*15,colors[(i+120)%3],1,.25);
  }
  // An imagined, original Bologna: arcades, leaning towers and a luminous public square.
  for(let section=0;section<3;section++){
   const base=section*1300-camera;
   if(base>W+200||base+1300<-200)continue;
   if(section===0){
    for(let i=0;i<12;i++){
     const x=base+100+i*100,archY=GROUND-65;
     ctx!.fillStyle='#3b294b88';ctx!.fillRect(x-8,archY-95,100,42);
     ctx!.fillStyle='#211e37';ctx!.fillRect(x-8,archY-53,9,118);ctx!.fillRect(x+83,archY-53,9,118);
     ctx!.strokeStyle='#7853758c';ctx!.lineWidth=7;ctx!.beginPath();ctx!.moveTo(x-3,GROUND);ctx!.lineTo(x-3,archY);ctx!.arc(x+42,archY,45,Math.PI,0);ctx!.lineTo(x+87,GROUND);ctx!.stroke();
     ctx!.strokeStyle='#77e5ff39';ctx!.lineWidth=1;ctx!.beginPath();ctx!.arc(x+42,archY,40,Math.PI,0);ctx!.stroke();
     line(x-8,archY-94,x+92,archY-94,'#b07b8590',1,.7);
     for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      ctx!.fillStyle=(i+col)%3?'#17182c':'#b4a1b12b';ctx!.fillRect(x+8+col*27,archY-83+row*17,10,12);
     }
     // Light pools lead to the first floating frequency, without obscuring platforms.
     const pool=ctx!.createRadialGradient(x+42,GROUND,0,x+42,GROUND,57);pool.addColorStop(0,'#77e5ff0e');pool.addColorStop(1,'#77e5ff00');ctx!.fillStyle=pool;ctx!.fillRect(x-15,GROUND-57,114,90);
    }
   }else if(section===1){
    // Asymmetric silhouettes recall Asinelli and Garisenda, interpreted as signal towers.
    for(const [offset,towerHeight,towerWidth,lean] of [[330,249,47,-.035],[445,169,53,.085]]){
     const x=base+offset;
     ctx!.save();ctx!.translate(x,GROUND);ctx!.transform(1,0,lean,1,0,0);
     const bricks=ctx!.createLinearGradient(0,0,towerWidth,0);bricks.addColorStop(0,'#69424d');bricks.addColorStop(.7,'#3d2d45');bricks.addColorStop(1,'#251f35');ctx!.fillStyle=bricks;ctx!.fillRect(-towerWidth/2,-towerHeight,towerWidth,towerHeight);
     for(let row=0;row<towerHeight/13;row++)line(-towerWidth/2,-row*13,towerWidth/2,-row*13,'#a7757938',1,.55);
     ctx!.fillStyle='#15182c';ctx!.fillRect(-8,-towerHeight+23,16,25);ctx!.fillStyle='#77e5ff32';ctx!.fillRect(-5,-towerHeight+25,2,20);
     for(let merlon=-2;merlon<=2;merlon++){ctx!.fillStyle='#79515d';ctx!.fillRect(merlon*10-3,-towerHeight-7,6,10);}
     line(-towerWidth/2,-towerHeight,towerWidth/2,-towerHeight,'#976cff',1,.7);ctx!.restore();
    }
    // Suspended sequencer lanterns make the second district feel musical.
    for(let i=0;i<8;i++){const x=base+100+i*145,y=112+(i*29)%60;line(x,y-22,x,y-7,'#976cff',1,.22);ctx!.fillStyle=colors[i%3]+'35';rounded(x-5,y-7,10,14,3);ctx!.fill();}
   }else{
    // The arcade opens into a square. Brick facades become a stage for the console.
    for(let i=0;i<6;i++){
     const x=base+70+i*205,buildingHeight=123+(i%3)*24;
     ctx!.fillStyle=i%2?'#392b43':'#443040';ctx!.fillRect(x,GROUND-buildingHeight,190,buildingHeight);
     ctx!.fillStyle='#6b414c';ctx!.beginPath();ctx!.moveTo(x-5,GROUND-buildingHeight);ctx!.lineTo(x+95,GROUND-buildingHeight-27);ctx!.lineTo(x+195,GROUND-buildingHeight);ctx!.closePath();ctx!.fill();
     line(x,GROUND-buildingHeight+8,x+190,GROUND-buildingHeight+8,'#ad7e86',1,.3);
     for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      ctx!.fillStyle=(row+col+i)%4?'#15182b':'#a291b540';ctx!.fillRect(x+17+col*27,GROUND-buildingHeight+24+row*27,10,17);
      line(x+15+col*27,GROUND-buildingHeight+42+row*27,x+29+col*27,GROUND-buildingHeight+42+row*27,'#7c5e77',1,.4);
     }
    }
    const fountainX=base+730;ctx!.strokeStyle='#77e5ff24';ctx!.lineWidth=2;ctx!.beginPath();ctx!.ellipse(fountainX,GROUND-8,60,11,0,0,Math.PI*2);ctx!.stroke();
    for(let jet=-2;jet<=2;jet++){ctx!.beginPath();ctx!.moveTo(fountainX,GROUND-8);ctx!.quadraticCurveTo(fountainX+jet*13,GROUND-91+Math.abs(jet)*12,fountainX+jet*24,GROUND-10);ctx!.stroke();}
   }
  }
  ctx!.font='10px "Space Grotesk",sans-serif';ctx!.letterSpacing='2px';ctx!.fillStyle='#b5aec8';ctx!.fillText(zoneNames[Math.min(2,Math.floor((player.x+20)/1300))],24,32);ctx!.letterSpacing='0px';
  for(const platform of platforms){
   const x=platform.x-camera;if(x+platform.w<0||x>W)continue;
   const fill=ctx!.createLinearGradient(0,platform.y,0,platform.y+(platform.ground?90:22));fill.addColorStop(0,'#222542');fill.addColorStop(1,'#111427');ctx!.fillStyle=fill;ctx!.fillRect(x,platform.y,platform.w,platform.ground?100:18);
   line(x,platform.y,x+platform.w,platform.y,colors[Math.min(2,Math.floor(platform.x/1300))],2,.8);
   for(let grid=x+8;grid<x+platform.w;grid+=22)line(grid,platform.y+9,grid+9,platform.y+9,'#976cff',1,.24);
  }
  for(const signal of signals){
   const x=signal.x-camera;if(x<-45||x>W+45)continue;
   const bob=signal.found?0:(reduced.matches?0:Math.sin(time*2.3+signal.x)*3);
   const color=colors[signals.indexOf(signal)];
   if(signal.found){ctx!.globalAlpha=.3;line(x-5,signal.y,x-1,signal.y+5,color,2);line(x-1,signal.y+5,x+7,signal.y-7,color,2);ctx!.globalAlpha=1;continue;}
   const glow=ctx!.createRadialGradient(x,signal.y+bob,2,x,signal.y+bob,40);glow.addColorStop(0,color+'5a');glow.addColorStop(1,color+'00');ctx!.fillStyle=glow;ctx!.fillRect(x-40,signal.y+bob-40,80,80);
   ctx!.save();ctx!.translate(x,signal.y+bob);ctx!.rotate(Math.PI/4);ctx!.strokeStyle=color;ctx!.lineWidth=2;ctx!.strokeRect(-10,-10,20,20);ctx!.fillStyle=color;ctx!.fillRect(-3,-3,6,6);ctx!.restore();
   ctx!.fillStyle='#eeeaff';ctx!.font='9px "DM Sans",sans-serif';ctx!.textAlign='center';ctx!.fillText(signal.label,x,signal.y-28);ctx!.textAlign='left';
  }
  const consoleX=3720-camera;
  if(consoleX<W+120&&consoleX>-120){
   const active=count()===3;ctx!.fillStyle=active?'#c9ff5220':'#252944';rounded(consoleX-45,GROUND-55,90,55,7);ctx!.fill();ctx!.strokeStyle=active?'#c9ff52':'#727296';ctx!.lineWidth=1;ctx!.stroke();
   ctx!.fillStyle='#0b0d19';ctx!.fillRect(consoleX-32,GROUND-44,64,22);
   for(let i=0;i<3;i++){ctx!.fillStyle=signals[i].found?colors[i]:'#43425d';ctx!.fillRect(consoleX-22+i*19,GROUND-38,12,9);}
   ctx!.fillStyle=active?'#c9ff52':'#b9b4d0';ctx!.font='10px "Space Grotesk",sans-serif';ctx!.textAlign='center';ctx!.fillText('KIST / ON AIR',consoleX,GROUND-73);ctx!.textAlign='left';
  }
  // Transparent source frames are 4 × 2. Feet align to the collision body's ground.
  const moving=Math.abs(player.vx)>14,frameIndex=player.grounded?(moving?Math.floor(time/.09)%8:0):3;
  const drawW=78,drawH=104,drawX=player.x-camera+(player.w-drawW)/2,drawY=player.y+player.h-drawH+5;
  ctx!.save();ctx!.translate(drawX+drawW/2,drawY);ctx!.scale(player.facing,1);ctx!.imageSmoothingEnabled=false;
  if(spriteReady){const sw=sprite.naturalWidth/4,sh=sprite.naturalHeight/2;ctx!.drawImage(sprite,(frameIndex%4)*sw,Math.floor(frameIndex/4)*sh,sw,sh,-drawW/2,0,drawW,drawH);}
  else if(posterReady)ctx!.drawImage(poster,-drawW/2,0,drawW,drawH);
  else{ctx!.fillStyle='#c9ff52';rounded(-14,39,28,56,12);ctx!.fill();}
  ctx!.restore();
  // A small progress route makes return trips and uncollected signals understandable.
  const routeW=Math.min(280,W-60),routeX=(W-routeW)/2,routeY=H-25;
  line(routeX,routeY,routeX+routeW,routeY,'#aaa0d5',1,.22);
  signals.forEach((s,i)=>{const x=routeX+s.x/LENGTH*routeW;ctx!.fillStyle=s.found?colors[i]:'#323147';ctx!.beginPath();ctx!.arc(x,routeY,3.5,0,Math.PI*2);ctx!.fill();});
  ctx!.fillStyle='#f4f0ff';ctx!.fillRect(routeX+player.x/LENGTH*routeW-2,routeY-3,4,6);
  if(state==='paused'){
   ctx!.fillStyle='#070a19a8';ctx!.fillRect(0,0,W,H);ctx!.textAlign='center';ctx!.fillStyle='#f2edff';ctx!.font='28px "Space Grotesk",sans-serif';ctx!.fillText('La pista ti aspetta.',W/2,H*.45);ctx!.fillStyle='#bdb8d1';ctx!.font='13px "DM Sans",sans-serif';ctx!.fillText('Premi Riprendi per continuare.',W/2,H*.45+28);ctx!.textAlign='left';
  }
 }
 function frame(now:number) {
  raf=0;if(disposed||!dialog!.open||document.hidden||state!=='running')return;
  // Keep real-time movement on slower devices. Fixed physics substeps below
  // prevent tunnelling; hidden-page pauses reset the clock before resuming.
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;time+=dt;
  // Fixed substeps prevent tunnelling through a platform after a slow frame.
  let remainder=dt;while(remainder>0&&state==='running'){const step=Math.min(remainder,1/120);move(step);remainder-=step;}
  draw();if(state==='running')raf=requestAnimationFrame(frame);
 }
 function resize() {
  const rect=canvas!.getBoundingClientRect();if(!rect.width||!rect.height)return;
  W=H*rect.width/rect.height;dpr=Math.min(devicePixelRatio||1,2);
  // Canvas backing size tracks CSS pixels without stretching the game coordinates.
  canvas!.width=Math.max(1,Math.round(W*dpr));canvas!.height=Math.round(H*dpr);
  if(reduced.matches)camera=clamp(player.x-W*.31,0,Math.max(0,LENGTH-W));
  draw();
 }
 function loadAssets() {
  if(sprite.src)return;
  poster.src='/media/kist/kist-16bit-run-poster.webp';poster.decode().then(()=>{posterReady=true;if(dialog!.open)draw();}).catch(()=>{});
  sprite.src='/media/kist/kist-16bit-run.webp';sprite.decode().then(()=>{spriteReady=true;dialog!.dataset.gameReady='true';if(dialog!.open)draw();}).catch(()=>{dialog!.dataset.gameReady='fallback';});
 }
 function openGame(event:Event) {
  opener=event.currentTarget instanceof HTMLElement?event.currentTarget:document.activeElement instanceof HTMLElement?document.activeElement:undefined;
  if(dialog!.open)return;
  // Choosing play also resolves the delayed entry invitation. Dismiss only its UI;
  // the existing handler never toggles or replaces the SoundCloud transport.
  document.querySelector<HTMLButtonElement>('#player-dismiss')?.click();
  dialog!.showModal();loadAssets();resize();
  if(started&&state!=='won'){updateState('paused');announce('La tua partita è qui. Premi Riprendi per tornare in pista.');draw();pauseButton.focus({preventScroll:true});}
  else if(state==='won')dialog!.querySelector<HTMLElement>('[data-game-listen]')?.focus({preventScroll:true});
  else dialog!.querySelector<HTMLElement>('[data-game-start-button]')?.focus({preventScroll:true});
 }
 function closeGame() {dialog!.close();}
 function onClose() {
  if(state==='running')updateState('paused');stop();
  const target=opener&&opener.getClientRects().length&&!opener.closest('[hidden]')?opener:document.querySelector<HTMLElement>('#world-map-toggle');
  target?.focus({preventScroll:true});
 }
 const controlCodes=new Set(['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space']);
 function onKey(event:KeyboardEvent) {
  if(!dialog!.open)return;
  const target=event.target;
  if((event.code==='Space'||event.code==='Enter')&&target instanceof HTMLButtonElement&&target.matches('[data-game-left],[data-game-right]')){
   event.preventDefault();if(state!=='running')return;
   keyboardDirections.add(target.matches('[data-game-left]')?'left':'right');target.dataset.held='true';return;
  }
  if(!controlCodes.has(event.code))return;
  if((event.code==='Space'||event.code==='ArrowUp'||event.code==='KeyW')&&target instanceof HTMLButtonElement&&!target.matches('[data-game-left],[data-game-right],[data-game-jump]'))return;
  event.preventDefault();if(state==='ready'||state==='won')return;
  if(['Space','ArrowUp','KeyW'].includes(event.code)){if(!event.repeat)requestJump();return;}
  if(state==='running')keys.add(event.code);
 }
 listen(document,'keydown',onKey as EventListener);
 listen(document,'keyup',((event:KeyboardEvent)=>{
  keys.delete(event.code);
  if(event.code==='Space'||event.code==='Enter'){
   keyboardDirections.clear();dialog!.querySelectorAll<HTMLElement>('[data-game-left],[data-game-right]').forEach(button=>delete button.dataset.held);
  }
 }) as EventListener);
 listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
 listen(window,'blur',()=>pause());
 listen(dialog,'close',onClose);
 listen(dialog,'click',(event)=>{if(event.target===dialog)closeGame();});
 dialog.querySelectorAll<HTMLElement>('[data-game-close]').forEach(button=>listen(button,'click',closeGame));
 document.querySelectorAll<HTMLElement>('[data-game-open]').forEach(button=>listen(button,'click',openGame));
 dialog.querySelectorAll<HTMLElement>('[data-game-start-button],[data-game-restart],[data-game-reset]').forEach(button=>listen(button,'click',reset));
 listen(pauseButton,'click',()=>state==='paused'?resume():pause());
 listen(dialog.querySelector<HTMLElement>('[data-game-listen]')!,'click',()=>{closeGame();document.querySelector<HTMLButtonElement>('#header-music')?.click();});
 listen(dialog.querySelector<HTMLElement>('[data-game-dates]')!,'click',closeGame);
 for(const [selector,side] of [['[data-game-left]','left'],['[data-game-right]','right']] as const){
  const button=dialog.querySelector<HTMLButtonElement>(selector)!;
  listen(button,'pointerdown',((event:PointerEvent)=>{event.preventDefault();if(state==='paused')resume();if(state!=='running')return;button.setPointerCapture(event.pointerId);touch[side]=true;button.dataset.held='true';}) as EventListener);
  const release=()=>{touch[side]=false;delete button.dataset.held;};
  listen(button,'pointerup',release);listen(button,'pointercancel',release);listen(button,'lostpointercapture',release);
  // Assistive technologies can activate a button without pointer or key events.
  listen(button,'click',event=>{if((event as MouseEvent).detail===0&&state==='running')directionPulse={side,until:time+.25};});
 }
 const jump=dialog.querySelector<HTMLButtonElement>('[data-game-jump]')!;
 listen(jump,'pointerdown',((event:PointerEvent)=>{event.preventDefault();requestJump();}) as EventListener);
 // Keyboard activation of visible touch controls remains a native button action.
 listen(jump,'click',(event)=>{if((event as MouseEvent).detail===0)requestJump();});
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 listen(reduced,'change',resize);
 updateState('ready');announce('Trova tre frequenze e riaccendi la console. Nessun limite di tempo.');
 const dispose=()=>{disposed=true;stop();observer.disconnect();bindings.forEach(unbind=>unbind());delete dialog!.dataset.gameBound;disposers.delete(dispose);};
 disposers.add(dispose);
}

initFrequencyQuest();
document.addEventListener('astro:page-load',initFrequencyQuest);
document.addEventListener('astro:before-swap',()=>{for(const dispose of [...disposers])dispose();});
export {};
