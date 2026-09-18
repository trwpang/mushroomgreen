import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {ground,chainshopPosition,type Point} from './layout';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A bounded art-direction study around the chainshop. All detail is original and seeded.
export function addShowcase(scene:T.Scene){
  let seed=9181865;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const angle=1.03,c=Math.cos(angle),s=Math.sin(angle);
  const world=(x:number,z:number):Point=>[chainshopPosition[0]+x*c+z*s,chainshopPosition[1]-x*s+z*c];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const ctx=canvas.getContext('2d')!,scale=2048/32;
  // Layer translucent patches rather than one hard-edged yard polygon.
  for(let i=0;i<320;i++){
    const x=(random()-.5)*23,z=(random()-.5)*19+3;
    const radius=1+random()*2.8,px=(x+16)*scale,py=(z+16)*scale;
    const g=ctx.createRadialGradient(px,py,0,px,py,radius*scale);
    g.addColorStop(0,i%3?'#4e493bd0':'#7b7056a0');g.addColorStop(1,'#64594500');
    ctx.fillStyle=g;ctx.fillRect(px-radius*scale,py-radius*scale,radius*scale*2,radius*scale*2);
  }
  // The entrance is on the right gable (local X +4.6), not the front shutter wall.
  ctx.beginPath();ctx.moveTo(20.8*scale,16*scale);ctx.bezierCurveTo(23*scale,16*scale,26*scale,18*scale,29*scale,22*scale);
  ctx.strokeStyle='#95846435';ctx.lineWidth=1.9*scale;ctx.lineCap='round';ctx.stroke();
  for(const side of [-1,1]){
    for(const [width,alpha]of [[.45,'20'],[.18,'48']]){
      ctx.beginPath();ctx.moveTo(20.8*scale,(16+side*.6)*scale);
      ctx.bezierCurveTo(23*scale,(16+side*.6)*scale,26*scale,(18+side*.65)*scale,29*scale,(22+side*.7)*scale);
      ctx.lineWidth=Number(width)*scale;ctx.strokeStyle='#302c25'+alpha;ctx.stroke();
    }
  }
  // Wet earth beneath the principal reflecting hollow.
  const damp=ctx.createRadialGradient(24.5*scale,19.5*scale,.5*scale,24.5*scale,19.5*scale,3*scale);
  damp.addColorStop(0,'#242822ee');damp.addColorStop(.55,'#35372dcc');damp.addColorStop(1,'#49432d00');
  ctx.fillStyle=damp;ctx.fillRect(21*scale,16*scale,7*scale,7*scale);
  // Broken tread marks soften the rut margins; no continuous clean striping.
  for(let i=0;i<2400;i++){
    const t=random(),u=1-t,side=i%2?1:-1;
    const x=u*u*u*4.8+3*u*u*t*7+3*u*t*t*10+t*t*t*13;
    const z=3*u*t*t*2+t*t*t*6+side*.65+(random()-.5)*.65;
    ctx.fillStyle=i%3?'#62563c80':'#2c2c2460';
    ctx.beginPath();ctx.ellipse((x+16)*scale,(z+16)*scale,(.03+random()*.12)*scale,(.015+random()*.06)*scale,random()*6.28,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<24000;i++){
    const x=(random()-.5)*26,z=(random()-.5)*23+2;
    if(random()>Math.max(0,1-Math.pow(x/14,4)-Math.pow((z-2)/13,4)))continue;
    ctx.fillStyle=['#beb39b35','#292c2966','#76664d77','#4e4d3f55'][i%4];
    ctx.fillRect((x+16)*scale,(z+16)*scale,.5+random()*3,.5+random()*2);
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const g=new T.PlaneGeometry(32,32,128,128);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const q=world(p.getX(i),p.getZ(i));p.setXYZ(i,q[0],ground(...q)+.035,q[1]);}
  g.computeVertexNormals();
  const yard=new T.Mesh(g,new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.88,polygonOffset:true,polygonOffsetFactor:-1}));
  weatherGround(yard.material);yard.receiveShadow=true;yard.renderOrder=1;scene.add(yard);
  const wet=new T.MeshStandardMaterial({color:'#34392f',roughness:.18});
  const puddles:T.Mesh[]=[];
  const shape=new T.Shape();
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,r=.83+Math.sin(a*3+.5)*.10+Math.cos(a*7)*.055,x=Math.cos(a)*1.65*r,y=Math.sin(a)*.83*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}
  shape.closePath();
  const puddle=new Reflector(new T.ShapeGeometry(shape),{color:0x666e62,textureWidth:768,textureHeight:768,clipBias:.003});
  const centre=world(8.5,3.5),e=.1;
  const nx=-(ground(centre[0]+e,centre[1])-ground(centre[0]-e,centre[1]))/(2*e),nz=-(ground(centre[0],centre[1]+e)-ground(centre[0],centre[1]-e))/(2*e);
  puddle.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(nx,1,nz).normalize());
  puddle.position.set(centre[0],ground(...centre)+.055,centre[1]);
  const pm=puddle.material as T.ShaderMaterial;
  pm.vertexShader='varying vec2 hollowPoint;\n'+pm.vertexShader.replace('void main() {','void main() { hollowPoint=position.xy/vec2(1.65,.83);');
  pm.transparent=true;pm.depthWrite=false;
  pm.fragmentShader=pm.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec2 reflectionUv=vUv.xy/vUv.w;
  vec2 ripple=vec2(sin(hollowPoint.y*29.+hollowPoint.x*11.),cos(hollowPoint.x*23.-hollowPoint.y*9.))*.0008;
  vec4 base=texture2D(tDiffuse,reflectionUv+ripple)*.4;
  base+=texture2D(tDiffuse,reflectionUv+ripple+vec2(.0018,0.))*.15;
  base+=texture2D(tDiffuse,reflectionUv+ripple-vec2(.0018,0.))*.15;
  base+=texture2D(tDiffuse,reflectionUv+ripple+vec2(0.,.0018))*.15;
  base+=texture2D(tDiffuse,reflectionUv+ripple-vec2(0.,.0018))*.15;`);
  pm.fragmentShader='varying vec2 hollowPoint;\n'+pm.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','float rim=smoothstep(.50,.95,length(hollowPoint)); gl_FragColor=vec4(mix(base.rgb*.72+vec3(.025,.032,.028),vec3(.06,.065,.042),rim*.50),(1.-smoothstep(.62,.94,length(hollowPoint)))*.80);');
  const reflect=puddle.onBeforeRender.bind(puddle),lastPosition=new T.Vector3(Infinity,0,0),lastRotation=new T.Quaternion();let lastReflection=0;
  puddle.onBeforeRender=(renderer,scene,camera,geometry,material,group)=>{
    if(scene.overrideMaterial)return;const now=performance.now(),moved=lastPosition.distanceToSquared(camera.position)>.00001||lastRotation.angleTo(camera.quaternion)>.0001;
    if(moved||now-lastReflection>180){reflect(renderer,scene,camera,geometry,material,group);lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);lastReflection=now;}
  };
  puddle.renderOrder=2;puddle.layers.set(1);scene.add(puddle);puddles.push(puddle);
  const materials=[new T.MeshStandardMaterial({color:'#655341',roughness:1}),new T.MeshStandardMaterial({color:'#3c3c35',roughness:.8}),new T.MeshStandardMaterial({color:'#75523e',roughness:.95}),new T.MeshStandardMaterial({color:'#848271',roughness:.9})];
  materials.forEach(m=>m.vertexColors=true);
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  function add(geometry:T.BufferGeometry,x:number,y:number,z:number,m:T.Material,rotation=0){
    const q=world(x,z);const mat=new T.Matrix4().compose(new T.Vector3(q[0],ground(...q)+y,q[1]),new T.Quaternion().setFromEuler(new T.Euler(0,angle+rotation,0)),new T.Vector3(1,1,1));
    const geo=(geometry.index?geometry.toNonIndexed():geometry).applyMatrix4(mat);const shade=.68+random()*.4,colors=new Float32Array(geo.attributes.position.count*3);colors.fill(shade);geo.setAttribute('color',new T.BufferAttribute(colors,3));const list=batches.get(m)||[];list.push(geo);batches.set(m,list);
  }
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,rot=0)=>add(new T.BoxGeometry(w,h,d),x,y,z,m,rot);
  // Low salvaged brick wall and open coal bay flank the yard, leaving the entrance clear.
  for(let row=0;row<5;row++)for(let col=0;col<14;col++){
    if(row===4&&col>8)continue;
    box(-6.4+col*.245+(row%2)*.11,row*.11+.055,4.7,.23,.098,.22,materials[col%5===0?1:2],(random()-.5)*.045);
  }
  for(let i=0;i<7;i++)box(-5.8+i*.25,.35,3.3,.22,.7,.085,materials[0]);
  for(let i=0;i<150;i++){
    const x=-5+ (random()-.5)*1.3,z=3.65+(random()-.5)*.75;
    const h=.12+.32*(1-Math.abs(x+5)/.8);
    const geo=new T.IcosahedronGeometry(.06+random()*.08,0);geo.scale(1.2,.75,1);
    add(geo,x,h*random(),z,materials[1]);
  }
  for(let i=0;i<22;i++)box(5.8+(i%4)*.14,.10+Math.floor(i/4)*.13,2.9, .12,.105,.85+random()*.5,materials[0],(random()-.5)*.12);
  for(let i=0;i<380;i++){
    const x=(random()-.5)*19,z=3.4+random()*7;
    if(Math.abs(x)<1&&z<5)continue;
    const geo=new T.IcosahedronGeometry(.025+random()*.075,0);geo.scale(1,.35+random()*.3,.6);
    add(geo,x,.025,z,materials[i%3?3:2]);
  }
  // Individual imperfect flags at the doorway, embedded rather than floating.
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(4.9+row*.4,.035,(col-1)*.43,.37,.065,.40,materials[3],(random()-.5)*.06);
  for(const [m,parts]of batches){const merged=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);}
  // Bramble clumps with small folded leaves, around the working yard margins.
  const leaves:number[]=[];
  for(let i=0;i<1900;i++){
    const a=random()*Math.PI*2,y=random()*1.1,r=Math.sqrt(random())*.8*Math.sqrt(Math.max(.05,1-Math.pow((y-.45)/.8,2)));
    const x=Math.cos(a)*r,z=Math.sin(a)*r,l=.035+random()*.045,dx=Math.cos(a)*l,dz=Math.sin(a)*l;
    leaves.push(x-dx,y,z-dz,x-dz*.5,y+.018,z+dx*.5,x+dx,y+.012,z+dz,x-dx,y,z-dz,x+dx,y+.012,z+dz,x+dz*.5,y-.01,z-dx*.5);
  }
  const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(leaves,3));leafGeo.computeVertexNormals();
  const locations=[[-7.6,3.5,1.1],[-7.9,2.1,1.4],[-7.3,.5,1.1],[-6.5,-2.9,1.3],[6.3,-2.6,1.3],[8,-2.5,.85],[9,-1.5,.7],[-8,6,.65]];
  const brambles=new T.InstancedMesh(leafGeo,new T.MeshStandardMaterial({color:'#4c5b35',roughness:1,side:T.DoubleSide}),locations.length);
  const obj=new T.Object3D();locations.forEach(([x,z,scale],i)=>{const q=world(x,z);obj.position.set(q[0],ground(...q),q[1]);obj.rotation.y=random()*6.28;obj.scale.setScalar(scale);obj.updateMatrix();brambles.setMatrixAt(i,obj.matrix);});brambles.castShadow=brambles.receiveShadow=true;scene.add(brambles);
  const glow=new T.PointLight('#ff842e',18,7,2);const q=world(4.5,.35);glow.position.set(q[0],ground(...q)+1.1,q[1]);glow.castShadow=true;glow.shadow.mapSize.set(512,512);glow.shadow.bias=-.001;scene.add(glow);
  return {wet,puddles,glow,world};
}

// World-space detail stays the same size at every camera distance.
export function weatherGround(material:T.MeshStandardMaterial){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 earthPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nearthPoint=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=`varying vec3 earthPoint;
float earthHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float earthNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(earthHash(i),earthHash(i+vec2(1.,0.)),f.x),mix(earthHash(i+vec2(0.,1.)),earthHash(i+vec2(1.,1.)),f.x),f.y);}
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float grain=earthNoise(earthPoint.xz*25.0);
float clods=earthNoise(earthPoint.xz*3.2);
float patches=earthNoise(earthPoint.xz*.38);
diffuseColor.rgb*=.77+grain*.20+clods*.20;
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.83,.87,.78),smoothstep(.40,.72,patches)*.34);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
float bareEarth=smoothstep(.002,.025,diffuseColor.r-diffuseColor.g);
float damp=bareEarth*smoothstep(.52,.75,earthNoise(earthPoint.xz*.62));
roughnessFactor=mix(roughnessFactor,.38,damp*.72);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
vec3 earthRipple=vec3((earthNoise(earthPoint.xz*16.0)-.5)*.23,0.,(earthNoise(earthPoint.zx*16.0+9.0)-.5)*.23);
normal=normalize(normal+mat3(viewMatrix)*earthRipple);`);
  };
  material.customProgramCacheKey=()=> 'earth-detail-v2';
}
