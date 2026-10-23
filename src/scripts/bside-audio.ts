import {createSession,cloneSession,type Channel,type Session,type VocalTone} from './bside-presets';

type Callbacks={onStep:(step:number)=>void;onPlaying:(playing:boolean)=>void;onError?:(message:string)=>void;onSession?:(session:Session,queued:boolean)=>void};
type Voice={sources:AudioScheduledSourceNode[];nodes:AudioNode[];end:number};
type Graph={ctx:BaseAudioContext;mix:GainNode;melodic:GainNode;duck:GainNode;filter:BiquadFilterNode;output:GainNode;send:GainNode;echo:GainNode;feedback:GainNode;delay:DelayNode;noise:AudioBuffer;vocalWave:PeriodicWave;voices:Set<Voice>;offline:boolean;dispose:()=>void};
const channels:Channel[]=['kick','snare','hat','perc','bass','acid','chord','fx','vocal'];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const hz=(midi:number)=>440*Math.pow(2,(midi-69)/12),silent=.0001;
function random(seed:number){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}

/** Shared graph and voices ensure the exported WAV sounds like the live instrument. */
function makeGraph(ctx:BaseAudioContext,session:Session,volume:number,offline=false):Graph{
 const mix=ctx.createGain(),melodic=ctx.createGain(),duck=ctx.createGain(),output=ctx.createGain();output.gain.value=volume;
 const high=ctx.createBiquadFilter();high.type='highpass';high.frequency.value=29;high.Q.value=.5;
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=.65;
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-17;compressor.knee.value=16;compressor.ratio.value=3.5;compressor.attack.value=.006;compressor.release.value=.12;
 const saturation=ctx.createWaveShaper(),curve=new Float32Array(1024);
 for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.tanh(x*1.3)/Math.tanh(1.3)}
 saturation.curve=curve;saturation.oversample='2x';
 mix.connect(high).connect(filter).connect(compressor).connect(saturation).connect(output).connect(ctx.destination);melodic.connect(duck).connect(mix);
 const room=ctx.createConvolver(),send=ctx.createGain(),roomReturn=ctx.createGain();roomReturn.gain.value=.65;
 const impulse=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*1.1),ctx.sampleRate),rng=random(0x4b495354);
 for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=(rng()*2-1)*Math.pow(1-i/data.length,3.7)*.28}
 room.buffer=impulse;mix.connect(send).connect(room).connect(roomReturn).connect(high);
 const delay=ctx.createDelay(2),feedback=ctx.createGain(),echo=ctx.createGain(),echoTone=ctx.createBiquadFilter(),echoHigh=ctx.createBiquadFilter();
 echoTone.type='lowpass';echoTone.frequency.value=3100;echoTone.Q.value=.5;echoHigh.type='highpass';echoHigh.frequency.value=250;
 melodic.connect(echo).connect(delay).connect(echoTone).connect(echoHigh).connect(mix);echoHigh.connect(feedback).connect(delay);
 const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=noise.getChannelData(0),noiseRng=random(0x6b697374);
 for(let i=0;i<data.length;i++)data[i]=noiseRng()*2-1;
 // A gently tilted glottal spectrum, built once, supplies all original vowel chops.
 const real=new Float32Array(40),imaginary=new Float32Array(40);
 for(let harmonic=1;harmonic<40;harmonic++)imaginary[harmonic]=Math.pow(harmonic,-1.2)*(harmonic%2===0?.84:1);
 const vocalWave=ctx.createPeriodicWave(real,imaginary);
 const nodes:AudioNode[]=[mix,melodic,duck,high,filter,compressor,saturation,output,send,room,roomReturn,echo,delay,feedback,echoTone,echoHigh];
 const graph:Graph={ctx,mix,melodic,duck,filter,output,send,echo,feedback,delay,noise,vocalWave,voices:new Set(),offline,dispose(){
  for(const voice of graph.voices){voice.sources.forEach(source=>{try{source.stop()}catch{}});voice.nodes.forEach(node=>{try{node.disconnect()}catch{}})}
  graph.voices.clear();nodes.forEach(node=>{try{node.disconnect()}catch{}});
 }};
 setGraph(graph,session);return graph;
}
function setGraph(graph:Graph,session:Session,performance?:{x:number;y:number}){
 const at=graph.ctx.currentTime;
 const cutoff=performance?150+Math.pow(performance.x,1.65)*16000:650+Math.pow(session.filter,1.45)*15200;
 graph.filter.frequency.setTargetAtTime(cutoff,at,.045);graph.filter.Q.setTargetAtTime(performance?Math.min(2.1,.65+performance.y*1.4):.65,at,.05);
 graph.send.gain.setTargetAtTime(.015+session.space*.2+(performance?.y||0)*.12,at,.07);
 graph.echo.gain.setTargetAtTime(.015+session.space*.15+(performance?.y||0)*.37,at,.04);
 graph.feedback.gain.setTargetAtTime(.12+session.space*.18+(performance?.y||0)*.28,at,.05);
 graph.delay.delayTime.setTargetAtTime(60/session.bpm*.75,at,.06);
}
function track(graph:Graph,sources:AudioScheduledSourceNode[],nodes:AudioNode[],end:number){
 const voice:Voice={sources,nodes,end};graph.voices.add(voice);let remaining=sources.length;
 sources.forEach(source=>source.addEventListener('ended',()=>{if(--remaining)return;graph.voices.delete(voice);nodes.forEach(node=>{try{node.disconnect()}catch{}})},{once:true}));
}
function synth(graph:Graph,session:Session,channel:Channel,at:number,index:number,velocity=1){
 const ctx=graph.ctx;
 if(!graph.offline){for(const voice of graph.voices)if(voice.end<ctx.currentTime-.1){graph.voices.delete(voice);voice.nodes.forEach(node=>{try{node.disconnect()}catch{}})}if(graph.voices.size>72)return}
 const amp=ctx.createGain(),v=clamp(velocity,0,1)*(.68+session.energy*.32),noteOffsets=[0,0,7,3,0,10,7,5,0,3,12,7,5,0,10,7];
 const note=session.key+noteOffsets[(Math.floor(index/2)+(session.seed%7))%noteOffsets.length],stepSeconds=60/session.bpm/4;
 if(channel==='kick'){
  const osc=ctx.createOscillator(),click=ctx.createBufferSource(),clickAmp=ctx.createGain(),tone=ctx.createBiquadFilter();osc.type='sine';const root=hz(session.key-1);
  osc.frequency.setValueAtTime(140+session.energy*36,at);osc.frequency.exponentialRampToValueAtTime(root,at+.055);osc.frequency.exponentialRampToValueAtTime(root*.77,at+.3);
  amp.gain.setValueAtTime(silent,at);amp.gain.exponentialRampToValueAtTime(.67*v,at+.003);amp.gain.exponentialRampToValueAtTime(silent,at+.32);osc.connect(amp).connect(graph.mix);
  click.buffer=graph.noise;tone.type='highpass';tone.frequency.value=2300;clickAmp.gain.setValueAtTime(.06*v,at);clickAmp.gain.exponentialRampToValueAtTime(silent,at+.012);click.connect(tone).connect(clickAmp).connect(graph.mix);
  const duck=graph.duck.gain;duck.cancelScheduledValues(at);duck.setValueAtTime(.48,at);duck.exponentialRampToValueAtTime(1,at+.115);
  track(graph,[osc,click],[osc,amp,click,clickAmp,tone],at+.34);osc.start(at);osc.stop(at+.34);click.start(at,.25);click.stop(at+.016);
 }else if(channel==='snare'){
  const noise=ctx.createBufferSource(),tone=ctx.createBiquadFilter(),body=ctx.createOscillator(),bodyAmp=ctx.createGain();noise.buffer=graph.noise;tone.type='bandpass';tone.frequency.value=session.style==='garage'?1650:2100;tone.Q.value=.6;
  const length=session.style==='garage'?.17:.22;amp.gain.setValueAtTime(silent,at);amp.gain.linearRampToValueAtTime(.34*v,at+.002);
  if(session.style==='garage')for(const offset of [.011,.024]){amp.gain.setValueAtTime(.25*v,at+offset);amp.gain.exponentialRampToValueAtTime(.05*v+.0001,at+offset+.009)}
  amp.gain.exponentialRampToValueAtTime(silent,at+length);noise.connect(tone).connect(amp).connect(graph.mix);
  body.type='triangle';body.frequency.setValueAtTime(195,at);body.frequency.exponentialRampToValueAtTime(150,at+.06);bodyAmp.gain.setValueAtTime(.13*v,at);bodyAmp.gain.exponentialRampToValueAtTime(silent,at+.075);body.connect(bodyAmp).connect(graph.mix);
  track(graph,[noise,body],[noise,tone,amp,body,bodyAmp],at+length+.02);noise.start(at,.31);noise.stop(at+length+.02);body.start(at);body.stop(at+.08);
 }else if(channel==='hat'){
  const noise=ctx.createBufferSource(),tone=ctx.createBiquadFilter();noise.buffer=graph.noise;tone.type='highpass';tone.frequency.value=6500;tone.Q.value=.5;
  const open=index%8===6&&velocity>.75,length=open?.13:.038;amp.gain.setValueAtTime((open?.12:.075)*v,at);amp.gain.exponentialRampToValueAtTime(silent,at+length);noise.connect(tone).connect(amp).connect(graph.mix);
  track(graph,[noise],[noise,tone,amp],at+length+.015);noise.start(at,.53);noise.stop(at+length+.015);
 }else if(channel==='perc'){
  const osc=ctx.createOscillator(),tone=ctx.createBiquadFilter();osc.type='triangle';osc.frequency.setValueAtTime(index%4===0?510:730,at);osc.frequency.exponentialRampToValueAtTime(190,at+.045);tone.type='bandpass';tone.frequency.value=1200;tone.Q.value=1.1;
  amp.gain.setValueAtTime(.23*v,at);amp.gain.exponentialRampToValueAtTime(silent,at+.09);osc.connect(tone).connect(amp).connect(graph.mix);
  track(graph,[osc],[osc,tone,amp],at+.11);osc.start(at);osc.stop(at+.11);
 }else if(channel==='bass'){
  const sub=ctx.createOscillator(),texture=ctx.createOscillator(),tone=ctx.createBiquadFilter(),blend=ctx.createGain();sub.type='sine';texture.type=session.style==='garage'?'triangle':'sawtooth';sub.frequency.value=hz(note);texture.frequency.value=hz(note)*2;blend.gain.value=session.style==='dnb'?.16:.075;
  const duration=Math.min(.4,stepSeconds*(session.style==='garage'?1.8:2.3));tone.type='lowpass';tone.frequency.value=230+session.energy*350;tone.Q.value=.7;
  amp.gain.setValueAtTime(silent,at);amp.gain.exponentialRampToValueAtTime(.39*v,at+.009);amp.gain.setTargetAtTime(silent,at+duration*.55,.035);sub.connect(amp);texture.connect(blend).connect(amp);amp.connect(tone).connect(graph.melodic);
  track(graph,[sub,texture],[sub,texture,blend,amp,tone],at+duration+.12);sub.start(at);texture.start(at);sub.stop(at+duration+.12);texture.stop(at+duration+.12);
 }else if(channel==='acid'){
  const osc=ctx.createOscillator(),tone=ctx.createBiquadFilter();osc.type='sawtooth';osc.frequency.value=hz(note+12);tone.type='lowpass';tone.Q.value=session.style==='acid'?8.5:4.3;
  tone.frequency.setValueAtTime(480+session.filter*4300+session.energy*900,at);tone.frequency.exponentialRampToValueAtTime(170+session.filter*450,at+.14);amp.gain.setValueAtTime(silent,at);amp.gain.exponentialRampToValueAtTime(.075*v,at+.004);amp.gain.exponentialRampToValueAtTime(silent,at+.19);osc.connect(tone).connect(amp).connect(graph.melodic);
  track(graph,[osc],[osc,tone,amp],at+.21);osc.start(at);osc.stop(at+.21);
 }else if(channel==='chord'){
  const tone=ctx.createBiquadFilter(),sources:OscillatorNode[]=[];tone.type='lowpass';tone.frequency.value=1100+session.filter*4200;tone.Q.value=.6;const duration=session.style==='jungle'?.48:.28;
  amp.gain.setValueAtTime(silent,at);amp.gain.exponentialRampToValueAtTime(.052*v,at+.009);amp.gain.exponentialRampToValueAtTime(silent,at+duration);
  // Minor seventh / ninth voicings make every scene harmonically compatible.
  const intervals=session.style==='garage'?[12,15,22,26]:[12,15,19,22];
  for(const [voice,interval]of intervals.entries()){const osc=ctx.createOscillator();osc.type='triangle';osc.frequency.value=hz(session.key+interval);osc.detune.value=voice%2===0?-3:3;osc.connect(amp);sources.push(osc)}
  amp.connect(tone).connect(graph.melodic);track(graph,sources,[...sources,amp,tone],at+duration+.02);sources.forEach(osc=>{osc.start(at);osc.stop(at+duration+.02)});
 }else if(channel==='vocal'){
  // Parallel vocal-tract resonances turn a tuned glottal source into syllables;
  // no speech engine, recordings or external voice assets are involved.
  const source=ctx.createOscillator(),breath=ctx.createBufferSource(),breathAmp=ctx.createGain(),throat=ctx.createGain();
  const airy=session.vocalTone==='air',robot=session.vocalTone==='robot',ya=index%8>=4;
  const length=airy?.37:robot?.22:.255,root=hz(session.key+12+[0,7,3,10][(Math.floor(index/4)+(session.seed%4))%4]);
  source.setPeriodicWave(graph.vocalWave);source.frequency.setValueAtTime(root*(robot?1:.94),at);source.frequency.exponentialRampToValueAtTime(root,at+.027);
  if(!robot)source.frequency.exponentialRampToValueAtTime(root*.985,at+length);
  breath.buffer=graph.noise;breathAmp.gain.setValueAtTime(airy?.10:robot?.014:.06,at);
  breathAmp.gain.exponentialRampToValueAtTime(airy?.035:silent,at+(airy?length*.7:.038));
  source.connect(throat);breath.connect(breathAmp).connect(throat);
  const from=airy?[760,1190,2720]:robot?[380,2050,2900]:ya?[330,2140,2930]:[530,1840,2480];
  const to=airy?[650,1040,2540]:robot?[460,840,2690]:ya?[790,1210,2690]:[390,2250,2820];
  const bands:BiquadFilterNode[]=[],weights=[1.7,1.15,.7],nodes:AudioNode[]=[source,breath,breathAmp,throat,amp];
  for(let formant=0;formant<3;formant++){
   const band=ctx.createBiquadFilter(),weight=ctx.createGain();band.type='bandpass';
   band.Q.value=robot?9:airy?5.2:6.8;
   band.frequency.setValueAtTime(from[formant],at);band.frequency.exponentialRampToValueAtTime(to[formant],at+length*(robot?.42:.7));
   weight.gain.value=weights[formant];throat.connect(band).connect(weight).connect(amp);bands.push(band);nodes.push(band,weight);
  }
  const level=(airy?.38:robot?.40:.43)*v;
  amp.gain.setValueAtTime(silent,at);amp.gain.exponentialRampToValueAtTime(level,at+(airy?.028:.009));
  if(robot){
   amp.gain.setValueAtTime(level,at+.065);amp.gain.exponentialRampToValueAtTime(.008,at+.077);
   amp.gain.setValueAtTime(.008,at+.092);amp.gain.exponentialRampToValueAtTime(level*.76,at+.099);
  }
  amp.gain.exponentialRampToValueAtTime(silent,at+length);
  amp.connect(graph.melodic);
  const sources:AudioScheduledSourceNode[]=[source,breath];
  if(!robot){
   const vibrato=ctx.createOscillator(),depth=ctx.createGain();vibrato.frequency.value=airy?5.4:4.8;depth.gain.value=airy?7:3;
   vibrato.connect(depth).connect(source.detune);sources.push(vibrato);nodes.push(vibrato,depth);vibrato.start(at);vibrato.stop(at+length+.02);
  }
  track(graph,sources,nodes,at+length+.02);source.start(at);source.stop(at+length+.02);breath.start(at,.16);breath.stop(at+length+.02);
 }else{
  const noise=ctx.createBufferSource(),tone=ctx.createBiquadFilter();noise.buffer=graph.noise;tone.type='bandpass';tone.Q.value=3;tone.frequency.setValueAtTime(index%8===0?1800:4200,at);tone.frequency.exponentialRampToValueAtTime(450,at+.23);amp.gain.setValueAtTime(silent,at);amp.gain.linearRampToValueAtTime(.10*v,at+.018);amp.gain.exponentialRampToValueAtTime(silent,at+.27);noise.connect(tone).connect(amp).connect(graph.melodic);
  track(graph,[noise],[noise,tone,amp],at+.3);noise.start(at,.11);noise.stop(at+.3);
 }
}
function wav(buffer:AudioBuffer){
 const length=buffer.length,bytes=length*4,data=new ArrayBuffer(44+bytes),view=new DataView(data);
 const text=(at:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i))};
 text(0,'RIFF');view.setUint32(4,36+bytes,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes,true);
 const left=buffer.getChannelData(0),right=buffer.numberOfChannels>1?buffer.getChannelData(1):left;let peak=0;
 for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));const normalize=peak>0?Math.min(1.8,.88/peak):1,fade=Math.min(Math.floor(buffer.sampleRate*.004),length/2);
 for(let i=0,offset=44;i<length;i++){const env=Math.min(1,i/fade,(length-1-i)/fade);for(const sample of [left[i],right[i]]){const value=clamp(sample*normalize*env,-1,1);view.setInt16(offset,value<0?Math.round(value*32768):Math.round(value*32767),true);offset+=2}}
 return new Blob([data],{type:'audio/wav'});
}

