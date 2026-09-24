import * as T from 'three';
/**
 * Henry's workshop cat: a sitting brown mackerel tabby with a white bib and mittens.
 * The body, head and ears are signed-distance sculptures (smooth unions of ellipsoids and
 * round cones) meshed with surface nets, so the silhouette is one continuous animal rather
 * than stacked ovals. Coat colour is baked per vertex; fur is rendered as instanced shells
 * (one draw per part) with strands that thin towards the tips. Animation is a pure function
 * of the shared clock: breathing, a slow look-round, ear flicks, blinks and a tail-tip twitch.
 * Units are metres; the cat faces +Z with its paws on y=0.
 */
type V3=[number,number,number];
const smin=(a:number,b:number,k:number)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
function ellipsoid(p:V3,c:V3,r:V3){const x=(p[0]-c[0])/r[0],y=(p[1]-c[1])/r[1],z=(p[2]-c[2])/r[2],k0=Math.hypot(x,y,z),k1=Math.hypot(x/r[0],y/r[1],z/r[2]);return k1>0?k0*(k0-1)/k1:-Math.min(...r);}
function roundCone(p:V3,a:V3,b:V3,ra:number,rb:number){
 const ba=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],pa=[p[0]-a[0],p[1]-a[1],p[2]-a[2]],l2=ba[0]**2+ba[1]**2+ba[2]**2;
 const t=Math.max(0,Math.min(1,(pa[0]*ba[0]+pa[1]*ba[1]+pa[2]*ba[2])/l2));
 return Math.hypot(pa[0]-ba[0]*t,pa[1]-ba[1]*t,pa[2]-ba[2]*t)-(ra+(rb-ra)*t);
}
const mirror=(p:V3):V3=>[Math.abs(p[0]),p[1],p[2]];

// Sitting body: haunches, belly, upright chest, forelegs, paws and hind feet.
function bodySdf(p:V3){
 const m=mirror(p);
 let d=ellipsoid(p,[0,.092,-.058],[.068,.086,.104]);
 d=smin(d,ellipsoid(m,[.045,.08,-.066],[.049,.074,.088]),.035);
 d=smin(d,roundCone(p,[0,.11,-.02],[0,.205,.045],.06,.049),.05);
 d=smin(d,ellipsoid(p,[0,.17,.05],[.045,.058,.04]),.03);
 d=smin(d,roundCone(m,[.027,.165,.055],[.029,.022,.076],.019,.0135),.018);
 d=smin(d,ellipsoid(m,[.03,.011,.087],[.0175,.011,.024]),.012);
 d=smin(d,ellipsoid(m,[.054,.012,.012],[.02,.012,.05]),.016);
 d=smin(d,roundCone(p,[0,.2,.045],[0,.24,.068],.047,.04),.03);
 return d;
}
// Head: skull, cheeks, muzzle pads and chin; the eye sockets are carved so the eyes seat in.
function headSdf(p:V3){
 const m=mirror(p);
 let d=ellipsoid(p,[0,.262,.072],[.047,.041,.043]);
 d=smin(d,ellipsoid(m,[.026,.248,.087],[.031,.027,.029]),.02);
 d=smin(d,ellipsoid(m,[.011,.24,.113],[.015,.0125,.013]),.01);
 d=smin(d,ellipsoid(p,[0,.229,.104],[.014,.009,.013]),.01);
 d=smin(d,ellipsoid(p,[0,.252,.116],[.009,.012,.008]),.008);
 d=Math.max(d,-ellipsoid(m,[.0205,.266,.1135],[.0105,.0085,.006]));
 return d;
}
// Ear: a thin, slightly cupped triangle leaning outwards (local frame, base at origin).
function earSdf(p:V3){
 const [x,y,z]=p;if(y<-.004)return .004+(-.004-y);
 const h=.049,w=.027*(1-Math.max(0,Math.min(1,y/h))),cup=.0025+.0045*(1-y/h)*(1-(x/Math.max(w,1e-4))**2);
 const side=Math.abs(x)-w,thick=Math.abs(z+cup*.6)-.0022*(1-y/h*.6);
 return Math.max(side,thick,y-h);
}

