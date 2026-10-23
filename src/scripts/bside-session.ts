import {CHANNELS,STYLES,SCENES,sanitizeSession,type Session} from './bside-presets';

/** A small portable score: no audio upload, account or server-side storage. */
export function encodeSession(session:Session):string{
 const score=CHANNELS.map(channel=>session.pattern[channel.id].map(value=>Math.round(value*255).toString(16).padStart(2,'0')).join('')).join('');
 const muted=CHANNELS.reduce((mask,channel,i)=>mask|(session.muted[channel.id]?1<<i:0),0);
 const values=[2,STYLES.findIndex(style=>style.id===session.style),SCENES.findIndex(scene=>scene.id===session.scene),session.seed,session.bpm,Math.round(session.swing*1000),session.key,Math.round(session.energy*1000),Math.round(session.space*1000),Math.round(session.filter*1000),score,muted,['air','club','robot'].indexOf(session.vocalTone)];
 return btoa(JSON.stringify(values)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeSession(encoded:string):Session|null{
 if(encoded.length>1800||!/^[\w-]+$/.test(encoded))return null;
 try{
  const value=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
  if(!Array.isArray(value)||value.length!==13||value[0]!==2||!STYLES[value[1]]||!SCENES[value[2]]||typeof value[10]!=='string'||!/^[\da-f]{576}$/.test(value[10])||!Number.isInteger(value[11])||value[11]<0||value[11]>511||!['air','club','robot'][value[12]])return null;
  const pattern=Object.fromEntries(CHANNELS.map((channel,i)=>[channel.id,Array.from({length:32},(_,step)=>parseInt(value[10].slice((i*32+step)*2,(i*32+step)*2+2),16)/255)]));
  const muted=Object.fromEntries(CHANNELS.map((channel,i)=>[channel.id,!!(value[11]&(1<<i))]));
  return sanitizeSession({version:2,style:STYLES[value[1]].id,scene:SCENES[value[2]].id,seed:value[3],bpm:value[4],swing:value[5]/1000,key:value[6],energy:value[7]/1000,space:value[8]/1000,filter:value[9]/1000,pattern,muted,vocalTone:['air','club','robot'][value[12]]});
 }catch{return null}
}