export function createBSideAudio(callbacks:Callbacks){
 let context:AudioContext|undefined,graph:Graph|undefined,session=createSession(),queued:Session|undefined;
 let timer:ReturnType<typeof setInterval>|undefined,pendingStart:Promise<void>|undefined;
 let playing=false,destroyed=false,epoch=0,step=0,absoluteStep=0,nextTime=0,volume=.72,lastHit=-Infinity,fillUntil=-1;
 let performance:{x:number;y:number}|undefined;
 const visuals=new Set<ReturnType<typeof setTimeout>>(),retireTimers=new Set<ReturnType<typeof setTimeout>>();
 function notify(pending=false){callbacks.onSession?.(cloneSession(pending&&queued?queued:session),pending)}
 function applyQueued(){if(queued){session=queued;queued=undefined;if(graph)setGraph(graph,session,performance);notify()}}
 async function ready(){
  if(destroyed)throw new Error('Riapri la stanza per suonare.');
  if(!context){const Audio=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Audio)throw new Error('Questo browser non può suonare la console. Prova con Safari, Chrome o Firefox aggiornato.');context=new Audio({latencyHint:'interactive'})}
  if(context.state!=='running'&&context.state!=='closed')await context.resume();if(context.state!=='running')throw new Error('Tocca ancora play per attivare il suono.');if(!graph)graph=makeGraph(context,session,volume);return context;
 }
 function schedule(){
  if(!context||!graph||!playing)return;if(nextTime<context.currentTime-.15)nextTime=context.currentTime+.025;
  while(nextTime<context.currentTime+.10){
   if(step===0)applyQueued();const current=step,ticket=epoch,at=nextTime;
   channels.forEach(channel=>{if(session.muted[channel])return;let velocity=session.pattern[channel][current]||0;
    if(absoluteStep<fillUntil){if(channel==='snare'&&current%16>=12&&current%2===0)velocity=Math.max(velocity,.4+(current%4)*.14);if(channel==='hat'&&current%16>=8)velocity=Math.max(velocity,current%2===0?.65:.3);if(channel==='perc'&&current%16===15)velocity=.82}
    if(velocity>0)synth(graph!,session,channel,at,current,velocity);
   });
   const visual=setTimeout(()=>{visuals.delete(visual);if(playing&&epoch===ticket&&!destroyed)callbacks.onStep(current)},Math.max(0,(at-context.currentTime)*1000));visuals.add(visual);
   nextTime+=(60/session.bpm/4)*(current%2===0?1+session.swing:1-session.swing);step=(step+1)%32;absoluteStep++;
  }
 }
 function stop(){
  epoch++;pendingStart=undefined;clearInterval(timer);timer=undefined;visuals.forEach(clearTimeout);visuals.clear();const wasPlaying=playing;playing=false;step=0;absoluteStep=0;fillUntil=-1;performance=undefined;
  if(graph&&context){const old=graph;graph=undefined;const now=context.currentTime;old.output.gain.cancelScheduledValues(now);old.output.gain.setValueAtTime(old.output.gain.value,now);old.output.gain.linearRampToValueAtTime(0,now+.012);old.voices.forEach(voice=>voice.sources.forEach(source=>{try{source.stop(now+.016)}catch{}}));const retire=setTimeout(()=>{retireTimers.delete(retire);old.dispose()},28);retireTimers.add(retire)}
  applyQueued();callbacks.onStep(-1);if(wasPlaying)callbacks.onPlaying(false);
 }
 async function start(){
  if(playing||destroyed)return;if(pendingStart)return pendingStart;const ticket=epoch;
  const task=(async()=>{try{const ctx=await ready();if(destroyed||ticket!==epoch||playing)return;playing=true;step=0;absoluteStep=0;nextTime=ctx.currentTime+.035;callbacks.onPlaying(true);schedule();timer=setInterval(schedule,25)}catch(error){if(destroyed||ticket!==epoch)return;callbacks.onError?.(error instanceof Error?error.message:'Tocca play per riprovare.');throw error}})();
  pendingStart=task;try{await task}finally{if(pendingStart===task)pendingStart=undefined}
 }
 async function hit(channel:Channel){
  if(!channels.includes(channel)||destroyed)return;const ticket=epoch;
  try{const ctx=await ready();if(destroyed||ticket!==epoch||ctx.currentTime-lastHit<.012)return;lastHit=ctx.currentTime;synth(graph!,session,channel,ctx.currentTime+.005,step,1)}catch(error){if(ticket!==epoch||destroyed)return;callbacks.onError?.(error instanceof Error?error.message:'Tocca ancora il pad.');throw error}
 }
 function update(field:'bpm'|'swing'|'energy'|'space'|'filter'|'key',value:number){session[field]=value;if(queued)queued[field]=value;if(graph)setGraph(graph,session,performance)}
 return {
  start,stop,hit,getSession:()=>cloneSession(session),
  loadSession(value:Session,quantized=true){const fresh=cloneSession(value);if(playing&&quantized){queued=fresh;notify(true)}else{queued=undefined;session=fresh;if(graph)setGraph(graph,session,performance);notify()}},
  setStep(channel:Channel,index:number,value?:number){if(!channels.includes(channel)||!Number.isInteger(index)||index<0||index>31)return 0;const velocity=value===undefined?(session.pattern[channel][index]>0?0:.85):clamp(value,0,1);session.pattern[channel][index]=velocity;if(queued)queued.pattern[channel][index]=velocity;return velocity},
  setTempo:(value:number)=>update('bpm',clamp(value,110,180)),setSwing:(value:number)=>update('swing',clamp(value,0,.32)),setEnergy:(value:number)=>update('energy',clamp(value,0,1)),setSpace:(value:number)=>update('space',clamp(value,0,1)),setFilter:(value:number)=>update('filter',clamp(value,0,1)),setKey:(value:number)=>update('key',Math.round(clamp(value,36,47))),
  setVocalTone(value:VocalTone){if(['air','club','robot'].includes(value)){session.vocalTone=value;if(queued)queued.vocalTone=value}},
  setChannel(channel:Channel,active:boolean){if(channels.includes(channel)){session.muted[channel]=!active;if(queued)queued.muted[channel]=!active}},
  setVolume(value:number){volume=clamp(value,0,1);if(graph)graph.output.gain.setTargetAtTime(volume,graph.ctx.currentTime,.025)},
  setPerformance(x:number,y:number){performance={x:clamp(x,0,1),y:clamp(y,0,1)};if(graph)setGraph(graph,session,performance)},resetPerformance(){performance=undefined;if(graph)setGraph(graph,session)},
  fill(){if(playing)fillUntil=absoluteStep+16},
  async renderWav(bars=8):Promise<Blob>{
   const snapshot=cloneSession(session),count=Math.round(clamp(bars,2,8)),Offline=window.OfflineAudioContext||(window as typeof window&{webkitOfflineAudioContext?:typeof OfflineAudioContext}).webkitOfflineAudioContext;
   if(!Offline)throw new Error('Questo browser non esporta WAV. Puoi continuare a suonare o esportare da Safari, Chrome o Firefox aggiornato.');
   const offline=new Offline(2,Math.ceil(count*4*60/snapshot.bpm*44100),44100),render=makeGraph(offline,snapshot,.72,true);
   try{let at=0;for(let index=0;index<count*16;index++){const offset=index%32;channels.forEach(channel=>{const velocity=snapshot.pattern[channel][offset];if(!snapshot.muted[channel]&&velocity>0)synth(render,snapshot,channel,at,offset,velocity)});at+=(60/snapshot.bpm/4)*(offset%2===0?1+snapshot.swing:1-snapshot.swing)}const buffer=await offline.startRendering();if(destroyed)throw new Error('Riapri la stanza per esportare.');return wav(buffer)}finally{render.dispose()}
  },
  destroy(){if(destroyed)return;stop();destroyed=true;if(context&&context.state!=='closed')void context.close().catch(()=>{})},
 };
}
