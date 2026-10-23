import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';

const engine=process.env.MOTION_BROWSER||'chromium';
const base=process.env.BASE_URL||'http://127.0.0.1:4321';
const engines={chromium,firefox,webkit};
const browser=await engines[engine].launch(engine==='chromium'?{channel:'chrome'}:{});
const profiles=engine==='webkit'?
 [{name:'iphone-small',width:375,height:667,touch:true,mobile:true},{name:'iphone',width:390,height:844,touch:true,mobile:true},{name:'ipad',width:834,height:1194,touch:true,mobile:true},{name:'safari-desktop',width:1440,height:900}]:
 engine==='firefox'?
 [{name:'firefox-compact',width:390,height:844,touch:true},{name:'firefox-desktop',width:1440,height:1000}]:
 [{name:'android-small',width:320,height:740,touch:true,mobile:true},{name:'android',width:412,height:915,touch:true,mobile:true},{name:'tablet',width:820,height:1180,touch:true,mobile:true},{name:'hybrid',width:1280,height:800,touch:true},{name:'desktop',width:1440,height:1000}];
await mkdir('screenshots/motion',{recursive:true});
const results=[];
let lastTrace;

async function compactHero(page,label){
 const geometry=await page.locator('#home .sound-invitation').evaluate(player=>{const box=player.getBoundingClientRect(),hero=player.closest('.hero').getBoundingClientRect(),play=player.querySelector('#hero-play').getBoundingClientRect();return {height:box.height,inside:box.left>=hero.left&&box.right<=hero.right&&box.bottom<=hero.bottom,bottomGap:hero.bottom-box.bottom,padding:parseFloat(getComputedStyle(player.closest('.hero')).paddingBottom),play:play.width};});
 assert(geometry.height<=112&&geometry.inside&&geometry.bottomGap<=geometry.padding+30&&geometry.play>=44,`${label}: hero player is oversized or misplaced: ${JSON.stringify(geometry)}`);
 assert.equal(await page.locator('#slides-toggle,[data-video-toggle],#hero-listen').count(),0,`${label}: duplicate hero control remains`);
}

