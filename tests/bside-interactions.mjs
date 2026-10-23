import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';

const engine=process.env.BSIDE_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='chromium'?{channel:'chrome'}:{});
const base=process.env.BASE_URL||'http://127.0.0.1:4321';
const sessionKey='kist:bside:session:v2';
const channels=['kick','snare','hat','perc','bass','acid','chord','fx','vocal'];
await mkdir('screenshots/bside',{recursive:true});
const profiles=[
 {name:'small-mobile',width:320,height:740,touch:true},
 {name:'iphone',width:390,height:844,touch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'},
 {name:'landscape',width:844,height:390,touch:true},
 {name:'desktop',width:1440,height:1000},
];

async function instrument(page){
 await page.route('https://w.soundcloud.com/player/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>SoundCloud widget fixture</title>'}));
 await page.addInitScript(()=>{
  // Observe native audio: the engine and its real scheduling remain intact.
  window.bsideAudioTest={contexts:[],started:0,ended:0,speechCalls:0};
  if(window.speechSynthesis){const speak=window.speechSynthesis.speak.bind(window.speechSynthesis);window.speechSynthesis.speak=(...args)=>{window.bsideAudioTest.speechCalls++;return speak(...args)}}
  const NativeAudioContext=window.AudioContext||window.webkitAudioContext;
  if(NativeAudioContext){
   class ObservedAudioContext extends NativeAudioContext{
    constructor(...args){
     super(...args);window.bsideAudioTest.contexts.push(this);
     for(const method of ['createOscillator','createBufferSource']){
      const create=this[method].bind(this);
      this[method]=(...parameters)=>{
       const node=create(...parameters),start=node.start.bind(node);
       node.start=(...values)=>{window.bsideAudioTest.started++;return start(...values)};
       node.addEventListener('ended',()=>window.bsideAudioTest.ended++);
       return node;
      };
     }
    }
   }
   window.AudioContext=ObservedAudioContext;
   if(window.webkitAudioContext)window.webkitAudioContext=ObservedAudioContext;
  }
  window.playerTest={play:0,pause:0,widgets:0,latePlay:()=>{}};
  function Widget(){
   window.playerTest.widgets++;
   const events={};let position=0;
   window.playerTest.latePlay=()=>events.PLAY?.();
   return {
    bind:(name,fn)=>{events[name]=fn;if(name==='READY')setTimeout(fn,200)},
    play:()=>{window.playerTest.play++;events.PLAY?.();events.PLAY_PROGRESS?.({currentPosition:position})},
    pause:()=>{window.playerTest.pause++;events.PAUSE?.()},
    seekTo:value=>{position=value;events.PLAY_PROGRESS?.({currentPosition:value})},
    setVolume:()=>{},getDuration:fn=>fn(100000),getPosition:fn=>fn(position),getCurrentSound:fn=>fn({}),
   };
  }
  Widget.Events={READY:'READY',PLAY:'PLAY',PAUSE:'PAUSE',ERROR:'ERROR',FINISH:'FINISH',PLAY_PROGRESS:'PLAY_PROGRESS'};
  window.SC={Widget};
 });
}

async function expectStopped(page){
 await page.waitForTimeout(350);
 const before=await page.evaluate(()=>window.bsideAudioTest.started);
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>window.bsideAudioTest.started),before,'Stopped room kept scheduling audio');
}

async function expectFits(page,profile){
 const box=await page.locator('#bside-room').boundingBox();
 assert(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=profile.width+1&&box.y+box.height<=profile.height+1,'Room exceeds the viewport');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Room creates horizontal page overflow');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden','Page scroll remains unlocked behind the modal');
 const close=await page.locator('#bside-close').boundingBox();
 assert(close&&close.width>=40&&close.height>=40&&close.y>=0&&close.y+close.height<=profile.height+1,'Close button is clipped or too small');
}

async function expose(locator){
 // Use the actual disclosures rather than mutating values or bypassing a hidden control.
 const ancestors=await locator.locator('xpath=ancestor::details').all();
 for(const details of ancestors.reverse())if(!await details.evaluate(element=>element.open))await details.locator(':scope>summary').click();
}