function surfaceNets(sdf:(p:V3)=>number,min:V3,max:V3,cell:number){
 const n=[0,1,2].map(i=>Math.ceil((max[i]-min[i])/cell)+1),[nx,ny,nz]=n,values=new Float32Array(nx*ny*nz);
 const at=(i:number,j:number,k:number)=>i+nx*(j+ny*k);
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)values[at(i,j,k)]=sdf([min[0]+i*cell,min[1]+j*cell,min[2]+k*cell]);
 const cellIndex=new Int32Array((nx-1)*(ny-1)*(nz-1)).fill(-1),ci=(i:number,j:number,k:number)=>i+(nx-1)*(j+(ny-1)*k);
 const pos:number[]=[],idx:number[]=[];
 const corners=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],edges=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
 for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  const v=corners.map(([a,b,c])=>values[at(i+a,j+b,k+c)]);let inside=0;for(const x of v)if(x<0)inside++;
  if(inside===0||inside===8)continue;
  let sx=0,sy=0,sz=0,count=0;
  for(const [a,b] of edges){if((v[a]<0)===(v[b]<0))continue;const t=v[a]/(v[a]-v[b]),ca=corners[a],cb=corners[b];
   sx+=ca[0]+(cb[0]-ca[0])*t;sy+=ca[1]+(cb[1]-ca[1])*t;sz+=ca[2]+(cb[2]-ca[2])*t;count++;}
  cellIndex[ci(i,j,k)]=pos.length/3;pos.push(min[0]+(i+sx/count)*cell,min[1]+(j+sy/count)*cell,min[2]+(k+sz/count)*cell);
 }
 const quad=(a:number,b:number,c:number,d:number,flip:boolean)=>{if(a<0||b<0||c<0||d<0)return;if(flip)idx.push(a,c,b,a,d,c);else idx.push(a,b,c,a,c,d);};
 for(let k=1;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=values[at(i,j,k)],b=values[at(i+1,j,k)];if((a<0)===(b<0))continue;quad(cellIndex[ci(i,j-1,k-1)],cellIndex[ci(i,j,k-1)],cellIndex[ci(i,j,k)],cellIndex[ci(i,j-1,k)],a<0);}
 for(let k=1;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=1;i<nx-1;i++){const a=values[at(i,j,k)],b=values[at(i,j+1,k)];if((a<0)===(b<0))continue;quad(cellIndex[ci(i-1,j,k-1)],cellIndex[ci(i-1,j,k)],cellIndex[ci(i,j,k)],cellIndex[ci(i,j,k-1)],a<0);}
 for(let k=0;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){const a=values[at(i,j,k)],b=values[at(i,j,k+1)];if((a<0)===(b<0))continue;quad(cellIndex[ci(i-1,j-1,k)],cellIndex[ci(i,j-1,k)],cellIndex[ci(i,j,k)],cellIndex[ci(i-1,j,k)],a<0);}
 // Smooth normals from the field gradient; fix any winding that disagrees with it.
 const normals=new Float32Array(pos.length),e=cell*.5;
 for(let v=0;v<pos.length;v+=3){const p:V3=[pos[v],pos[v+1],pos[v+2]];
  const g=[sdf([p[0]+e,p[1],p[2]])-sdf([p[0]-e,p[1],p[2]]),sdf([p[0],p[1]+e,p[2]])-sdf([p[0],p[1]-e,p[2]]),sdf([p[0],p[1],p[2]+e])-sdf([p[0],p[1],p[2]-e])],l=Math.hypot(...g)||1;
  normals[v]=g[0]/l;normals[v+1]=g[1]/l;normals[v+2]=g[2]/l;}
 for(let t=0;t<idx.length;t+=3){const [a,b,c]=[idx[t]*3,idx[t+1]*3,idx[t+2]*3];
  const u=[pos[b]-pos[a],pos[b+1]-pos[a+1],pos[b+2]-pos[a+2]],w=[pos[c]-pos[a],pos[c+1]-pos[a+1],pos[c+2]-pos[a+2]];
  const f=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
  if(f[0]*(normals[a]+normals[b]+normals[c])+f[1]*(normals[a+1]+normals[b+1]+normals[c+1])+f[2]*(normals[a+2]+normals[b+2]+normals[c+2])<0){const s=idx[t+1];idx[t+1]=idx[t+2];idx[t+2]=s;}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setIndex(idx);return g;
}

