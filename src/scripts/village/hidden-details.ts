import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ground,localPoint,type Home,type Point} from './layout';
/**
 * Ten small things to find: jokes, toys and luck left by the people who lived and worked here.
 * All are interpretations, not recorded objects. Units are metres; each builder works in its own
 * local frame (Y up) and is placed against a real anchor (a sill, a door, a gate, a store eave).
 *
 * Each builder batches its parts per material, so every detail costs only a few draw calls.
 */
type Rand=()=>number;
const seeded=(seed:number):Rand=>{let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const std=(color:string,roughness=.85,metalness=0,extra:T.MeshStandardMaterialParameters={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
function canvasTexture(size:number|[number,number],draw:(g:CanvasRenderingContext2D,w:number,h:number)=>void,srgb=true){
 const [w,h]=Array.isArray(size)?size:[size,size],c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d')!,w,h);
 const t=new T.CanvasTexture(c);if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
/** Collects parts per material and merges them into one mesh each. */
class Batch{
 private parts=new Map<T.Material,T.BufferGeometry[]>();
 add(g:T.BufferGeometry,m:T.Material,matrix?:T.Matrix4){
  let n=g.index?g:withIndex(g);if(matrix)n.applyMatrix4(matrix);
  for(const name of Object.keys(n.attributes))if(!['position','normal','uv'].includes(name))n.deleteAttribute(name);
  if(!n.getAttribute('uv'))n.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(n.getAttribute('position').count*2),2));
  const list=this.parts.get(m)??[];list.push(n);this.parts.set(m,list);return n;
 }
 build(name:string){
  const group=new T.Group();group.name=name;
  for(const [m,list] of this.parts){const g=mergeGeometries(list);list.forEach(p=>p.dispose());const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  return group;
 }
}
function withIndex(g:T.BufferGeometry){const count=g.getAttribute('position').count,index=count>65535?new Uint32Array(count):new Uint16Array(count);for(let i=0;i<count;i++)index[i]=i;g.setIndex(new T.BufferAttribute(index,1));return g;}
const m4=(x=0,y=0,z=0,rx=0,ry=0,rz=0,s:number|[number,number,number]=1)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),Array.isArray(s)?new T.Vector3(...s):new T.Vector3(s,s,s));
const tube=(points:[number,number,number][],r:number,segments=10,radial=6)=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,radial,false);
const lathe=(points:[number,number][],segments=20)=>new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments);
/** An oval chain link lying in the local XY plane. */
const link=(length:number,wire:number)=>new T.TorusGeometry(length*.3,wire,5,14).scale(1,1.55,1);

// 1 · A tiny chainmaker made from scrap: nut feet and chest, bent-rod limbs, a rivet head, a
// sheet-iron apron, a hammer raised over a square-nut anvil and a short length of real chain.
function scrapChainmaker(){
 const b=new Batch(),iron=std('#34312c',.58,.7),bright=std('#6d6860',.38,.85),rust=std('#6a4632',.9,.25);
 const nut=(r:number,t:number,m=iron)=>new T.CylinderGeometry(r,r,t,6);
 for(const x of [-.014,.014]){b.add(nut(.008,.006),iron,m4(x,.003,.004,0,Math.PI/6));
  b.add(tube([[x,.006,.004],[x*1.1,.022,.008],[x*.9,.036,.001],[x*.6,.05,0]],.0022),iron);}
 // Chest: a hex nut on edge, its thread showing as a dark hole.
 b.add(nut(.017,.012),bright,m4(0,.064,0,Math.PI/2,0,Math.PI/6));
 b.add(new T.CircleGeometry(.0085,12),std('#141210',.9),m4(0,.064,.0062));b.add(new T.CircleGeometry(.0085,12),std('#141210',.9),m4(0,.064,-.0062,0,Math.PI));
 b.add(new T.CylinderGeometry(.003,.003,.012,6),iron,m4(0,.085,0));
 // Head: a domed rivet with two punched eyes.
 b.add(new T.SphereGeometry(.0105,14,8,0,Math.PI*2,0,Math.PI*.62),bright,m4(0,.092,0));
 b.add(new T.CylinderGeometry(.012,.012,.002,14),iron,m4(0,.092,0));
 for(const x of [-.0038,.0038])b.add(new T.SphereGeometry(.0016,6,4),std('#0d0c0b',.9),m4(x,.0985,.0085));
 // Apron: a scrap of sheet iron, a little dished.
 const apron=new T.PlaneGeometry(.026,.03,3,3),ap=apron.attributes.position;for(let i=0;i<ap.count;i++)ap.setZ(i,-.002*Math.cos(ap.getX(i)*80));
 b.add(apron,std('#5b3b2a',.92,.2,{side:T.DoubleSide}),m4(0,.046,.009,-.12));
 // Right arm raised with a hammer; left arm down, holding chain that runs to the anvil.
 b.add(tube([[.016,.074,0],[.03,.08,.004],[.036,.098,.006],[.03,.118,.008]],.002),iron);
 b.add(new T.CylinderGeometry(.0013,.0013,.03,5),std('#6b5238',.8),m4(.03,.126,.008,0,0,.5));
 b.add(new T.BoxGeometry(.012,.007,.007),bright,m4(.023,.139,.008,0,0,.5));
 b.add(tube([[-.016,.074,0],[-.028,.06,.008],[-.03,.045,.018],[-.026,.036,.026]],.002),iron);
 for(let i=0;i<4;i++)b.add(link(.012,.0014),i%2?bright:iron,m4(-.024+i*.006,.03-i*.007,.028+i*.004,i%2?Math.PI/2:0,0,.9));
 // Anvil: a big square nut on a washer.
 b.add(new T.CylinderGeometry(.013,.013,.003,16),rust,m4(.012,.0015,.034));
 b.add(new T.BoxGeometry(.022,.013,.016),iron,m4(.012,.0095,.034));
 b.add(new T.BoxGeometry(.028,.004,.018),bright,m4(.012,.018,.034));
 return b.build('Scrap-iron chainmaker (a worker’s joke)');
}

