document.querySelectorAll<HTMLCanvasElement>('[data-prism]').forEach(canvas=>{
const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(gl){
const vertex='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const fragment='precision mediump float;uniform vec2 uRes;uniform float uTime,uEnergy,uPhase;uniform vec2 uPointer;vec3 spectrum(float x){return .5+.5*cos(6.28318*(vec3(.03,.36,.68)+x));}mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}void main(){vec2 p=(gl_FragCoord.xy*2.-uRes)/min(uRes.x,uRes.y);p+=uPointer*.14;float t=uTime*.13+uPhase*.09;p*=rot(t*.21);vec2 q=p;float field=0.;for(int i=0;i<5;i++){q=abs(q)/max(dot(q,q),.25)-.85;q*=rot(.65+t*.13);field+=exp(-abs(q.x+q.y)*3.)/float(i+1);}float facet=abs(sin(p.x*2.3+p.y*1.4+t));float beams=pow(max(0.,1.-abs(p.y*.45-sin(p.x*.8+t)*.6)),7.);vec3 c=spectrum(field*.22+t*.07+uPhase*.025);c*=pow(field*.35,1.7)*(.27+uEnergy*.18)+beams*(.1+uEnergy*.1);c=mix(c,vec3(.62,.83,.3)*facet,.12);float vignette=1.-smoothstep(.35,1.9,length(p*.7));gl_FragColor=vec4(c*vignette,.92);}';
function shader(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){gl!.deleteShader(s);return null}return s}
const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
if(vs&&fs){
const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
if(gl.getProgramParameter(program,gl.LINK_STATUS)){
gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
const uniforms=Object.fromEntries(['uRes','uTime','uEnergy','uPhase','uPointer'].map(n=>[n,gl.getUniformLocation(program,n)]));
let energy=0,target=0,phase=0,visible=true,frame=0,then=0;
const pointer={x:0,y:0};
function size(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio,1.25);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl!.viewport(0,0,canvas.width,canvas.height)}
new ResizeObserver(size).observe(canvas);
window.addEventListener('kist:audio',(e)=>{const d=(e as CustomEvent<{playing:boolean;position?:number}>).detail;target=d.playing?1:0;if(d.position!==undefined)phase=d.position/60000});
canvas.parentElement?.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5},{passive:true});
function draw(now:number){frame=0;if(!visible||document.hidden)return;if(now-then>40||reduced){then=now;energy+=(target-energy)*.04;gl!.uniform2f(uniforms.uRes,canvas.width,canvas.height);gl!.uniform1f(uniforms.uTime,reduced?0:now/1000);gl!.uniform1f(uniforms.uEnergy,energy);gl!.uniform1f(uniforms.uPhase,phase);gl!.uniform2f(uniforms.uPointer,pointer.x,pointer.y);gl!.drawArrays(gl!.TRIANGLES,0,6)}if(!reduced)frame=requestAnimationFrame(draw)}
function resume(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw)}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else if(frame){cancelAnimationFrame(frame);frame=0}}).observe(canvas);
document.addEventListener('visibilitychange',resume);size();resume();
canvas.addEventListener('webglcontextlost',()=>{if(frame)cancelAnimationFrame(frame)});
}
}
}
});
export {};
