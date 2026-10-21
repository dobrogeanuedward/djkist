/** Small, square-pixel sky details over the illustrated Bologna layers. */
export type WorldFrame={time:number;chapter:number;scroll:number;energy:number;musicPosition:number;pointerX:number;pointerY:number;reduced:boolean};
const clouds=[[.08,.12,1],[.52,.22,.75],[.88,.08,.9]] as const;
export function renderWorld(ctx:CanvasRenderingContext2D,width:number,height:number,state:WorldFrame):void{
 if(width<1||height<1)return;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
 const energy=Math.max(0,Math.min(1,state.energy));
 // Discrete drift is deliberately slower than the city and foreground planes.
 const drift=state.reduced?0:Math.floor(state.time/5)-Math.round(state.scroll*5);
 ctx.fillStyle='#69548c';ctx.globalAlpha=.32;
 for(const [x,y,scale] of clouds){
  const length=Math.round(22*scale),offset=((Math.round(x*width)+drift+length)%(width+length))-length,top=Math.round(y*height);
  ctx.fillRect(offset,top+3,length,3);ctx.fillRect(offset+4,top+1,length-9,2);ctx.fillRect(offset+8,top,length-16,1);
 }
 // Playback gently lights a few stationary square pixels, without inferring beats.
 if(energy>.01){
  const phase=state.reduced?0:state.musicPosition/1000;
  ctx.globalAlpha=energy*(.13+Math.sin(phase*.18)*.025);ctx.fillStyle='#c9e875';
  ctx.fillRect(Math.round(width*.08),Math.round(height*.76),2,1);
  ctx.fillStyle='#bd88ff';
  ctx.fillRect(Math.round(width*.92),Math.round(height*.72),1,2);
  ctx.fillStyle='#65e1e6';ctx.fillRect(Math.round(width*.9),Math.round(height*.74),2,1);
 }
 ctx.restore();
}