// 2 · A child's carved boat: a knife-faceted hull, a stick mast, a patched cloth sail.
function toyBoat(rand:Rand){
 const b=new Batch(),L=.3,beam=.085,depth=.045,stations=14,section=7,pos:number[]=[],index:number[]=[];
 for(let i=0;i<=stations;i++){const t=i/stations,z=(t-.5)*L,width=beam/2*Math.pow(Math.sin(Math.min(1,t*1.15)*Math.PI*.5+.02),.7)*(t>.86?1-(t-.86)*4.6:1),d=depth*(.55+.45*Math.sin(t*Math.PI));
  for(let j=0;j<section;j++){const a=j/(section-1),x=(a-.5)*2*width,y=-d*(1-Math.pow(Math.abs(a-.5)*2,1.6))+(rand()-.5)*.003;pos.push(x+(rand()-.5)*.002,y,z);}}
 for(let i=0;i<stations;i++)for(let j=0;j<section-1;j++){const a=i*section+j,c=a+section;index.push(a,c,a+1,a+1,c,c+1);}
 // Deck: flat top between the gunwales.
 for(let i=0;i<stations;i++){const a=i*section,c=a+section;index.push(a,a+section-1,c,c,a+section-1,c+section-1);}
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(pos,3));hull.setIndex(index);
 const flat=hull.toNonIndexed();flat.computeVertexNormals();
 const wood=std('#8c6d49',.8,0,{flatShading:true,side:T.DoubleSide});b.add(flat,wood);
 b.add(new T.CylinderGeometry(.0035,.004,.18,6),std('#6c5436',.9),m4(0,.09,.02,.04,0,.03));
 const sail=new T.PlaneGeometry(.1,.12,6,6),sp=sail.attributes.position;for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i);sp.setZ(i,.018*Math.cos(x/.1*Math.PI)*(.6+.4*Math.cos(y/.12*Math.PI)));}sail.computeVertexNormals();
 const cloth=canvasTexture(64,(g,w,h)=>{g.fillStyle='#b9ad8f';g.fillRect(0,0,w,h);g.fillStyle='#7c8aa0';for(let y=0;y<h;y+=10)g.fillRect(0,y,w,4);g.fillStyle='#9a5a44';g.fillRect(34,6,22,20);g.strokeStyle='#3d3528';g.setLineDash([2,2]);g.strokeRect(34,6,22,20);});
 b.add(sail,std('#ffffff',.95,0,{map:cloth,side:T.DoubleSide}),m4(0,.105,.02,0,Math.PI/2+.25,0));
 return b.build('Toy boat caught in the reeds');
}
/** Reeds and sedge round the boat: tapered, bending blades with some broken tips. */
function reeds(rand:Rand,count:number,radius:number){
 const b=new Batch(),m=std('#6d7a3e',.9,0,{side:T.DoubleSide}),dry=std('#9a8c58',.9,0,{side:T.DoubleSide});
 for(let i=0;i<count;i++){const h=.35+rand()*.45,blade=new T.PlaneGeometry(.012,h,1,5).translate(0,h/2,0),p=blade.attributes.position;
  const lean=(rand()-.5)*.5;for(let k=0;k<p.count;k++){const t=p.getY(k)/h;p.setX(k,p.getX(k)*(1-t*.85));p.setZ(k,lean*t*t*h*.6);}blade.computeVertexNormals();
  const a=rand()*Math.PI*2,r=radius*(.35+rand()*.65);b.add(blade,rand()<.25?dry:m,m4(Math.cos(a)*r,-.08,Math.sin(a)*r,0,rand()*6,0));}
 return b.build('Reeds');
}

