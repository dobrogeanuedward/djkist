export type Channel = 'kick' | 'snare' | 'hat' | 'perc' | 'bass' | 'acid' | 'chord' | 'fx' | 'vocal';
export type StyleId = 'garage' | 'breaks' | 'jungle' | 'dnb' | 'acid';
export type SceneId = 'warm' | 'groove' | 'peak' | 'after';
export type VocalTone = 'air' | 'club' | 'robot';
export type Session = {
 version: 2;
 style: StyleId;
 scene: SceneId;
 seed: number;
 bpm: number;
 swing: number;
 key: number;
 energy: number;
 space: number;
 filter: number;
 vocalTone: VocalTone;
 pattern: Record<Channel, number[]>;
 muted: Record<Channel, boolean>;
};

export const CHANNELS: {id:Channel;name:string;key:string;color:string}[] = [
 {id:'kick', name:'Cassa', key:'1', color:'#c9ff52'},
 {id:'snare', name:'Rullante', key:'2', color:'#ff96c9'},
 {id:'hat', name:'Hi-hat', key:'3', color:'#85ebed'},
 {id:'perc', name:'Percussioni', key:'4', color:'#ffc18d'},
 {id:'bass', name:'Sub', key:'5', color:'#b7a1ff'},
 {id:'acid', name:'Acid', key:'6', color:'#d9ff7b'},
 {id:'chord', name:'Accordi', key:'7', color:'#80d0ff'},
 {id:'fx', name:'Atmosfera', key:'8', color:'#f6b5ed'},
 {id:'vocal', name:'Vocal', key:'9', color:'#c9ff52'},
];
export const STYLES: {id:StyleId;name:string;bpm:number;description:string;color:string}[] = [
 {id:'garage', name:'UK garage', bpm:132, description:'Due passi, basso elastico, accordi sospesi.', color:'#c9ff52'},
 {id:'breaks', name:'Breakbeat', bpm:138, description:'Battute spezzate, ghost note e pressione sul sub.', color:'#91eced'},
 {id:'jungle', name:'Jungle', bpm:164, description:'Break veloci, tagli e risposte di basso.', color:'#ffc18d'},
 {id:'dnb', name:'Drum & bass', bpm:172, description:'Rullante netto, cassa essenziale, basso profondo.', color:'#c7a0ff'},
 {id:'acid', name:'Acid techno', bpm:140, description:'Cassa continua e una linea che prende vita.', color:'#d9ff7b'},
];
export const SCENES: {id:SceneId;name:string}[] = [
 {id:'warm', name:'Warm up'},
 {id:'groove', name:'Groove'},
 {id:'peak', name:'Peak time'},
 {id:'after', name:'Afterhours'},
];