async function centerScene(page){
 await page.evaluate(()=>document.querySelector('#frequency-break').scrollIntoView({block:'center',behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('#kist-world')?.dataset.worldVisible==='true');
 await page.waitForFunction(()=>document.querySelector('.gate-character')?.dataset.pose==='groove');
}

// Sample rendered poses and sprite frames while the browser actually scrolls.
// One-pixel scrolls expose the mobile threshold regression; 55ms intervals
// expose timers that restart the run cycle before its first frame advances.
async function traceScroll(page,delta=1,interval=55,count=12){
 lastTrace=await page.evaluate(({delta,interval,count})=>new Promise(resolve=>{
  const character=document.querySelector('.gate-character');
  const sprite=character.querySelector('[data-gate-pose="run"] [data-kist-sprite]');
  const start=performance.now(),startY=scrollY,route=Number(character.dataset.routeProgress),samples=[],poseChanges=[],frameChanges=[],movements=[];
  let sampledY=scrollY;
  const movementTimer=setInterval(()=>{if(scrollY!==sampledY){sampledY=scrollY;movements.push({time:performance.now()-start,y:sampledY});}},16);
  const observer=new MutationObserver(()=>poseChanges.push({time:performance.now()-start,pose:character.dataset.pose}));
  observer.observe(character,{attributes:true,attributeFilter:['data-pose']});
  const frames=new MutationObserver(()=>frameChanges.push({time:performance.now()-start,pose:character.dataset.pose,frame:sprite.dataset.frame}));
  frames.observe(sprite,{attributes:true,attributeFilter:['data-frame']});
  let step=0,endedAt=Infinity;
  const timer=setInterval(()=>{scrollBy({top:delta,behavior:'instant'});if(++step===count){clearInterval(timer);endedAt=performance.now()-start;}},interval);
  function sample(){
   const time=performance.now()-start;
   samples.push({time,pose:character.dataset.pose,frame:sprite.dataset.frame,y:scrollY});
   if(time<Math.max(endedAt,movements.at(-1)?.time||0)+250&&time<5000)requestAnimationFrame(sample);
   else{observer.disconnect();frames.disconnect();clearInterval(movementTimer);resolve({samples,poseChanges,frameChanges,movements,endedAt,startY,endY:scrollY,route,endRoute:Number(character.dataset.routeProgress),facing:character.dataset.facing});}
  }
  requestAnimationFrame(sample);
 }),{delta,interval,count});
 return lastTrace;
}

function verifyTrace(trace,label,direction=1){
 assert(direction*(trace.endY-trace.startY)>5,`${label}: the page did not scroll`);
 assert(direction*(trace.endRoute-trace.route)>.003,`${label}: character did not follow the page`);
 const active=trace.samples.filter(s=>s.time>140&&s.time<trace.endedAt);
 const runs=active.filter(s=>s.pose==='run');
 assert(runs.length/active.length>.85,`${label}: running flickered or stayed idle (${runs.length}/${active.length})`);
 const runFrames=trace.frameChanges.filter(s=>s.pose==='run'&&s.time<trace.endedAt);
 assert(new Set(runFrames.map(s=>s.frame)).size>=3,`${label}: run sprite froze despite page movement`);
 // Measure the DOM transition, not the next sampled frame: Safari/Firefox may
 // composite less often on a busy device even while the stop timer fires on time.
 const lastMovement=trace.movements.at(-1)?.time||trace.endedAt;
 const stopped=trace.poseChanges.find(s=>s.time>lastMovement&&s.pose==='groove');
 assert(stopped&&stopped.time-lastMovement<220,`${label}: character kept running after scroll stopped`);
 assert.equal(trace.samples.at(-1).pose,'groove',`${label}: final pose must be idle`);
 assert.equal(trace.facing,direction>0?'right':'left',`${label}: wrong facing direction`);
}

try{
 for(const profile of profiles){
  const label=`${engine}/${profile.name}`;
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:!!profile.touch,isMobile:!!profile.mobile});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  // Older Safari and hybrid devices cannot rely on scrollend to release touch state.
  await page.addInitScript(()=>{
   const listen=window.addEventListener;
   window.addEventListener=function(type,...args){if(type!=='scrollend')return listen.call(this,type,...args);};
  });
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'Continua senza musica',exact:true}).click();
   await compactHero(page,label);
   await centerScene(page);
   await page.waitForFunction(()=>[...document.querySelectorAll('.gate-character [data-kist-sprite]')].every(sprite=>sprite.dataset.kistReady==='true'));
   assert.equal(await page.locator('.gate-character [data-kist-sprite]').count(),2,`${label}: both poses must be prepared`);

   const traces=[];
   traces.push(await traceScroll(page));verifyTrace(traces.at(-1),`${label}/slow-down`);
   traces.push(await traceScroll(page,-1));verifyTrace(traces.at(-1),`${label}/slow-up`,-1);
   traces.push(await traceScroll(page,2,16,24));verifyTrace(traces.at(-1),`${label}/trackpad`);

   // Repeated touches, cancelled touches and inertia must not permanently disable running.
   await page.evaluate(()=>window.dispatchEvent(new Event('touchstart')));
   traces.push(await traceScroll(page));verifyTrace(traces.at(-1),`${label}/touch`);
   await page.evaluate(()=>window.dispatchEvent(new Event('touchend')));
   traces.push(await traceScroll(page));verifyTrace(traces.at(-1),`${label}/inertia-after-touchend`);
   await page.evaluate(()=>window.dispatchEvent(new Event('touchcancel')));
   traces.push(await traceScroll(page,-1));verifyTrace(traces.at(-1),`${label}/after-touchcancel`,-1);

   await page.evaluate(()=>{const main=document.querySelector('main');main.setAttribute('tabindex','-1');main.focus({preventScroll:true});});
   const beforeKey=await page.evaluate(()=>scrollY);
   await page.keyboard.press('ArrowDown');
   await page.waitForFunction(()=>document.querySelector('.gate-character')?.dataset.pose==='run',null,{timeout:2000});
   assert(await page.evaluate(()=>scrollY)>beforeKey,`${label}: keyboard scroll did not move`);
   await page.waitForFunction(()=>document.querySelector('.gate-character')?.dataset.pose==='groove');

   // A real Chromium touch gesture exercises compositor scrolling and momentum.
   if(engine==='chromium'&&profile.mobile){
    await centerScene(page);
    const session=await context.newCDPSession(page),x=profile.width/2,y=profile.height*.65;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=9;step++){
     await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*10}]});
     await page.waitForTimeout(25);
    }
    assert.equal(await page.locator('.gate-character').getAttribute('data-pose'),'run',`${label}: native touch did not run`);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('.gate-character')?.dataset.pose==='groove');
    await session.detach();
   }

   await centerScene(page);
   await page.evaluate(()=>document.querySelector('#sound-dialog').showModal());
   await page.waitForTimeout(100);
   const paused=await page.locator('#kist-world').getAttribute('data-world-frame');
   const pausedSprites=await page.locator('.gate-character [data-kist-sprite]').evaluateAll(items=>items.map(item=>item.dataset.frame).join(','));
   await page.waitForTimeout(250);
   assert.equal(await page.locator('#kist-world').getAttribute('data-world-frame'),paused,`${label}: scene ran behind a dialog`);
   assert.equal(await page.locator('.gate-character [data-kist-sprite]').evaluateAll(items=>items.map(item=>item.dataset.frame).join(',')),pausedSprites,`${label}: sprites ran behind a dialog`);
   await page.getByRole('button',{name:'Chiudi il player',exact:true}).click();
   await page.waitForFunction(frame=>document.querySelector('#kist-world')?.dataset.worldFrame!==frame,paused);
   verifyTrace(await traceScroll(page),`${label}/resume-after-dialog`);

   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#kist-world')?.dataset.worldVisible==='false');
   const offscreen=await page.locator('#kist-world').getAttribute('data-world-frame');
   await page.waitForTimeout(200);
   assert.equal(await page.locator('#kist-world').getAttribute('data-world-frame'),offscreen,`${label}: scene ran offscreen`);
   await centerScene(page);
   verifyTrace(await traceScroll(page),`${label}/reentry`);

   await page.setViewportSize({width:profile.height,height:profile.width});
   await compactHero(page,label+'/rotated');
   await centerScene(page);
   await page.waitForTimeout(180);
   const inside=await page.locator('.gate-character').evaluate(character=>{const box=character.getBoundingClientRect(),scene=character.closest('section').getBoundingClientRect();return box.left>=scene.left-1&&box.right<=scene.right+1&&box.top>=scene.top&&box.bottom<=scene.bottom;});
   assert(inside,`${label}: character escaped scene after rotation`);
   verifyTrace(await traceScroll(page,-1),`${label}/rotated`,-1);

   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.querySelector('#kist-world')?.dataset.worldPaused==='true');
   const calm=await page.locator('#kist-world').getAttribute('data-world-frame');
   await page.evaluate(()=>scrollBy({top:30,behavior:'instant'}));
   await page.waitForTimeout(220);
   assert.equal(await page.locator('#kist-world').getAttribute('data-world-frame'),calm,`${label}: reduced motion still animated`);
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.waitForFunction(()=>document.querySelector('#kist-world')?.dataset.worldPaused==='false');
   verifyTrace(await traceScroll(page,-1),`${label}/resume-after-reduced-motion`,-1);
   assert.deepEqual(errors,[],`${label}: JavaScript errors`);

   results.push({profile:label,status:'passed',scrollCases:10,stopTimesMs:traces.map(trace=>{const lastMovement=trace.movements.at(-1)?.time||trace.endedAt;return Math.round(trace.poseChanges.find(s=>s.time>lastMovement&&s.pose==='groove').time-lastMovement);})});
   await page.screenshot({path:`screenshots/motion/${engine}-${profile.name}.png`});
   console.log(JSON.stringify(results.at(-1)));
  }catch(error){
   const state=await page.evaluate(()=>({y:scrollY,width:innerWidth,height:innerHeight,hidden:document.hidden,world:{...document.querySelector('#kist-world')?.dataset},gate:document.querySelector('#frequency-break')?.getBoundingClientRect().toJSON(),character:document.querySelector('.gate-character')?.getBoundingClientRect().toJSON(),sprites:[...document.querySelectorAll('.gate-character [data-kist-sprite]')].map(sprite=>({data:{...sprite.dataset},rect:sprite.getBoundingClientRect().toJSON(),display:getComputedStyle(sprite).display})),dialogs:[...document.querySelectorAll('dialog[open]')].map(dialog=>dialog.id),entranceHidden:document.querySelector('.entrance')?.hidden})).catch(()=>null);
   await writeFile(`screenshots/motion/${engine}-${profile.name}-failure.json`,JSON.stringify({error:String(error),state,trace:lastTrace},null,2));
   await page.screenshot({path:`screenshots/motion/${engine}-${profile.name}-failure.png`}).catch(()=>{});
   throw error;
  }finally{await context.close();}
 }
}finally{
 await writeFile(`screenshots/motion/${engine}-results.json`,JSON.stringify(results,null,2));
 await browser.close();
}