// 3 · A robin's nest in a cast-off clog on a ledge under an eave: three speckled eggs show only
// when you look into the clog's mouth.
function clogNest(rand:Rand){
 const b=new Batch(),sole=std('#6f5639',.85),leather=std('#4a3323',.58,0,{side:T.DoubleSide}),brass=std('#9c7a3c',.35,.9),iron=std('#2d2b28',.6,.6);
 const outline=new T.Shape();outline.moveTo(-.035,-.12);outline.bezierCurveTo(-.05,-.02,-.05,.08,-.03,.13);outline.bezierCurveTo(-.01,.16,.02,.16,.035,.13);outline.bezierCurveTo(.05,.07,.048,-.03,.034,-.12);outline.bezierCurveTo(.02,-.14,-.02,-.14,-.035,-.12);
 b.add(new T.ExtrudeGeometry(outline,{depth:.032,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:1,curveSegments:10}),sole,m4(0,.036,0,Math.PI/2));
 // Clog irons round the sole's edge.
 b.add(new T.TorusGeometry(.043,.003,4,24,Math.PI).scale(1,2.6,1),iron,m4(0,.004,.03,Math.PI/2));
 b.add(new T.TorusGeometry(.036,.003,4,24,Math.PI).scale(1,2.6,1),iron,m4(0,.004,-.04,-Math.PI/2));
 // Upper: a toe cap over the front and a low heel counter; the throat is open.
 b.add(new T.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI/2).scale(.041,.034,.075),leather,m4(0,.04,.055,0,0,0));
 b.add(new T.CylinderGeometry(.039,.04,.03,16,1,true,Math.PI*.5,Math.PI),leather,m4(0,.055,-.07,0,0,0,[1,1,1.25]));
 // Brass tacks along the welt and a clasp across the instep.
 const pts=outline.getSpacedPoints(26);for(const q of pts.slice(0,-1))b.add(new T.SphereGeometry(.0028,6,4),brass,m4(q.x*.97,.042,-q.y*.97));
 b.add(new T.BoxGeometry(.086,.006,.014),leather,m4(0,.069,.005,0,0,0));b.add(new T.BoxGeometry(.016,.004,.018),brass,m4(.036,.071,.005));
 // Nest: a ring of twigs and moss in the heel, lined with hair, three eggs.
 const twig=std('#6b5a42',.95),moss=std('#5f6a36',1);
 for(let i=0;i<46;i++){const a=rand()*Math.PI*2,r=.022+rand()*.01;b.add(new T.CylinderGeometry(.0012,.0012,.03+rand()*.02,4),rand()<.3?moss:twig,m4(Math.cos(a)*r,.052+rand()*.012,-.045+Math.sin(a)*r*1.1,Math.PI/2+(rand()-.5)*.6,a+Math.PI/2,(rand()-.5)*.6));}
 b.add(new T.TorusGeometry(.021,.009,6,16),moss,m4(0,.058,-.045,Math.PI/2,0,0,[1,1.1,.7]));
 b.add(new T.CircleGeometry(.019,14),std('#8d7b62',1),m4(0,.053,-.045,-Math.PI/2));
 const speckle=canvasTexture(64,(g,w,h)=>{g.fillStyle='#efe6d6';g.fillRect(0,0,w,h);const r=seeded(4411);for(let i=0;i<260;i++){g.fillStyle=`rgba(${150+r()*40},${70+r()*30},${40+r()*20},${.35+r()*.5})`;const s=.6+r()*1.6;g.beginPath();g.arc(r()*w,r()*h*(r()<.6?.4:1),s,0,7);g.fill();}});
 const egg=std('#ffffff',.55,0,{map:speckle});
 [[-.007,-.041,0],[.008,-.043,1.3],[0,-.054,2.2]].forEach(([x,z,a])=>b.add(new T.SphereGeometry(.0085,12,8).scale(1,.78,1.28),egg,m4(x,.059,z,.2,a,.1)));
 return b.build('Robin’s nest in an old clog');
}

// 4 · A wonky cottage of spare bricks, slate fragments for a roof and a brick-end chimney.
function brickCottage(rand:Rand){
 const bricks:T.Matrix4[]=[],colors:T.Color[]=[],W=.78,D=.56,BL=.215,BH=.068,BW=.1025;
 const palette=['#8a4a33','#7a3f2c','#9a5a3d','#6e3b2a','#a0634a'];
 const put=(x:number,y:number,z:number,ry:number,half=false)=>{bricks.push(m4(x+(rand()-.5)*.012,y+(rand()-.5)*.006,z+(rand()-.5)*.012,(rand()-.5)*.03,ry+(rand()-.5)*.08,(rand()-.5)*.04,half?[.52,1,1]:1));colors.push(new T.Color(palette[Math.floor(rand()*palette.length)]).multiplyScalar(.85+rand()*.25));};
 for(let course=0;course<5;course++){const y=BH/2+course*(BH+.004)+course*course*.0015,shift=course%2?BL/2:0;
  for(let x=-W/2+BL/2-shift;x<W/2;x+=BL+.006){if(x<-W/2+BL/2-1e-3&&course%2){put(-W/2+BL*.26,y,D/2-BW/2,0,true);put(-W/2+BL*.26,y,-D/2+BW/2,0,true);continue;}
   const cx=Math.min(x,W/2-BL/2);if(!(course<3&&Math.abs(cx)<.09))put(cx,y,D/2-BW/2,0);put(cx,y,-D/2+BW/2,0);}
  for(let z=-D/2+BW+BL/2-shift*.5;z<D/2-BW;z+=BL+.006){const cz=Math.min(z,D/2-BW-BL/2);for(const x of [-W/2+BW/2,W/2-BW/2])if(!(course===3&&x>0&&Math.abs(cz)<.06))put(x,y,cz,Math.PI/2);}}
 // Gable steps at each end.
 const top=5*(BH+.004)+.03;for(const x of [-W/2+BW/2,W/2-BW/2]){put(x,top+BH/2,-.11,Math.PI/2);put(x,top+BH/2,.11,Math.PI/2);put(x,top+BH*1.5+.004,0,Math.PI/2);}
 const brick=new T.InstancedMesh(new T.BoxGeometry(BL,BH,BW),std('#ffffff',.92),bricks.length);bricks.forEach((m,i)=>{brick.setMatrixAt(i,m);brick.setColorAt(i,colors[i]);});brick.castShadow=brick.receiveShadow=true;
 const b=new Batch(),slate=std('#4b5057',.7,.05,{flatShading:true}),ridgeY=top+BH*2+.03;
 b.add(new T.CylinderGeometry(.009,.01,W+.12,6),std('#6b5238',.9),m4(0,ridgeY,0,0,0,Math.PI/2));
 for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<5;i++){
  const w=.13+rand()*.08,h=.1+rand()*.07,s=new T.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2*(.8+rand()*.2),-h/2+rand()*.02);s.lineTo(w/2,h/2*(.7+rand()*.3));s.lineTo(-w/2*(.6+rand()*.4),h/2);
  const g=new T.ExtrudeGeometry(s,{depth:.006,bevelEnabled:false});const t=row/2.4,y=ridgeY-.02-t*.3,z=side*(.04+t*(D/2+.05));
  b.add(g,slate,m4(-W/2+.05+i*(W/4.4)+(rand()-.5)*.05,y,z,side*.98+(rand()-.5)*.12,(rand()-.5)*.2,(rand()-.5)*.15));}
 b.add(new T.BoxGeometry(BW,BL,BH),std('#853f2b',.92),m4(.18,ridgeY+.08,-.07,.06,.3,.03));
 // One slate has slipped to the ground.
 b.add(new T.BoxGeometry(.15,.006,.11),slate,m4(.32,.004,.42,.02,.6,.04));
 const group=b.build('Miniature brick cottage (a child’s building)');group.add(brick);return group;
}