type Part = {main:number[];ghost?:number[]};
type Score = Record<Channel, Part>;
const scores:Record<StyleId,Score> = {
 garage:{
  kick:{main:[0,10,16,26],ghost:[6,15,23,30]},
  snare:{main:[4,12,20,28],ghost:[11,27,31]},
  hat:{main:[2,6,10,14,18,22,26,30],ghost:[3,7,15,19,23,31]},
  perc:{main:[7,15,23,31],ghost:[9,18,25,29]},
  bass:{main:[0,7,10,16,23,26],ghost:[14,30]},
  acid:{main:[6,22],ghost:[14,30]},
  chord:{main:[2,11,18,27],ghost:[7,23]},
  fx:{main:[31],ghost:[15]},
  vocal:{main:[6,22],ghost:[15,31]},
 },
 breaks:{
  kick:{main:[0,6,10,16,22,27],ghost:[9,15,19,30]},
  snare:{main:[4,12,20,28],ghost:[3,11,18,26,31]},
  hat:{main:[0,2,6,8,10,14,16,18,22,24,26,30],ghost:[3,7,11,15,19,23,27,31]},
  perc:{main:[7,14,23,30],ghost:[2,11,18,25]},
  bass:{main:[0,6,10,16,22,27],ghost:[14,30]},
  acid:{main:[9,25],ghost:[15,31]},
  chord:{main:[6,22],ghost:[14,30]},
  fx:{main:[30],ghost:[15]},
  vocal:{main:[14,30],ghost:[7,23]},
 },
 jungle:{
  kick:{main:[0,6,9,16,19,26],ghost:[3,14,22,30]},
  snare:{main:[4,12,20,28],ghost:[7,10,11,18,23,27,30,31]},
  hat:{main:[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],ghost:[3,7,11,15,19,23,27,31]},
  perc:{main:[7,15,23,31],ghost:[5,11,18,25,29]},
  bass:{main:[0,10,16,25],ghost:[6,14,22,30]},
  acid:{main:[14,30]},
  chord:{main:[0,16],ghost:[26]},
  fx:{main:[15,31],ghost:[6,22]},
  vocal:{main:[6,22],ghost:[15,31]},
 },
 dnb:{
  kick:{main:[0,10,16,26],ghost:[6,14,22,30]},
  snare:{main:[4,12,20,28],ghost:[11,19,27,31]},
  hat:{main:[0,2,6,8,10,14,16,18,22,24,26,30],ghost:[3,7,11,15,19,23,27,31]},
  perc:{main:[7,15,23,31],ghost:[6,14,22,30]},
  bass:{main:[0,7,10,16,23,26],ghost:[14,30]},
  acid:{main:[14,30]},
  chord:{main:[0,16],ghost:[10,26]},
  fx:{main:[31],ghost:[15,24]},
  vocal:{main:[14,30],ghost:[7,23]},
 },
 acid:{
  kick:{main:[0,4,8,12,16,20,24,28],ghost:[15,31]},
  snare:{main:[4,12,20,28],ghost:[11,27]},
  hat:{main:[2,6,10,14,18,22,26,30],ghost:[3,7,11,15,19,23,27,31]},
  perc:{main:[3,11,19,27],ghost:[7,14,23,30]},
  bass:{main:[0,14,16,30],ghost:[6,22]},
  acid:{main:[0,2,3,6,8,10,11,14,16,18,19,22,24,26,27,30],ghost:[5,13,21,29,31]},
  chord:{main:[0,16]},
  fx:{main:[31],ghost:[15]},
  vocal:{main:[7,23],ghost:[15,31]},
 },
};
const sceneSettings:Record<SceneId,{energy:number;space:number;filter:number;ghosts:number;density:number}>={
 warm:{energy:.38,space:.34,filter:.44,ghosts:.2,density:.68},
 groove:{energy:.64,space:.28,filter:.62,ghosts:.52,density:.85},
 peak:{energy:.89,space:.19,filter:.82,ghosts:.88,density:1},
 after:{energy:.45,space:.62,filter:.42,ghosts:.32,density:.62},
};
const round=(value:number)=>Math.round(value*1000)/1000;
function random(seed:number){
 let state=seed>>>0;
 return ()=>{
  state=(state+0x6d2b79f5)>>>0;
  let value=Math.imul(state^(state>>>15),1|state);
  value^=value+Math.imul(value^(value>>>7),61|value);
  return ((value^(value>>>14))>>>0)/4294967296;
 };
}
function emptyPattern():Record<Channel,number[]>{
 return Object.fromEntries(CHANNELS.map(channel=>[channel.id,Array<number>(32).fill(0)])) as Record<Channel,number[]>;
}
function compose(style:StyleId,scene:SceneId,seed:number):Record<Channel,number[]>{
 const rng=random(seed),settings=sceneSettings[scene],pattern=emptyPattern();
 for(const {id} of CHANNELS){
  const part=scores[style][id];
  part.main.forEach((step,index)=>{
   const foundation=id==='kick'||id==='snare';
   const keep=foundation||index===0||rng()<settings.density;
   if(!keep)return;
   let velocity=.75+rng()*.23;
   if(id==='hat')velocity=(step%4===2?.73:.47)+rng()*.2;
   if(id==='perc')velocity=.36+rng()*.28;
   if(id==='chord')velocity=.44+rng()*.23;
   if(id==='fx')velocity=.3+rng()*.25;
   if(id==='acid')velocity=.54+rng()*.34;
   if(id==='vocal')velocity=.45+rng()*.22;
   pattern[id][step]=round(velocity*(scene==='after'?.83:scene==='warm'?.9:1));
  });
  part.ghost?.forEach(step=>{
   if(rng()>settings.ghosts)return;
   pattern[id][step]=round((id==='snare'?.16:id==='kick'?.37:.2)+rng()*.18);
  });
 }
 // Leave room between bass, chord and lead phrases. These are arrangements,
 // not nine full-density loops stacked on top of one another.
 if(scene==='warm'){
  pattern.perc=pattern.perc.map((velocity,step)=>step>=16?velocity*.8:0);
  pattern.fx.fill(0);
  pattern.vocal=pattern.vocal.map((velocity,step)=>step>=16?velocity*.72:0);
  if(!pattern.vocal.some(value=>value>0))pattern.vocal[scores[style].vocal.main[1]]=.36;
 }
 if(scene==='after'){
  pattern.kick=pattern.kick.map((velocity,step)=>step%8===0?velocity:velocity*.5);
  pattern.snare=pattern.snare.map((velocity,step)=>step%16===12?velocity:velocity*.45);
  pattern.chord[style==='garage'?2:0]=.66;
  pattern.chord[style==='garage'?18:16]=.57;
  pattern.vocal=pattern.vocal.map(velocity=>velocity*.72);
 }
 if(style==='acid'){
  pattern.chord=pattern.chord.map((velocity,step)=>scene==='after'&&step===0?velocity*.5:0);
  pattern.bass=pattern.bass.map(velocity=>velocity*.7);
 }else{
  // An acid voice is available on every kit; only the peak scene layers it in.
  if(scene!=='peak')pattern.acid.fill(0);
  else pattern.acid=pattern.acid.map(velocity=>velocity*.65);
 }
 return pattern;
}

