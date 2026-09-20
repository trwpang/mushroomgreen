import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {refineSurface} from '../rendering/surfaces';
import {textureDetail} from './texture-detail';

export const propNames={wheelbarrow:'Wooden wheelbarrow',handcart:'Low timber handcart',pump:'Village hand pump',tub:'Staved washing tub',washboard:'Wooden washboard',scuttle:'Coal scuttle',woodpile:'Split firewood stack',block:'Chopping block and axe',grindstone:'Hand-cranked grindstone',tools:'Garden tool rack',basket:'Wicker carrying basket',bucket:'Oak water bucket',churn:'Conical milk churn',ladder:'Wooden step ladder',broom:'Birch besom broom',trough:'Carved feeding trough',barrel:'Rain barrel and tap',hayfork:'Three-tine hay fork',sacks:'Tied grain sacks',trestles:'Saw trestles and hand saw'} as const;
export type PropKind=keyof typeof propNames;
type V=[number,number,number];
const tau=Math.PI*2;
// Original metre-scale geometry. References inform construction, not exact historical ownership.
export function createPropKit(oak?:T.MeshStandardMaterial){
 const mats=[new T.MeshStandardMaterial({vertexColors:true,roughness:.96,map:oak?.map??null,normalMap:oak?.normalMap??null,roughnessMap:oak?.roughnessMap??null}),new T.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.55}),new T.MeshStandardMaterial({vertexColors:true,roughness:1}),new T.MeshStandardMaterial({vertexColors:true,roughness:.96}),new T.MeshStandardMaterial({vertexColors:true,roughness:.25,metalness:.22}),new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide})];
 mats.forEach((m,i)=>{m.name=['Prop oak','Prop iron','Prop stone','Prop end grain','Prop still water','Prop sack cloth'][i];if(i<4)refineSurface(m,['wood','iron','stone','wood'][i] as 'wood'|'iron'|'stone');});
 refineSurface(mats[5],'cloth');
 const cutFace=new T.MeshStandardMaterial({name:'Prop cut face',vertexColors:true,roughness:.96});
 // The lengthwise procedural wood shader would cross the radial cut-face pattern.
 textureDetail(cutFace,'end-grain');mats.push(cutFace);
 // Original woven hemp texture: crossing yarns and fine fibres, with mipmaps for distant views.
 const clothPixels=new Uint8Array(256*256*4);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const cellX=Math.floor(x/8),cellY=Math.floor(y/8),over=(cellX+cellY)%2===0;
  const strand=over?Math.sin((x%8+.5)/8*Math.PI):Math.sin((y%8+.5)/8*Math.PI),fibre=Math.sin(x*1.7+y*2.3)*5;
  const shade=Math.round(174+strand*59+fibre),i=(y*256+x)*4;clothPixels[i]=shade;clothPixels[i+1]=shade;clothPixels[i+2]=shade;clothPixels[i+3]=255;
 }
 const hemp=new T.DataTexture(clothPixels,256,256);hemp.wrapS=hemp.wrapT=T.RepeatWrapping;hemp.repeat.set(10,8);hemp.generateMipmaps=true;hemp.minFilter=T.LinearMipmapLinearFilter;hemp.magFilter=T.LinearFilter;hemp.colorSpace=T.SRGBColorSpace;hemp.needsUpdate=true;
 mats[5].map=hemp;mats[5].bumpMap=hemp;mats[5].bumpScale=.0025;

 const W=0,I=1,S=2,E=3,A=4,C=5,F=6;
 const brown='#837057',dark='#33342e',cut='#b49b72',rust='#77553c';
 const make=(kind:PropKind)=>{
 let seed=Object.keys(propNames).indexOf(kind)*1931+1865;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const parts:T.BufferGeometry[][]=mats.map(()=>[]);const root=new T.Group();root.name=propNames[kind];root.userData.kind=kind;
 const add=(geo:T.BufferGeometry,k:number,c:string,p:V=[0,0,0],rot:V=[0,0,0],shade?:number)=>{
  const g=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();g.applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(...rot,'YXZ')));g.translate(...p);
  const color=new T.Color(k===W&&oak?.map?'#cbbda5':c).multiplyScalar(shade??(.84+rand()*.27)),data=new Float32Array(g.attributes.position.count*3);for(let i=0;i<data.length;i+=3)color.toArray(data,i);g.setAttribute('color',new T.BufferAttribute(data,3));
  if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(k===W&&oak?.map){const t=(parts[k].length*7+g.attributes.position.count)%16,uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(t%4+.015+uv.getX(i)*.97)/4,(Math.floor(t/4)+.015+uv.getY(i)*.97)/4);}
  parts[k].push(g);
 };
 const box=(p:V,size:V,k=W,c=brown,rot:V=[0,0,0])=>add(new T.BoxGeometry(...size),k,c,p,rot);
 const rod=(a:V,b:V,r:number,k=W,c=brown,r2=r,n=10)=>{const v=new T.Vector3(...a),to=new T.Vector3(...b),g=new T.CylinderGeometry(r2,r,v.distanceTo(to),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(v).normalize()));g.translate(...v.add(to).multiplyScalar(.5).toArray());add(g,k,c);};
 const tube=(points:V[],r:number,k=I,c=dark)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*5),r,6,false),k,c);
 const torus=(p:V,r:number,t:number,k=I,c=dark,rot:V=[0,0,0],arc=tau)=>add(new T.TorusGeometry(r,t,5,32,arc),k,c,p,rot);
 const nail=(p:V)=>add(new T.CylinderGeometry(.009,.009,.007,6),I,rust,p,[Math.PI/2,0,0]);
 const plank=(p:V,size:V,rot:V=[0,0,0])=>{box(p,size,W,brown,rot);};
 const blade=(outline:[number,number][],depth:number,p:V,rot:V=[0,0,0],color=dark)=>{const s=new T.Shape();outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1,steps:1});g.translate(0,0,-depth/2);add(g,I,color,p,rot);};
 const wheel=(x:number,y:number,z:number,r:number,spokes=10)=>{
  // Flat metal tyre around eight distinct wooden rim sections.
  for(let j=0;j<8;j++){const a=j*tau/8,s=new T.Shape();for(let n=0;n<=4;n++){const t=a+.006+n*(tau/8-.012)/4;const p=[Math.cos(t)*r,Math.sin(t)*r];n?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]);}for(let n=4;n>=0;n--){const t=a+.006+n*(tau/8-.012)/4;s.lineTo(Math.cos(t)*(r-.047),Math.sin(t)*(r-.047));}s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.052,bevelEnabled:false});g.translate(0,0,-.026);add(g,W,brown,[x,y,z],[0,Math.PI/2,0]);}
  const tyre=new T.CylinderGeometry(r+.009,r+.009,.052,32,1,true);tyre.rotateZ(Math.PI/2);add(tyre,I,dark,[x,y,z]);
  for(let j=0;j<spokes;j++){const a=j*tau/spokes;rod([x,y+Math.cos(a)*.06,z+Math.sin(a)*.06],[x,y+Math.cos(a)*(r-.025),z+Math.sin(a)*(r-.025)],.015,W,brown,.022,4);}
  rod([x-.065,y,z],[x+.065,y,z],.065,W,brown,.057,12);rod([x-.081,y,z],[x+.081,y,z],.024,I,dark);box([x+.084,y,z],[.009,.064,.01],I,rust);
 };
 const log=(p:V,r:number,length:number,angle=0)=>{
  // A split billet: bark on the curved back, pale split plane and visible end grain.
  const shape=new T.Shape();shape.moveTo(-r,0);for(let i=0;i<=8;i++){const a=Math.PI-i*Math.PI/8;shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false});g.translate(0,0,-length/2);
  // Preserve the original one colour draw: material splitting must not change the seeded pile.
  const shade=.84+rand()*.27;
  for(const group of g.groups){const piece=new T.BufferGeometry();
   for(const name of ['position','normal','uv']){const a=g.getAttribute(name);piece.setAttribute(name,new T.Float32BufferAttribute(Array.from(a.array).slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize),a.itemSize));}
   const cap=group.materialIndex===0;
   if(cap){const p=piece.getAttribute('position'),uv=piece.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+r)/(2*r),.5+p.getY(i)/(2*r));}
   add(piece,cap?F:E,cut,p,[0,0,angle],shade);
  }g.dispose();
  const bark=new T.CylinderGeometry(r+.003,r+.003,length,12,1,true,0,Math.PI);bark.rotateX(Math.PI/2);bark.rotateZ(Math.PI/2);add(bark,W,'#514534',p,[0,0,angle]);
  // Dark radial checks on both end faces; deliberately irregular lengths.
  for(const end of [-1,1])for(let i=0;i<3;i++){const a=.25+i*.78,len=r*(.28+rand()*.36);rod([p[0]+Math.cos(a+angle)*r*.18,p[1]+Math.sin(a+angle)*r*.18,p[2]+end*(length/2+.001)],[p[0]+Math.cos(a+angle)*len,p[1]+Math.sin(a+angle)*len,p[2]+end*(length/2+.001)],.002,E,'#65513c',.001,4);}
 };
 if(kind==='wheelbarrow'||kind==='handcart'){
  const hand=kind==='handcart',radius=hand?.39:.275,wy=radius+.01,zAxle=hand?0:-.76,half=hand?.55:.33;
  if(hand){wheel(-.65,wy,0,radius);wheel(.65,wy,0,radius);rod([-.73,wy,0],[.73,wy,0],.025,I,dark);}else{wheel(0,wy,zAxle,radius,8);rod([-.36,wy,zAxle],[.36,wy,zAxle],.026,I,dark);for(const x of [-.33,.33])box([x,wy+.054,zAxle],[.033,.15,.065],I,dark);}
  const bedY=hand?.51:.42,bedL=hand?1.35:.89;
  for(const side of [-1,1]){
   rod([side*half,.38,hand?-bedL/2-.15:-.83],[side*(half+.045),.60,hand?1.65:1.10],.035,W,brown,.027,4);
   rod([side*half,.025,.46],[side*half,bedY,.31],.03,W,brown,.034,4);rod([side*half,.09,.44],[side*half,bedY,-.12],.012,I,dark);
   for(let row=0;row<(hand?2:3);row++)plank([side*(half+.015+row*.022),bedY+.095+row*.105,0],[.042,.099,bedL], [0,0,-side*.16]);
   for(const z of [-bedL/2+.07,bedL/2-.07]){box([side*(half+.055),bedY+.17,z],[.018,hand?.27:.38,.037],I,dark);for(const y of [bedY+.06,bedY+.26])nail([side*(half+.071),y,z]);}
  }
  for(let i=0;i<(hand?8:5);i++)plank([-half+(i+.5)*half*2/(hand?8:5),bedY,0],[half*2/(hand?8:5)-.005,.045,bedL]);
  for(const z of [-bedL/2,bedL/2])for(let row=0;row<(hand?2:3);row++)plank([0,bedY+.095+row*.105,z],[half*2+.065+row*.04,.099,.038]);
  box([0,bedY-.055,0],[half*2,.085,.10],W,brown);
  if(hand){rod([-half-.045,.60,1.64],[half+.045,.60,1.64],.027,W,brown);for(let i=0;i<4;i++)log([-.35+i*.22,bedY+.027,0],.09,.65,(i-.5)*.025);}
  else for(let i=0;i<8;i++){const g=new T.IcosahedronGeometry(.065+rand()*.025,0);g.scale(1,.6,1.2);add(g,S,'#776d55',[(rand()-.5)*.4,bedY+.07,(rand()-.5)*.6]);}
 }
 if(kind==='pump'){
  for(let i=0;i<4;i++)box([(i%2-.5)*.50,.035,(Math.floor(i/2)-.5)*.51],[.49,.07,.50],S,'#8c8066',[0,(rand()-.5)*.025,0]);
  box([0,.12,0],[.45,.16,.40],I,'#363c35');box([0,.74,0],[.25,1.14,.25],I,'#3b443b');
  for(const y of [.21,1.25,1.30])box([0,y,0],[.32,.045,.32],I,dark);
  add(new T.ConeGeometry(.225,.14,4),I,dark,[0,1.39,0],[0,Math.PI/4,0]);
  // Recessed front plate and corner mouldings, no invented date or maker.
  box([0,.78,.132],[.16,.77,.014],I,'#29332d');for(const x of [-.11,.11])box([x,.73,.14],[.013,1,.015],I,'#596053');
  tube([[0,.84,.12],[0,.85,.28],[0,.79,.39],[0,.73,.40]],.045);torus([0,.726,.40],.043,.008,I,'#6b6754',[Math.PI/2,0,0]);
  add(new T.CircleGeometry(.035,16),I,'#101612',[0,.731,.40],[-Math.PI/2,0,0]);
  rod([.08,1.13,0],[.22,1.13,0],.027,I,dark);tube([[.19,1.13,0],[.38,1.03,0],[.48,.76,0],[.59,.47,0],[.66,.43,0]],.019,I,'#504d3b');
  rod([.62,.43,0],[.73,.43,0],.026,W,brown);for(const x of [-.16,.16])for(const z of [-.14,.14])add(new T.CylinderGeometry(.018,.018,.015,6),I,rust,[x,.21,z]);
  // Open drainage trough below the spout.
  box([0,.09,.64],[.5,.09,.60],S,'#625e4c');for(const x of [-.27,.27])box([x,.16,.64],[.065,.21,.68],S,'#827b66');for(const z of [.32,.96])box([0,.16,z],[.6,.21,.055],S,'#827b66');box([0,.139,.64],[.45,.009,.55],A,'#39463d');
 }
 if(kind==='tub'){
  const n=24;for(let i=0;i<n;i++){const a=i*tau/n;plank([Math.sin(a)*.40,.23,Math.cos(a)*.40],[.102,.43,.035],[.09,a,0]);}
  add(new T.CylinderGeometry(.375,.375,.035,24),W,brown,[0,.03,0]);
  for(const y of [.095,.345]){const hoop=new T.CylinderGeometry(.40+(y-.23)*.09+.022,.40+(y-.23)*.09+.022,.034,48,1,true);add(hoop,I,dark,[0,y,0]);}
  for(const side of [-1,1])tube([[side*.405,.27,-.09],[side*.49,.28,-.08],[side*.49,.28,.08],[side*.405,.27,.09]],.017,I,dark);
  add(new T.CircleGeometry(.365,40),A,'#697068',[0,.16,0],[-Math.PI/2,0,0]);
  for(let i=0;i<3;i++)torus([-.12+i*.11,.162,.05+i*.04],.035+i*.012,.0014,A,'#9caa96',[Math.PI/2,0,0]);
 }
 if(kind==='washboard'){
  // Wooden rubbing surface is an interpretation appropriate to a modest early household.
  for(const side of [-1,1])plank([side*.205,.42,0],[.043,.84,.05]);
  plank([0,.10,0],[.42,.06,.055]);plank([0,.75,0],[.42,.13,.055]);plank([0,.42,.011],[.37,.56,.025]);
  for(let i=0;i<25;i++)rod([-.176,.16+i*.022,.039],[.176,.16+i*.022,.039],.009,E,i%4?'#988361':'#b5a17b',.009,6);
  for(const x of [-.205,.205])for(const y of [.1,.71])nail([x,y,.029]);
  // A small worn cake of soap on the top ledge.
  box([0,.73,.049],[.14,.045,.06],E,'#baa984');
 }
 if(kind==='scuttle'){
  const vertices:number[]=[],rings=12,n=40;
  const point=(i:number,j:number,inside=false):V=>{const t=i/rings,a=j*tau/n,front=(Math.cos(a)+1)/2,r=(.105+.075*Math.sin(t*Math.PI/2))-(inside?.008:0);return [Math.sin(a)*r,.06+t*(.32-.15*front),Math.cos(a)*(r+.12*t*front)];};
  for(let i=0;i<rings;i++)for(let j=0;j<n;j++)for(const inside of [false,true]){const a=point(i,j,inside),b=point(i,j+1,inside),c=point(i+1,j+1,inside),d=point(i+1,j,inside);vertices.push(...(inside?[a,c,b,a,d,c]:[a,b,c,a,c,d]).flat());}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();add(g,I,'#414039');
  const lip:V[]=[];for(let j=0;j<=n;j++)lip.push(point(rings,j));tube(lip,.006,I,'#69634e');
  add(new T.CylinderGeometry(.10,.135,.065,24),I,dark,[0,.034,0]);
  tube([[-.17,.26,0],[-.15,.43,0],[0,.51,0],[.15,.43,0],[.17,.26,0]],.013,I,'#63543f');rod([-.055,.50,0],[.055,.50,0],.02,W,brown);
  for(const x of [-.17,.17])nail([x,.26,.008]);tube([[-.05,.26,-.18],[-.055,.27,-.25],[.055,.27,-.25],[.05,.26,-.18]],.011,I,dark);
  for(let i=0;i<12;i++){const g=new T.IcosahedronGeometry(.027+rand()*.018,0);add(g,I,'#202722',[(rand()-.5)*.20,.12+rand()*.035,(rand()-.5)*.18]);}
 }
 if(kind==='woodpile'){
  for(const z of [-.29,.29])plank([0,.065,z],[1.42,.13,.095]);
  for(const x of [-.67,.67]){plank([x,.065,0],[.11,.13,.85]);plank([x,.46,-.35],[.08,.90,.08]);}
  for(let row=0;row<8;row++)for(let col=0;col<7-row%2;col++)log([-.57+col*.185+(row%2)*.09,.135+row*.085,-.04+(rand()-.5)*.10],.091+rand()*.016,.60+rand()*.15,(rand()-.5)*.20);
 }
 if(kind==='block'){
  add(new T.CylinderGeometry(.24,.28,.45,17),W,'#534534',[0,.225,0]);
  const capSource=new T.CylinderGeometry(.233,.233,.012,32),capGeo=capSource.toNonIndexed();capSource.dispose();const capShade=.84+rand()*.27;
  for(const group of capGeo.groups){const piece=new T.BufferGeometry();for(const name of ['position','normal','uv']){const a=capGeo.getAttribute(name);piece.setAttribute(name,new T.Float32BufferAttribute(Array.from(a.array).slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize),a.itemSize));}add(piece,group.materialIndex===1?F:E,cut,[0,.452,0],[0,0,0],capShade);}capGeo.dispose();
  // Growth rings now come from the cut-face map; keep later seeded chips unchanged.
  for(let i=0;i<7;i++)rand();
  for(let i=0;i<12;i++){const a=i*tau/12;rod([Math.sin(a)*.257,.02,Math.cos(a)*.257],[Math.sin(a)*.236,.41,Math.cos(a)*.236],.007,W,'#433b2d',.004,4);}
  for(let i=0;i<5;i++){const a=i*.78;rod([0,.461,0],[Math.cos(a)*.17,.461,Math.sin(a)*.17],.002,E,'#4c3c2c',.001,4);}
  blade([[-.08,0],[.10,0],[.08,.10],[.035,.19],[-.055,.19],[-.08,.10]],.048,[-.055,.43,0],[0,0,-.15]);
  rod([-.035,.58,0],[.59,.84,.02],.022,W,'#a38d67',.026,10);box([-.06,.60,.025],[.07,.024,.012],I,'#8f8570');
  for(let i=0;i<9;i++){const a=rand()*tau,r=.34+rand()*.19;const g=new T.ConeGeometry(.014+rand()*.013,.055+rand()*.035,3);add(g,E,cut,[Math.sin(a)*r,.012,Math.cos(a)*r],[Math.PI/2,a,0]);}
  log([-.39,.04,.18],.08,.30,.2);
 }
 if(kind==='grindstone'){
  for(const x of [-.30,.30]){
   for(const z of [-.46,.46]){rod([x*1.45,.025,z*1.45],[x,.80,z],.053,W,brown,.048,4);}
   plank([x,.78,0],[.12,.13,1.14]);plank([x*1.32,.24,0],[.075,.09,1.13]);
  }
  for(const z of [-.44,.44])plank([0,.76,z],[.72,.08,.095]);
  add(new T.CylinderGeometry(.37,.37,.115,64),S,'#aaa58c',[0,.90,0],[0,0,Math.PI/2]);
  for(const side of [-1,1]){
   for(let j=0;j<9;j++)torus([side*.059,.90,0],.07+j*.031,.0013,S,'#8f8e79',[0,Math.PI/2,0],tau-.08);
   box([side*.30,.86,0],[.09,.09,.10],I,dark);rod([side*.37,.90,0],[0,.90,0],.025,I,dark);
  }
  tube([[.37,.90,0],[.45,.90,0],[.47,.70,0],[.60,.70,0]],.018,I,'#67583f');rod([.54,.70,0],[.66,.70,0],.03,W,brown);
  // Narrow open water trough under the stone; room for the crank and the operator.
  box([0,.48,0],[.23,.045,.61],W,brown);for(const x of [-.135,.135])box([x,.55,0],[.035,.18,.66],W,brown);for(const z of [-.31,.31])box([0,.55,z],[.29,.18,.035],W,brown);box([0,.525,0],[.21,.009,.56],A,'#4b5449');
  for(const x of [-.3,.3])for(const z of [-.45,.45])nail([x,.79,z+.06]);
 }
 if(kind==='tools'){
  for(const x of [-.50,.50]){plank([x,.71,0],[.07,1.42,.09]);plank([x,.035,.13],[.13,.07,.35]);}
  for(const y of [.24,1.12])plank([0,y,0],[1.13,.09,.065]);
  for(const x of [-.34,0,.34]){rod([x,.14,.16],[x,1.28,.07],.018,W,brown,.020);rod([x-.07,1.28,.07],[x+.07,1.28,.07],.02,W,brown);for(const dx of [-.04,.04])tube([[x+dx,1.14,.03],[x+dx,1.14,.15],[x+dx,1.18,.15]],.007,I,dark);}
  blade([[-.10,.22],[.10,.22],[.105,.035],[.07,0],[-.07,0],[-.105,.035]],.013,[-.34,.02,.165],[.04,0,0],'#625e4b');
  box([0,.26,.145],[.22,.038,.025],I,dark);for(let i=0;i<4;i++)tube([[-.085+i*.056,.26,.145],[-.085+i*.056,.12,.17],[-.085+i*.056,.03,.20]],.01,I,'#665e4a');
  box([.34,.12,.19],[.31,.045,.06],W,brown);for(let i=0;i<9;i++)rod([.20+i*.036,.12,.20],[.20+i*.036,.03,.27],.007,I,dark);
  for(const x of [-.5,.5])for(const y of [.24,1.12])nail([x,y,.039]);
 }
 if(kind==='basket'){
  const wicker=(ps:V[],r=.004,c='#927247')=>add(new T.TubeGeometry(new T.CatmullRomCurve3(ps.map(p=>new T.Vector3(...p))),ps.length-1,r,4,false),E,c);
  for(let row=0;row<18;row++){const y=.04+row*.017,t=(y-.04)/.30,ps:V[]=[];
   for(let j=0;j<=48;j++){const a=j*tau/48,wave=Math.cos(a*24/2+row*Math.PI)*.004;ps.push([Math.cos(a)*(.22+t*.075+wave),y,Math.sin(a)*(.16+t*.07+wave)]);}wicker(ps,.0085,row%3?'#917144':'#ad8b55');}
  for(let j=0;j<24;j++){const a=j*tau/24,ps:V[]=[];for(let row=0;row<=12;row++){const t=row/12;ps.push([Math.cos(a)*(.22+t*.075),.035+t*.31,Math.sin(a)*(.16+t*.07)]);}wicker(ps,.005,'#705732');}
  for(let j=0;j<14;j++){const x=(j-6.5)*.029,zmax=.16*Math.sqrt(Math.max(0,1-x*x/(.22*.22)));rod([x,.035,-zmax],[x,.035,zmax],.008,E,'#987748',.008,4);}
  for(let j=0;j<12;j++){const z=(j-5.5)*.026,xmax=.22*Math.sqrt(Math.max(0,1-z*z/(.16*.16)));rod([-xmax,.040,z],[xmax,.040,z],.006,E,'#aa8652',.006,4);}
  for(let row=0;row<3;row++){const ps:V[]=[];for(let j=0;j<=48;j++){const a=j*tau/48;ps.push([Math.cos(a)*(.297+row*.003),.343+row*.005,Math.sin(a)*(.234+row*.003)]);}wicker(ps,.006);}
  for(const dz of [-.01,0,.01]){const ps:V[]=[];for(let j=0;j<=28;j++){const a=j*Math.PI/28;ps.push([Math.cos(a)*.294,.34+Math.sin(a)*.30,dz+Math.sin(a*5)*.002]);}wicker(ps,.008,'#8c693e');}
 }
 if(kind==='bucket'||kind==='barrel'){
  const big=kind==='barrel',height=big?.88:.30,rad=big?.29:.145,n=big?26:18,base=big?.12:.016;
  const radius=(y:number)=>rad+(big?Math.sin(y/height*Math.PI)*.047:y*.075);
  for(let i=0;i<n;i++){const a=i*tau/n,g=new T.BoxGeometry(rad*tau/n-.002,height,.027,1,10,1),p=g.attributes.position;
   for(let j=0;j<p.count;j++){const y=p.getY(j)+height/2,r=radius(y)+p.getZ(j),angle=a+p.getX(j)/rad;p.setXYZ(j,Math.sin(angle)*r,base+y,Math.cos(angle)*r);}g.computeVertexNormals();add(g,W,brown);}
  add(new T.CylinderGeometry(rad-.02,rad-.02,.03,32),W,brown,[0,base+.012,0]);
  for(const t of big?[.05,.20,.76,.95]:[.13,.82]){const y=t*height,r=radius(y)+.014;add(new T.CylinderGeometry(r,r,.027,40,1,true),I,dark,[0,base+y,0]);for(let j=0;j<4;j++){const a=j*tau/4;add(new T.SphereGeometry(.007,6,4),I,rust,[Math.sin(a)*r,base+y,Math.cos(a)*r]);}}
  if(!big){tube([[-.17,.27,0],[-.165,.43,0],[0,.51,0],[.165,.43,0],[.17,.27,0]],.008,I,dark);rod([-.04,.51,0],[.04,.51,0],.013,W,brown);for(const x of [-.17,.17])box([x,.26,0],[.018,.075,.025],I,dark);add(new T.CircleGeometry(.139,28),A,'#4b5a51',[0,.105,0],[-Math.PI/2,0,0]);}
  else{
   for(const x of [-.20,.20])box([x,.06,0],[.13,.12,.69],S,'#797364');
   // Half lid leaves rain collection visible; no invented plumbing connection.
   for(let i=0;i<4;i++){const x=-.22+i*.069,len=Math.sqrt(rad*rad-x*x)*2;plank([x,base+height+.014,0],[.066,.038,len]);}
   box([-.12,base+height+.046,0],[.24,.035,.07],W,brown);add(new T.CircleGeometry(.28,40),A,'#405148',[0,base+height-.12,0],[-Math.PI/2,0,0]);
   rod([0,.31,.28],[0,.31,.45],.027,W,'#9f835c',.037);rod([0,.31,.45],[0,.255,.45],.023,W,brown);rod([0,.31,.395],[0,.40,.395],.017,W,brown);rod([-.045,.40,.395],[.045,.40,.395],.015,W,brown);torus([0,.252,.45],.016,.005,I,dark,[Math.PI/2,0,0]);
  }
 }
 if(kind==='churn'){
  const profile=[[.24,0],[.255,.025],[.25,.075],[.15,.63],[.16,.69],[.18,.76],[.18,.785]];
  add(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),48),I,'#697165',[0,.016,0]);
  for(const [r,y] of [[.25,.06],[.153,.66],[.18,.80]])torus([0,y,0],r,.012,I,'#777b6b',[Math.PI/2,0,0]);
  add(new T.ConeGeometry(.19,.09,40),I,'#687060',[0,.84,0]);rod([0,.88,0],[0,.94,0],.022,I,dark);box([0,.945,0],[.095,.023,.035],W,brown);
  for(const side of [-1,1]){tube([[side*.19,.40,0],[side*.29,.43,0],[side*.30,.56,0],[side*.18,.57,0]],.012,I,dark);for(const y of [.41,.55])box([side*.185,y,0],[.025,.058,.065],I,rust);}
  box([0,.765,.18],[.035,.105,.014],I,'#807054');box([0,.73,.19],[.045,.025,.018],I,dark);
  for(let i=0;i<11;i++)add(new T.SphereGeometry(.0045,6,4),I,rust,[.001,.09+i*.049,.244-i*.008]);
 }
 if(kind==='ladder'){
  for(const x of [-.23,.23])for(const side of [-1,1])rod([x,.027,side*.48],[x,1.49,0],.032,W,brown,.030,4);
  for(let i=0;i<5;i++){const y=.22+i*.255,z=.48*(1-y/1.49);plank([0,y,z],[.51,.042,.16]);for(const x of [-.23,.23])nail([x,y,z+.09]);}
  plank([0,1.5,0],[.57,.055,.30]);
  for(const y of [.25,1.1])plank([0,y,-.48*(1-y/1.49)],[.50,.055,.055]);rod([-.23,.27,-.40],[.23,1.13,-.11],.015,W,brown,.015,4);
  for(const x of [-.23,.23]){rod([x,.56,-.30],[x,.56,.30],.008,I,dark);box([x,1.45,0],[.06,.08,.05],I,'#514c3c');}
 }
 if(kind==='broom'){
  rod([0,.34,0],[.10,1.49,.035],.018,W,'#9b8059',.022);
  for(let i=0;i<90;i++){const a=i*2.399,r=.03+rand()*.125,x=Math.cos(a)*r,z=Math.sin(a)*r;
   rod([x,.009+rand()*.025,z],[x*.20,.45+rand()*.025,z*.20],.0025,E,i%3?'#665039':'#947148',.004,4);
   if(i%3===0)rod([x,.03,z],[x+Math.cos(a)*.035,.13,z+Math.sin(a)*.026],.0015,E,'#5d4731',.002,4);
  }
  for(const y of [.32,.40])torus([0,y,0],y>.35?.033:.046,.007,E,'#ae9868',[Math.PI/2,0,0]);
 }
 if(kind==='trough'){
  const s=new T.Shape();const outline=[[-.25,.38],[-.29,.26],[-.24,.12],[0,.075],[.24,.12],[.29,.26],[.25,.38],[.195,.37],[.19,.24],[.14,.19],[0,.17],[-.14,.19],[-.19,.24],[-.195,.37]];outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth:1.45,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:1});g.translate(0,0,-.725);add(g,W,brown,[0,0,0],[0,Math.PI/2,0]);
  for(const x of [-.70,.70]){box([x,.24,0],[.07,.27,.45],W,brown);for(const z of [-.19,.19])nail([x,.28,z]);}
  for(const x of [-.50,.50])box([x,.042,0],[.14,.085,.65],W,brown);
  for(let i=0;i<75;i++){const g=new T.IcosahedronGeometry(.009+rand()*.012,0);g.scale(1,.5,1.5);add(g,E,'#b09c6c',[(rand()-.5)*1.21,.18+rand()*.015,(rand()-.5)*.20]);}
 }
 if(kind==='hayfork'){
  // Stored low on a timber rest, with the curved tines on the ground.
  box([0,.16,.45],[.32,.32,.11],W,brown);rod([0,.13,-.42],[0,.42,1.23],.018,W,'#a18a63',.022);
  tube([[0,.13,-.42],[0,.10,-.57],[0,.08,-.65]],.023,I,dark);
  for(const x of [-.105,0,.105])tube([[0,.10,-.55],[x,.10,-.67],[x,.065,-.84],[x*.93,.015,-.94]],.008,I,'#6a6250');
  rod([0,.13,-.42],[0,.16,-.26],.026,I,dark,.023);for(let i=0;i<12;i++)rod([-.08+rand()*.16,.018,-.85+rand()*.5],[.03+rand()*.19,.021,-.60+rand()*.5],.0015,E,'#ae9763',.001,3);
 }
 if(kind==='sacks'){
  const sack=(p:V,height:number,width:number,rot:V)=>{
   const rows=24,n=36,vertices:number[]=[],uvs:number[]=[];const pt=(i:number,j:number):V=>{const t=i/rows,a=j*tau/n;let r=width*(.64+.36*Math.sin(t*Math.PI));r*=t>.77?Math.max(.12,1-(t-.77)*4.2):1;const fold=.012*Math.sin(a*9+t*16)*(t>.7?1.5:.4)+.009*Math.sin(a*3+t*7)*Math.sin(t*Math.PI);return [Math.cos(a)*(r+fold),.025+t*height,Math.sin(a)*(r+fold)*.71];};
   for(let i=0;i<rows;i++)for(let j=0;j<n;j++){const a=pt(i,j),b=pt(i,j+1),c=pt(i+1,j+1),d=pt(i+1,j);vertices.push(...a,...c,...b,...a,...d,...c);uvs.push(j/n,i/rows,(j+1)/n,(i+1)/rows,(j+1)/n,i/rows,j/n,i/rows,j/n,(i+1)/rows,(j+1)/n,(i+1)/rows);}
   for(let j=0;j<n;j++){vertices.push(0,.025,0,...pt(0,j),...pt(0,j+1));uvs.push(.5,.5,j/n,0,(j+1)/n,0);}
   const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(vertices,3));raw.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));const g=mergeVertices(raw);raw.dispose();g.computeVertexNormals();add(g,C,'#8d704b',p,rot);
   for(const offset of [-.08,.08]){
    const ribbon:number[]=[],tex:number[]=[];for(let i=2;i<20;i++){const a=.5*Math.PI+offset;const pts=[pt(i,(a-.018)/tau*n),pt(i+1,(a-.018)/tau*n),pt(i+1,(a+.018)/tau*n),pt(i,(a+.018)/tau*n)];pts.forEach(q=>{q[0]*=1.003;q[2]*=1.003;});ribbon.push(...pts[0],...pts[1],...pts[2],...pts[0],...pts[2],...pts[3]);tex.push(0,i/24,0,(i+1)/24,1,(i+1)/24,0,i/24,1,(i+1)/24,1,i/24);}
    const stripe=new T.BufferGeometry();stripe.setAttribute('position',new T.Float32BufferAttribute(ribbon,3));stripe.setAttribute('uv',new T.Float32BufferAttribute(tex,2));stripe.computeVertexNormals();add(stripe,C,'#514f42',p,rot);
   }
   // Sewn side edges and a tied, puckered neck follow the same shape transform.
   for(const a of [0,Math.PI]){const points=[];for(let i=0;i<=18;i++)points.push(pt(i,a/ tau*n));const seam=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(q=>new T.Vector3(...q))),24,.003,4,false);add(seam,C,'#77674d',p,rot);}
   const neck=new T.TorusGeometry(width*.14,.007,5,18);neck.rotateX(Math.PI/2);neck.translate(0,height*.975,0);add(neck,E,'#68583d',p,rot);
   const cap=new T.ConeGeometry(width*.14,.045,8);cap.scale(1,1,.71);cap.translate(0,height+.012,0);add(cap,C,'#8f724e',p,rot);
   for(const dx of [-.012,.012]){const cord=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(dx,height*.97,.018),new T.Vector3(dx*2,height*.92,.047),new T.Vector3(dx*3,height*.84,.033)]),8,.003,4,false);add(cord,E,'#68583d',p,rot);}
  };
  for(const z of [-.19,0,.19])plank([0,.03,z],[1.10,.06,.18]);
  sack([-.23,.045,0],.65,.22,[0,-.10,-.08]);sack([.23,.045,-.04],.55,.23,[0,.28,.15]);
  sack([-.08,.49,.015],.52,.18,[0,.15,-1.20]);
 }
 if(kind==='trestles'){
  for(const x of [-.67,.67]){
   for(const z of [-.29,.29])for(const dx of [-.085,.085])rod([x+dx,.026,z],[x+dx,.69,z*.20],.027,W,brown,.031,4);
   plank([x,.69,0],[.17,.12,.81]);for(const z of [-.22,.22])box([x,.24,z],[.25,.06,.045],W,brown);rod([x-.085,.23,-.22],[x+.085,.62,.045],.019,W,brown,.019,4);
  }
  for(let i=0;i<2;i++)plank([0,.785,i*.20-.11],[2.10,.075,.18]);
  // A real toothed blade lies flat on the boards, beside its open wooden grip.
  const outline:[number,number][]=[[-.45,.055],[.37,.023],[.38,-.06]];for(let i=0;i<17;i++)outline.push([.38-i*.049,-.06-(i%2)*.023]);outline.push([-.45,.055]);blade(outline,.004,[.08,.827,-.06],[Math.PI/2,0,.15],'#827c65');
  const shape=new T.Shape();shape.moveTo(-.10,-.12);shape.lineTo(.10,-.09);shape.lineTo(.10,.10);shape.lineTo(-.10,.13);shape.closePath();const hole=new T.Path();hole.absellipse(0,0,.054,.075,0,tau,true,0);shape.holes.push(hole);const grip=new T.ExtrudeGeometry(shape,{depth:.028,bevelEnabled:true,bevelThickness:.006,bevelSize:.008,bevelSegments:1});add(grip,W,brown,[-.46,.836,-.07],[Math.PI/2,0,.15]);
  for(let i=0;i<18;i++){const g=new T.ConeGeometry(.010,.040,3);add(g,E,cut,[(rand()-.5)*1.8,.014,(rand()-.5)*.9],[Math.PI/2,rand()*tau,0]);}
 }

 parts.forEach((list,i)=>{if(!list.length)return;const g=mergeGeometries(list);const m=new T.Mesh(g,mats[i]);m.castShadow=m.receiveShadow=true;root.add(m);list.forEach(p=>p.dispose());});
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);root.userData.size=bounds.getSize(new T.Vector3()).toArray();return root;
 };
 const models=Object.fromEntries((Object.keys(propNames) as PropKind[]).map(k=>[k,make(k)])) as Record<PropKind,T.Group>;
 return {models,materials:mats};
}