// 5 · A secret game of marbles: a scratched ring in trodden earth, clay marbles and one glass one.
function marbles(rand:Rand,place:(x:number,z:number)=>T.Vector3){
 const group=new T.Group();group.name='A game of marbles';
 const earth=canvasTexture(256,(g,w,h)=>{const grad=g.createRadialGradient(w/2,h/2,w*.1,w/2,h/2,w/2);grad.addColorStop(0,'rgba(150,128,96,.95)');grad.addColorStop(.7,'rgba(140,120,90,.82)');grad.addColorStop(1,'rgba(140,120,90,0)');g.fillStyle=grad;g.fillRect(0,0,w,h);
  const r=seeded(221);for(let i=0;i<400;i++){g.fillStyle=`rgba(${60+r()*40},${50+r()*30},${36+r()*20},${r()*.35})`;g.fillRect(r()*w,r()*h,1+r()*3,1+r()*2);}
  g.strokeStyle='rgba(38,30,22,.95)';g.lineWidth=2.6;g.beginPath();for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,q=w*.36+Math.sin(a*5)*1.5+(r()-.5)*1.4;g.lineTo(w/2+Math.cos(a)*q,h/2+Math.sin(a)*q);}g.stroke();
  g.lineWidth=1.2;g.beginPath();g.moveTo(w*.18,h*.84);g.lineTo(w*.4,h*.8);g.stroke();});
 // The patch follows the ground so it never floats or sinks.
 const R=.38,disc=new T.CircleGeometry(R,32,0,Math.PI*2),p=disc.attributes.position,centre=place(0,0);
 disc.rotateX(-Math.PI/2);for(let i=0;i<p.count;i++){const q=place(p.getX(i),p.getZ(i));p.setXYZ(i,q.x-centre.x,q.y-centre.y+.006,q.z-centre.z);}disc.computeVertexNormals();
 const patch=new T.Mesh(disc,new T.MeshStandardMaterial({map:earth,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-2}));patch.receiveShadow=true;patch.renderOrder=1;patch.position.copy(centre);group.add(patch);
 const clay=['#9a6b4b','#7f7466','#a88c67','#6b4f3c','#8b5a44','#b09a7a','#5d5a54'];
 const spots:[number,number][]=[[.05,.02],[-.08,.07],[.11,-.09],[-.02,-.12],[.16,.1],[-.14,-.03],[.02,.15]];
 spots.forEach(([x,z],i)=>{const r=.0075+rand()*.0015,q=place(x,z),m=new T.Mesh(new T.SphereGeometry(r,12,8),std(clay[i],.8));m.position.set(q.x,q.y+r,q.z);m.castShadow=true;group.add(m);});
 // The shooter: clear glass with a twisted blue-and-amber vane inside.
 const q=place(-.22,.2),glass=new T.Mesh(new T.SphereGeometry(.009,20,14),new T.MeshPhysicalMaterial({color:'#bfe0e6',roughness:.04,clearcoat:1,clearcoatRoughness:.03,transparent:true,opacity:.55,envMapIntensity:1.4}));glass.position.set(q.x,q.y+.009,q.z);group.add(glass);
 const vane=new T.PlaneGeometry(.013,.0075,6,1),vp=vane.attributes.position;for(let i=0;i<vp.count;i++){const x=vp.getX(i),a=x*140,y=vp.getY(i);vp.setXYZ(i,x,Math.cos(a)*y,Math.sin(a)*y);}
 const inner=new T.Mesh(vane,new T.MeshStandardMaterial({color:'#2f6bd1',emissive:'#1b3d7a',emissiveIntensity:.5,side:T.DoubleSide,roughness:.4}));inner.position.copy(glass.position);inner.rotation.set(.4,.8,.2);group.add(inner);
 return group;
}

