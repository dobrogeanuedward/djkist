// Actual licensed skinned geometry. No synthetic BPM or access to SoundCloud PCM.
const canvas=document.querySelector<HTMLCanvasElement>('[data-festival]');
if(canvas){
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 let visible=false,initialized=false,paused=reduced,active=false;
 const control=document.getElementById('trip-motion')!;
 control.setAttribute('aria-pressed',String(paused));control.textContent=paused?'Anima il visual':'Ferma il visual';
 control.addEventListener('click',()=>{paused=!paused;control.setAttribute('aria-pressed',String(paused));control.textContent=paused?'Anima il visual':'Ferma il visual'});
 window.addEventListener('kist:audio',e=>{active=(e as CustomEvent).detail.playing});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!initialized){initialized=true;init().catch(error=>{console.warn('KIST visual:',error);canvas.dataset.renderer='fallback';control.hidden=true})}},{rootMargin:'100px'}).observe(canvas);
 async function init(){
  const T=await import('three');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const {clone}=await import('three/addons/utils/SkeletonUtils.js');
  const renderer=new T.WebGLRenderer({canvas:canvas!,alpha:true,antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();const camera=new T.PerspectiveCamera(36,1,.1,100);camera.position.set(0,.05,6.7);
  scene.add(new T.AmbientLight(0x8583cd,2));
  const light=new T.PointLight(0x73e8ff,35);light.position.set(-2,3,3);scene.add(light);
  const rim=new T.PointLight(0xd153ff,45);rim.position.set(2,-1,1);scene.add(rim);
  const solar=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},eclipse:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision mediump float;varying vec2 v;uniform float time,eclipse;void main(){vec2 p=(v-.5)*2.;float r=length(p);float ring=exp(-pow((r-.64)*24.,2.));float disk=(1.-smoothstep(.56,.65,r))*(1.-eclipse);float corona=exp(-pow((r-.66)*7.,2.))*.22;vec3 col=.55+.45*cos(6.28*(vec3(0.,.33,.66)+atan(p.y,p.x)*.12+time*.03));float a=ring+disk*.7+corona;gl_FragColor=vec4(col*a,a*.82);}`});
  const sun=new T.Mesh(new T.PlaneGeometry(4.9,4.9),solar);sun.position.z=-1;scene.add(sun);
  const gltf=await new GLTFLoader().loadAsync('/media/frequency-body.glb');
  const box=new T.Box3().setFromObject(gltf.scene);const size=box.getSize(new T.Vector3());const center=box.getCenter(new T.Vector3());
  const bodies:{group:any;material:any;mixer:any;bones:{node:any;base:any}[]}[]=[];
  for(let i=0;i<3;i++){
   const model=clone(gltf.scene);model.position.copy(center).multiplyScalar(-1);
   const group=new T.Group();group.add(model);group.scale.setScalar(2.9/size.y);scene.add(group);
   const material=new T.MeshPhysicalMaterial({color:i===0?0x9cf4ff:i===1?0xd6b2ff:0xffb776,metalness:.8,roughness:.28,iridescence:1,iridescenceIOR:1.4,transparent:true,opacity:i===0?1:.25,emissive:0x190926,emissiveIntensity:.7,depthWrite:i===0});
   const bones:{node:any;base:any}[]=[];model.traverse((node:any)=>{if(node.isMesh){node.material=material;node.frustumCulled=false}if(node.isBone)bones.push({node,base:node.quaternion.clone()})});
   const mixer=new T.AnimationMixer(model);if(gltf.animations[0])mixer.clipAction(gltf.animations[0]).play();
   bodies.push({group,material,mixer,bones});
  }
  function resize(){const r=canvas!.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
  new ResizeObserver(resize).observe(canvas!);resize();canvas!.dataset.renderer='webgl';canvas!.parentElement!.classList.add('webgl-ready');
  let raf=0,last=0,time=0,lost=false;
  const poses=[[-.9,1.2,.6,-.8],[1.6,-1.4,-.9,.3],[-1.7,.5,1.2,-.4],[.4,1.8,-1.1,1.3],[1.2,-1.8,.4,-1.1],[-.7,-.5,1.4,.8]];
  function draw(now:number){raf=0;if(lost)return;if(visible&&!document.hidden&&now-last>50){const dt=Math.min((now-last)/1000,.08);last=now;if(!paused)time+=dt*(active?1.35:.7);
   const phase=time/.68,poseIndex=Math.floor(phase)%poses.length;
   bodies.forEach((body,i)=>{const p=poses[(poseIndex+i*2)%poses.length];body.mixer.setTime((poseIndex*.31+i*.8)%1.8);
    body.bones.forEach(({node})=>{let a=0;if(node.name==='Skeleton_arm_joint_R')a=p[0];if(node.name==='Skeleton_arm_joint_L__4_')a=p[1];if(node.name==='leg_joint_R_1')a=p[2];if(node.name==='leg_joint_L_1')a=p[3];if(a)node.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),a*.7))});
    const arc=time*.6+i*2.1;body.group.position.set(i===0?Math.sin(time*.7)*.23:Math.sin(arc)*.6,Math.sin(time*1.2+i)*.1,i===0?.15:-.25);
    body.group.rotation.set(i===0?0:Math.sin(arc)*.15,Math.sin(time*.8+i)*.65+i*.3,Math.sin(time*.9+i)*.15);
    body.material.opacity=i===0?.88:.15+Math.sin(phase*Math.PI+i)*.08;
    body.material.color.setHSL((time*.045+i*.2)%1,.72,.7);
   });
   solar.uniforms.time.value=time;solar.uniforms.eclipse.value=.5+.5*Math.sin(time*.75);renderer.render(scene,camera);
  }if(!paused&&visible&&!document.hidden)raf=requestAnimationFrame(draw)}
  function resume(){if(!raf&&!lost&&visible&&!document.hidden){last=performance.now()-51;raf=requestAnimationFrame(draw)}}
  control.addEventListener('click',resume);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume()}).observe(canvas!);document.addEventListener('visibilitychange',resume);canvas!.addEventListener('webglcontextlost',()=>{lost=true;cancelAnimationFrame(raf);canvas!.parentElement!.classList.remove('webgl-ready');control.hidden=true});resume();
 }
}
export {};
