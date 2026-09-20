import {serviceStore} from './outbuildings';
import {refineSurface} from '../rendering/surfaces';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Home} from './layout';

// Stable household seeds keep each dwelling recognisable across reloads and LOD changes.
export function individualise(home:Home, root:T.Group, low:T.Object3D, high:T.Object3D){
  let seed=home.number*971+1865;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const palette=['#ad7961','#9a8776','#c2b79a','#877765','#b59071','#999b83'];
  const wall=new T.Color(palette[home.number%palette.length]);
  const roof=new T.Color().setHSL(.06+random()*.06,.12+random()*.18,.47+random()*.22);
  const door=new T.Color(['#586557','#697473','#71614b','#493e32','#827863'][home.number%5]);
  const cache=new Map<string,T.Material>();
  for(const model of [low,high])model.traverse(o=>{
    if(!(o instanceof T.Mesh))return;
    const recolour=(source:T.Material)=>{
      if(!(source instanceof T.MeshStandardMaterial)||/glass/i.test(source.name))return source;
      const key=source.uuid+(/door|frames/i.test(o.name)?'joinery':'body');
      if(cache.has(key))return cache.get(key)!;
      const m=source.clone(),name=source.name+' '+o.name;m.userData.surfaceDatum=home.height;
      if(/brick|limewash|wall/i.test(name)){
        m.color.multiply(wall).multiplyScalar(1.45);
        if(home.number%5===0&&!/soot/i.test(name))m.color.lerp(new T.Color('#b3ad94'),.68);
        if(home.number%7===0&&!/soot/i.test(name))m.color.lerp(new T.Color('#86867a'),.6);
      }
      else if(/slate|roof/i.test(name)){m.color.multiply(roof).multiplyScalar(1.8);if(home.number%3===0)m.color.multiply(new T.Color('#8caebc'));}
      else if(/door|frames/i.test(o.name))m.color.copy(door);
      cache.set(key,m);return m;
    };
    o.material=Array.isArray(o.material)?o.material.map(recolour):recolour(o.material);
  });
  if(home.number!==22)root.scale.y=.9+random()*.21;
  const w=[6.4,7.2,9.2][home.style],d=[4.6,4.8,4.5][home.style],e=[2.65,4.45,2.85][home.style];
  const wood=new T.MeshStandardMaterial({color:door,roughness:1});
  const masonry=new T.MeshStandardMaterial({color:wall.clone().multiplyScalar(.63),roughness:1});
  const tile=new T.MeshStandardMaterial({color:roof.clone().multiplyScalar(.48),roughness:1});
  const lime=new T.MeshStandardMaterial({color:'#a39b80',roughness:1});
  const soot=new T.MeshStandardMaterial({color:'#484438',roughness:1});
  refineSurface(wood,'wood');masonry.userData.surfaceDatum=home.height;refineSurface(masonry,'brick');refineSurface(tile,'slate');refineSurface(lime,'plaster');
  const buckets=new Map<T.Material,T.BufferGeometry[]>();
  const matrix=new T.Matrix4();
  function box(x:number,y:number,z:number,a:number,b:number,c:number,m:T.Material,tilt=0){
    matrix.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(tilt,0,0)),new T.Vector3(a,b,c));
    const g=new T.BoxGeometry(1,1,1).toNonIndexed().applyMatrix4(matrix);
    if(m.userData.boardAtlas){
      const piece=Math.abs(Math.floor(x*31+y*17+z*7))%16,uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,((piece%4)+.015+uv.getX(i)*.97)/4,(Math.floor(piece/4)+.015+uv.getY(i)*.97)/4);
    }
    const list=buckets.get(m)||[];list.push(g);buckets.set(m,list);
  }
  const atlases:Partial<Record<'wood'|'slate',T.MeshStandardMaterial>>={};
  high.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(m instanceof T.MeshStandardMaterial&&m.map){
      if(/old oak/i.test(m.name))atlases.wood=m;
      if(/weathered slate/i.test(m.name))atlases.slate=m;
    }
  }});
  // Unequal service additions change the silhouette without enlarging the main map footprint.
  if(home.number!==22&&home.number%4!==0){
    const aw=1.8+random()*1.3,ad=1.05+random()*.55,ah=1.45+random()*.5;
    const x=(random()-.5)*(w-aw),z=-d/2-ad/2+.05;
    const store=serviceStore(home.number,aw,ad,ah,home.height,atlases);
    // The authored timber shed already occupies the right-hand rear corner.
    const storeX=Math.min(x,w/2-1.75-aw/2);
    store.position.set(storeX,0,z);root.add(store);
  }
  // The Blender shed had detailed doors but plain dark side boxes. Clad both exposed sides.
  const shedWood=new T.MeshStandardMaterial({color:'#62503b',roughness:.96});shedWood.name='Shed timber';
  refineSurface(shedWood,'wood');
  const shedX=w/2-.8,shedZ=-d/2-.76;
  for(const side of [-1,1]){
    for(let i=0;i<10;i++){
      const z=shedZ-.675+i*.15;
      box(shedX+side*.79,.86,z,.045,1.70,.143,shedWood);
      if(i%3===home.number%3)box(shedX+side*.816,.5+(i%4)*.2,z,.008,.25,.008,soot);
    }
    box(shedX+side*.79,.12,shedZ,.06,.10,1.52,soot);
    for(const end of [-1,1])box(shedX+side*.8,.87,shedZ+end*.73,.075,1.75,.075,shedWood);
  }
  if(home.number%3===0){const x=w/2-.55;for(const side of [-1,1]){box(x+side*.19,e+1.9,-.25,.10,1.2,.51,masonry);box(x,e+1.9,-.25+side*.205,.28,1.2,.10,masonry);}box(x,e+2.08,-.25,.28,.03,.31,new T.MeshStandardMaterial({color:'#141310',roughness:1}));}
  // Preserve the appearance RNG sequence. Repairs now live in the masonry shader,
  // so they follow real wall faces rather than floating rectangular soot decals.
  for(let i=0;i<5+home.number%7;i++){
    const x=(random()-.5)*w;
    if(Math.abs(x)<.65)continue;
    random();random();random();
  }
  if(home.number%4===1){ // A repaired shutter beside one window.
    for(let i=0;i<4;i++)box(-w*.32-.76+i*.10,1.3,d/2+.10,.09,1,.055,wood);
    box(-w*.32-.60,1.05,d/2+.14,.43,.055,.03,soot);
  }
  // Threshold slabs and stacks give each entrance a different working character.
  box(0,.05,d/2+.35,.95+random()*.7,.1,.45+random()*.35,masonry);
  const side=home.number%2?1:-1;
  if(home.number%3===1){
    for(let i=0;i<7;i++)box(side*w*.37,.10+Math.floor(i/3)*.17,d/2+.4+(i%3)*.17,.65+random()*.3,.13,.14,wood);
  }else if(home.number%3===2){
    // Boarded household storage, not a pale solid box with a slab lid.
    const chestWood=new T.MeshStandardMaterial({color:atlases.wood?'#e4d6bc':'#776048',roughness:.94,map:atlases.wood?.map??null});
    chestWood.name='Shed timber storage';chestWood.userData.boardAtlas=!!atlases.wood;refineSurface(chestWood,'wood');
    const cx=side*w*.39,cz=d/2+.5;
    box(cx,.06,cz,.80,.10,.65,soot);
    for(let row=0;row<4;row++){
      const y=.15+row*.115;
      for(const end of [-1,1])box(cx,y,cz+end*.303,.79,.109,.044,chestWood);
      for(const end of [-1,1])box(cx+end*.375,y,cz,.044,.109,.57,chestWood);
    }
    for(const end of [-1,1])box(cx+end*.29,.31,cz+.334,.044,.51,.036,chestWood);
    for(let i=0;i<5;i++)box(cx+(i-2)*.16,.615,cz,.154,.055,.69,chestWood);
    for(const dx of [-.25,.25]){box(cx+dx,.647,cz-.18,.033,.014,.21,soot);box(cx+dx,.606,cz-.347,.033,.08,.013,soot);}
    box(cx,.58,cz+.353,.033,.12,.018,soot);
  }
  for(const [material,parts] of buckets){
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  }
  root.userData.characterSeed=home.number*971+1865;
}