// 6 · A horseshoe over the chainshop door, heels up, its edges rubbed bright by years of touching.
function horseshoe(){
 const s=new T.Shape(),R=.062,r=.04;
 s.absarc(0,0,R,-.35,Math.PI+.35,false);s.lineTo(Math.cos(Math.PI+.35)*r,Math.sin(Math.PI+.35)*r);s.absarc(0,0,r,Math.PI+.35,-.35,true);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:.011,bevelEnabled:true,bevelSize:.0025,bevelThickness:.002,bevelSegments:2,curveSegments:28});g.rotateZ(Math.PI);g.center();
 // `polish` rises on the outer rim, the front face and the toe, where hands touch it.
 const p=g.attributes.position,n=g.attributes.normal,polish=new Float32Array(p.count);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rad=Math.hypot(x,y),rim=T.MathUtils.smoothstep(rad,.052,.064),front=Math.max(0,n.getZ(i))*T.MathUtils.smoothstep(z,0,.007),toe=T.MathUtils.smoothstep(-y,.0,.05);polish[i]=Math.min(1,rim*.8+front*.45*toe+(Math.abs(n.getZ(i))<.5?.35*toe:0));}
 g.setAttribute('polish',new T.BufferAttribute(polish,1));
 const m=new T.MeshStandardMaterial({color:'#433a33',roughness:.85,metalness:.45});
 m.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float polish;varying float vPolish;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPolish=polish;');
  shader.fragmentShader='varying float vPolish;\n'+shader.fragmentShader
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.62,.56),vPolish);')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.2,vPolish);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.95,vPolish);');
 };
 m.customProgramCacheKey=()=>'polished-horseshoe';
 const shoe=new T.Mesh(g,m);shoe.castShadow=true;
 const group=new T.Group();group.name='Lucky horseshoe, rubbed bright';group.add(shoe);
 const nail=std('#2a2826',.7,.6);for(const x of [-.045,.045]){const h=new T.Mesh(new T.CylinderGeometry(.0035,.0035,.004,6),nail);h.rotation.x=Math.PI/2;h.position.set(x,.012,.008);group.add(h);}
 return group;
}

// 7 · Initials carved into the gate: TRW and a date, the date's end hidden under a later patch board.
function gateCarving(){
 const W=512,H=192,draw=(bump:boolean)=>(g:CanvasRenderingContext2D,w:number,h:number)=>{
  g.fillStyle=bump?'#fff':'rgba(0,0,0,0)';g.fillRect(0,0,w,h);
  const groove=bump?'#262626':'rgba(40,28,18,.92)',lip=bump?'#ffffff':'rgba(220,196,160,.35)';
  g.textBaseline='middle';g.lineJoin='round';
  const text=(s:string,x:number,y:number,size:number)=>{g.font=`bold ${size}px Georgia, serif`;g.lineWidth=3;g.strokeStyle=lip;g.strokeText(s,x+2,y+2);g.fillStyle=groove;g.fillText(s,x,y);};
  // Knife-cut letters: straight V-cuts, slightly uneven, as a pocket knife would leave them.
  const r=seeded(1852),cut=(pts:[number,number][],width:number)=>{g.lineCap='round';for(const pass of [0,1]){g.beginPath();pts.forEach(([x,y],i)=>{const jx=x+(r()-.5)*2.5,jy=y+(r()-.5)*2.5;if(i)g.lineTo(jx+(pass?2:0),jy+(pass?2:0));else g.moveTo(jx+(pass?2:0),jy+(pass?2:0));});g.lineWidth=pass?width*.45:width;g.strokeStyle=pass?lip:groove;g.stroke();}};
  const L=(x:number,y:number,s=1)=>({T:()=>{cut([[x,y],[x+56*s,y+3]],11);cut([[x+28*s,y+1],[x+30*s,y+92*s]],11);},
   R:()=>{cut([[x,y+2],[x+2,y+92*s]],11);cut([[x,y+2],[x+34*s,y+4],[x+48*s,y+22*s],[x+34*s,y+44*s],[x+2,y+46*s]],10);cut([[x+22*s,y+46*s],[x+52*s,y+92*s]],11);},
   W:()=>cut([[x,y],[x+16*s,y+92*s],[x+36*s,y+30*s],[x+56*s,y+90*s],[x+74*s,y-2]],11)});
  L(60,22).T();L(150,26).R();L(236,20).W();
  g.font='bold 52px Georgia, serif';g.textBaseline='middle';g.lineWidth=2;g.strokeStyle=lip;g.strokeText('1852',152,160);g.fillStyle=groove;g.fillText('1852',150,158);
 };
 const map=canvasTexture([W,H],draw(false)),bump=canvasTexture([W,H],draw(true),false);
 const group=new T.Group();group.name='TRW carved on the gate';
 // The old ledge board that carries the carving, worn grey.
 const board=new T.Mesh(new T.BoxGeometry(1.16,.13,.024),std('#7d7263',.95));board.castShadow=board.receiveShadow=true;group.add(board);
 const decal=new T.Mesh(new T.PlaneGeometry(.52,.195),new T.MeshStandardMaterial({map,bumpMap:bump,bumpScale:2.5,transparent:true,roughness:.95,polygonOffset:true,polygonOffsetFactor:-2}));decal.position.set(-.08,0,.0125);group.add(decal);
 // The later repair: a paler, newer piece nailed over the end of the date.
 const patch=new T.Mesh(new T.BoxGeometry(.13,.08,.02),std('#a38d6a',.9));patch.position.set(-.085,-.052,.022);patch.rotation.z=.05;patch.castShadow=true;group.add(patch);
 const nail=std('#2b2927',.6,.6);for(const [x,y] of [[-.135,-.022],[-.035,-.019],[-.135,-.082],[-.035,-.08],[-.52,0],[.52,0]]){const n=new T.Mesh(new T.CylinderGeometry(.004,.004,.004,6),nail);n.rotation.x=Math.PI/2;n.position.set(x,y,x>.4||x<-.4?.014:.034);group.add(n);}
 return group;
}

