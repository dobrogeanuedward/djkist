import {createBSideAudio, type BSideChannel} from './bside-audio';

const room=document.querySelector<HTMLDialogElement>('#bside-room');
const entry=document.querySelector<HTMLButtonElement>('#bside-entry');
if(room&&entry){
 const start=room.querySelector<HTMLButtonElement>('#bside-start')!;
 const status=room.querySelector<HTMLElement>('#bside-status')!;
 const beat=room.querySelector<HTMLOutputElement>('#bside-beat')!;
 const pads=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-pad]'));
 const steps=Array.from(room.querySelectorAll<HTMLButtonElement>('[data-bside-step]'));
 const channels:BSideChannel[]=['kick','clap','hat','acid'];
 const enabled:Record<BSideChannel,boolean>={kick:true,clap:true,hat:true,acid:true};
 const padTimers=new Map<HTMLButtonElement,ReturnType<typeof setTimeout>>();
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let playing=false,starting=false,claimedAudio=false,previousHash='',opener:HTMLElement|undefined;
 let shareTimer:ReturnType<typeof setTimeout>|undefined;
 const storageKey='kist:bside:found:v1';
 function message(copy:string){status.textContent=copy}
 function claimAudio(){
  if(claimedAudio)return;
  claimedAudio=true;
  window.dispatchEvent(new CustomEvent('kist:bside-audio',{detail:{active:true}}));
 }
 function flash(channel:BSideChannel){
  const pad=pads.find(item=>item.dataset.bsidePad===channel);
  if(!pad)return;
  clearTimeout(padTimers.get(pad));pad.classList.add('is-hit');
  padTimers.set(pad,setTimeout(()=>{pad.classList.remove('is-hit');padTimers.delete(pad)},110));
 }
 const audio=createBSideAudio({
  onStep(step){
   room.dataset.step=String(step);
   room.dataset.beat=step>=0&&step%4===0?'down':'up';
   beat.value=step<0?'01.1':String(Math.floor(step/4)+1).padStart(2,'0')+'.'+(step%4+1);
   steps.forEach(button=>button.classList.toggle('is-current',Number(button.dataset.step)===step));
   if(step<0||motion.matches)return;
   const pattern=audio.getPattern();
   channels.forEach(channel=>{if(enabled[channel]&&pattern[channel][step])flash(channel)});
  },
  onPlaying(active){
   playing=active;starting=false;room.dataset.playing=String(active);
   start.querySelector('span')!.textContent=active?'Ferma il ritmo':'Accendi la stanza';
   start.setAttribute('aria-label',active?'Ferma il ritmo':'Accendi la stanza');
   start.querySelector('path')!.setAttribute('d',active?'M8 5h2v14H8Zm6 0h2v14h-2Z':'m8 5 11 7-11 7Z');
   room.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:!active}}));
   if(active)message('Ci sei. Suona i pad, muovi il filtro, cambia la notte.');
  },
  onError(copy){starting=false;message(copy)},
 });
 audio.setFilter(.58);
 function syncPattern(){
  const pattern=audio.getPattern();
  steps.forEach(button=>button.setAttribute('aria-pressed',String(pattern[button.dataset.channel as BSideChannel][Number(button.dataset.step)])));
 }
 function stop(){
  starting=false;audio.stop();room.dataset.playing='false';
  padTimers.forEach(clearTimeout);padTimers.clear();pads.forEach(pad=>pad.classList.remove('is-hit'));
 }
 async function toggle(){
  if(!room.open)return;
  if(playing||starting){stop();message('Il ritmo si ferma. La stanza resta tua.');return}
  starting=true;claimAudio();
  try{await audio.start()}catch{/* The engine exposes an actionable message through onError. */}
 }
 async function hit(channel:BSideChannel){
  if(!room.open)return;
  claimAudio();flash(channel);
  try{await audio.hit(channel)}catch{/* onError updates the live status. */}
 }
 function open(){
  if(room.open)return;
  opener=document.activeElement instanceof HTMLElement?document.activeElement:entry;
  previousHash=location.hash==='#b-side'?'':location.hash;
  window.dispatchEvent(new CustomEvent('kist:bside-open'));
  room.showModal();room.scrollTop=0;
  room.dataset.playing='false';room.dataset.step='-1';
  room.querySelector<HTMLElement>('[data-kist-sprite]')?.dispatchEvent(new CustomEvent('kist:pause',{detail:{paused:true}}));
  if(location.hash!=='#b-side')history.replaceState(history.state,'',location.pathname+location.search+'#b-side');
  try{localStorage.setItem(storageKey,'1')}catch{/* Private browsing still gets the complete room. */}
  message('Hai trovato la stanza. Adesso falla suonare.');
 }
 function close(){if(room.open)room.close()}
 entry.addEventListener('click',open);
 room.querySelector('#bside-close')!.addEventListener('click',close);
 room.querySelector('.bside-identity')!.addEventListener('click',event=>{event.preventDefault();close()});
 room.addEventListener('click',event=>{if(event.target===room)close()});
 room.addEventListener('close',()=>{
  stop();clearTimeout(shareTimer);
  if(claimedAudio){claimedAudio=false;window.dispatchEvent(new CustomEvent('kist:bside-audio',{detail:{active:false}}))}
  if(location.hash==='#b-side')history.replaceState(history.state,'',location.pathname+location.search+previousHash);
  const target=opener?.isConnected&&opener!==document.body?opener:entry;
  target.focus({preventScroll:true});
 });
 start.addEventListener('click',toggle);
 pads.forEach(pad=>pad.addEventListener('click',()=>hit(pad.dataset.bsidePad as BSideChannel)));
 steps.forEach(button=>button.addEventListener('click',()=>{
  const active=audio.toggleStep(button.dataset.channel as BSideChannel,Number(button.dataset.step));
  button.setAttribute('aria-pressed',String(active));
 }));
 room.querySelectorAll<HTMLButtonElement>('[data-bside-channel]').forEach(button=>button.addEventListener('click',()=>{
  const channel=button.dataset.bsideChannel as BSideChannel;
  enabled[channel]=!enabled[channel];audio.setChannel(channel,enabled[channel]);
  button.setAttribute('aria-pressed',String(enabled[channel]));
  const name=button.textContent!.trim();button.setAttribute('aria-label',(enabled[channel]?'Disattiva ':'Attiva ')+name);
 }));
 const tempo=room.querySelector<HTMLInputElement>('#bside-tempo')!;
 tempo.addEventListener('input',()=>{
  const value=Number(tempo.value);audio.setTempo(value);
  room.querySelector<HTMLOutputElement>('#bside-tempo-value')!.value=tempo.value;
  tempo.setAttribute('aria-valuetext',value+' battiti al minuto');
 });
 room.querySelector<HTMLInputElement>('#bside-filter')!.addEventListener('input',event=>audio.setFilter(Number((event.target as HTMLInputElement).value)/100));
 room.querySelector('#bside-shuffle')!.addEventListener('click',()=>{audio.randomize();syncPattern();message('Un’altra combinazione. La stessa notte.');});
 const lights=room.querySelector<HTMLButtonElement>('#bside-lights')!;
 lights.addEventListener('click',()=>{
  const rose=room.dataset.light!=='rose';room.dataset.light=rose?'rose':'violet';
  lights.setAttribute('aria-pressed',String(rose));
 });
 const photo=room.querySelector<HTMLButtonElement>('#bside-photo')!;
 photo.addEventListener('click',()=>photo.setAttribute('aria-pressed',String(photo.getAttribute('aria-pressed')!=='true')));
 const share=room.querySelector<HTMLButtonElement>('#bside-share')!;
 share.addEventListener('click',async()=>{
  const url=new URL(location.href);url.hash='b-side';
  try{
   await navigator.clipboard.writeText(url.href);
   share.querySelector('span')!.textContent='Chiave copiata';
   message('Link copiato. Scegli bene a chi passare la chiave.');
   clearTimeout(shareTimer);shareTimer=setTimeout(()=>{share.querySelector('span')!.textContent='Passa la chiave'},3500);
  }catch{
   message('La chiave è il link in alto: copialo e passalo a chi vuoi.');
  }
 });
 room.addEventListener('keydown',event=>{
  const target=event.target as HTMLElement;
  if(target.matches('input,textarea,select,[contenteditable=true]')||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
  const channel=channels[Number(event.key)-1];
  if(channel){event.preventDefault();hit(channel)}
  if(event.code==='Space'&&target===room){event.preventDefault();toggle()}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&room.open){stop();message('Ti aspetto qui. Tocca play per ricominciare.')}});
 window.addEventListener('pagehide',stop);
 window.addEventListener('hashchange',()=>{if(location.hash==='#b-side')open();else if(room.open)close()});
 syncPattern();
 // Let the normal player register its transport bridge before opening a shared key.
 if(location.hash==='#b-side')queueMicrotask(open);
}
