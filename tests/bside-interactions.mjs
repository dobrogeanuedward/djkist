import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const engine=process.env.BSIDE_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='chromium'?{channel:'chrome'}:{});
const base=process.env.BASE_URL||'http://127.0.0.1:4321';
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
  // Preserve the native graph and output: observe real audio, do not mock synthesis.
  window.bsideAudioTest={contexts:[],started:0,ended:0};
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

try{
 for(const profile of profiles){
  const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},hasTouch:!!profile.touch,reducedMotion:profile.name==='desktop'?'no-preference':'reduce',...(profile.userAgent?{userAgent:profile.userAgent}:{})});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await instrument(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Continua senza musica',exact:true}).click();
  const entry=page.locator('#bside-entry'),room=page.locator('#bside-room'),start=page.locator('#bside-start');
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
  assert.equal(await room.locator('[data-bside-step]').count(),64,'Sequencer does not provide four sixteen-step channels');
  assert.equal(await room.locator('[data-bside-pad]').count(),4);
  await room.locator('.bside-pattern>summary').click();
  const firstStep=room.locator('[data-bside-step][data-channel="kick"][data-step="0"]');
  const previous=await firstStep.getAttribute('aria-pressed');
  await firstStep.click();assert.equal(await firstStep.getAttribute('aria-pressed'),String(previous!=='true'));
  await firstStep.click();assert.equal(await firstStep.getAttribute('aria-pressed'),previous);
  // Editing the score remains silent until a deliberate play/pad gesture.
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),0);
  const tempo=page.locator('#bside-tempo'),filter=page.locator('#bside-filter');
  assert.equal(await tempo.inputValue(),'132');
  await tempo.press('End');assert.equal(await tempo.inputValue(),'150');
  await filter.press('End');assert.equal(await filter.inputValue(),'100');
  const lights=page.locator('#bside-lights'),wasLit=await lights.getAttribute('aria-pressed');
  await lights.click();assert.notEqual(await lights.getAttribute('aria-pressed'),wasLit);
  const scoreBefore=await room.locator('[data-bside-step]').evaluateAll(steps=>steps.map(step=>step.getAttribute('aria-pressed')).join(','));
  await page.locator('#bside-shuffle').click();
  assert.notEqual(await room.locator('[data-bside-step]').evaluateAll(steps=>steps.map(step=>step.getAttribute('aria-pressed')).join(',')),scoreBefore,'Shuffle kept the same score');
  await start.click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='true');
  await page.waitForFunction(()=>window.bsideAudioTest.started>3&&window.bsideAudioTest.contexts.some(context=>context.state==='running'));
  assert.match(await start.innerText(),/Ferma il ritmo/);
  const firstBeat=await room.getAttribute('data-step');
  await page.waitForFunction(previous=>document.querySelector('#bside-room').dataset.step!==previous,firstBeat);
  for(const channel of ['kick','clap','hat','acid'])await room.locator(`[data-bside-pad="${channel}"]`).click();
  const mute=room.locator('[data-bside-channel="acid"]'),muteState=await mute.getAttribute('aria-pressed');
  await mute.click();assert.notEqual(await mute.getAttribute('aria-pressed'),muteState);
  await mute.click();
  // Reset a flattering tempo/filter position for screenshots, using native keyboard controls.
  await tempo.press('Home');for(let n=0;n<22;n++)await tempo.press('ArrowRight');
  await filter.press('Home');for(let n=0;n<65;n++)await filter.press('ArrowRight');
  await room.locator('.bside-pattern>summary').click();
  await room.evaluate(el=>{el.scrollTop=0});
  await page.locator('#bside-close').scrollIntoViewIfNeeded();
  await page.screenshot({path:`screenshots/bside/${engine}-${profile.name}.png`});
  await start.click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='false');
  await expectStopped(page);
  const contexts=await page.evaluate(()=>window.bsideAudioTest.contexts.length);
  await start.click();await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='true');
  assert.equal(await page.evaluate(()=>window.bsideAudioTest.contexts.length),contexts,'Restart leaks AudioContexts');
  await page.keyboard.press('Escape');assert(!await room.isVisible());
  await expectStopped(page);
  assert(await entry.evaluate(el=>document.activeElement===el),'Escape did not restore the secret opener focus');
  await entry.click();assert.equal(await room.getAttribute('data-playing'),'false','Reopening automatically started audio');
  await page.locator('#bside-close').click();assert(!await room.isVisible());
  assert(await entry.evaluate(el=>document.activeElement===el),'Close did not restore opener focus');

  // Existing SoundCloud playback yields the room and resumes only on exit.
  await page.locator('#hero-play').click();
  await page.waitForFunction(()=>document.body.classList.contains('sound-active'));
  const playsBefore=await page.evaluate(()=>window.playerTest.play);
  await entry.click();await start.click();
  await page.waitForFunction(()=>document.querySelector('#bside-room').dataset.playing==='true'&&!document.body.classList.contains('sound-active'));
  const pausesBefore=await page.evaluate(()=>window.playerTest.pause);
  await page.evaluate(()=>window.playerTest.latePlay());
  await page.waitForFunction(previous=>window.playerTest.pause>previous,pausesBefore);
  assert(!await page.evaluate(()=>document.body.classList.contains('sound-active')),'Late SoundCloud playback overlaps the room');
  await page.locator('#bside-close').click();
  await page.waitForFunction(previous=>window.playerTest.play>previous&&document.body.classList.contains('sound-active'),playsBefore);
  assert(!await page.locator('#sound-dialog').isVisible(),'Returning to the set reopened entry invitation');
  await expectStopped(page);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine,profile:profile.name,realAudio:true,quietEntry:true,sequencer:true,transport:true,focus:true,soundcloudRestore:true}));
  await page.close();
 }
 const deepPage=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const deepErrors=[];deepPage.on('pageerror',error=>deepErrors.push(error.message));
 await instrument(deepPage);
 await deepPage.goto(base+'/#b-side',{waitUntil:'domcontentloaded'});
 await deepPage.locator('#bside-room').waitFor({state:'visible'});
 await deepPage.waitForTimeout(3800);
 assert(!await deepPage.locator('#sound-dialog').isVisible(),'Entry invitation interrupted the deep-linked room');
 assert.equal(await deepPage.evaluate(()=>window.bsideAudioTest.contexts.length),0,'Deep link starts audio');
 assert.equal(await deepPage.locator('#bside-room').getAttribute('data-playing'),'false');
 await deepPage.keyboard.press('Tab');
 assert(await deepPage.locator('#bside-room').evaluate(el=>el.contains(document.activeElement)),'Keyboard focus escaped the modal');
 await deepPage.keyboard.press('Escape');assert(!await deepPage.locator('#bside-room').isVisible());
 assert.deepEqual(deepErrors,[]);
 await deepPage.close();
}finally{await browser.close()}