// 8 · A clay pipe with a stern bearded face on its bowl, and a battered tobacco tin.
function facePipe(rand:Rand){
 const b=new Batch(),clay=std('#e4dccb',.72),tar=std('#2a2019',.8);
 b.add(lathe([[.0035,0],[.011,.004],[.0125,.014],[.012,.028],[.0112,.036],[.0098,.036],[.0102,.026],[.009,.008],[.0,.006]],18),clay);
 b.add(new T.CircleGeometry(.0096,16),tar,m4(0,.0335,0,-Math.PI/2));
 // Built on the bowl's +X side; the pipe then lies on its side on the ledge with the face turned up.
 const fm=(...a:Parameters<typeof m4>)=>new T.Matrix4().makeRotationY(Math.PI/2).multiply(m4(...a));
 const f=.0112,soot=std('#1d1714',.95);
 // Stern: brows drawn down at the inner ends over deep sockets, a heavy nose, a down-turned mouth
 // under a drooping moustache, and a full beard round the lower bowl.
 for(const x of [-1,1]){b.add(new T.BoxGeometry(.0075,.0026,.0034),clay,fm(x*.0042,.0268,f+.0006,-.25,0,x*.42));
  b.add(new T.SphereGeometry(.0021,8,6),soot,fm(x*.0039,.0236,f-.0006));b.add(new T.SphereGeometry(.0009,6,4),clay,fm(x*.0036,.0238,f+.001));}
 b.add(new T.ConeGeometry(.003,.0085,6),clay,fm(0,.0205,f+.0024,Math.PI/2+.45));
 for(const x of [-1,1])b.add(tube([[0,.0168,f+.002],[x*.0045,.0163,f+.0016],[x*.0085,.0135,f-.0002]],.0015,8,5),clay,fm());
 b.add(tube([[-.0042,.0118,f+.0004],[0,.0132,f+.0012],[.0042,.0118,f+.0004]],.0008,8,4),soot,fm());
 for(let i=0;i<9;i++){const a=(i/8-.5)*1.5;b.add(new T.SphereGeometry(.0026,6,4),clay,fm(Math.sin(a)*.0088,.0075+Math.abs(Math.sin(a))*.0025,Math.cos(a)*.0102,0,0,0,[1,1.7,.7]));}
 // Stem, broken short, lying back along the sill.
 b.add(new T.CylinderGeometry(.0024,.0036,.1,8).rotateX(Math.PI/2),clay,m4(0,.009,-.056,-.06));
 const pipe=b.build('Clay pipe with a face');pipe.children.forEach(c=>{c.rotation.z=Math.PI/2;c.position.y=.0125;});
 const tin=new Batch(),red=std('#5e231a',.5,.55),worn=std('#9a958a',.35,.85),rust=std('#7a4a2c',.95,.2);
 // Body: a shallow oval tin, dented on one side, its paint worn to bare tinplate at the rim.
 const body=new T.CylinderGeometry(1,1,.02,28,2).scale(.043,1,.028),bp=body.attributes.position;
 for(let i=0;i<bp.count;i++){const x=bp.getX(i),z=bp.getZ(i);if(x>.018&&z>0)bp.setZ(i,z-.005*Math.min(1,(x-.018)/.02));}body.computeVertexNormals();
 tin.add(body,red,m4(0,.01,0));tin.add(new T.TorusGeometry(1,.035,4,28).scale(.043,.028,1),worn,m4(0,.02,0,Math.PI/2));
 // Lid: pushed back a little so a crescent of tobacco shows; a faded paper label on top.
 tin.add(new T.CylinderGeometry(1,1,.006,28).scale(.0445,1,.0295),red,m4(-.007,.0225,-.003,0,.08,.035));
 tin.add(new T.CircleGeometry(.9,24).scale(.0445,.0295,1),std('#6b4a2e',1),m4(0,.0195,0,-Math.PI/2));
 const label=canvasTexture([128,84],(g,w,h)=>{g.fillStyle='#d8c9a2';g.beginPath();g.ellipse(w/2,h/2,w/2-2,h/2-2,0,0,7);g.fill();g.strokeStyle='#7a2a1f';g.lineWidth=3;g.beginPath();g.ellipse(w/2,h/2,w/2-8,h/2-8,0,0,7);g.stroke();
  g.fillStyle='#6d241a';g.font='bold 17px Georgia, serif';g.textAlign='center';g.fillText('FINE',w/2,h/2-4);g.font='bold 15px Georgia, serif';g.fillText('SHAG',w/2,h/2+14);
  const r=seeded(1865);g.fillStyle='rgba(120,90,60,.45)';for(let i=0;i<40;i++)g.fillRect(r()*w,r()*h,2+r()*6,1+r()*3);});
 tin.add(new T.CircleGeometry(.8,24).scale(.0445,.0295,1),std('#ffffff',.9,0,{map:label,transparent:true}),m4(-.007,.0256,-.003,-Math.PI/2+.035,0,-.08));
 tin.add(new T.TorusGeometry(1,.05,4,28).scale(.0445,.0295,1),rust,m4(-.007,.0254,-.003,Math.PI/2+.035,0,.08));
 const tinGroup=tin.build('Battered tobacco tin');
 const group=new T.Group();group.name='Pipe and tobacco tin on the ledge';pipe.position.set(-.04,0,.005);pipe.rotation.y=.35;tinGroup.position.set(.07,0,-.01);tinGroup.rotation.y=-.2;group.add(pipe,tinGroup);
 return group;
}

