import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ground,type Point} from './layout';

// Sky and far country. A graded sky with soft cumulus and a smoky horizon haze replaces the
// flat backdrop; the fog takes the haze colour, so distant ground dissolves into the same air.
// Beyond the modelled ground a low-detail ring of fields, hedges and tree clumps carries the
// land out to the fog, so the model no longer ends at a cliff. The far country is generic
// interpretation, not mapped fields; only its rise toward higher ground in the north-east
// echoes the real setting.

const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const GLSL_NOISE=`
float skyHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float skyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+vec2(1,1)),f.x),f.y);}
float skyFbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*skyNoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}
`;

export const skyPalette={
 day:{zenith:new T.Color('#8ea3b6'),horizon:new T.Color('#cdcbbb'),ground:new T.Color('#c4c3b3')},
 dusk:{zenith:new T.Color('#34414d'),horizon:new T.Color('#6a6e6c'),ground:new T.Color('#58656b')},
};

export function createSky(scene:T.Scene){
 const uniforms={
  skySun:{value:new T.Vector3(.17,.54,.83).normalize()},skyTime:{value:0},
  skyZenith:{value:skyPalette.day.zenith.clone()},skyHorizon:{value:skyPalette.day.horizon.clone()},skyGround:{value:skyPalette.day.ground.clone()},skyDusk:{value:0},
 };
 const material=new T.ShaderMaterial({uniforms,side:T.BackSide,depthWrite:false,depthTest:false,fog:false,
  vertexShader:`varying vec3 skyDir;void main(){skyDir=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=vec4(p.xy,p.w*.99999,p.w);}`,
  fragmentShader:`uniform vec3 skySun,skyZenith,skyHorizon,skyGround;uniform float skyTime,skyDusk;varying vec3 skyDir;${GLSL_NOISE}
  void main(){
   vec3 d=normalize(skyDir);float h=d.y;
   vec3 sky=mix(skyHorizon,skyZenith,pow(clamp(h,0.,1.),.5));
   // Smoke-stained haze thickens toward the horizon.
   sky=mix(sky,skyHorizon*vec3(1.02,.99,.93),exp(-max(h,0.)*9.)*.55);
   float sun=max(dot(d,skySun),0.);
   sky+=vec3(1.,.93,.78)*(pow(sun,6.)*.16+pow(sun,64.)*.22)*(1.-skyDusk*.8);
   // Soft cumulus on a curved layer, thinning toward the haze.
   vec2 cloudUv=d.xz/(h+.14)*1.35+vec2(skyTime*.004,skyTime*.0015);
   float cover=skyFbm(cloudUv*1.1),detail=skyFbm(cloudUv*3.7+cover);
   float cloud=smoothstep(.5,.78,cover*.78+detail*.32)*smoothstep(.02,.22,h);
   float lit=clamp(.55+.45*dot(normalize(vec3(d.x,0.,d.z)+.001),normalize(vec3(skySun.x,0.,skySun.z))),0.,1.);
   vec3 cloudColour=mix(vec3(.66,.66,.63),vec3(.95,.93,.88),lit*.6+detail*.4)*mix(vec3(1.),vec3(.45,.47,.5),skyDusk);
   sky=mix(sky,cloudColour,cloud*.85);
   sky=mix(sky,skyGround,smoothstep(.0,-.08,h));
   gl_FragColor=vec4(sky,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 // Large enough that planar-reflection cameras stay inside it; layer 1 keeps it out of the GTAO pass.
 const dome=new T.Mesh(new T.SphereGeometry(2000,48,24),material);
 dome.frustumCulled=false;dome.renderOrder=-10;dome.layers.set(1);
 scene.add(dome);
 return {
  dome,
  /** Returns the horizon/fog colour for this frame. */
  update(camera:T.Camera,sunDirection:T.Vector3,dusk:number,time:number){
   dome.position.copy(camera.position);uniforms.skySun.value.copy(sunDirection).normalize();uniforms.skyTime.value=time;uniforms.skyDusk.value=dusk;
   uniforms.skyZenith.value.lerpColors(skyPalette.day.zenith,skyPalette.dusk.zenith,dusk);
   uniforms.skyHorizon.value.lerpColors(skyPalette.day.horizon,skyPalette.dusk.horizon,dusk);
   uniforms.skyGround.value.lerpColors(skyPalette.day.ground,skyPalette.dusk.ground,dusk);
   return uniforms.skyGround.value;
  },
 };
}

/**
 * Far country: a polar ring from just inside the modelled edge out to 2.2 km.
 * The inner ring samples the real ground and sits under the terrain edge (polygon offset
 * keeps the overlap behind it); outward it relaxes into rolling ground with a patchwork
 * of hedged fields drawn in the shader.
 */
/**
 * Field layout shared by the shader and the tree/hedge placement: warped, slowly turning rows
 * of parcels. Returns the metres to the nearest hedge, the hedge direction and a field id.
 * Everything uses smooth trig and small-integer fract so JavaScript and GLSL agree.
 */
const fract=(x:number)=>x-Math.floor(x);
export function fieldAt(x:number,z:number){
 const wx=x+Math.sin(z/113+Math.sin(x/171))*40,wz=z+Math.sin(x/127+Math.cos(z/149))*40;
 const angle=.22*Math.sin(x/1500+.3)+.18*Math.sin(z/1300)+.35,c=Math.cos(angle),s=Math.sin(angle);
 const qx=c*wx-s*wz,qz=s*wx+c*wz,row=Math.floor(qz/68),width=52+58*fract(row*.6180339+.31),offset=width*fract(row*.7548776+.17);
 const u=(qx+offset)/width,col=Math.floor(u),alongX=(.5-Math.abs(fract(u)-.5))*width,alongZ=(.5-Math.abs(fract(qz/68)-.5))*68;
 // Hedges along the row run in rotated X; between parcels they run in rotated Z.
 const acrossRow=alongZ<alongX;
 return {edge:Math.min(alongX,alongZ),direction:(acrossRow?[c,-s]:[s,c]) as Point,id:fract(col*.4142136+row*.7320508+.5)};
}
const FIELD_GLSL=`
vec3 fieldAt(vec2 p){
 vec2 w=p+vec2(sin(p.y/113.+sin(p.x/171.)),sin(p.x/127.+cos(p.y/149.)))*40.;
 float angle=.22*sin(p.x/1500.+.3)+.18*sin(p.y/1300.)+.35,c=cos(angle),s=sin(angle);
 vec2 q=vec2(c*w.x-s*w.y,s*w.x+c*w.y);float row=floor(q.y/68.),width=52.+58.*fract(row*.6180339+.31),offset=width*fract(row*.7548776+.17);
 float u=(q.x+offset)/width,col=floor(u);
 float edge=min((.5-abs(fract(u)-.5))*width,(.5-abs(fract(q.y/68.)-.5))*68.);
 return vec3(edge,fract(col*.4142136+row*.7320508+.5),row);
}
`;

export type RoadExit={p:Point;dir:Point};
export function addFarCountry(scene:T.Scene,edge:(angle:number)=>Point,exits:RoadExit[],streams:RoadExit[],nearTrees:(matrices:T.Matrix4[])=>void,nearHedges:(matrices:T.Matrix4[])=>void,weather:(material:T.MeshStandardMaterial)=>void){
 const random=seeded(8861865),angles=640,rings=52,position:number[]=[],field:number[]=[],index:number[]=[];
 const cx=0,cz=-60;
 const hills=(x:number,z:number)=>{let h=0,a=1,f=1/420;for(let i=0;i<4;i++){h+=a*Math.sin(x*f+i*1.7+Math.sin(z*f*.7+i))*Math.cos(z*f*1.1-i*.9);f*=2.1;a*=.45;}return h;};
 // Edge heights, and a broad angular average of them: local cuts at the edge (lanes, the brook)
 // must not extrude outward as radial trenches.
 const samples=720,edgeHeight=Array.from({length:samples},(_,i)=>{const a=i/samples*Math.PI*2,e=edge(a),dx=e[0]-cx,dz=e[1]-cz,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;return ground(e[0]-ux*6,e[1]-uz*6);});
 const broad=edgeHeight.map((_,i)=>{let sum=0,weight=0;for(let k=-40;k<=40;k++){const w=Math.exp(-(k*k)/(2*18*18));sum+=edgeHeight[(i+k+samples)%samples]*w;weight+=w;}return sum/weight;});
 const place=(angle:number,reach:number)=>{
  const e=edge(angle),dx=e[0]-cx,dz=e[1]-cz,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  const k=Math.round(angle/(Math.PI*2)*samples)%samples,settle=Math.min(1,Math.max(0,(reach-6)/140));
  const x=e[0]+ux*(reach-6),z=e[1]+uz*(reach-6),exact=ground(x,z)-(reach<6?.05+(6-reach)*.04:.05*Math.max(0,1-(reach-6)/20)),base=exact+(broad[k]-exact)*settle*settle*(3-2*settle),blend=Math.min(1,Math.max(0,(reach-6)/260));
  // Higher ground to the north-east, as around the Rowley Hills; lower toward the south-west.
  const regional=((x-cx)*.35-(z-cz)*.55)/2200*28;
  // The brooks run on in shallow valleys.
  let valley=0;for(const w of streams){const qx=x-w.p[0],qz=z-w.p[1],t=qx*w.dir[0]+qz*w.dir[1];if(t>0)valley=Math.max(valley,Math.exp(-((Math.hypot(qx-w.dir[0]*t,qz-w.dir[1]*t)/30)**2))*Math.min(1,t/60));}
  return new T.Vector3(x,base+(hills(x,z)*9+regional*Math.min(1,reach/900))*blend*blend-valley*3.2*blend,z);
 };
 const streamDistance=(x:number,z:number)=>Math.min(Infinity,...streams.map(w=>{const qx=x-w.p[0],qz=z-w.p[1],t=qx*w.dir[0]+qz*w.dir[1];return t<0?Infinity:Math.hypot(qx-w.dir[0]*t,qz-w.dir[1]*t);}));
 for(let j=0;j<=rings;j++){
  const reach=Math.pow(j/rings,1.9)*2200;
  for(let i=0;i<angles;i++){const v=place(i/angles*Math.PI*2,reach);position.push(v.x,v.y,v.z);field.push(reach);}
 }
 for(let j=0;j<rings;j++)for(let i=0;i<angles;i++){const a=j*angles+i,b=j*angles+(i+1)%angles,c=a+angles,d=b+angles;index.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('reach',new T.Float32BufferAttribute(field,1));g.setIndex(index);g.computeVertexNormals();
 const rays=(list:RoadExit[])=>Array.from({length:4},(_,i)=>{const r=list[i];return r?new T.Vector4(r.p[0],r.p[1],r.dir[0],r.dir[1]):new T.Vector4(0,0,0,0);});
 const roads=rays(exits),brookRays=rays(streams);
 const material=new T.MeshStandardMaterial({color:'#4f572e',roughness:1,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:2});
 // The village ground's grain and ripple continue across the seam.
 weather(material);const grain=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{grain.call(material,shader,renderer);
  shader.uniforms.farRoads={value:roads};shader.uniforms.farStreams={value:brookRays};
  shader.vertexShader='attribute float reach;varying float farReach;varying vec2 farPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfarReach=reach;farPoint=position.xz;');
  shader.fragmentShader='uniform vec4 farRoads[4];uniform vec4 farStreams[4];varying float farReach;varying vec2 farPoint;\n'+GLSL_NOISE+`
  `+FIELD_GLSL+`
  `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   // Hedged parcels: mostly rough pasture, some hay and ploughed ground, mottled like the village ground.
   vec3 field=fieldAt(farPoint);
   float tone=fract(field.y*7.31);
   vec3 pasture=mix(vec3(.44,.51,.28),vec3(.58,.59,.35),tone);
   pasture=mix(pasture,vec3(.63,.60,.38),step(.78,field.y));
   pasture=mix(pasture,vec3(.52,.44,.31),step(.9,field.y));
   pasture=mix(pasture,vec3(.40,.47,.26),step(.965,field.y));
   float mottle=skyNoise(farPoint/23.)*.6+skyNoise(farPoint/6.)*.4;
   pasture*=.84+mottle*.3;
   // Ploughed parcels keep faint furrows.
   pasture=mix(pasture,pasture*vec3(.88,.92,.84),step(.9,field.y)*step(.965,1.-field.y+.9)*step(.5,fract(dot(farPoint,vec2(.7,.7))/2.4)));
   float hedgePx=fwidth(field.x)+.001,hedge=1.-smoothstep(.9,.9+hedgePx*1.5+.9,field.x);
   vec3 farColour=mix(pasture,vec3(.22,.27,.15),hedge*.8);
   // Brooks: a dark channel in a damp, rushy margin.
   for(int i=0;i<4;i++){vec4 r=farStreams[i];if(dot(r.zw,r.zw)<.5)continue;vec2 q=farPoint-r.xy;float t=dot(q,r.zw);if(t<0.)continue;float across=length(q-r.zw*t)+(skyNoise(farPoint/9.)-.5)*3.;
    farColour=mix(farColour,farColour*vec3(.78,.86,.74),(1.-smoothstep(3.,9.,across))*.8);farColour=mix(farColour,vec3(.16,.2,.15),(1.-smoothstep(.6,1.3,across))*.85);}
   // The outside roads carry on beyond the model and fade into the fields.
   for(int i=0;i<4;i++){vec4 r=farRoads[i];if(dot(r.zw,r.zw)<.5)continue;vec2 q=farPoint-r.xy;float t=dot(q,r.zw),across=length(q-r.zw*t);
    float lane=(1.-smoothstep(1.7,2.6,across))*step(-4.,t)*(1.-smoothstep(350.,700.,t));farColour=mix(farColour,vec3(.55,.46,.34),lane*.9);}
   // Albedo matches the painted village ground at the seam, then turns to fields.
   float seamPatch=skyNoise(farPoint/5.3+3.1),seamDark=skyNoise(farPoint/7.9-8.);
   vec3 seam=vec3(1.)*(.9+skyNoise(farPoint*1.3)*.2);
   seam=mix(seam,vec3(1.18,1.06,.95),smoothstep(.62,.8,seamPatch)*.55);
   seam=mix(seam,vec3(.78,.74,.72),smoothstep(.66,.84,seamDark)*.45);
   diffuseColor.rgb*=mix(seam,farColour/vec3(.52,.55,.33),smoothstep(12.,110.,farReach));`);
 };
 material.customProgramCacheKey=()=>'far-country-v2';
 const mesh=new T.Mesh(g,material);mesh.receiveShadow=false;mesh.renderOrder=-1;scene.add(mesh);

 // Hedgerow and field trees. The first 170 m use the village's own tree models (handed back to
 // the caller); beyond that, smooth lobed clumps are enough under the haze.
 const clump=new T.IcosahedronGeometry(1,3),p=clump.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=.82+.14*Math.sin(x*4.1+y*3.3+z*2.7)+.08*Math.sin(x*9.3-z*7.1+y*5.2);p.setXYZ(i,x*f,(y<-.1?-.1+(y+.1)*.3:y)*f*1.15+1.25,z*f);}
 clump.deleteAttribute('normal');clump.deleteAttribute('uv');
 const crown=mergeVertices(clump);clump.dispose();crown.computeVertexNormals();
 // A short trunk under each distant crown (unit tree ≈ 2.4 m tall before scaling).
 const stem=new T.CylinderGeometry(.07,.11,1.1,6,1,true);stem.translate(0,.5,0);stem.deleteAttribute('uv');
 const paint=(g:T.BufferGeometry,colour:string)=>{const c=new T.Color(colour),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([c.r,c.g,c.b],i);g.setAttribute('color',new T.BufferAttribute(a,3));return g;};
 const smooth=mergeGeometries([paint(crown.toNonIndexed(),'#ffffff'),paint(stem.toNonIndexed(),'#6b5a44')]);
 const trees:T.Matrix4[]=[],near:T.Matrix4[]=[],hedges:T.Matrix4[]=[],d=new T.Object3D(),colours:T.Color[]=[];
 const nearRoad=(x:number,z:number,r:number)=>exits.some(e=>{const qx=x-e.p[0],qz=z-e.p[1],t=qx*e.dir[0]+qz*e.dir[1];return t>-10&&Math.hypot(qx-e.dir[0]*t,qz-e.dir[1]*t)<r;});
 for(let n=0;n<140000;n++){
  const angle=random()*Math.PI*2,reach=8+Math.pow(random(),1.6)*950,v=place(angle,reach),field=fieldAt(v.x,v.z);
  const brookside=streamDistance(v.x,v.z)<6;
  if((field.edge>1.6&&!brookside)||nearRoad(v.x,v.z,6))continue;
  // Hedgerow trees stand in the hedge line; a few parcels hold small copses.
  if(random()<(brookside?.12:reach<170?.08:.06)){
   if(reach<170){const s=.8+random()*.7;d.position.set(v.x,v.y-.05,v.z);d.rotation.set(0,random()*6.3,0);d.scale.set(s*(.94+random()*.2),s,s);d.updateMatrix();near.push(d.matrix.clone());}
   else{const s=2.6+random()*2.2;d.position.set(v.x,v.y-.2,v.z);d.rotation.set(0,random()*6.3,0);d.scale.set(s*(.9+random()*.35),s*(1.05+random()*.3),s*(.9+random()*.35));d.updateMatrix();trees.push(d.matrix.clone());colours.push(new T.Color().setHSL(.2+random()*.05,.26,.14+random()*.07));}
  }
 }
 // Near hedges: a dense pass so runs read as continuous, with occasional gaps and gates.
 for(let n=0;n<420000&&hedges.length<6200;n++){
  const angle=random()*Math.PI*2,reach=8+random()*175,v=place(angle,reach),field=fieldAt(v.x,v.z);
  if(field.edge>.8||random()<.55||nearRoad(v.x,v.z,5)||streamDistance(v.x,v.z)<3)continue;
  if(Math.sin(v.x*.11+v.z*.07)*Math.sin(v.x*.05-v.z*.13)>.8)continue;
  const s=1.05+random()*.4;d.position.set(v.x,v.y-.1,v.z);d.rotation.set(0,Math.atan2(-field.direction[1],field.direction[0])+(random()-.5)*.3,0);d.scale.set(s*(1+random()*.3),s*(.9+random()*.4),s*(.9+random()*.3));d.updateMatrix();hedges.push(d.matrix.clone());
 }
 for(let n=0;n<700;n++){const angle=random()*Math.PI*2,reach=200+random()*700,v=place(angle,reach);if(fieldAt(v.x,v.z).id<.965||nearRoad(v.x,v.z,20))continue;for(let k=0;k<14;k++){const x=v.x+(random()-.5)*40,z=v.z+(random()-.5)*40,s=2.8+random()*2;d.position.set(x,v.y-.2,z);d.rotation.set(0,random()*6.3,0);d.scale.set(s,s*1.15,s);d.updateMatrix();trees.push(d.matrix.clone());colours.push(new T.Color().setHSL(.21+random()*.04,.26,.13+random()*.06));}}
 nearHedges(hedges);
 nearTrees(near);
 const woods=new T.InstancedMesh(smooth,new T.MeshStandardMaterial({color:'#8f9a70',roughness:1,vertexColors:true}),trees.length);
 trees.forEach((m,i)=>{woods.setMatrixAt(i,m);woods.setColorAt(i,colours[i]);});
 scene.add(woods);
 return {mesh,woods,counts:{farTrees:trees.length,farModelTrees:near.length,hedgeBushes:hedges.length}};
}
