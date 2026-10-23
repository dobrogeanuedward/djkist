import {createBSideAudio} from './bside-audio';
import {CHANNELS,STYLES,SCENES,createSession,varySession,sanitizeSession,cloneSession,type Session,type Channel,type StyleId,type SceneId} from './bside-presets';
import {encodeSession,decodeSession} from './bside-session';

const room=document.querySelector<HTMLDialogElement>('#bside-room');
const entry=document.querySelector<HTMLButtonElement>('#bside-entry');
if(room&&entry){
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>room.querySelector<T>(selector)!;
 const start=$<HTMLButtonElement>('#bside-start'),status=$('#bside-status'),beat=$<HTMLOutputElement>('#bside-beat');
 const pads=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-pad]'));
 const steps=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-step]'));
 const channelButtons=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-channel]'));
 const styleButtons=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-style]'));
 const sceneButtons=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-scene]'));
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const padTimers=new Map<HTMLButtonElement,ReturnType<typeof setTimeout>>();
 const sessionKey='kist:bside:session:v2',foundKey='kist:bside:found:v1';
 const isSide=()=>/^#b-side(?:=|$)/.test(location.hash);
 let playing=false,starting=false,claimedAudio=false,previousHash='',opener:HTMLElement|undefined;
 let bank=0,pending:Session|undefined,editGroup='';
 let objectUrl:string|undefined,shareTimer:ReturnType<typeof setTimeout>|undefined;
 const undoHistory:Session[]=[];
 function message(copy:string){status.textContent=copy}
 function working(){return cloneSession(pending||audio.getSession())}
 function remember(){undoHistory.push(working());if(undoHistory.length>24)undoHistory.shift();$<HTMLButtonElement>('#bside-undo').disabled=false}
 function claimAudio(){if(claimedAudio)return;claimedAudio=true;window.dispatchEvent(new CustomEvent('kist:bside-audio',{detail:{active:true}}))}
 function flash(channel:Channel){
  const pad=pads.find(item=>item.dataset.bsidePad===channel);if(!pad)return;
  clearTimeout(padTimers.get(pad));pad.classList.add('is-hit');
  padTimers.set(pad,setTimeout(()=>{pad.classList.remove('is-hit');padTimers.delete(pad)},105));
 }
 function syncPattern(){
  const session=audio.getSession();
  steps.forEach(button=>{
   const velocity=session.pattern[button.dataset.channel as Channel][bank*16+Number(button.dataset.step)];
   button.setAttribute('aria-pressed',String(velocity>0));button.style.setProperty('--velocity',String(velocity));
   const name=CHANNELS.find(channel=>channel.id===button.dataset.channel)!.name;
   button.setAttribute('aria-label',name+', passo '+(bank*16+Number(button.dataset.step)+1));
  });
  channelButtons.forEach(button=>{
   const channel=button.dataset.bsideChannel as Channel,active=!session.muted[channel];
   button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',(active?'Disattiva ':'Attiva ')+CHANNELS.find(item=>item.id===channel)!.name);
  });
  pads.forEach(pad=>pad.classList.toggle('is-muted',session.muted[pad.dataset.bsidePad as Channel]));
 }
 function syncRange(id:string,value:number,suffix='%'){
  const input=$<HTMLInputElement>('#bside-'+id);input.value=String(value);
  input.setAttribute('aria-valuetext',value+(id==='tempo'?' battiti al minuto':suffix));
  const output=room.querySelector<HTMLOutputElement>('output[for="bside-'+id+'"]');if(output)output.value=value+suffix;
 }
 function showSession(session:Session,queued:boolean){
  pending=queued?cloneSession(session):undefined;room.dataset.pending=String(queued);$('#bside-pending').hidden=!queued;
  styleButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bsideStyle===session.style)));
  sceneButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bsideScene===session.scene)));
  const style=STYLES.find(item=>item.id===session.style)!,scene=SCENES.find(item=>item.id===session.scene)!;
  $('#bside-preset-caption').textContent=(queued?'Prossimo: ':'')+style.name+' / '+scene.name;
  if(queued)return;
  room.dataset.style=session.style;room.dataset.scene=session.scene;room.style.setProperty('--style-color',style.color);
  syncRange('tempo',session.bpm,'');syncRange('energy',Math.round(session.energy*100));syncRange('space',Math.round(session.space*100));
  syncRange('filter',Math.round(session.filter*100));syncRange('swing',Math.round(session.swing*100));
  $<HTMLSelectElement>('#bside-key').value=String(session.key);$<HTMLSelectElement>('#bside-vocal').value=session.vocalTone;syncPattern();
 }
 const audio=createBSideAudio({
  onStep(step){
   room.dataset.step=String(step);room.dataset.beat=step>=0&&step%4===0?'down':'up';
   beat.value=step<0?'1 / 1.1':(Math.floor(step/16)+1)+' / '+(Math.floor(step%16/4)+1)+'.'+(step%4+1);
   steps.forEach(button=>button.classList.toggle('is-current',step>=0&&Math.floor(step/16)===bank&&Number(button.dataset.step)===step%16));
   for(let i=0;i<2;i++)$('#bside-bank-'+i).classList.toggle('is-playing-bank',step>=0&&Math.floor(step/16)===i);
   if(step<0||motion.matches)return;
   const session=audio.getSession();CHANNELS.forEach(channel=>{if(!session.muted[channel.id]&&session.pattern[channel.id][step]>0)flash(channel.id)});
  },
  onPlaying(active){
   playing=active;starting=false;room.dataset.playing=String(active);
   start.querySelector('span')!.textContent=active?'Ferma il ritmo':'Accendi la stanza';start.setAttribute('aria-label',active?'Ferma il ritmo':'Accendi la stanza');
   start.querySelector('path')!.setAttribute('d',active?'M8 5h2v14H8Zm6 0h2v14h-2Z':'m8 5 11 7-11 7Z');
   room.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:!active}}));
   if(active)message('È il tuo groove. Suona le voci e muovi il suono.');
  },onSession:showSession,onError(copy){starting=false;message(copy)},
 });
 function settle(){if(pending)audio.loadSession(pending,false)}
 function change(session:Session,saveHistory=true){if(saveHistory)remember();editGroup='';audio.loadSession(session,true)}
 function resetFx(){
  audio.resetPerformance();room.dataset.performance='false';$('#bside-xy').setAttribute('aria-pressed','false');
  room.style.setProperty('--xy-x','50%');room.style.setProperty('--xy-y','50%');
 }
 function stop(){
  starting=false;resetFx();audio.stop();room.dataset.playing='false';
  padTimers.forEach(clearTimeout);padTimers.clear();pads.forEach(pad=>pad.classList.remove('is-hit'));
 }
 async function begin(){if(!room.open)return;starting=true;claimAudio();try{await audio.start()}catch{/* onError provides recovery. */}}
 async function toggle(){if(!room.open)return;if(playing||starting){stop();message('Una pausa. Il groove resta qui.');return}await begin()}
 async function hit(channel:Channel){if(!room.open)return;claimAudio();flash(channel);try{await audio.hit(channel)}catch{/* onError handles unavailable audio. */}}
 function readInitial(){
  const encoded=location.hash.startsWith('#b-side=')?location.hash.slice(8):'';
  if(encoded){const shared=decodeSession(encoded);if(shared)return {session:shared,message:'Qualcuno ti ha passato un groove. Adesso fallo tuo.'};return {session:createSession(),message:'Questa chiave è incompleta. Ti ho preparato un nuovo groove.'}}
  try{const saved=sanitizeSession(JSON.parse(localStorage.getItem(sessionKey)||'null'));if(saved)return {session:saved,message:'Bentornato. Ho tenuto il tuo groove.'}}catch{}
  return {session:createSession(),message:'Scegli un suono. Il tuo prossimo groove comincia qui.'};
 }
 const initial=readInitial();audio.loadSession(initial.session,false);
 function historyReplace(hash:string){window.history.replaceState(window.history.state,'',location.pathname+location.search+hash)}
 function open(){
  if(room.open)return;opener=document.activeElement instanceof HTMLElement?document.activeElement:entry;previousHash=isSide()?'':location.hash;
  window.dispatchEvent(new CustomEvent('kist:bside-open'));room.showModal();room.scrollTop=0;room.dataset.playing='false';room.dataset.step='-1';
  room.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:true}}));
  if(!isSide())historyReplace('#b-side');try{localStorage.setItem(foundKey,'1')}catch{}message(initial.message);
 }
 function close(){if(room.open)room.close()}
 entry.addEventListener('click',open);$('#bside-close').addEventListener('click',close);
 $('.bside-identity').addEventListener('click',event=>{event.preventDefault();close()});room.addEventListener('click',event=>{if(event.target===room)close()});
 room.addEventListener('close',()=>{
  stop();clearTimeout(shareTimer);if(claimedAudio){claimedAudio=false;window.dispatchEvent(new CustomEvent('kist:bside-audio',{detail:{active:false}}))}
  if(isSide())historyReplace(previousHash);const target=opener?.isConnected&&opener!==document.body?opener:entry;target.focus({preventScroll:true});
 });
 start.addEventListener('click',toggle);pads.forEach(pad=>pad.addEventListener('click',()=>hit(pad.dataset.bsidePad as Channel)));
 styleButtons.forEach(button=>button.addEventListener('click',()=>{
  const session=working();change(createSession(button.dataset.bsideStyle as StyleId,session.scene));message(STYLES.find(style=>style.id===button.dataset.bsideStyle)!.description);
 }));
 sceneButtons.forEach(button=>button.addEventListener('click',()=>{
  const session=working(),next=createSession(session.style,button.dataset.bsideScene as SceneId,session.seed);
  next.key=session.key;next.vocalTone=session.vocalTone;change(next);message(playing?'Il prossimo momento entra a tempo.':'Scegli il tuo momento. Poi premi play.');
 }));
 steps.forEach(button=>button.addEventListener('click',()=>{
  settle();remember();const value=audio.setStep(button.dataset.channel as Channel,bank*16+Number(button.dataset.step));button.setAttribute('aria-pressed',String(value>0));button.style.setProperty('--velocity',String(value));
 }));
 for(let i=0;i<2;i++)$('#bside-bank-'+i).addEventListener('click',()=>{bank=i;for(let j=0;j<2;j++)$('#bside-bank-'+j).setAttribute('aria-pressed',String(i===j));syncPattern()});
 channelButtons.forEach(button=>button.addEventListener('click',()=>{settle();remember();const channel=button.dataset.bsideChannel as Channel;audio.setChannel(channel,audio.getSession().muted[channel]);syncPattern()}));
 const ranges:{id:string;scale:number;set:(value:number)=>void;suffix:string}[]=[
  {id:'tempo',scale:1,set:value=>audio.setTempo(value),suffix:''},{id:'energy',scale:100,set:value=>audio.setEnergy(value),suffix:'%'},
  {id:'space',scale:100,set:value=>audio.setSpace(value),suffix:'%'},{id:'filter',scale:100,set:value=>audio.setFilter(value),suffix:'%'},{id:'swing',scale:100,set:value=>audio.setSwing(value),suffix:'%'},
 ];
 ranges.forEach(({id,scale,set,suffix})=>{const input=$<HTMLInputElement>('#bside-'+id);input.addEventListener('input',()=>{const value=Number(input.value);settle();if(editGroup!==id){remember();editGroup=id}set(value/scale);syncRange(id,value,suffix)});input.addEventListener('change',()=>{editGroup=''})});
 $<HTMLSelectElement>('#bside-key').addEventListener('change',event=>{settle();remember();audio.setKey(Number((event.target as HTMLSelectElement).value))});
 $<HTMLSelectElement>('#bside-vocal').addEventListener('change',event=>{settle();remember();audio.setVocalTone((event.target as HTMLSelectElement).value as Session['vocalTone']);message('La voce cambia. Il groove continua.')});
 $('#bside-shuffle').addEventListener('click',()=>{change(varySession(working()));message('Un’altra versione. Stessa frequenza, nuove possibilità.')});
 $('#bside-undo').addEventListener('click',()=>{const previous=undoHistory.pop();if(previous)change(previous,false);$<HTMLButtonElement>('#bside-undo').disabled=!undoHistory.length;message('Torniamo a quel groove.')});
 $('#bside-fill').addEventListener('click',async()=>{if(!playing)await begin();if(!room.open||!playing)return;audio.fill();message('Un giro diverso. Poi il groove torna al suo posto.')});
 const xy=$<HTMLButtonElement>('#bside-xy');let pointer:number|undefined,fxX=.5,fxY=.5;
 function performanceAt(x:number,y:number){fxX=Math.max(0,Math.min(1,x));fxY=Math.max(0,Math.min(1,y));audio.setPerformance(fxX,1-fxY);xy.setAttribute('aria-pressed','true');room.dataset.performance='true';room.style.setProperty('--xy-x',fxX*100+'%');room.style.setProperty('--xy-y',fxY*100+'%')}
 function point(event:PointerEvent){const rect=xy.getBoundingClientRect();performanceAt((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height)}
 xy.addEventListener('pointerdown',event=>{if(event.button!==0)return;pointer=event.pointerId;xy.setPointerCapture(event.pointerId);point(event)});xy.addEventListener('pointermove',event=>{if(event.pointerId===pointer)point(event)});
 function release(){pointer=undefined;resetFx()}
 xy.addEventListener('pointerup',release);xy.addEventListener('pointercancel',release);xy.addEventListener('lostpointercapture',release);xy.addEventListener('blur',release);
 xy.addEventListener('keydown',event=>{
  if(event.code==='Space'){event.preventDefault();performanceAt(fxX,fxY)}
  if(event.key.startsWith('Arrow')){event.preventDefault();event.stopPropagation();performanceAt(fxX+(event.key==='ArrowRight'?.08:event.key==='ArrowLeft'?-.08:0),fxY+(event.key==='ArrowDown'?.08:event.key==='ArrowUp'?-.08:0))}
 });
 xy.addEventListener('keyup',event=>{if(event.code==='Space'||event.key.startsWith('Arrow')){event.preventDefault();resetFx()}});
 const lights=$<HTMLButtonElement>('#bside-lights');lights.addEventListener('click',()=>{const rose=room.dataset.light!=='rose';room.dataset.light=rose?'rose':'violet';lights.setAttribute('aria-pressed',String(rose))});
 const photo=$<HTMLButtonElement>('#bside-photo');photo.addEventListener('click',()=>photo.setAttribute('aria-pressed',String(photo.getAttribute('aria-pressed')!=='true')));
 $('#bside-save').addEventListener('click',()=>{try{localStorage.setItem(sessionKey,JSON.stringify(working()));message('Salvato su questo browser. Lo ritrovi al prossimo giro.')}catch{message('Il browser non può salvare qui. Usa “Passa il groove” per conservarlo.')}});
 const share=$<HTMLButtonElement>('#bside-share');share.addEventListener('click',async()=>{
  const url=new URL(location.href);url.hash='b-side='+encodeSession(working());
  try{await navigator.clipboard.writeText(url.href);share.querySelector('span')!.textContent='Groove copiato';message('Il link contiene il tuo groove. Passalo a chi vuoi.');clearTimeout(shareTimer);shareTimer=setTimeout(()=>{share.querySelector('span')!.textContent='Passa il groove'},3500)}catch{historyReplace(url.hash);message('Il tuo groove è nel link in alto. Copialo per conservarlo o condividerlo.')}
 });
 const exportButton=$<HTMLButtonElement>('#bside-export'),download=$<HTMLAnchorElement>('#bside-download');
 exportButton.addEventListener('click',async()=>{
  if(exportButton.disabled)return;exportButton.disabled=true;exportButton.setAttribute('aria-busy','true');exportButton.querySelector('span')!.textContent='Creo il WAV…';message('Sto preparando otto battute del tuo groove. Puoi continuare a suonare.');settle();const snapshot=audio.getSession();
  try{const blob=await audio.renderWav(8);if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(blob);download.href=objectUrl;download.download='KIST-BSIDE-'+snapshot.style+'-'+snapshot.bpm+'bpm.wav';download.hidden=false;
   const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!ios)download.click();message(ios?'Il tuo WAV è pronto. Tocca “Scaricalo” qui sotto.':'Il tuo loop è pronto: otto battute, WAV stereo.');
  }catch{message('Non riesco a creare il WAV in questo browser. Salva il groove o riprova con Safari o Chrome aggiornato.')}
  finally{exportButton.disabled=false;exportButton.removeAttribute('aria-busy');exportButton.querySelector('span')!.textContent='Esporta WAV'}
 });
 room.addEventListener('keydown',event=>{const target=event.target as HTMLElement;if(target.matches('input,textarea,select,[contenteditable=true]')||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;const channel=CHANNELS.find(item=>item.key===event.key);if(channel){event.preventDefault();hit(channel.id)}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&room.open){stop();message('Ti aspetto qui. Tocca play per ricominciare.')}});window.addEventListener('pagehide',stop);
 window.addEventListener('hashchange',()=>{if(isSide()){const next=readInitial();audio.loadSession(next.session,false);open();message(next.message)}else if(room.open)close()});
 if(isSide())queueMicrotask(open);
}