// 9 · A child's toy copy of the red works cart: uneven wheels, a string handle, a load of sticks.
function toyCart(rand:Rand){
 const b=new Batch(),red=std('#8d3b2c',.85),wood=std('#8a6c4a',.9,0,{flatShading:true}),string=std('#c9bb97',.95);
 const L=.32,Wd=.19,y0=.055;
 b.add(new T.BoxGeometry(Wd,.012,L),wood,m4(0,y0,0));
 for(const x of [-1,1])b.add(new T.BoxGeometry(.01,.045,L),red,m4(x*(Wd/2-.005),y0+.028,0,0,0,x*.06));
 for(const z of [-1,1])b.add(new T.BoxGeometry(Wd,.04,.01),red,m4(0,y0+.026,z*(L/2-.005)));
 [[.046,-.1],[.052,.1],[.043,-.1],[.049,.1]].forEach(([r,z],i)=>{const x=(i<2?-1:1)*(Wd/2+.012);
  b.add(new T.CylinderGeometry(r,r,.012,9),wood,m4(x,r,z,(rand()-.5)*.12,0,Math.PI/2+(rand()-.5)*.14));
  b.add(new T.CylinderGeometry(.006,.006,.018,6),std('#5f4a33',.9),m4(x,r,z,0,0,Math.PI/2));});
 for(const z of [-.1,.1])b.add(new T.CylinderGeometry(.004,.004,Wd+.03,5),std('#5f4a33',.9),m4(0,.048,z,0,0,Math.PI/2));
 // Shafts in miniature, then a string handle trailing on the ground.
 for(const x of [-1,1])b.add(new T.BoxGeometry(.008,.008,.16),wood,m4(x*.05,y0,L/2+.075,.2));
 b.add(tube([[0,y0-.02,L/2+.15],[.02,.02,L/2+.26],[-.03,.006,L/2+.38],[.04,.004,L/2+.5],[.08,.004,L/2+.55]],.0018,20,4),string);
 for(let i=0;i<16;i++)b.add(new T.CylinderGeometry(.004,.005,.16+rand()*.08,5),std(['#6e5a40','#7c6749','#5c4a36'][i%3],.95),m4((rand()-.5)*.13,y0+.02+rand()*.035,(rand()-.5)*.06,Math.PI/2+(rand()-.5)*.3,(rand()-.5)*.4,0));
 return b.build('Toy copy of the works cart');
}

// 10 · Liberty caps (Psilocybe semilanceata): pointed, nippled bell caps on thin wavy stems.
function libertyCaps(rand:Rand,count:number){
 const b=new Batch(),cap=std('#b08a55',.55),dark=std('#7c5a37',.6),stem=std('#d0bf99',.8),gill=std('#6d5a45',.9,0,{side:T.DoubleSide});
 for(let i=0;i<count;i++){
  const R=.005+rand()*.006,H=R*(1.35+rand()*.4),len=.045+rand()*.045,a=rand()*Math.PI*2,r=Math.sqrt(rand())*.16,x=Math.cos(a)*r,z=Math.sin(a)*r,lean=(rand()-.5)*.5,dir=rand()*6.28;
  const top=new T.Vector3(x+Math.cos(dir)*lean*len*.4,len,z+Math.sin(dir)*lean*len*.4);
  b.add(tube([[x,0,z],[x+Math.cos(dir+1)*.004,len*.35,z+Math.sin(dir+1)*.004],[x+(top.x-x)*.6,len*.7,z+(top.z-z)*.6],[top.x,top.y,top.z]],.0009+R*.08,8,5),stem);
  const profile:[number,number][]=[[0,H],[R*.16,H*.95],[R*.22,H*.86],[R*.34,H*.8],[R*.62,H*.55],[R*.86,H*.25],[R,0]];
  const tilt=m4(top.x,top.y-H*.12,top.z,Math.cos(dir)*lean*.8,0,-Math.sin(dir)*lean*.8);
  b.add(lathe(profile,14),rand()<.3?dark:cap,tilt.clone());
  b.add(lathe([[R*.97,0],[R*.3,H*.12],[.0008,H*.1]],14),gill,tilt.clone());
 }
 return b.build('Liberty caps in the grass');
}