// Brown mackerel tabby: warm agouti ground, narrow dark stripes, spine line, M on the brow,
// white bib, muzzle and mittens.
const ground=new T.Color('#8f7a60'),ticked=new T.Color('#a8926f'),stripe=new T.Color('#3a3024'),white=new T.Color('#e3ddd0'),pink=new T.Color('#b98479'),nose=new T.Color('#a8695e');
const hash=(x:number,y:number,z:number)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);};
function coat(p:V3,part:'body'|'head'|'ear'|'tail',along=0):T.Color{
 const [x,y,z]=p,ax=Math.abs(x),c=ground.clone().lerp(ticked,hash(x*300,y*300,z*300)*.5);
 let dark=0;
 if(part==='body'){
  dark=Math.max(0,Math.sin(z*62+y*18+Math.sin(y*31)*1.3))**6*smooth(.03,.07,ax);
  dark=Math.max(dark,.8*smooth(.012,.004,ax)*smooth(.07,.16,y)*(z<.02?1:0));
  dark=Math.max(dark,Math.max(0,Math.sin(Math.atan2(y-.09,ax-.045)*7))**8*smooth(.11,.03,Math.hypot(ax-.045,y-.09,z+.07))*.9);
  const bib=smooth(.028,.012,ax)*smooth(.035,.075,z)*smooth(.2,.13,y),mittens=smooth(.032,.022,y)*(z>.04?1:0)+smooth(.018,.01,y)*(z>-.02?1:0);
  const w=Math.max(bib,Math.min(1,mittens));c.lerp(stripe,dark*.85).lerp(white,w);return c;
 }
 if(part==='head'){
  dark=Math.max(0,Math.sin(ax*210))**4*smooth(.275,.29,y)*(z<.1?1:0)*smooth(.03,.012,ax);
  dark=Math.max(dark,Math.max(0,Math.sin((y-.25)*260+ax*40))**6*smooth(.025,.04,ax)*smooth(.1,.07,z));
  const muzzle=smooth(.012,.0,Math.hypot(ax*1.1,y-.236,Math.max(0,.1-z)*.6))+smooth(.24,.228,y)*smooth(.09,.11,z);
  const n=smooth(.0065,.002,Math.hypot(x,(y-.252)*.9,z-.122));
  c.lerp(stripe,dark*.8).lerp(white,Math.min(1,muzzle));return c.lerp(nose,n);
 }
 if(part==='ear'){const inner=smooth(.0005,-.0015,p[2])*smooth(.0,.012,y)*smooth(.019,.008,ax);return c.lerp(stripe,.25).lerp(pink,inner*.8);}
 dark=Math.max(0,Math.sin(along*52))**5*.9;dark=Math.max(dark,smooth(.84,.92,along));return c.lerp(stripe,dark);
}
function smooth(a:number,b:number,x:number){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
function paint(g:T.BufferGeometry,part:'body'|'head'|'ear'|'tail',offset:V3=[0,0,0]){
 const p=g.getAttribute('position'),colour=new Float32Array(p.count*3),along=g.getAttribute('along');
 for(let i=0;i<p.count;i++){const c=coat([p.getX(i)+offset[0],p.getY(i)+offset[1],p.getZ(i)+offset[2]],part,along?along.getX(i):0);colour.set([c.r,c.g,c.b],i*3);}
 g.setAttribute('color',new T.BufferAttribute(colour,3));return g;
}

// Tapered, curling tail with an `along` attribute (0 root → 1 tip) for colour rings and the flick.
function tailGeometry(){
 const curve=new T.CatmullRomCurve3([new T.Vector3(.0,.035,-.155),new T.Vector3(.06,.022,-.17),new T.Vector3(.11,.016,-.12),new T.Vector3(.125,.013,-.04),new T.Vector3(.108,.012,.035),new T.Vector3(.07,.013,.085)]);
 const segs=48,sides=10,frames=curve.computeFrenetFrames(segs,false),pos:number[]=[],nor:number[]=[],along:number[]=[],idx:number[]=[];
 for(let s=0;s<=segs;s++){const t=s/segs,c=curve.getPointAt(t),r=.0185*(1-t*.45)*(t>.94?Math.sqrt(Math.max(0,(1-t)/.06)):1)+.0006;
  for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2,n=frames.normals[s].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[s].clone().multiplyScalar(Math.sin(a)));
   pos.push(c.x+n.x*r,Math.max(.002,c.y+n.y*r*.85),c.z+n.z*r);nor.push(n.x,n.y,n.z);along.push(t);}}
 for(let s=0;s<segs;s++)for(let k=0;k<sides;k++){const a=s*sides+k,b=s*sides+(k+1)%sides,c=a+sides,d=b+sides;idx.push(a,b,d,a,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('along',new T.Float32BufferAttribute(along,1));g.setIndex(idx);return g;
}

const SHELLS=12;
const furTime={value:0};
/** Coat material. Shell 0 is the solid pelt; shells 1..N rise along the normal, keeping only
 * strand cores that thin towards the tips, darkened near the skin for self-shadowing. */
function furMaterial(length:number,density:number,flick=false){
 const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0});
 m.onBeforeCompile=shader=>{
  shader.uniforms.furTime=furTime;
  shader.vertexShader=`uniform float furTime;varying vec3 furP;varying float furShell;${flick?'attribute float along;':''}\n`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    furShell=float(gl_InstanceID)/${SHELLS.toFixed(1)};
   #else
    furShell=0.;
   #endif
   furP=position;
   transformed+=normalize(objectNormal)*furShell*${length.toFixed(4)};
   transformed.y-=furShell*furShell*${(length*.35).toFixed(4)};
   ${flick?`float tip=smoothstep(.55,1.,along);transformed.x+=tip*tip*(.022*sin(furTime*1.9)+.012*sin(furTime*4.3+1.))*smoothstep(.2,.9,sin(furTime*.37)*.5+.5);`:''}`);
  shader.fragmentShader=`varying vec3 furP;varying float furShell;
   float furHash(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}\n`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(furShell>0.){
    vec3 q=furP*${density.toFixed(1)};vec3 cell=floor(q);float h=furHash(cell);
    float r=length(fract(q)-.5-(vec3(furHash(cell+1.7),furHash(cell+3.1),furHash(cell+5.3))-.5)*.35);
    // Strands of varied height, thinning to the tip; sub-pixel strands fade rather than sparkle.
    float keep=step(furShell,h*.9+.1)*step(r,.52*(1.-furShell*.75));
    float far=smoothstep(.35,1.1,length(fwidth(q)));
    if(keep<.5||furShell>1.-far)discard;
   }
   diffuseColor.rgb*=mix(.58,1.08,furShell);`);
 };
 m.customProgramCacheKey=()=>`cat-fur-${length}-${density}-${flick}`;
 return m;
}
function furred(g:T.BufferGeometry,m:T.Material){
 const group=new T.Group(),base=new T.Mesh(g,m),shells=new T.InstancedMesh(g,m,SHELLS);
 for(let i=0;i<SHELLS;i++)shells.setMatrixAt(i,new T.Matrix4());shells.count=SHELLS;
 base.castShadow=base.receiveShadow=true;shells.receiveShadow=true;shells.castShadow=false;shells.frustumCulled=false;
 group.add(base,shells);return group;
}
function eyeMaterial(){
 const m=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.25,clearcoat:1,clearcoatRoughness:.04});
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 eyeP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\neyeP=position;');
  shader.fragmentShader='varying vec3 eyeP;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 e=normalize(eyeP);float rim=length(e.xy);
   vec3 iris=mix(vec3(.42,.36,.1),vec3(.62,.5,.15),smoothstep(.1,.75,rim));iris=mix(iris,vec3(.3,.25,.08),smoothstep(.72,.9,rim));
   float pupil=smoothstep(.16,.1,abs(e.x)/max(.05,1.-e.y*e.y));
   diffuseColor.rgb=mix(iris,vec3(.02),pupil)*step(0.,e.z)+vec3(.05)*step(e.z,0.);`);
 };
 m.customProgramCacheKey=()=> 'cat-eye';
 return m;
}

export function createCat(){
 const root=new T.Group();root.name='Workshop cat';
 const body=new T.Group(),head=new T.Group(),tail=new T.Group();root.add(body,tail);body.add(head);
 const coatFur=furMaterial(.0085,1400),headFur=furMaterial(.0045,1900),tailFur=furMaterial(.011,1300,true);
 body.add(furred(paint(surfaceNets(bodySdf,[-.13,-.004,-.2],[.13,.3,.14],.0055),'body'),coatFur));
 // The head turns about the top of the neck.
 const pivot:V3=[0,.232,.052];head.position.set(...pivot);
 const hg=paint(surfaceNets(headSdf,[-.07,.195,.02],[.07,.31,.14],.0036),'head');hg.translate(-pivot[0],-pivot[1],-pivot[2]);head.add(furred(hg,headFur));
 const ears:T.Group[]=[];
 for(const side of [-1,1]){const g=paint(surfaceNets(earSdf,[-.03,-.006,-.012],[.034,.055,.012],.0017),'ear');
  const ear=new T.Group();ear.position.set(side*.03-pivot[0],.289-pivot[1],.064-pivot[2]);ear.rotation.set(-.12,side*.35,-side*.28);ear.add(furred(g,headFur));head.add(ear);ears.push(ear);}
 const eyes:T.Mesh[]=[],eye=eyeMaterial();
 for(const side of [-1,1]){const m=new T.Mesh(new T.SphereGeometry(.0098,20,14),eye);m.position.set(side*.0205-pivot[0],.266-pivot[1],.1105-pivot[2]);m.rotation.y=side*.32;m.scale.z=.8;head.add(m);eyes.push(m);}
 // Whiskers: fine pale arcs from the muzzle pads.
 const whisker:number[]=[];for(const side of [-1,1])for(let i=0;i<5;i++){const a:V3=[side*.013,.243-i*.0028,.121],len=.042+i*.003;let prev=a;for(let s=1;s<=6;s++){const t=s/6,q:V3=[a[0]+side*len*t,a[1]-.006*t*t+(i-2)*.004*t,a[2]+.012*t-.02*t*t];whisker.push(...prev,...q);prev=q;}}
 const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(whisker,3));wg.translate(-pivot[0],-pivot[1],-pivot[2]);
 head.add(new T.LineSegments(wg,new T.LineBasicMaterial({color:'#dcd8cc',transparent:true,opacity:.42})));
 tail.add(furred(paint(tailGeometry(),'tail'),tailFur));
 root.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh))o.castShadow=true;});
 const glance=(t:number)=>{const s=Math.sin(t*.21)+.6*Math.sin(t*.53+1.3);return T.MathUtils.clamp(s,-1,1);};
 function update(time:number){
  furTime.value=time;
  body.scale.set(1,1+Math.sin(time*1.35)*.006,1+Math.sin(time*1.35)*.004);
  // Looks round slowly, holds, then settles; a slight tilt follows the turn.
  head.rotation.y=glance(time)*.42;head.rotation.x=-.05+.05*Math.sin(time*.31);head.rotation.z=glance(time-.4)*.06;
  // Ears flick independently every few seconds.
  ears.forEach((ear,i)=>{const f=Math.max(0,Math.sin(time*(.9+i*.23)+i*2.1));ear.rotation.z=(i?-1:1)*-.28+(i?-1:1)*.22*f**24;});
  // Slow blinks.
  const blink=Math.max(0,Math.sin(time*.43+.7))**60;eyes.forEach(e=>e.scale.y=1-.92*blink);
 }
 update(0);
 return {root,body,tail,update};
}