async function setRange(locator,value){
 await expose(locator);
 const current=Number(await locator.inputValue());if(current===value)return;
 const min=Number(await locator.getAttribute('min')||0),max=Number(await locator.getAttribute('max')||100),step=Number(await locator.getAttribute('step')||1);
 const fromEnd=max-value<value-min;
 await locator.press(fromEnd?'End':'Home');
 const count=Math.round((fromEnd?max-value:value-min)/step);
 for(let i=0;i<count;i++)await locator.press(fromEnd?'ArrowLeft':'ArrowRight');
 assert.equal(Number(await locator.inputValue()),value);
}

function inspectWav(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF','Export is not RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WAVE','Export is not WAVE');
 let fmt,data;
 for(let offset=12;offset+8<=bytes.length;){
  const type=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
  assert(offset+8+size<=bytes.length,'WAV chunk exceeds its file');
  if(type==='fmt ')fmt=bytes.subarray(offset+8,offset+8+size);
  if(type==='data')data=bytes.subarray(offset+8,offset+8+size);
  offset+=8+size+(size%2);
 }
 assert(fmt&&data,'WAV lacks its audio format or samples');
 assert.equal(fmt.readUInt16LE(0),1,'WAV is not PCM');
 assert.equal(fmt.readUInt16LE(2),2,'WAV is not stereo');
 assert.equal(fmt.readUInt32LE(4),44100,'WAV sample rate is not 44.1 kHz');
 assert.equal(fmt.readUInt16LE(14),16,'WAV is not 16-bit');
 assert(data.length>100000,'Export has too few audio samples');
 let energy=0,peak=0,clipped=0;
 for(let i=0;i<data.length;i+=2){const value=data.readInt16LE(i)/32768;energy+=value*value;peak=Math.max(peak,Math.abs(value));if(Math.abs(value)>.999)clipped++}
 const samples=data.length/2,rms=Math.sqrt(energy/samples);
 assert(rms>.001,'Export contains silence');
 assert(clipped/samples<.02,'Export persistently clips');
 return {seconds:data.length/(44100*4),rms,peak,hash:createHash('sha256').update(data).digest('hex')};
}

async function exportWav(page){
 const downloadPromise=page.waitForEvent('download',{timeout:60000});await page.locator('#bside-export').click();
 const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.wav$/i);
 const file=await download.path();assert(file,'Rendered WAV is unavailable');
 const result=inspectWav(await readFile(file));assert(result.seconds>10&&result.seconds<25,'Export duration does not match an eight-bar loop');
 return result;
}