export type HiddenDetailAnchors={
 forgeRoot:T.Object3D;weaverShop:T.Object3D;founder:Home;homes:Home[];stores:T.Object3D[];
 brook:{p:Point;along:Point;water:number;bank:number};grass:Point;
 yardPoint:(x:number,z:number,y?:number)=>T.Vector3;chainshopReplacesHouse:number;
};
export function addHiddenDetails(scene:T.Scene,a:HiddenDetailAnchors){
 const root=new T.Group();root.name='Hidden details';scene.add(root);
 const where:Record<string,number[]>={};
 const note=(name:string,o:T.Object3D)=>{o.updateMatrixWorld(true);const p=o.getWorldPosition(new T.Vector3());where[name]=[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)];};
 where.founder=[a.founder.x,a.founder.z,a.founder.angle,[6.4,7.2,9.2][a.founder.style]*a.founder.sx,[4.6,4.8,4.5][a.founder.style]*a.founder.sz].map(n=>+n.toFixed(3));
 const weaverHomes=a.homes.filter(h=>/Weaver/.test(h.family??'')&&h.number!==a.chainshopReplacesHouse);

 // 1 · On the sill of the front window beside the chainshop door.
 const figure=scrapChainmaker();figure.position.set(3.2,.86,2.37);figure.rotation.y=.35;a.forgeRoot.add(figure);note('scrapChainmaker',figure);
 // 6 · Heels up over the chainshop door.
 const shoe=horseshoe();shoe.position.set(4.76,2.42,0);shoe.rotation.y=Math.PI/2;a.forgeRoot.add(shoe);note('horseshoe',shoe);

 // 2 · Caught at the brook's edge by the fly agarics, bow into the reeds.
 {const [dx,dz]=a.brook.along,side=[-dz,dx],p:Point=[a.brook.p[0]+side[0]*a.brook.bank,a.brook.p[1]+side[1]*a.brook.bank];
  const boat=toyBoat(seeded(7021)),heading=Math.atan2(dx,dz);boat.scale.setScalar(1.3);boat.position.set(p[0],a.brook.water-.014,p[1]);boat.rotation.set(0,heading+.5,.2);root.add(boat);note('toyBoat',boat);
  const out=Math.sign(a.brook.bank)||1,r=reeds(seeded(7022),30,.28),q:Point=[p[0]+side[0]*out*.32,p[1]+side[1]*out*.32];r.position.set(q[0],Math.max(a.brook.water,ground(...q)-.02),q[1]);root.add(r);}

 // 3 · In a clog on a ledge under the front eave of the store nearest Henry's house.
 {const home=new T.Vector2(a.founder.x,a.founder.z),at=new T.Vector3(),store=a.stores.map(s=>({s,d:home.distanceTo(new T.Vector2(s.getWorldPosition(at).x,at.z))})).sort((p,q)=>p.d-q.d)[0]?.s;
  if(store){const info=store.userData.store as {width:number;depth:number;eave:number;doorX:number;doorW:number};
   const x=info.doorX+(info.doorX<=0?1:-1)*(info.doorW/2+.42),y=info.eave-.34,z=-info.depth/2-.075;
   const ledge=new T.Group();ledge.name='Ledge under the eave';ledge.position.set(x,y,z);
   const plank=new T.Mesh(new T.BoxGeometry(.42,.025,.13),std('#6a5641',.95));plank.castShadow=plank.receiveShadow=true;ledge.add(plank);
   for(const bx of [-.15,.15]){const bracket=new T.Mesh(new T.BoxGeometry(.025,.1,.025),std('#5a4836',.95));bracket.position.set(bx,-.06,.05);bracket.rotation.x=-.5;ledge.add(bracket);}
   const clog=clogNest(seeded(7031));clog.position.set(0,.012,-.005);clog.rotation.set(0,Math.PI/2+.25,0);clog.rotation.order='YXZ';clog.rotation.x=-.12;ledge.add(clog);
   store.add(ledge);note('clogNest',clog);}}

 // 4 · Beside the largest Weaver house (not Henry's), at its front corner.
 {const h=weaverHomes.filter(h=>h.number!==a.founder.number).sort((p,q)=>q.width*q.depth-p.width*p.depth)[0];
  if(h){const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz,p=localPoint(h,-(w/2-1.1),d/2+1.5);
   const cottage=brickCottage(seeded(7041));cottage.position.set(p[0],ground(...p)-.01,p[1]);cottage.rotation.y=h.angle+.12;root.add(cottage);note('brickCottage',cottage);where.brickCottageHouse=[h.number];}}

 // 5 · In the lee of Henry's back wall, near the gable end.
 {const fd=[4.6,4.8,4.5][a.founder.style]*a.founder.sz,fw=[6.4,7.2,9.2][a.founder.style]*a.founder.sx,centre=a.yardPoint(fw/2-1.3,-(fd/2+1.0)),angle=a.founder.angle;
  const place=(x:number,z:number)=>{const c=Math.cos(angle),s=Math.sin(angle),px=centre.x+c*x+s*z,pz=centre.z-s*x+c*z;return new T.Vector3(px,ground(px,pz),pz);};
  const game=marbles(seeded(7051),place);root.add(game);where.marbles=[+centre.x.toFixed(2),+centre.y.toFixed(2),+centre.z.toFixed(2)];}

 // 7 · On the mended gate beside Henry's yard, on the lane side.
 {const p=a.yardPoint(5.8,-1.75,.64),carving=gateCarving();carving.position.copy(p);carving.rotation.y=a.founder.angle+Math.PI/2;
  carving.translateZ(.045);root.add(carving);note('gateCarving',carving);}

 // 8 · On the window ledge of the Weavers' small shop (the shop itself is built at reduced scale).
 {const shop=a.weaverShop;shop.updateMatrixWorld(true);const p=shop.localToWorld(new T.Vector3(1.35,.87,2.38));
  const items=facePipe(seeded(7081));items.position.copy(p);items.rotation.y=shop.rotation.y;root.add(items);note('facePipe',items);}

 // 9 · Parked beside the works cart's right wheel.
 {const toy=toyCart(seeded(7091));toy.position.set(.95,0,5.35);a.forgeRoot.add(toy);toy.updateMatrixWorld(true);
  const w=toy.getWorldPosition(new T.Vector3());toy.position.y=ground(w.x,w.z)-a.forgeRoot.position.y+.002;toy.rotation.y=-.35;note('toyCart',toy);}

 // 10 · A patch in the lane-side grass.
 {const caps=libertyCaps(seeded(7101),16);caps.position.set(a.grass[0],ground(...a.grass)-.004,a.grass[1]);root.add(caps);note('libertyCaps',caps);}

 return {root,where};
}
