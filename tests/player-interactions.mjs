import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const engine=process.env.PLAYER_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='chromium'?{channel:'chrome'}:{});
const base=process.env.BASE_URL||'http://127.0.0.1:4321';
await mkdir('screenshots/player',{recursive:true});
const profiles=[
 {name:'small-mobile',width:320,height:740,touch:true},
 {name:'iphone',width:390,height:844,touch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'},
 {name:'desktop',width:1440,height:1000},
];
try{
 for(const profile of profiles){
  const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},hasTouch:!!profile.touch,reducedMotion:'reduce',...(profile.userAgent?{userAgent:profile.userAgent}:{})});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://w.soundcloud.com/player/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Widget contract fixture</title>'}));
  await page.addInitScript(()=>{
   window.playerTest={play:0,pause:0,widgets:0,position:0,volume:80,error:()=>{}};
   function Widget(){
    window.playerTest.widgets++;
    const events={};let position=0;
    window.playerTest.error=()=>events.ERROR?.();
    return {
     bind:(name,fn)=>{events[name]=fn;if(name==='READY')setTimeout(fn,250)},
     play:()=>{window.playerTest.play++;events.PLAY?.();events.PLAY_PROGRESS?.({currentPosition:position})},
     pause:()=>{window.playerTest.pause++;events.PAUSE?.()},
     seekTo:value=>{position=value;window.playerTest.position=value;events.PLAY_PROGRESS?.({currentPosition:value})},
     setVolume:value=>{window.playerTest.volume=value},getDuration:fn=>fn(100000),
     getPosition:fn=>fn(position),getCurrentSound:fn=>fn({}),
    };
   }
   Widget.Events={READY:'READY',PLAY:'PLAY',PAUSE:'PAUSE',ERROR:'ERROR',FINISH:'FINISH',PLAY_PROGRESS:'PLAY_PROGRESS'};
   window.SC={Widget};
  });
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Continua senza musica',exact:true}).click();
  const menu=page.locator('#header-nav-toggle');
  assert.equal(await menu.getAttribute('aria-expanded'),'false');
  assert(!await page.locator('#site-navigation').isVisible(),'Navigation leaked outside the dropdown');
  assert(!await page.locator('.site-header .header-actions').isVisible(),'Player leaked outside the dropdown');
  const headerBox=await page.locator('.site-header').boundingBox();
  assert(headerBox.width<=440&&headerBox.height<=86,'Header is not the unified compact component');
  await menu.click();assert(await page.locator('#site-navigation').isVisible());
  assert(await page.locator('.site-header [data-audio-play]').isVisible());
  await page.screenshot({path:`screenshots/player/${engine}-${profile.name}-dropdown.png`});
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'),'false');
  assert(await menu.evaluate(el=>document.activeElement===el));
  const title=page.locator('.track-title-link'),cover=page.locator('.sound-invitation>.mini-record');
  const details=page.locator('#track-dialog'),entry=page.locator('#sound-dialog'),play=page.locator('#hero-play');
  assert.equal(await page.locator('#player-mount iframe').count(),0,'Quiet entry loaded a widget');
  assert.match(await title.locator('strong').evaluate(el=>getComputedStyle(el).textDecorationLine),/underline/);
  await title.click();
  assert(await details.isVisible());assert(!await entry.isVisible());
  const selected=await title.innerText();
  assert.equal(await page.locator('#track-detail-title').innerText(),selected);
  const destination=await page.locator('.sound-invitation').getAttribute('data-url');
  assert.equal(await page.locator('.track-detail-source').getAttribute('href'),destination);
  assert.equal(await page.locator('.track-detail-source').getAttribute('target'),'_blank');
  assert.equal(await page.evaluate(()=>window.playerTest.widgets),0,'Details started playback');
  await page.locator('.track-detail-close').click();
  assert(await title.evaluate(el=>document.activeElement===el),'Close lost title focus');
  await cover.click();assert(await details.isVisible());
  await page.locator('#track-detail-cover').evaluate(image=>image.decode());
  const detailBox=await details.evaluate(el=>{const r=el.getBoundingClientRect(),cover=document.querySelector('#track-detail-cover').getBoundingClientRect();return {inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,art:cover.width,blur:getComputedStyle(el,'::backdrop').backdropFilter}});
  assert(detailBox.inside&&detailBox.art>=220,'Detail modal does not fit the screen');
  assert.match(detailBox.blur,/blur\(8px\)/);
  await page.screenshot({path:`screenshots/player/${engine}-${profile.name}-details.png`});
  await page.keyboard.press('Escape');assert(!await details.isVisible());
  assert(await cover.evaluate(el=>document.activeElement===el),'Escape lost cover focus');
  await play.click();
  // WebKit may finish the short fixture connection before click() returns.
  // Check the loading contract if still pending, then require the final ready state.
  if(await play.isDisabled())assert.equal(await page.locator('.sound-invitation').getAttribute('aria-busy'),'true');
  assert(!await entry.isVisible());
  await page.waitForFunction(()=>document.body.classList.contains('sound-active'));
  assert(!await play.isDisabled());
  assert.equal(await page.locator('.sound-invitation').getAttribute('aria-busy'),'false');
  assert.equal(await page.evaluate(()=>window.playerTest.play),1,'Direct first play requires a second tap');
  assert.equal(await page.locator('#player-mount iframe').count(),1);
  await title.click();
  const counts=await page.evaluate(()=>({play:window.playerTest.play,pause:window.playerTest.pause}));
  await page.mouse.click(2,2);assert(!await details.isVisible(),'Backdrop did not dismiss details');
  assert.deepEqual(await page.evaluate(()=>({play:window.playerTest.play,pause:window.playerTest.pause})),counts,'Details altered playback');
  await play.click();assert(!await page.evaluate(()=>document.body.classList.contains('sound-active')));
  const seek=page.locator('#player-seek-hero');
  await seek.press('Home');for(let n=0;n<24;n++)await seek.press('ArrowRight');
  assert.equal(await page.evaluate(()=>window.playerTest.position),24000,'Seek did not reach the widget');
  assert.equal(await page.locator('[data-audio-elapsed]').first().innerText(),'0:24');
  assert.equal(await page.locator('[data-audio-duration]').first().innerText(),'1:40');
  assert(await page.locator('[data-audio-seek]').evaluateAll(inputs=>inputs.every(el=>el.value==='24000')),'Both timelines must follow the seek');
  await play.click();assert(!await entry.isVisible());
  const volumeOpen=page.locator('[data-player-controls="hero"] [data-volume-open]');
  if(profile.name==='iphone'){
   assert(await page.locator('[data-volume-open]').evaluateAll(buttons=>buttons.every(button=>button.hidden)),'iPhone still exposes a volume control');
   assert(await page.locator('[data-audio-volume]').evaluateAll(inputs=>inputs.every(input=>input.disabled)));
  }else{
   await volumeOpen.click();
   const panel=page.locator('#player-volume-panel-hero'),volume=panel.locator('[data-audio-volume]');
   await panel.waitFor({state:'visible'});
   const box=await volume.boundingBox();assert(box.height>box.width*2,'Volume is not vertical');
   await volume.press('Home');for(let n=0;n<7;n++)await volume.press('ArrowUp');
   await page.waitForFunction(()=>window.playerTest.volume===35);
   assert(await page.locator('[data-audio-volume]').evaluateAll(inputs=>inputs.every(input=>input.value==='35')));
   await panel.locator('[data-audio-mute]').click();assert.equal(await page.evaluate(()=>window.playerTest.volume),0);
   await panel.locator('[data-audio-mute]').click();assert.equal(await page.evaluate(()=>window.playerTest.volume),35);
   await page.screenshot({path:`screenshots/player/${engine}-${profile.name}-volume.png`});
   await page.keyboard.press('Escape');assert(!await panel.isVisible());
   assert.equal(await volumeOpen.getAttribute('aria-expanded'),'false');
  }
  await page.evaluate(()=>document.querySelector('#sound').scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.site-header').classList.contains('is-scrolled'));
  await page.locator('#header-nav-toggle').click();
  await page.locator('#dock-open').click();assert(await details.isVisible());
  await page.locator('.track-detail-close').click();
  assert(await page.locator('#dock-open').evaluate(el=>document.activeElement===el),'Header focus was lost');
  await page.locator('#dock-toggle').click();assert(!await entry.isVisible());
  assert(!await page.evaluate(()=>document.body.classList.contains('sound-active')));
  await page.locator('#dock-toggle').click();
  await page.locator('[data-player-controls="header-active"] [data-audio-next]').click();
  await page.waitForFunction(previous=>document.querySelector('.sound-invitation').dataset.url!==previous,destination);
  await page.waitForFunction(()=>document.body.classList.contains('sound-active'));
  assert.equal(await page.evaluate(()=>window.playerTest.position),0,'Changing set kept the previous time');
  assert.equal(await page.locator('#player-mount iframe').count(),1,'Set change duplicated the widget');
  await page.locator('#dock-open').click();
  assert.equal(await page.locator('#track-detail-title').innerText(),await title.innerText());
  assert.notEqual(await page.locator('.track-detail-source').getAttribute('href'),destination);
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(()=>document.body.classList.contains('sound-active'));
  assert(!await entry.isVisible(),'Restored playback retained the invitation');
  assert.equal(await page.evaluate(()=>window.playerTest.volume),profile.name==='iphone'?80:35,'Volume was lost on refresh');
  await page.evaluate(()=>window.playerTest.error());
  await page.locator('[data-player-feedback]').waitFor({state:'visible'});
  assert(!await play.isDisabled());assert(!await entry.isVisible());
  await play.click();await page.waitForFunction(()=>document.body.classList.contains('sound-active'));
  assert(!await page.locator('[data-player-feedback]').isVisible());
  assert.equal(await page.locator('#player-mount iframe').count(),1,'Retry duplicated the widget');
  const credit=page.getByRole('link',{name:'DOGO Studio',exact:true});
  assert.equal(await credit.getAttribute('href'),'https://www.dogostudio.it/');
  assert.equal(await credit.getAttribute('target'),'_blank');
  const geometry=await page.locator('.sound-invitation').boundingBox();
  assert(profile.width>1050?geometry.height>=130&&geometry.height<=160&&geometry.width>=600:geometry.height<=112,'Hero player has the wrong device scale');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine,profile:profile.name,directPlay:true,seek:true,details:true,volume:profile.name==='iphone'?'hidden':'vertical + synchronized',retry:true,height:geometry.height}));
  await page.close();
 }
}finally{await browser.close()}
