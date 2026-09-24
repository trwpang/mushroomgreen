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
 day:{zenith:new T.Color('#7b9bbd'),horizon:new T.Color('#d3d3c6'),ground:new T.Color('#c6c8bd')},
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

export type FarData={extent:number;buildings:[number,number,number,number,number][];treeMarks:Point[];woodTrees:Point[];hedgerowTrees:Point[];hedges:[number,number,number][];brooks:{name:string;line:Point[]}[];
 heights:{x0:number;z0:number;step:number;width:number;height:number;values:number[];weight:number[]}};
export type FarHooks={nearTrees:(matrices:T.Matrix4[])=>void;nearHedges:(matrices:T.Matrix4[])=>void;weather:(material:T.MeshStandardMaterial)=>void;water:T.Material};

/**
 * Far country from the OS six-inch sheets surveyed 1881-82 (see scripts/village/build-far-country.py).
 * A polar ring from just inside the modelled edge to 2.2 km carries: a ground texture painted from the
 * map (parcels, hedges, lanes, water, woods), real EA DTM heights where they reach, mapped buildings,
 * woodland and hedgerow trees, hedges near the model and the brooks continuing as water.
 * Beyond the sheet extent the procedural parcels continue under the haze.
 */
export function addFarCountry(scene:T.Scene,edge:(angle:number)=>Point,data:FarData,groundMap:T.Texture,hooks:FarHooks){
 const random=seeded(8861865),angles=720,rings=72,position:number[]=[],field:number[]=[],index:number[]=[];
 const cx=0,cz=-60,E=data.extent,hg=data.heights;
 const hills=(x:number,z:number)=>{let h=0,a=1,f=1/420;for(let i=0;i<4;i++){h+=a*Math.sin(x*f+i*1.7+Math.sin(z*f*.7+i))*Math.cos(z*f*1.1-i*.9);f*=2.1;a*=.45;}return h;};
 const samples=720,edgeHeight=Array.from({length:samples},(_,i)=>{const a=i/samples*Math.PI*2,e=edge(a),dx=e[0]-cx,dz=e[1]-cz,len=Math.hypot(dx,dz);return ground(e[0]-dx/len*6,e[1]-dz/len*6);});
 const broad=edgeHeight.map((_,i)=>{let sum=0,weight=0;for(let k=-40;k<=40;k++){const w=Math.exp(-(k*k)/(2*18*18));sum+=edgeHeight[(i+k+samples)%samples]*w;weight+=w;}return sum/weight;});
 // Real surveyed heights (EA DTM) with a confidence weight that fades where the survey ends.
 const dtm=(x:number,z:number)=>{const u=Math.max(0,Math.min(hg.width-1.001,(x-hg.x0)/hg.step)),v=Math.max(0,Math.min(hg.height-1.001,(z-hg.z0)/hg.step)),i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*hg.width+i;
  const lerp=(f:number[])=>f[k]*(1-a)*(1-b)+f[k+1]*a*(1-b)+f[k+hg.width]*(1-a)*b+f[k+hg.width+1]*a*b;
  const inside=x>=hg.x0&&z>=hg.z0&&x<=hg.x0+(hg.width-1)*hg.step&&z<=hg.z0+(hg.height-1)*hg.step;return {h:lerp(hg.values),w:inside?lerp(hg.weight):0};};
 /** Height anywhere outside the model: the model's own ground at the seam, the DTM, then synthetic rolling ground. */
 const reachOf=(x:number,z:number)=>{const q=Math.sqrt((x/210)**2+((z+60)/240)**2)/Math.sqrt(.95);return (q-1)*Math.hypot(x-cx,z-cz)/Math.max(q,1e-3);};
 const heightAt=(x:number,z:number)=>{
  const reach=reachOf(x,z)+6,angle=Math.atan2((z-cz)/240,x/210),k=((Math.round(angle/(Math.PI*2)*samples)%samples)+samples)%samples;
  const settle=Math.min(1,Math.max(0,(reach-6)/140)),blend=Math.min(1,Math.max(0,(reach-6)/260));
  const regional=((x-cx)*.35-(z-cz)*.55)/2200*28;
  const synthetic=broad[k]+(hills(x,z)*9+regional*Math.min(1,reach/900))*blend*blend;
  const real=dtm(x,z),far=synthetic+(real.h-synthetic)*real.w;
  const exact=ground(x,z)-(reach<6?.05+(6-reach)*.04:.05*Math.max(0,1-(reach-6)/20));
  return exact+(far-exact)*settle*settle*(3-2*settle);
 };
 for(let j=0;j<=rings;j++){
  const reach=Math.pow(j/rings,1.9)*2200;
  for(let i=0;i<angles;i++){const e=edge(i/angles*Math.PI*2),dx=e[0]-cx,dz=e[1]-cz,len=Math.hypot(dx,dz),x=e[0]+dx/len*(reach-6),z=e[1]+dz/len*(reach-6);position.push(x,heightAt(x,z),z);field.push(reach);}
 }
 for(let j=0;j<rings;j++)for(let i=0;i<angles;i++){const a=j*angles+i,b=j*angles+(i+1)%angles,c=a+angles,d=b+angles;index.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('reach',new T.Float32BufferAttribute(field,1));g.setIndex(index);g.computeVertexNormals();
 groundMap.colorSpace=T.SRGBColorSpace;groundMap.anisotropy=8;
 // Same tint and grain as the village terrain, so the painted map meets the model's own ground.
 const material=new T.MeshStandardMaterial({color:'#c1c3ab',roughness:1,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:2});
 hooks.weather(material);const grain=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{grain.call(material,shader,renderer);
  shader.uniforms.farMap={value:groundMap};shader.uniforms.farExtent={value:E};
  shader.vertexShader='attribute float reach;varying float farReach;varying vec2 farPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfarReach=reach;farPoint=position.xz;');
  shader.fragmentShader='uniform sampler2D farMap;uniform float farExtent;varying float farReach;varying vec2 farPoint;\n'+GLSL_NOISE+FIELD_GLSL+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 farUv=(farPoint+farExtent)/(2.*farExtent);farUv.y=1.-farUv.y;
   vec3 mapped=texture2D(farMap,farUv).rgb;
   // Beyond the sheets: procedural parcels in the same painted colour space.
   vec3 field=fieldAt(farPoint);float tone=fract(field.y*7.31);
   vec3 canvas=mix(vec3(106.,113.,70.),vec3(120.,125.,79.),tone)/255.;
   canvas=mix(canvas,vec3(126.,122.,80.)/255.,step(.82,field.y));canvas=mix(canvas,vec3(112.,96.,70.)/255.,step(.92,field.y));
   canvas=mix(canvas,vec3(66.,76.,44.)/255.,1.-smoothstep(.9,2.2,field.x));
   canvas*=.9+skyNoise(farPoint/23.)*.2;
   vec2 edgeDistance=farExtent-abs(farPoint);
   float onSheet=smoothstep(0.,120.,min(edgeDistance.x,edgeDistance.y));
   diffuseColor.rgb*=mix(pow(canvas,vec3(2.2)),mapped,onSheet);`);
 };
 material.customProgramCacheKey=()=>'far-country-v3';
 const mesh=new T.Mesh(g,material);mesh.receiveShadow=false;mesh.renderOrder=-1;scene.add(mesh);

 // Buildings from the map: brick walls with slate or tile roofs; large works get chimney stacks.
 const cell=(x:number,z:number)=>Math.floor(x/24)+':'+Math.floor(z/24),built=new Map<string,number>();
 for(const [x,z] of data.buildings){const k=cell(x,z);built.set(k,(built.get(k)??0)+1);}
 const nearBuilding=(x:number,z:number)=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(built.has((Math.floor(x/24)+i)+':'+(Math.floor(z/24)+j)))return true;return false;};
 const wallGeo=new T.BoxGeometry(1,1,1);wallGeo.translate(0,.5,0);
 const roofGeo=new T.BufferGeometry();roofGeo.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,.5,1,0,-.5,0,-.5,.5,1,0,-.5,1,0, -.5,0,.5,-.5,1,0,.5,1,0,-.5,0,.5,.5,1,0,.5,0,.5, -.5,0,-.5,-.5,1,0,-.5,0,.5, .5,0,-.5,.5,0,.5,.5,1,0],3));roofGeo.computeVertexNormals();
 const stackGeo=new T.CylinderGeometry(.55,.85,1,8);stackGeo.translate(0,.5,0);
 const walls:T.Matrix4[]=[],roofs:T.Matrix4[]=[],stacks:T.Matrix4[]=[],wallTone:T.Color[]=[],roofTone:T.Color[]=[],q=new T.Quaternion(),up=new T.Vector3(0,1,0);
 for(const [x,z,length,depth,angle] of data.buildings){
  if(Math.abs(x)>E-30||Math.abs(z)>E-30)continue;
  const area=length*depth,works=area>380,y=heightAt(x,z),wall=works?6.5+random()*2.5:Math.min(5.8,Math.max(2.4,Math.min(length,depth)*.85))+random()*.8,pitch=works?1.4:Math.min(2.6,depth*.42);
  q.setFromAxisAngle(up,angle);
  walls.push(new T.Matrix4().compose(new T.Vector3(x,y-1.5,z),q,new T.Vector3(Math.max(2.5,length),wall+1.5,Math.max(2.5,depth))));
  roofs.push(new T.Matrix4().compose(new T.Vector3(x,y+wall,z),q,new T.Vector3(Math.max(2.5,length)+.3,pitch,Math.max(2.5,depth)+.4)));
  wallTone.push(new T.Color(['#6e4331','#7a4a35','#65402f','#83553d','#5c3d2e'][Math.floor(random()*5)]).multiplyScalar(.85+random()*.25));
  roofTone.push(new T.Color(random()<.6?'#3f4246':'#5e3f33').multiplyScalar(.85+random()*.3));
  if(works&&area>650&&random()<.7){const along=new T.Vector3(Math.max(2.5,length)*.38,0,0).applyQuaternion(q);stacks.push(new T.Matrix4().compose(new T.Vector3(x+along.x,y,z+along.z),new T.Quaternion(),new T.Vector3(1.3,20+random()*10,1.3)));}
 }
 const addInstances=(geometry:T.BufferGeometry,material:T.Material,matrices:T.Matrix4[],tones?:T.Color[])=>{const m=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((x,i)=>{m.setMatrixAt(i,x);if(tones)m.setColorAt(i,tones[i]);});scene.add(m);return m;};
 addInstances(wallGeo,new T.MeshStandardMaterial({color:'#ffffff',roughness:.95}),walls,wallTone);
 addInstances(roofGeo,new T.MeshStandardMaterial({color:'#ffffff',roughness:.8,side:T.DoubleSide}),roofs,roofTone);
 addInstances(stackGeo,new T.MeshStandardMaterial({color:'#6d4636',roughness:.95}),stacks);

 // Trees: woods from the map's tree marks, hedgerow trees along boundaries (not in streets).
 const clump=new T.IcosahedronGeometry(1,2),p=clump.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=.82+.14*Math.sin(x*4.1+y*3.3+z*2.7)+.08*Math.sin(x*9.3-z*7.1+y*5.2);p.setXYZ(i,x*f,(y<-.1?-.1+(y+.1)*.3:y)*f*1.15+1.25,z*f);}
 clump.deleteAttribute('normal');clump.deleteAttribute('uv');
 const crown=mergeVertices(clump);clump.dispose();crown.computeVertexNormals();
 const stem=new T.CylinderGeometry(.07,.11,1.1,6,1,true);stem.translate(0,.5,0);stem.deleteAttribute('uv');
 const paint=(geometry:T.BufferGeometry,colour:string)=>{const c=new T.Color(colour),a=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([c.r,c.g,c.b],i);geometry.setAttribute('color',new T.BufferAttribute(a,3));return geometry;};
 const smooth=mergeGeometries([paint(crown.toNonIndexed(),'#ffffff'),paint(stem.toNonIndexed(),'#6b5a44')]);
 const trees:T.Matrix4[]=[],colours:T.Color[]=[],near:T.Matrix4[]=[],d=new T.Object3D();
 const plant=([x,z]:Point,wood:boolean)=>{
  const reach=reachOf(x,z);if(reach<4)return;
  const y=heightAt(x,z);
  if(reach<170&&near.length<2200){const s=(wood?1:.85)+random()*.6;d.position.set(x,y-.05,z);d.rotation.set(0,random()*6.3,0);d.scale.set(s*(.94+random()*.2),s,s);d.updateMatrix();near.push(d.matrix.clone());return;}
  const s=(wood?2.9:2.5)+random()*2;d.position.set(x,y-.2,z);d.rotation.set(0,random()*6.3,0);d.scale.set(s*(.9+random()*.35),s*(1.05+random()*.3),s*(.9+random()*.35));d.updateMatrix();
  trees.push(d.matrix.clone());colours.push(new T.Color().setHSL(.2+random()*.05,.26,(wood?.12:.14)+random()*.07));
 };
 for(const t of data.woodTrees)plant(t,true);
 for(const t of data.treeMarks)plant(t,true);
 for(const t of data.hedgerowTrees)if(random()<.5&&!nearBuilding(...t))plant(t,false);
 const woods=new T.InstancedMesh(smooth,new T.MeshStandardMaterial({color:'#8f9a70',roughness:1,vertexColors:true}),trees.length);
 trees.forEach((m,i)=>{woods.setMatrixAt(i,m);woods.setColorAt(i,colours[i]);});scene.add(woods);
 hooks.nearTrees(near);

 // Hedges along the mapped boundaries near the model.
 const hedges:T.Matrix4[]=[];
 for(const [x,z,angle] of data.hedges){const reach=reachOf(x,z);if(reach<3||reach>200||nearBuilding(x,z)&&random()<.8||hedges.length>=16000)continue;
  const s=1.05+random()*.35;d.position.set(x,heightAt(x,z)-.1,z);d.rotation.set(0,angle+(random()-.5)*.25,0);d.scale.set(s*(1.05+random()*.3),s*(.9+random()*.35),s*(.85+random()*.25));d.updateMatrix();hedges.push(d.matrix.clone());}
 hooks.nearHedges(hedges);

 // The brooks run on as water, oriented downstream by the ground's fall.
 const ribbons:T.Mesh[]=[];
 for(const brook of data.brooks){
  let line=brook.line.filter(([x,z])=>reachOf(x,z)>-2);if(line.length<3)continue;
  if(heightAt(...line[0])<heightAt(...line[line.length-1]))line=[...line].reverse();
  const verts:number[]=[],uvs:number[]=[],tangents:number[]=[],ids:number[]=[];let distance=0;
  line.forEach((pt,i)=>{const a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;
   if(i)distance+=Math.hypot(pt[0]-line[i-1][0],pt[1]-line[i-1][1]);const w=1.1+.35*Math.sin(distance*.05);
   // The far mesh is coarser than a brook channel: sit the water on the local rim, not the DTM thalweg.
   let rim=-Infinity;for(let k=0;k<8;k++){const a=k/8*Math.PI*2;rim=Math.max(rim,heightAt(pt[0]+Math.cos(a)*3.5,pt[1]+Math.sin(a)*3.5));}
   const level=Math.max(heightAt(pt[0],pt[1])+.15,rim-.25);
   for(const side of [-1,1]){const x=pt[0]+nx*w*side,z=pt[1]+nz*w*side;verts.push(x,level,z);uvs.push((side+1)/2,distance);tangents.push(nz,-nx);}
   if(i){const k=i*2;ids.push(k-2,k-1,k,k-1,k+1,k);}});
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('flowTangent',new T.Float32BufferAttribute(tangents,2));geometry.setIndex(ids);geometry.computeVertexNormals();
  const ribbon=new T.Mesh(geometry,hooks.water);ribbon.renderOrder=1;scene.add(ribbon);ribbons.push(ribbon);
 }
 return {mesh,woods,ribbons,heightAt,counts:{buildings:walls.length,stacks:stacks.length,farTrees:trees.length,farModelTrees:near.length,hedgeBushes:hedges.length,brooks:ribbons.length}};
}
