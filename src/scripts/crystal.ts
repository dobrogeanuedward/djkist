const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
document.querySelectorAll<HTMLCanvasElement>('[data-crystal]').forEach(canvas=>{
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'});if(!gl){canvas.dataset.renderer='fallback';return;}
 const vs=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
 const fs=`precision mediump float;uniform vec2 res,pointer;uniform float time,energy,phase;
 mat2 R(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
 vec3 palette(float t){return .55+.45*cos(6.28318*(vec3(.0,.33,.67)+t));}
 float shape(vec3 p){p.xz*=R(time*.23+pointer.x*.6);p.xy*=R(.4+sin(time*.2)*.2+pointer.y*.4);return (abs(p.x)+abs(p.y)+abs(p.z)-1.25)*.57735;}
 void main(){vec2 uv=(gl_FragCoord.xy*2.-res)/min(res.x,res.y);vec3 ro=vec3(0.,0.,4.5),rd=normalize(vec3(uv,-3.));float travel=0.;float glow=0.;vec3 p;
 for(int i=0;i<48;i++){p=ro+rd*travel;float d=shape(p);glow+=.012/(.04+abs(d));if(d<.002||travel>7.)break;travel+=d*.75;}
 vec3 c=vec3(0.);if(travel<7.){vec2 e=vec2(.003,0.);vec3 n=normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));float fres=pow(1.-max(0.,dot(n,-rd)),2.);float stripe=pow(.5+.5*sin((p.x+p.y)*24.+time*(.4+energy*.8)+phase),8.);c=palette(n.x*.5+n.y*.3+time*.025+phase*.07)*(.35+fres*1.4+stripe*.6);c+=vec3(.6,.8,1.)*pow(max(0.,dot(reflect(rd,n),normalize(vec3(-1.,2.,3.)))),18.);}
 c+=palette(time*.04+length(uv)*.3)*glow*.045*(.3+energy*.7);c*=1.-smoothstep(.6,1.6,length(uv));gl_FragColor=vec4(c,1.);}`;
 function compile(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){canvas.dataset.renderer='shader-error';console.warn('KIST crystal:',gl!.getShaderInfoLog(s));return null}return s}
 const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);if(!v||!f)return;
 const program=gl.createProgram()!;gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);canvas.dataset.renderer='webgl';canvas.parentElement?.classList.add('webgl-ready');
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const u=Object.fromEntries(['res','pointer','time','energy','phase'].map(n=>[n,gl.getUniformLocation(program,n)]));let visible=false,raf=0,last=0,target=0,energy=0,phase=0,x=0,y=0;
 window.addEventListener('kist:pulse',e=>{const d=(e as CustomEvent<{pulse:number}>).detail;target=.3+d.pulse*1.4});
 function size(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio,1.25);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl!.viewport(0,0,canvas.width,canvas.height)}
 function draw(now:number){raf=0;if(!visible||document.hidden)return;if(now-last>50||reduced){last=now;energy+=(target-energy)*.08;gl!.uniform2f(u.res,canvas.width,canvas.height);gl!.uniform2f(u.pointer,x,y);gl!.uniform1f(u.time,reduced?0:now/1000);gl!.uniform1f(u.energy,energy);gl!.uniform1f(u.phase,phase);gl!.drawArrays(gl!.TRIANGLES,0,6)}if(!reduced)raf=requestAnimationFrame(draw)}
 function resume(){if(visible&&!document.hidden&&!raf)raf=requestAnimationFrame(draw)}
 new ResizeObserver(size).observe(canvas);new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)resume();else{cancelAnimationFrame(raf);raf=0}}).observe(canvas);document.addEventListener('visibilitychange',resume);
 canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();x=(e.clientX-r.left)/r.width-.5;y=(e.clientY-r.top)/r.height-.5},{passive:true});window.addEventListener('kist:audio',e=>{const d=(e as CustomEvent<{playing:boolean;position?:number}>).detail;target=d.playing?1:0;if(d.position!==undefined)phase=d.position/60000;document.body.classList.toggle('sound-active',d.playing)});canvas.addEventListener('webglcontextlost',()=>{cancelAnimationFrame(raf);raf=0});size();
});
export {};
