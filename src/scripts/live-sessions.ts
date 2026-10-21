const liveLibraries=new Set<()=>void>();
function initLiveLibraries(){
 document.querySelectorAll<HTMLElement>('[data-live-sessions]').forEach(root=>{
  if(root.dataset.liveBound)return;
  const choices=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-live-session-choice]'));
  const panels=Array.from(root.querySelectorAll<HTMLElement>('[data-live-session-panel]'));
  const navigation=root.querySelector<HTMLElement>('.live-library-choices');
  if(!choices.length||!navigation)return;
  root.dataset.liveBound='true';
  // Keep the original nodes: experience.ts owns their existing video click listeners.
  const posters=new Map<HTMLElement,Node[]>();
  panels.forEach(panel=>{const media=panel.querySelector<HTMLElement>('.session-media');if(media)posters.set(media,Array.from(media.childNodes))});
  function releaseInlineVideo(panel:HTMLElement){
   const media=panel.querySelector<HTMLElement>('.session-media');
   if(media?.querySelector('iframe')&&posters.has(media))media.replaceChildren(...posters.get(media)!);
  }
  function choose(button:HTMLButtonElement){
   const next=button.dataset.liveSessionChoice;
   if(!panels.some(panel=>panel.dataset.liveSessionPanel===next))return;
   panels.forEach(panel=>{
    const active=panel.dataset.liveSessionPanel===next;
    if(!active)releaseInlineVideo(panel);
    panel.hidden=!active;
   });
   choices.forEach(choice=>choice.setAttribute('aria-expanded',String(choice===button)));
   root.dataset.liveSession=next;
  }
  function onClick(event:MouseEvent){
   const button=event.target instanceof Element?event.target.closest<HTMLButtonElement>('[data-live-session-choice]'):null;
   if(button&&choices.includes(button))choose(button);
  }
  function onKey(event:KeyboardEvent){
   const current=choices.indexOf(document.activeElement as HTMLButtonElement);if(current<0)return;
   let next=current;
   if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(current+1)%choices.length;
   else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(current-1+choices.length)%choices.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=choices.length-1;
   else return;
   event.preventDefault();choices[next].focus();choose(choices[next]);
  }
  navigation.addEventListener('click',onClick);navigation.addEventListener('keydown',onKey);
  choose(choices.find(choice=>choice.getAttribute('aria-expanded')==='true')||choices[0]);
  const dispose=()=>{panels.forEach(releaseInlineVideo);navigation.removeEventListener('click',onClick);navigation.removeEventListener('keydown',onKey);delete root.dataset.liveBound;liveLibraries.delete(dispose)};
  liveLibraries.add(dispose);
 });
}
initLiveLibraries();
document.addEventListener('astro:page-load',initLiveLibraries);
document.addEventListener('astro:before-swap',()=>{for(const dispose of [...liveLibraries])dispose()});
export {};