export function createSession(style:StyleId='garage',scene:SceneId='groove',seed:number=Math.floor(Math.random()*4294967296)):Session{
 const safeStyle=STYLES.some(item=>item.id===style)?style:'garage';
 const safeScene=SCENES.some(item=>item.id===scene)?scene:'groove';
 const safeSeed=Number.isFinite(seed)?Math.floor(seed)>>>0:0;
 const settings=sceneSettings[safeScene];
 return {
  version:2,style:safeStyle,scene:safeScene,seed:safeSeed,
  bpm:STYLES.find(item=>item.id===safeStyle)!.bpm,
  swing:({garage:.22,breaks:.11,jungle:.04,dnb:.02,acid:.04} as const)[safeStyle],
  key:36,energy:settings.energy,space:settings.space,filter:settings.filter,
  vocalTone:({garage:'club',breaks:'club',jungle:'air',dnb:'air',acid:'robot'} as const)[safeStyle],
  pattern:compose(safeStyle,safeScene,safeSeed),
  muted:Object.fromEntries(CHANNELS.map(channel=>[channel.id,false])) as Record<Channel,boolean>,
 };
}
export function cloneSession(session:Session):Session{
 return {...session,pattern:Object.fromEntries(CHANNELS.map(channel=>[channel.id,[...session.pattern[channel.id]]])) as Record<Channel,number[]>,muted:{...session.muted}};
}
export function varySession(session:Session):Session{
 const next=cloneSession(session);
 next.seed=(session.seed+0x9e3779b9)>>>0;
 next.pattern=compose(next.style,next.scene,next.seed);
 const changed=CHANNELS.some(({id})=>next.pattern[id].some((value,index)=>value!==session.pattern[id][index]));
 // A variation always changes the score, even after a manually edited pattern.
 if(!changed)next.pattern.perc[31]=next.pattern.perc[31]===0?.46:0;
 return next;
}

function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value)}
function bounded(value:unknown,min:number,max:number):value is number{return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max}
/** Shared links and local saves are untrusted; never feed malformed schedules to audio. */
export function sanitizeSession(input:unknown):Session|null{
 if(!record(input)||input.version!==2||!STYLES.some(item=>item.id===input.style)||!SCENES.some(item=>item.id===input.scene))return null;
 if(!bounded(input.seed,0,4294967295)||!Number.isInteger(input.seed)||!bounded(input.bpm,110,180)||!bounded(input.swing,0,.32)||!bounded(input.key,36,47)||!Number.isInteger(input.key))return null;
 if(!bounded(input.energy,0,1)||!bounded(input.space,0,1)||!bounded(input.filter,0,1)||!record(input.pattern)||!record(input.muted))return null;
 if(input.vocalTone!==undefined&&!['air','club','robot'].includes(input.vocalTone as string))return null;
 for(const {id} of CHANNELS){
  const sequence=input.pattern[id];
  if(!Array.isArray(sequence)||sequence.length!==32||!Array.from(sequence).every(value=>bounded(value,0,1))||typeof input.muted[id]!=='boolean')return null;
 }
 return cloneSession({...input,vocalTone:input.vocalTone??'club'} as Session);
}