let sharedSession,sharedExpected;
try{
 for(const profile of profiles){
  const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},hasTouch:!!profile.touch,reducedMotion:profile.name==='desktop'?'no-preference':'reduce',...(profile.userAgent?{userAgent:profile.userAgent}:{})});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await instrument(page);await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Continua senza musica',exact:true}).click();
  const entry=page.locator('#bside-entry'),room=page.locator('#bside-room'),start=page.locator('#bside-start');
  const tempo=page.locator('#bside-tempo'),filter=page.locator('#bside-filter');
  assert(!await room.isVisible(),'Secret room opens without discovery');
  assert.equal(await entry.getAttribute('aria-label'),'Scopri il lato B');
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),0,'Hidden room allocated an AudioContext');
  await entry.scrollIntoViewIfNeeded();await entry.focus();await page.keyboard.press('Enter');
  await room.waitFor({state:'visible'});
  await room.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  assert.equal(await room.getAttribute('data-playing'),'false');
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),0,'Opening room made sound without consent');
  assert(await room.evaluate(el=>el.contains(document.activeElement)),'Focus did not enter the modal');
  assert(!await page.locator('#sound-dialog').isVisible(),'Normal invitation covers the secret room');
  await expectFits(page,profile);
  assert.equal(await room.locator('[data-bside-step]').count(),144,'Sequencer does not provide nine sixteen-step banks');
  assert.equal(await room.locator('[data-bside-pad]').count(),9);
  assert.equal(await room.locator('[data-bside-style]').count(),5);
  assert.equal(await room.locator('[data-bside-scene]').count(),4);
  assert.equal(await room.getAttribute('data-style'),'garage');assert.equal(await tempo.inputValue(),'132');
  assert.equal(await page.locator('#bside-vocal').inputValue(),'club');
  for(const [style,bpm] of [['jungle',164],['dnb',172],['acid',140],['breaks',138],['garage',132]]){
   await room.locator(`[data-bside-style="${style}"]`).click();
   await page.waitForFunction(value=>document.querySelector('#bside-room').dataset.style===value,style);
   assert.equal(Number(await tempo.inputValue()),bpm,'Style did not load its musical tempo');
  }
  for(const scene of ['warm','groove','peak','after']){
   await room.locator(`[data-bside-scene="${scene}"]`).click();assert.equal(await room.getAttribute('data-scene'),scene);
  }
  await room.locator('[data-bside-scene="groove"]').click();await room.locator('.bside-pattern>summary').click();
  const firstStep=room.locator('[data-bside-step][data-channel="kick"][data-step="0"]');
  const previous=await firstStep.getAttribute('aria-pressed');
  await firstStep.click();assert.equal(await firstStep.getAttribute('aria-pressed'),String(previous!=='true'));
  await firstStep.click();assert.equal(await firstStep.getAttribute('aria-pressed'),previous);
  await room.locator('#bside-bank-1').click();assert.equal(await room.locator('#bside-bank-1').getAttribute('aria-pressed'),'true');
  const secondBank=await firstStep.getAttribute('aria-pressed');
  await firstStep.click();assert.equal(await firstStep.getAttribute('aria-pressed'),String(secondBank!=='true'));
  await room.locator('#bside-bank-0').click();assert.equal(await firstStep.getAttribute('aria-pressed'),previous,'Editing bank two changed bank one');
  await room.locator('#bside-bank-1').click();assert.equal(await firstStep.getAttribute('aria-pressed'),String(secondBank!=='true'),'Switching banks lost its edit');
  await firstStep.click();await room.locator('#bside-bank-0').click();
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),0,'Editing or choosing a preset starts audio');
  await tempo.press('End');assert.equal(await tempo.inputValue(),'180');
  await filter.press('End');assert.equal(await filter.inputValue(),'100');
  const lights=page.locator('#bside-lights'),wasLit=await lights.getAttribute('aria-pressed');
  await lights.click();assert.notEqual(await lights.getAttribute('aria-pressed'),wasLit);
  const scoreBefore=await room.locator('[data-bside-step]').evaluateAll(steps=>steps.map(step=>step.getAttribute('aria-pressed')+':'+step.style.getPropertyValue('--velocity')).join(','));
  await page.locator('#bside-shuffle').click();
  assert.notEqual(await room.locator('[data-bside-step]').evaluateAll(steps=>steps.map(step=>step.getAttribute('aria-pressed')+':'+step.style.getPropertyValue('--velocity')).join(',')),scoreBefore,'Variation kept the same score');
  await room.locator('[data-bside-style="garage"]').click();await start.click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='true');
  await page.waitForFunction(()=>window.bsideAudioTest.started>3&&window.bsideAudioTest.contexts.some(context=>context.state==='running'));
  assert.match(await start.innerText(),/Ferma il ritmo/);
  const firstBeat=await room.getAttribute('data-step');
  await page.waitForFunction(previous=>document.querySelector('#bside-room').dataset.step!==previous,firstBeat);
  await room.locator('[data-bside-style="jungle"]').click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.style==='jungle',null,{timeout:6500});
  assert.equal(await tempo.inputValue(),'164','Quantized style did not reach the engine');
  for(const channel of channels)await room.locator(`[data-bside-pad="${channel}"]`).click();
  await page.locator('#bside-vocal').selectOption('robot');
  await room.locator('[data-bside-pad="vocal"]').click();
  assert.equal(await page.locator('#bside-vocal').inputValue(),'robot');
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.speechCalls),0,'Vocal pad used speech synthesis instead of the musical audio graph');
  const mute=room.locator('[data-bside-channel="acid"]'),muteState=await mute.getAttribute('aria-pressed');
  await mute.click();assert.notEqual(await mute.getAttribute('aria-pressed'),muteState);await mute.click();
  await page.locator('#bside-fill').click();
  const xy=page.locator('#bside-xy');await expose(xy);await xy.focus();
  await page.keyboard.down('Space');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');await page.keyboard.up('Space');
  await room.locator('[data-bside-style="garage"]').click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.style==='garage',null,{timeout:6500});
  // Show the primary surface rather than a scrolled advanced panel.
  await room.evaluate(el=>{el.querySelectorAll('details').forEach(details=>{details.open=false});el.scrollTop=0});
  await page.locator('#bside-close').scrollIntoViewIfNeeded();await page.screenshot({path:`screenshots/bside/${engine}-${profile.name}.png`});
  await start.click();await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='false');await expectStopped(page);
  const contexts=await page.evaluate(()=>window.bsideAudioTest.contexts.length);
  await start.click();await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='true');
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),contexts,'Restart leaks AudioContexts');
  await page.keyboard.press('Escape');assert(!await room.isVisible());await expectStopped(page);
  assert(await entry.evaluate(el=>document.activeElement===el),'Escape did not restore the secret opener focus');
  await entry.click();assert.equal(await room.getAttribute('data-playing'),'false','Reopening automatically started audio');

  if(profile.name==='desktop'){
   await room.locator('[data-bside-style="jungle"]').click();await room.locator('[data-bside-scene="after"]').click();
   await setRange(tempo,135);await setRange(page.locator('#bside-energy'),71);await setRange(page.locator('#bside-space'),44);await setRange(page.locator('#bside-swing'),22);
   await expose(page.locator('#bside-key'));await page.locator('#bside-key').selectOption('41');await page.locator('#bside-vocal').selectOption('robot');
   await room.locator('[data-bside-channel="fx"]').click();await page.locator('#bside-save').click();
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),sessionKey);
   assert(saved&&saved.version===2&&saved.style==='jungle'&&saved.scene==='after','Save did not persist the musical session');
   assert.equal(saved.bpm,135);assert.equal(saved.key,41);assert.equal(saved.muted.fx,true);assert.equal(saved.vocalTone,'robot');
   await page.reload({waitUntil:'domcontentloaded'});await room.waitFor({state:'visible'});
   assert.equal(await room.getAttribute('data-style'),'jungle');assert.equal(await room.getAttribute('data-scene'),'after');
   assert.equal(await tempo.inputValue(),'135');assert.equal(await page.locator('#bside-key').inputValue(),'41');
   assert.equal(await page.locator('#bside-vocal').inputValue(),'robot','Reload lost the synthesized vocal character');
   assert.equal(await room.locator('[data-bside-channel="fx"]').getAttribute('aria-pressed'),'false','Reload lost the channel mute');
   assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),0,'Restoring a session starts audio');
   if(engine==='chromium'){
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#bside-share').click();
    sharedSession=await page.evaluate(()=>navigator.clipboard.readText());sharedExpected=saved;assert.match(sharedSession,/#b-side=/,'Share did not include the musical session');
    console.log(JSON.stringify({engine,exportWav:await exportWav(page)}));
    // Isolate the voice so other musical channels cannot hide a silent or broken vocal.
    const originalMutes={};
    const vocalButton=room.locator('[data-bside-channel="vocal"]');await expose(vocalButton);
    for(const channel of channels){
     const button=room.locator(`[data-bside-channel="${channel}"]`),active=await button.getAttribute('aria-pressed')==='true';
     originalMutes[channel]=active;
     if(active!==(channel==='vocal'))await button.click();
    }
    const vocalRenders=[];
    for(const tone of ['air','club','robot']){
     await page.locator('#bside-vocal').selectOption(tone);
     const wav=await exportWav(page);
     assert(wav.rms>.001,`${tone} vocal render is inaudible`);assert(wav.peak<=.9,`${tone} vocal render has an excessive peak`);
     vocalRenders.push({tone,...wav});
    }
    assert.equal(new Set(vocalRenders.map(render=>render.hash)).size,3,'The three vocal characters render the same sound');
    assert.equal(await page.evaluate(()=>window.bsideAudioTest.speechCalls),0,'Vocal rendering used speech synthesis');
    for(const channel of channels){const button=room.locator(`[data-bside-channel="${channel}"]`);if((await button.getAttribute('aria-pressed')==='true')!==originalMutes[channel])await button.click()}
    console.log(JSON.stringify({engine,isolatedVocalRenders:vocalRenders}));
   }
  }
  await page.locator('#bside-close').click();assert(!await room.isVisible());
  assert(await entry.evaluate(el=>document.activeElement===el),'Close did not restore opener focus');
  // The existing SoundCloud set yields the groovebox and resumes only on exit.
  await page.locator('#hero-play').click();await page.waitForFunction(()=>document.body.classList.contains('sound-active'));
  const playsBefore=await page.evaluate(()=>window.playerTest.play);await entry.click();await start.click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='true'&&!document.body.classList.contains('sound-active'));
  const pausesBefore=await page.evaluate(()=>window.playerTest.pause);await page.evaluate(()=>window.playerTest.latePlay());
  await page.waitForFunction(previous=>window.playerTest.pause>previous,pausesBefore);
  assert(!await page.evaluate(()=>document.body.classList.contains('sound-active')),'Late SoundCloud playback overlaps the room');
  await page.locator('#bside-close').click();
  await page.waitForFunction(previous=>window.playerTest.play>previous&&document.body.classList.contains('sound-active'),playsBefore);
  assert(!await page.locator('#sound-dialog').isVisible(),'Returning to the set reopened entry invitation');await expectStopped(page);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine,profile:profile.name,realAudio:true,quietEntry:true,styles:true,quantized:true,sequencer:true,transport:true,focus:true,soundcloudRestore:true}));await page.close();
 }

 for(const suffix of ['/#b-side','/#b-side=invalid-session',...(sharedSession?[new URL(sharedSession).pathname+new URL(sharedSession).hash]:[])]){
  const deepPage=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const deepErrors=[];deepPage.on('pageerror',error=>deepErrors.push(error.message));await instrument(deepPage);
  await deepPage.goto(base.replace(/\/$/,'')+suffix,{waitUntil:'domcontentloaded'});
  await deepPage.locator('#bside-room').waitFor({state:'visible'});await deepPage.waitForTimeout(3800);
  assert(!await deepPage.locator('#sound-dialog').isVisible(),'Entry invitation interrupted a deep-linked room');
  assert.equal(await deepPage.evaluate(()=>window.bsideAudioTest.contexts.length),0,'Deep link starts audio');assert.equal(await deepPage.locator('#bside-room').getAttribute('data-playing'),'false');
  if(sharedSession&&suffix.includes(new URL(sharedSession).hash)){
   assert.equal(await deepPage.locator('#bside-room').getAttribute('data-style'),'jungle');assert.equal(await deepPage.locator('#bside-tempo').inputValue(),'135');assert.equal(await deepPage.locator('#bside-key').inputValue(),'41');
   assert.equal(await deepPage.locator('#bside-room').getAttribute('data-scene'),'after');
   assert.equal(await deepPage.locator('#bside-vocal').inputValue(),'robot','Shared link lost the synthesized vocal character');
   assert.equal(await deepPage.locator('[data-bside-channel="fx"]').getAttribute('aria-pressed'),'false','Shared link lost the channel mute');
   const sharedMask=await deepPage.locator('[data-bside-step]').evaluateAll(steps=>steps.map(step=>step.getAttribute('aria-pressed')==='true'));
   assert.deepEqual(sharedMask,channels.flatMap(channel=>sharedExpected.pattern[channel].slice(0,16).map(velocity=>velocity>0)),'Shared link changed the programmed score');
  }
  await deepPage.keyboard.press('Tab');assert(await deepPage.locator('#bside-room').evaluate(el=>el.contains(document.activeElement)),'Keyboard focus escaped the modal');
  await deepPage.keyboard.press('Escape');assert(!await deepPage.locator('#bside-room').isVisible());assert.deepEqual(deepErrors,[]);await deepPage.close();
 }
}finally{await browser.close()}
