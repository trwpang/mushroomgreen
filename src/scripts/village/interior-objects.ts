import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {type InteriorObjectId} from './interior-catalogue';
export type ObjectMaterial='oak'|'darkwood'|'iron'|'steel'|'copper'|'cream'|'blue'|'clay'|'cloth'|'green'|'coal'|'glass'|'paper'|'linen'|'tile'|'stone'|'lampglass';
export interface ObjectPart {geometry:T.BufferGeometry;material:ObjectMaterial;}
export interface ObjectSurface {x:number;y:number;z:number;width:number;depth:number;}
export interface InteriorObject {parts:ObjectPart[];bounds:T.Box3;surfaces:ObjectSurface[];}
/** Metres; +Z is the usable front. Every object has a grounded base and actual hollow vessels. */
export function buildInteriorObject(id:InteriorObjectId):InteriorObject{
 const batches=new Map<ObjectMaterial,T.BufferGeometry[]>(),surfaces:ObjectSurface[]=[];
 const put=(g:T.BufferGeometry,m:ObjectMaterial,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{
  const n=g.index?g.toNonIndexed():g.clone();g.dispose();if(!n.hasAttribute('color'))n.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(n.getAttribute('position').count*3).fill(1),3));n.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1)));
  const parts=batches.get(m)??[];parts.push(n);batches.set(m,parts);
 };
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:ObjectMaterial='oak',ry=0)=>put(new T.BoxGeometry(w,h,d),m,x,y,z,0,ry);
 const cyl=(x:number,y:number,z:number,rt:number,rb:number,h:number,m:ObjectMaterial='iron',n=16)=>put(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);
 const ball=(x:number,y:number,z:number,w:number,h:number,d:number,m:ObjectMaterial)=>{const g=new T.SphereGeometry(1,16,10);g.scale(w,h,d);put(g,m,x,y,z);};
 const softBox=(x:number,y:number,z:number,w:number,h:number,d:number,m:ObjectMaterial,r=.035)=>{
  const g=new T.BoxGeometry(w,h,d,8,4,8),p=g.getAttribute('position'),half=new T.Vector3(w/2-r,h/2-r,d/2-r);
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),inner=v.clone().clamp(half.clone().negate(),half),delta=v.sub(inner).normalize().multiplyScalar(r);p.setXYZ(i,inner.x+delta.x,inner.y+delta.y,inner.z+delta.z);}
  g.computeVertexNormals();put(g,m,x,y,z);
 };
 const rod=(a:number[],b:number[],r:number,m:ObjectMaterial='iron')=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,start.distanceTo(end),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize()));const p=start.add(end).multiplyScalar(.5);put(g,m,p.x,p.y,p.z);};
 const ring=(x:number,y:number,z:number,r:number,t:number,m:ObjectMaterial='iron',rx=0,ry=0,arc=Math.PI*2)=>put(new T.TorusGeometry(r,t,6,24,arc),m,x,y,z,rx,ry);
 const vessel=(x:number,y:number,z:number,r:number,h:number,m:ObjectMaterial,shape='bowl')=>{
  const profile=shape==='bottle'?[[0,0],[r*.8,0],[r,h*.15],[r,h*.6],[r*.32,h*.78],[r*.30,h],[r*.20,h],[r*.20,h*.80],[r*.88,h*.58],[r*.88,.014],[0,.014]]:
   shape==='pot'?[[0,0],[r*.76,0],[r,h*.23],[r*.96,h*.83],[r*.82,h],[r*.73,h],[r*.84,h*.80],[r*.86,h*.25],[r*.64,.015],[0,.015]]:
   [[0,0],[r*.48,0],[r*.66,h*.20],[r,h*.92],[r,h],[r*.91,h],[r*.56,h*.20],[0,.016]];
  put(new T.LatheGeometry(profile.map(([a,b])=>new T.Vector2(a,b)),24),m,x,y,z);
 };
 const lid=(x:number,y:number,z:number,r:number,m:ObjectMaterial)=>{cyl(x,y,z,r,r*.92,.022,m);ball(x,y+.025,z,.021,.018,.021,m);};
 const handle=(x:number,y:number,z:number,r:number,m:ObjectMaterial='iron',ry=0)=>ring(x,y,z,r,.009,m,0,ry);
 const leg=(x:number,z:number,h:number,turned=false,m:ObjectMaterial='oak')=>{
  if(turned){const profile=[[.035,0],[.046,.035],[.031,h*.25],[.048,h*.46],[.032,h*.58],[.048,h*.74],[.035,h]].map(([r,y])=>new T.Vector2(r,y));put(new T.LatheGeometry(profile,12),m,x,0,z);}
  else box(x,h/2,z,.052,h,.052,m);
 };
 const board=(x:number,y:number,z:number,w:number,d:number,m:ObjectMaterial='oak')=>{
  surfaces.push({x,y:y+.0225,z,width:w,depth:d});
  for(let i=0;i<5;i++)box(x-w/2+w*(i+.5)/5,y,z,w/5-.003,.045,d,i%3===0?'darkwood':m);
 };
 const panel=(x:number,y:number,z:number,w:number,h:number,m:ObjectMaterial='oak')=>{
  const trim=m==='iron'?'iron':'darkwood';box(x,y,z,w,h,.025,m);for(const dx of [-1,1])box(x+dx*(w/2-.016),y,z+.020,.027,h,.019,trim);for(const dy of [-1,1])box(x,y+dy*(h/2-.018),z+.020,w-.04,.028,.019,trim);
 };
 const cloth=(x:number,y:number,z:number,w:number,h:number,m:ObjectMaterial='cloth',horizontal=false)=>{
  const g=new T.PlaneGeometry(w,h,20,20),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i);p.setZ(i,.014*Math.sin(xx*59)+.006*Math.sin(yy*31+xx*4));}
  g.computeVertexNormals();put(g,m,x,y,z,horizontal?-Math.PI/2:0);
 };
 const plate=(x:number,y:number,z:number,r:number,m:ObjectMaterial='cream')=>{
  const pts=[[0,.008],[r*.67,.008],[r*.84,.013],[r,.03],[r,.039],[r*.82,.023],[r*.65,.018],[0,.018]];
  put(new T.LatheGeometry(pts.map(([a,b])=>new T.Vector2(a,b)),32),m,x,y,z);ring(x,y+.030,z,r*.88,.0025,'blue',Math.PI/2);
 };
 const spout=(x:number,y:number,z:number,r:number,m:ObjectMaterial)=>{rod([x,y,z],[x+r*.65,y+r*.4,z],r*.20,m);rod([x+r*.65,y+r*.4,z],[x+r*1.18,y+r*1.1,z],r*.13,m);ring(x+r*1.18,y+r*1.1,z,r*.13,.003,m,0,Math.PI/2);};
 const quilt=()=>{cloth(0,.045,0,1.20,1.3,'cloth',true);for(let x=0;x<6;x++)for(let z=0;z<6;z++){const xx=(x-2.5)*.194,zz=(z-2.5)*.21;box(xx,.064+.008*Math.cos(xx*9),zz,.19,.004,.206,(x+z)%3===0?'cream':(x+z)%3===1?'green':'cloth');}};
 const sewing=(treadle=false)=>{
  const b=treadle?.78:.045;
  if(treadle){board(0,.75,0,.82,.43);for(const x of [-.31,.31]){rod([x,.04,-.16],[x,.73,-.13],.016);rod([x,.04,.17],[x,.73,.13],.016);for(const y of [.18,.34,.50])ring(x,y,0,.073,.009,'iron',0,Math.PI/2);}for(let i=0;i<7;i++)box((i-3)*.043,.13,.04,.017,.016,.22,'iron');for(const zz of [-.07,.15])rod([-.145,.13,zz],[.145,.13,zz],.007);rod([-.30,.13,0],[.30,.13,0],.015);ring(.31,.31,0,.15,.012,'iron',0,Math.PI/2);rod([.31,.13,0],[.31,.37,.07],.010);}
  box(0,b,0,.55,.04,.24,'darkwood');box(0,b+.028,0,.45,.014,.19,'iron');cyl(.16,b+.13,0,.039,.055,.20);ball(.13,b+.235,0,.08,.06,.047,'iron');box(-.005,b+.257,0,.28,.052,.072,'iron');cyl(-.15,b+.211,0,.038,.031,.11);rod([-.15,b+.16,0],[-.15,b+.047,0],.004,'steel');box(-.143,b+.045,0,.035,.009,.052,'steel');ring(.24,b+.19,0,.092,.012,'iron',0,Math.PI/2);
  for(let i=0;i<6;i++){const t=i*Math.PI/3;rod([.24,b+.19,0],[.24,b+.19+Math.sin(t)*.084,Math.cos(t)*.084],.005,'steel');}
  rod([.24,b+.19,0],[.27,b+.12,.06],.008);cyl(.09,b+.318,0,.021,.021,.055,'cream');rod([.09,b+.345,0],[-.15,b+.273,0],.0015,'cream');for(let i=0;i<5;i++)ring(-.08+i*.044,b+.26,.038,.009,.002,'copper');
  if(treadle){rod([.31,.31,.15],[.24,b+.19,.09],.0025,'darkwood');rod([.31,.31,-.15],[.24,b+.19,-.09],.0025,'darkwood');}
 };
 if(id==='windsor-armchair'||id==='rush-armchair'){
  const rush=id==='rush-armchair';board(0,.43,0,.52,.47,'darkwood');
  for(const x of [-.21,.21])for(const z of [-.18,.18]){rod([x,.43,z],[x*1.18,.025,z*1.17],.026,'oak');}
  for(const z of [-.16,.16])rod([-.235,.19,z],[.235,.19,z],.019,'darkwood');rod([0,.19,-.16],[0,.19,.16],.020,'oak');
  for(const side of [-1,1]){rod([side*.23,.46,.13],[side*.27,.68,.12],.019,'oak');rod([side*.27,.68,.19],[side*.27,.71,-.21],.026,'darkwood');rod([side*.225,.45,-.205],[side*.255,.80,-.22],.021,'oak');rod([side*.27,.71,-.21],[side*.247,.71,-.215],.024,'darkwood');ball(side*.27,.68,.19,.036,.026,.042,'oak');}
  if(rush){for(const side of [-1,1])leg(side*.225,-.205,1.02,true);for(const y of [.70,.83,.96])box(0,y,-.205,.45,.07,.03,'oak');for(let i=0;i<24;i++)rod([-.235,.460,(i-11.5)*.018],[.235,.460,(i-11.5)*.018],.0045,'linen');}
  else{const arch=(x:number)=>.79+.29*Math.cos(x/.255*Math.PI/2);for(let i=0;i<9;i++){const x=(i-4)*.051;rod([x,.46,-.18],[x,arch(x),-.22],.010,'oak');}const hoop=Array.from({length:25},(_,i)=>{const x=-.255+i*.51/24;return new T.Vector3(x,arch(x),-.22);});put(new T.TubeGeometry(new T.CatmullRomCurve3(hoop),48,.020,8,false),'darkwood');softBox(0,.487,.01,.44,.05,.39,'cloth',.018);}
 }else if(id==='prep-table'||id==='sewing-table'){
  const prep=id==='prep-table',w=prep?1.50:1.04,d=prep?.58:.52;
  board(0,.79,0,w,d,'oak');for(const x of [-w/2+.065,w/2-.065])for(const z of [-d/2+.055,d/2-.055])leg(x,z,.767,!prep);
  board(0,.22,-.015,w-.12,d-.09,'darkwood');
  for(const z of [-d/2+.02,d/2-.02])box(0,.68,z,w-.07,.12,.025,'darkwood');panel(0,.68,d/2,.40,.11);for(const x of [-.13,.13])ball(x,.68,d/2+.035,.014,.014,.018,'iron');
  if(prep){box(0,.885,-d/2+.012,w,.15,.025,'darkwood');for(const x of [-w/2+.04,w/2-.04])box(x,.17,0,.04,.04,d-.08,'oak');}
 }else if(id==='water-crock-stand'){
  board(0,.35,0,.43,.43);for(const x of [-.16,.16])for(const z of [-.16,.16])leg(x,z,.33);vessel(0,.375,0,.18,.32,'clay','pot');lid(0,.695,0,.15,'darkwood');spout(.16,.46,0,.065,'copper');
 }else if(id==='log-basket'||id==='vegetable-basket'){
  const logs=id==='log-basket',r=logs?.26:.18,h=logs?.26:.16;
  vessel(0,0,0,r,h,'oak');for(let i=0;i<10;i++)ring(0,.026+i*(h-.04)/10,0,r*(.61+i*.038),.006,'darkwood',Math.PI/2);
  for(let i=0;i<20;i++){const a=i*Math.PI/10;rod([Math.sin(a)*r*.54,.018,Math.cos(a)*r*.54],[Math.sin(a)*r*.96,h,Math.cos(a)*r*.96],.004,'oak');}
  if(logs){for(let i=0;i<9;i++){const x=(i%3-1)*.105,z=(Math.floor(i/3)-1)*.10;rod([x,.08,z],[x+.04,.36+(i%3)*.045,z+.07],.036,'darkwood');ball(x+.04,.36+(i%3)*.045,z+.07,.034,.009,.034,'oak');}}
  else for(let i=0;i<12;i++){const t=i*2.4,rr=.11*Math.sqrt(i/12);ball(Math.cos(t)*rr,.11+(i%3)*.018,Math.sin(t)*rr,.035,.03,.026,i%3?'oak':'clay');}
 }else if(id==='pan-rack'){
  box(0,.42,0,.91,.085,.035,'darkwood');for(const x of [-.40,-.20,0,.20,.40])rod([x,.42,.018],[x,.43,.075],.005,'iron');
  for(const [i,x]of [-.30,0,.30].entries()){rod([x,.41,.065],[x,.22,.065],.012,'iron');const g=new T.CylinderGeometry(i===1?.115:.09,i===1?.115:.09,.035,24);g.rotateX(Math.PI/2);put(g,i===0?'copper':'iron',x,.125,.065);ring(x,.125,.087,i===1?.10:.078,.005,'steel');}
 }else if(id==='wall-sampler'){
  panel(0,.235,0,.37,.47,'darkwood');box(0,.235,.031,.30,.39,.01,'linen');
  for(let row=0;row<7;row++)for(let col=0;col<9;col++){const x=(col-4)*.026,y=.10+row*.046;if((row*7+col*3)%5===0)continue;rod([x-.006,y-.006,.039],[x+.006,y+.006,.039],.0013,row%2?'blue':'clay');rod([x-.006,y+.006,.039],[x+.006,y-.006,.039],.0013,row%2?'blue':'clay');}
 }else if(id==='oval-portrait'){
  const frame=new T.TorusGeometry(.15,.015,6,32);frame.scale(.80,1,1);put(frame,'darkwood',0,.17,0);const paper=new T.CircleGeometry(.144,32);paper.scale(.80,1,1);put(paper,'paper',0,.17,0);ball(0,.21,.008,.041,.057,.003,'coal');box(.012,.157,.008,.030,.031,.006,'coal');ball(0,.12,.008,.074,.035,.003,'coal');
 }else if(id==='mantel-clock'){
  box(0,.04,0,.34,.07,.15,'darkwood');panel(0,.22,0,.27,.34,'darkwood');const face=new T.CircleGeometry(.103,32);put(face,'cream',0,.245,.032);ring(0,.245,.035,.106,.008,'copper');for(let i=0;i<12;i++){const t=i*Math.PI/6;rod([Math.sin(t)*.081,.245+Math.cos(t)*.081,.04],[Math.sin(t)*.093,.245+Math.cos(t)*.093,.04],.002,'coal');}rod([0,.245,.044],[-.041,.28,.044],.003,'coal');rod([0,.245,.045],[.012,.325,.045],.002,'coal');
 }else if(id==='dish-rack'){
  board(0,.035,0,.38,.26);for(const side of [-1,1])rod([side*.17,.035,-.10],[side*.17,.16,-.10],.012,'oak');for(let i=0;i<6;i++)rod([-.15+i*.06,.045,.10],[-.15+i*.06,.16,-.10],.008,'darkwood');for(const x of [-.12,0,.12]){const g=new T.CylinderGeometry(.085,.085,.009,24);g.rotateZ(Math.PI/2);put(g,'cream',x,.12,0);ring(x+.005,.12,0,.073,.002,'blue',0,Math.PI/2);}
 }else if(['open-range','oven-range','hob-stove'].includes(id)){
  const closed=id==='hob-stove',oven=id==='oven-range';
  box(0,.04,0,.96,.08,.55,'clay');for(const x of [-.38,.38])for(const z of [-.18,.18])leg(x,z,.16,false,'iron');
  box(0,.40,-.18,.88,.54,.12,'iron');box(0,.17,0,.85,.12,.42,'iron');box(0,.71,0,.94,.07,.50,'iron');surfaces.push({x:0,y:.755,z:0,width:.90,depth:.47});
  for(const x of [-.4,.4])box(x,.43,0,.075,.50,.41,'iron');
  const grateX=oven?-.20:0,grateW=oven?.32:.65;
  if(closed){panel(0,.43,.225,.71,.38,'iron');handle(.22,.46,.255,.027,'steel');for(let i=0;i<4;i++)box(-.15+i*.09,.30,.26,.055,.014,.006,'coal');}
  else{box(grateX,.30,.02,grateW,.07,.25,'coal');for(let i=0;i<7;i++)rod([grateX-grateW/2+i*grateW/6,.25,.20],[grateX-grateW/2+i*grateW/6,.51,.20],.011);for(const y of [.27,.40,.51])rod([grateX-grateW/2,y,.20],[grateX+grateW/2,y,.20],.009);}
  if(oven){panel(.23,.44,.23,.31,.40,'iron');handle(.27,.47,.265,.025,'steel');box(.23,.41,.25,.22,.015,.022,'steel');}
  for(const x of [-.22,.22]){ring(x,.749,0,.128,.006,'steel',Math.PI/2);cyl(x,.744,0,.112,.112,.012,'iron');}
  box(0,.88,-.205,.87,.28,.04,'iron');for(let i=0;i<5;i++)panel((i-2)*.16,.87,-.176,.12,.15,'iron');
  for(const x of [-.40,.40]){cyl(x,.45,.22,.018,.018,.44,'steel');ball(x,.70,.22,.025,.024,.025,'steel');}
  put(new T.LatheGeometry([[.068,0],[.068,.20],[.054,.20],[.054,0]].map(([r,y])=>new T.Vector2(r,y)),20),'iron',0,.97,-.15);ring(0,1.17,-.15,.066,.009,'iron',Math.PI/2);
 }else if(['scrubbed-table','turned-table','trestle-table'].includes(id)){
  board(0,.76,0,1.30,.68,id==='scrubbed-table'?'oak':'darkwood');
  if(id==='trestle-table'){for(const x of [-.44,.44]){box(x,.10,0,.11,.10,.58);rod([x,.13,-.23],[x,.73,-.04],.035,'oak');rod([x,.13,.23],[x,.73,.04],.035,'oak');}rod([-.48,.22,0],[.48,.22,0],.03,'oak');}
  else{for(const x of [-.55,.55])for(const z of [-.25,.25])leg(x,z,.735,id==='turned-table');for(const z of [-.28,.28])box(0,.64,z,1.14,.14,.027);for(const x of [-.56,.56])box(x,.64,0,.028,.14,.52);box(0,.64,.32,.36,.095,.034,'darkwood');ball(0,.64,.346,.015,.015,.019,'iron');}
 }else if(['rope-bed','iron-bed','box-bed'].includes(id)){
  const metal=id==='iron-bed',boxed=id==='box-bed',m=metal?'iron':'darkwood';
  for(const x of [-.57,.57])for(const z of [-.87,.87]){leg(x,z,z<0?1.01:.69,false,m);ball(x,z<0?1.02:.70,z,.035,.037,.035,metal?'copper':'oak');}
  for(const x of [-.58,.58])box(x,.37,0,.05,boxed?.38:.09,1.79,m);
  for(const z of [-.88,.88]){box(0,.35,z,1.18,.08,.05,m);if(metal){const arch=(x:number)=>(z<0?.78:.46)+(z<0?.24:.22)*Math.cos(x/.57*Math.PI/2);
   for(let i=0;i<7;i++){const xx=(i-3)*.15;rod([xx,.38,z],[xx,arch(xx),z],.010);}
   for(let i=1;i<=20;i++){const x0=-.57+(i-1)*1.14/20,x1=-.57+i*1.14/20;rod([x0,arch(x0),z],[x1,arch(x1),z],.013);} }else panel(0,z<0?.73:.51,z,1.15,z<0?.46:.24,'darkwood');}
  if(!boxed)for(let i=0;i<12;i++)rod([-.56,.39,(i-5.5)*.145],[.56,.39,(i-5.5)*.145],.008,'cream');
  else for(let i=0;i<10;i++)box(0,.34,(i-4.5)*.17,1.13,.03,.163,'oak');
  softBox(0,.495,0,1.14,.18,1.74,'linen',.045);
 }else if(['dresser','drawers','food-cupboard'].includes(id)){
  const tall=id==='food-cupboard',h=tall?1.48:.82,w=.70,d=.37;
  for(const x of [-.29,.29])for(const z of [-.13,.13])leg(x,z,.13);
  for(const x of [-1,1])box(x*(w/2-.018),h/2+.06,0,.035,h-.12,d,'darkwood');box(0,h/2,-d/2+.01,w,h,.022,'darkwood');box(0,.13,0,w-.06,.025,d-.035,'darkwood');board(0,h,0,w+.045,d+.045);
  if(id==='drawers'){for(let i=0;i<3;i++){panel(0,.22+i*.22,d/2,.64,.197);for(const x of [-.20,.20]){cyl(x,.23+i*.22,d/2+.026,.021,.021,.007,'copper');handle(x,.20+i*.22,d/2+.035,.022,'iron');}}}
  else{panel(0,tall?.64:.35,d/2,.64,tall?1.06:.52);ball(.23,tall?.69:.36,d/2+.043,.020,.021,.025,'iron');if(tall){for(let i=0;i<6;i++)box(0,1.24+i*.026,d/2+.02,.51,.009,.015,'coal');}else{for(const x of [-.32,.32])box(x,1.20,-.12,.035,.75,.09);for(const y of [1.03,1.36,1.63]){box(0,y,-.09,.72,.038,.20);surfaces.push({x:0,y:y+.019,z:-.09,width:.72,depth:.20});rod([-.33,y+.043,0],[.33,y+.043,0],.009,'darkwood');}box(0,1.69,-.10,.77,.10,.04,'darkwood');panel(0,.716,d/2,.64,.125);for(const x of [-.20,.20])ball(x,.716,d/2+.04,.013,.013,.019,'iron');}}
 }else if(['spindle-chair','ladder-chair','bench','stool'].includes(id)){
  const bench=id==='bench',stool=id==='stool',w=bench?.90:.38,d=.36;
  board(0,.44,0,w,d);for(const x of [-w*.39,w*.39])for(const z of [-.13,.13])rod([x,.43,z],[x*1.12,.02,z*1.12],.024,'darkwood');for(const z of [-.12,.12])rod([-w*.43,.19,z],[w*.43,.19,z],.014,'darkwood');
  if(!stool){for(const x of [-w*.44,w*.44])leg(x,-.15,.91,true);if(id==='spindle-chair'){for(let i=0;i<5;i++)rod([(i-2)*.061,.47,-.15],[(i-2)*.061,.85,-.15],.009,'oak');}else for(let i=0;i<3;i++)box(0,.61+i*.105,-.15,w-.07,.055,.024);box(0,.925,-.15,w+.015,.055,.03);}
 }else if(id==='cradle'){
  for(const z of [-.34,.34]){const pts=[];for(let i=0;i<=16;i++)pts.push(new T.Vector3((i/16-.5)*.70,.07+Math.pow(i/16-.5,2)*.40,z));for(let i=1;i<pts.length;i++)rod(pts[i-1].toArray(),pts[i].toArray(),.025,'oak');}
  box(0,.17,0,.37,.05,.73);
  for(const x of [-.21,.21])box(x,.34,0,.032,.30,.74);for(const z of [-.36,.36])panel(0,.36,z,.42,.35);ball(0,.25,0,.16,.08,.32,'cream');
 }else if(id==='blanket-box'){
  box(0,.24,0,.75,.44,.40,'darkwood');board(0,.49,0,.79,.44);for(const x of [-.25,.25]){box(x,.25,.208,.026,.44,.017,'iron');box(x,.515,0,.026,.012,.43,'iron');}panel(0,.25,.211,.58,.29);box(0,.42,.238,.04,.055,.012,'iron');
 }else if(id==='washstand'){
  for(const x of [-.24,.24])for(const z of [-.14,.14])leg(x,z,.77,true);board(0,.79,0,.59,.37);board(0,.31,-.11,.50,.12);box(0,.87,-.16,.56,.13,.02);vessel(-.05,.815,0,.15,.09,'cream');
 }else if(id==='plate-rack'){
  for(const x of [-.36,.36])box(x,.35,-.065,.032,.70,.16);for(const y of [.04,.33,.66]){box(0,y,0,.75,.033,.23);surfaces.push({x:0,y:y+.0165,z:0,width:.70,depth:.20});rod([-.36,y+.08,.10],[.36,y+.08,.10],.009,'darkwood');}for(let i=0;i<7;i++)rod([(i-3)*.10,.08,-.06],[(i-3)*.10,.58,-.06],.009,'oak');
 }else if(['cooking-pot','saucepan','iron-kettle','copper-kettle','teapot'].includes(id)){
  const tea=id==='teapot',kettle=id.includes('kettle')||tea,m=tea?'clay':id==='copper-kettle'?'copper':'iron',r=tea?.10:id==='copper-kettle'?.15:.135;
  vessel(0,0,0,r,kettle?.19:.20,m,'pot');if(id!=='cooking-pot')lid(0,kettle?.185:.20,0,r*.75,m);
  if(kettle){spout(r*.72,.08,0,r,m);if(tea)handle(-r,.115,0,.075,m);else ring(0,.21,0,r*.8,.010,m,0,0,Math.PI);}
  else if(id==='saucepan')rod([r*.7,.17,0],[r+.21,.205,0],.016);else ring(0,.205,0,r,.009,'iron',0,0,Math.PI);
 }else if(id==='griddle'||id==='skillet'){
  if(id==='skillet')vessel(0,0,0,.145,.045,'iron');else cyl(0,.012,0,.16,.16,.024);rod([.12,.03,0],[.38,.05,0],.014);ring(.38,.05,0,.022,.008,'iron',Math.PI/2);
 }else if(['toast-fork','poker','tongs','coal-shovel','ladle'].includes(id)){
  const h=id==='ladle'?.42:.64;rod([0,.06,0],[0,h,0],.007);ring(0,h+.02,0,.021,.006);
  if(id==='coal-shovel'){box(0,.07,.009,.12,.14,.017,'iron');for(const x of [-.057,.057])box(x,.07,.019,.010,.14,.03,'iron');}
  if(id==='tongs'){rod([0,h-.04,0],[.055,.05,0],.007);box(.051,.043,0,.026,.045,.018,'iron');}
  if(id==='toast-fork')for(const x of [-.026,.026])rod([0,.12,0],[x,0,0],.004);
  if(id==='poker')rod([0,.03,0],[.045,.045,0],.007);
  if(id==='ladle')vessel(0,0,.028,.044,.045,'iron');
 }else if(['coal-scuttle','water-pail','slop-pail'].includes(id)){
  const coal=id==='coal-scuttle',wood=id==='water-pail',m=wood?'oak':'iron';vessel(0,0,0,.16,coal?.28:.31,m);
  if(wood)for(const y of [.05,.25])ring(0,y,0,.105+y*.17,.009,'iron',Math.PI/2);
  ring(0,.30,0,.15,.010,'iron',0,0,Math.PI);if(id==='slop-pail')lid(0,.314,0,.16,'iron');
  if(coal){for(let i=0;i<13;i++){const t=i*2.4,r=.10*Math.sqrt(i/13);put(new T.IcosahedronGeometry(.035+(i%3)*.004,0),'coal',Math.cos(t)*r,.21+(i%3)*.012,Math.sin(t)*r);}box(0,.25,-.12,.20,.06,.08,'iron');}
 }else if(id==='fireguard'){
  for(const x of [-.36,.36]){rod([x,0,-.17],[x,.70,-.17],.009);rod([x,0,.15],[x,.70,.15],.009);for(const y of [.08,.68])rod([x,y,-.17],[x,y,.15],.008);}
  for(const y of [.07,.68])rod([-.36,y,.15],[.36,y,.15],.009);for(let i=0;i<10;i++)rod([-.36+i*.08,.07,.15],[-.36+i*.08,.68,.15],.005);
 }else if(id==='bellows'){
  ball(0,.19,0,.105,.16,.043,'darkwood');for(const z of [-.04,.04])ball(0,.19,z,.10,.15,.010,'oak');rod([0,.08,0],[0,0,0],.014,'copper');for(const z of [-.025,.025])rod([0,.30,z],[0,.45,z],.018,'oak');for(let i=0;i<6;i++)ring(0,.16,0,.052+i*.008,.002,'copper');
 }else if(id==='flat-iron'){
  const shape=new T.Shape();shape.moveTo(-.055,-.09);shape.lineTo(.055,-.09);shape.lineTo(.07,.025);shape.lineTo(0,.11);shape.lineTo(-.07,.025);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.003,bevelThickness:.003});g.rotateX(-Math.PI/2);put(g,'iron',0,.003,0);for(const z of [-.05,.05])rod([0,.04,z],[0,.105,z],.010);rod([0,.105,-.055],[0,.105,.055],.017,'darkwood');
 }else if(id==='trivet'){
  ring(0,.07,0,.095,.012,'iron',Math.PI/2);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([Math.cos(a)*.075,0,Math.sin(a)*.075],[Math.cos(a)*.075,.07,Math.sin(a)*.075],.008);rod([0,.07,0],[Math.cos(a)*.09,.07,Math.sin(a)*.09],.007);}
 }else if(id==='candlestick'){
  vessel(0,0,0,.09,.024,'copper');cyl(0,.085,0,.022,.038,.12,'copper');cyl(0,.19,0,.018,.018,.11,'cream');rod([0,.24,0],[0,.256,0],.0018,'coal');handle(.085,.045,0,.025,'copper');
 }else if(id==='oil-lamp'){
  // Portable brass reservoir, wick adjuster and open glass chimney. About 35 cm tall.
  cyl(0,.009,0,.083,.080,.018,'copper',32);ring(0,.018,0,.077,.004,'copper',Math.PI/2);
  ball(0,.052,0,.074,.039,.074,'copper');cyl(0,.091,0,.039,.048,.026,'copper',24);
  ring(0,.105,0,.035,.003,'iron',Math.PI/2);cyl(0,.113,0,.027,.030,.014,'copper',24);
  cyl(.049,.079,0,.012,.012,.009,'copper');ring(.049,.084,0,.010,.002,'darkwood',Math.PI/2);
  handle(-.085,.047,0,.032,'copper');rod([.024,.112,0],[.060,.112,0],.003,'steel');
  ring(.062,.112,0,.014,.003,'copper',0,Math.PI/2);for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(.062,.112+Math.sin(a)*.014,Math.cos(a)*.014,.003,.003,.003,'copper');}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;rod([Math.cos(a)*.029,.109,Math.sin(a)*.029],[Math.cos(a)*.032,.137,Math.sin(a)*.032],.002,'copper');}
  cyl(0,.127,0,.011,.011,.025,'coal');ring(0,.140,0,.009,.003,'cream',Math.PI/2);
  const profile=[[.031,.120],[.042,.149],[.044,.180],[.036,.215],[.025,.250],[.022,.346],[.0205,.346],[.0235,.250],[.0345,.215],[.0425,.180],[.0405,.149],[.0295,.120],[.031,.120]];
  put(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),40),'lampglass');
  ring(0,.346,0,.0212,.0012,'lampglass',Math.PI/2);
 }else if(id==='tinderbox'){cyl(0,.024,0,.065,.065,.046,'steel');lid(0,.05,0,.067,'steel');
 }else if(id==='dinner-plate'||id==='side-plate'||id==='saucer'){plate(0,0,0,id==='dinner-plate'?.13:id==='side-plate'?.10:.075);if(id==='side-plate')for(let i=0;i<16;i++){const a=i*Math.PI/8;ball(Math.cos(a)*.096,.025,Math.sin(a)*.096,.008,.004,.008,'cream');}
 }else if(['soup-bowl','mixing-bowl','teacup','tankard','egg-cup','salt-cellar','mortar'].includes(id)){
  const r=id==='mixing-bowl'?.17:id==='soup-bowl'?.10:id==='mortar'?.085:id==='egg-cup'?.035:.055,h=id==='mixing-bowl'?.115:id==='tankard'?.15:id==='salt-cellar'?.045:.08,m=id==='tankard'?'steel':id==='mixing-bowl'?'clay':id==='egg-cup'||id==='salt-cellar'?'oak':'cream';
  vessel(0,0,0,r,h,m);if(id==='teacup'||id==='tankard')handle(r,h*.62,0,.030,m);if(id==='teacup'||id==='soup-bowl')ring(0,h*.86,0,r*.97,.003,'blue',Math.PI/2);
  if(id==='mortar')rod([-.035,.025,0],[.055,.17,0],.019,'oak');if(id==='egg-cup')cyl(0,-.018,0,.025,.035,.04,'oak');
 }else if(['jug','storage-crock','spice-jar','stone-bottle','glass-bottle','bread-crock'].includes(id)){
  const bottle=id.includes('bottle'),r=id==='bread-crock'?.16:id==='storage-crock'?.095:id==='spice-jar'?.035:.075,h=id==='bread-crock'?.27:id==='glass-bottle'?.26:id==='spice-jar'?.09:.22,m=id==='glass-bottle'?'glass':id==='stone-bottle'?'cream':'clay';
  vessel(0,0,0,r,h,m,bottle?'bottle':'pot');if(id==='jug')handle(-r,h*.60,0,.064,m);else if(bottle)cyl(0,h+.006,0,r*.21,r*.21,.035,'oak');else lid(0,h,0,r*.8,m);
 }else if(id==='bread'){ball(0,.075,0,.135,.075,.10,'oak');for(let i=0;i<4;i++)rod([-.07+i*.045,.139,-.04],[-.08+i*.045,.139,.04],.003,'cream');
 }else if(id==='bread-board'){box(0,.009,0,.25,.018,.16);box(.16,.009,0,.08,.018,.055);ring(.19,.019,0,.01,.002,'darkwood',Math.PI/2);
 }else if(id==='rolling-pin'){const g=new T.CylinderGeometry(.027,.027,.26,16);g.rotateZ(Math.PI/2);put(g,'oak',0,.028,0);rod([-.19,.028,0],[.19,.028,0],.014,'darkwood');
 }else if(id==='wooden-spoon'){ball(0,.010,-.07,.033,.009,.045,'oak');rod([0,.012,-.035],[0,.018,.17],.008,'oak');
 }else if(id==='knife'||id==='fork'){
  rod([0,.009,-.12],[0,.009,-.025],.012,'darkwood');if(id==='knife')box(.006,.012,.044,.021,.009,.14,'steel');else{rod([0,.012,-.03],[0,.012,.045],.006,'steel');for(const x of [-.01,.01])rod([0,.012,.04],[x,.012,.11],.003,'steel');}
 }else if(id==='butter-dish'){plate(0,0,0,.085);box(0,.046,0,.105,.045,.07,'cream');ball(0,.077,0,.012,.009,.012,'blue');
 }else if(id==='cheese'){const g=new T.CylinderGeometry(.11,.11,.07,3,1,false,0,Math.PI*2);put(g,'cream',0,.035,0);for(let i=0;i<5;i++)cyl((i%2-.5)*.035,.072,(Math.floor(i/2)-1)*.035,.006,.006,.002,'oak');
 }else if(id==='flour-sack'){ball(0,.19,0,.14,.19,.11,'cloth');cyl(0,.36,0,.038,.02,.07,'cloth');ring(0,.35,0,.025,.005,'darkwood',Math.PI/2);for(const x of [-.05,.05])box(x,.18,.106,.009,.22,.004,'blue');
 }else if(id==='onion-string'||id==='herb-bundle'){
  rod([0,0,0],[0,.55,0],.004,'oak');if(id==='onion-string')for(let i=0;i<8;i++){const x=(i%2-.5)*.056,y=.055+i*.052;ball(x,y,0,.037,.042,.035,'clay');rod([x,y+.03,0],[0,y+.085,0],.003,'oak');}
  else for(let i=0;i<14;i++){const x=Math.sin(i*2.4)*.075,z=Math.cos(i*2.4)*.035;rod([0,.50,0],[x,.03,z],.002,'oak');for(let j=0;j<4;j++){const leaf=new T.SphereGeometry(1,6,4);leaf.scale(.020,.042,.006);put(leaf,'green',x*.7,.05+j*.075,z);}}
 }else if(id==='coffee-mill'){panel(0,.09,.074,.15,.14);box(0,.085,0,.17,.17,.15,'darkwood');ball(0,.192,0,.078,.045,.066,'iron');rod([0,.21,0],[0,.25,0],.005);rod([0,.25,0],[.10,.25,0],.006);cyl(.10,.263,0,.017,.017,.04,'oak');ball(0,.09,.098,.012,.012,.015,'copper');
 }else if(id==='hand-machine'||id==='treadle-machine'){sewing(id==='treadle-machine');
 }else if(id==='sewing-basket'){
  vessel(0,0,0,.115,.11,'oak');for(let i=0;i<7;i++)ring(0,.025+i*.013,0,.08+i*.005,.004,'darkwood',Math.PI/2);for(let i=0;i<12;i++){const a=i*Math.PI/6;rod([Math.cos(a)*.063,0,Math.sin(a)*.063],[Math.cos(a)*.109,.11,Math.sin(a)*.109],.003,'oak');}ball(-.02,.075,0,.045,.037,.037,'cloth');cyl(.04,.08,0,.018,.018,.065,'cream');
 }else if(id==='thread-spools'){
  for(let i=0;i<3;i++){const x=(i-1)*.045;for(const y of [.005,.06])cyl(x,y,0,.02,.02,.008,'oak');cyl(x,.032,0,.015,.015,.051,i===0?'cloth':i===1?'cream':'green');for(let j=0;j<6;j++)ring(x,.012+j*.008,0,.015,.001,'darkwood',Math.PI/2);}
 }else if(id==='scissors'){
  for(const side of [-1,1]){ring(side*.019,.008,-.055,.020,.004,'steel',Math.PI/2);rod([side*.019,.009,-.038],[0,.011,.02],.005,'steel');rod([0,.011,.02],[-side*.024,.013,.105],.004,'steel');}cyl(0,.016,.02,.007,.007,.008,'copper');
 }else if(id==='pincushion'){ball(0,.025,0,.043,.025,.033,'cloth');for(let i=0;i<7;i++){const x=Math.sin(i*2.4)*.028,z=Math.cos(i*2.4)*.02;rod([x,.024,z],[x,.065,z],.001,'steel');ball(x,.067,z,.003,.003,.003,'cream');}
 }else if(id==='darning-mushroom'){cyl(0,.066,0,.012,.018,.13,'darkwood');ball(0,.145,0,.055,.021,.055,'oak');
 }else if(id==='needle-case'){box(0,.012,0,.035,.023,.12,'darkwood');box(0,.025,.007,.030,.004,.095,'oak');
 }else if(id==='folded-linen'){for(let i=0;i<4;i++){box((i%2)*.007,.018+i*.026,0,.31-i*.011,.025,.23-i*.009,i%2?'cloth':'linen');for(let j=0;j<2;j++)box(-.11+j*.015,.032+i*.026,0,.005,.002,.20,'blue');}
 }else if(id==='patchwork-quilt'){quilt();
 }else if(id==='pillow'){softBox(0,.07,0,.52,.14,.32,'linen',.06);for(let i=0;i<9;i++)rod([-.20+i*.05,.107,-.11],[-.20+i*.05,.107,.11],.0018,'blue');
 }else if(id==='bolster'){const g=new T.CapsuleGeometry(.095,.63,6,16);g.rotateZ(Math.PI/2);put(g,'linen',0,.095,0);for(const x of [-.33,.33])ring(x,.095,0,.07,.005,'cloth',0,Math.PI/2);
 }else if(id==='chamber-pot'){vessel(0,0,0,.13,.14,'cream','pot');handle(.12,.09,0,.042,'cream');ring(0,.14,0,.105,.006,'blue',Math.PI/2);
 }else if(id==='boots'||id==='clogs'){
  for(const x of [-.09,.09]){ball(x,.023,0,.065,.023,.145,'oak');ball(x,.070,.025,.060,.055,.12,'darkwood');if(id==='boots'){cyl(x,.14,-.075,.048,.055,.20,'darkwood');for(let i=0;i<6;i++)rod([x-.025,.09+i*.024,-.019],[x+.025,.10+i*.024,-.019],.002,'cream');}}
 }else if(id==='cap'){ball(0,.048,0,.12,.048,.10,'cloth');ball(0,.017,.072,.106,.009,.083,'darkwood');
 }else if(id==='apron'){cloth(0,.27,0,.37,.52,'cream');cloth(0,.61,0,.21,.23,'cream');ring(0,.78,0,.065,.006,'cream');rod([-.18,.52,0],[.18,.52,0],.009,'cloth');box(0,.25,.025,.17,.14,.009,'cloth');
 }else if(id==='towel'){cloth(0,.29,0,.29,.56,'cream');for(const y of [.04,.075])rod([-.14,y,.014],[.14,y,.014],.003,'blue');
 }else if(id==='curtains'){
  rod([-.64,1.09,0],[.64,1.09,0],.013,'darkwood');for(const side of [-1,1]){ball(side*.66,1.09,0,.025,.025,.025,'oak');const g=new T.PlaneGeometry(.30,1.03,20,24),p=g.attributes.position;for(let i=0;i<p.count;i++){const yy=p.getY(i),xx=p.getX(i);p.setX(i,xx*(.70+.30*Math.abs(yy)*2)+side*(.40+.03*Math.cos(yy*5)));p.setZ(i,.024*Math.sin(xx*85));}g.computeVertexNormals();put(g,'cloth',0,.53,.025);for(let j=0;j<5;j++)ring(side*.40+(j-2)*.052,1.065,0,.022,.004,'iron',0,Math.PI/2);}
 }else if(id==='rag-rug'){cloth(0,.02,0,.90,1.28,'cloth',true);for(let i=0;i<16;i++)box(0,.039,(i-7.5)*.076,.88,.003,.025,i%3?'green':'cream');for(let i=0;i<20;i++)for(const side of [-1,1])rod([(i-9.5)*.044,.023,side*.63],[(i-9.5)*.044,.023,side*.68],.002,'cream');
 }else if(id==='mirror'||id==='framed-print'){
  const w=id==='mirror'?.32:.39,h=id==='mirror'?.43:.29;panel(0,h/2,0,w,h);box(0,h/2,.030,w-.075,h-.075,.008,id==='mirror'?'glass':'paper');if(id==='framed-print'){for(let i=0;i<5;i++)ball((i-2)*.050,.12,.038,.047,.020+i*.005,.002,'green');box(.055,.112,.041,.065,.055,.002,'clay');}rod([-w*.28,h-.03,-.012],[0,h+.08,-.012],.002,'darkwood');rod([0,h+.08,-.012],[w*.28,h-.03,-.012],.002,'darkwood');
 }else if(id==='wall-clock'){
  panel(0,.30,0,.26,.57,'darkwood');// Clock dial faces the room.
  const dial=new T.CircleGeometry(.097,32);put(dial,'cream',0,.43,.040);ring(0,.43,.044,.100,.008,'copper');for(let i=0;i<12;i++){const t=i*Math.PI/6;rod([Math.sin(t)*.081,.43+Math.cos(t)*.081,.05],[Math.sin(t)*.089,.43+Math.cos(t)*.089,.05],.002,'coal');}rod([0,.43,.053],[-.041,.462,.053],.003,'coal');rod([0,.43,.053],[.012,.50,.053],.002,'coal');box(0,.16,.026,.14,.17,.017,'coal');rod([0,.24,.05],[0,.09,.05],.003,'copper');ball(0,.08,.05,.031,.031,.007,'copper');
 }else if(id==='book'){box(0,.025,0,.13,.044,.18,'paper');for(const y of [.003,.050])box(0,y,0,.143,.007,.188,'darkwood');box(-.070,.025,0,.01,.05,.19,'cloth');
 }else if(id==='candle-snuffer'){put(new T.ConeGeometry(.023,.05,12),'copper',0,.025,0);rod([0,.03,0],[.17,.07,0],.004,'copper');
 }else if(id==='scrub-brush'){ball(0,.055,0,.076,.02,.039,'oak');for(let i=0;i<7;i++)for(let j=0;j<4;j++)rod([(i-3)*.019,.040,(j-1.5)*.018],[(i-3)*.019,0,(j-1.5)*.018],.003,'cream');
 }else if(id==='soap-dish'){plate(0,0,0,.065);box(0,.036,0,.065,.025,.04,'cream');
 }else if(id==='quarry-tiles'||id==='flagstones'){
  const tiles=id==='quarry-tiles',n=tiles?4:2;box(0,.004,0,1,.008,1,'stone');
  for(let x=0;x<n;x++)for(let z=0;z<n;z++){
   const size=1/n-.003,half=size/2,chip=.001,shape=new T.Shape();
   shape.moveTo(-half+chip,-half);shape.lineTo(half-chip,-half);shape.lineTo(half,-half+chip);shape.lineTo(half,half-chip);shape.lineTo(half-chip,half);shape.lineTo(-half+chip,half);shape.lineTo(-half,half-chip);shape.lineTo(-half,-half+chip);shape.closePath();
   const g=new T.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelThickness:.0004,bevelSize:.0004,bevelSegments:1,steps:1});g.rotateX(-Math.PI/2);
   const tint=.94+((x*13+z*7)%9)*.014,colour=new Float32Array(g.getAttribute('position').count*3).fill(tint);g.setAttribute('color',new T.Float32BufferAttribute(colour,3));put(g,tiles?'tile':'stone',(x+.5)/n-.5,.016,(z+.5)/n-.5);
  }
 }else if(id==='board-ceiling'){
  for(let i=0;i<7;i++)box((i+.5)/7-.5,.015,0,1/7-.004,.03,1,i%3?'oak':'darkwood');for(const x of [-.43,.43])box(x,-.030,0,.045,.06,1,'darkwood');
 }else{throw new Error(`Missing object geometry: ${id}`);}
 const parts:ObjectPart[]=[];const bounds=new T.Box3();for(const [material,raw]of batches){const geometry=mergeGeometries(raw);raw.forEach(g=>g.dispose());geometry.computeBoundingBox();bounds.union(geometry.boundingBox!);parts.push({geometry,material});}
 const floor=bounds.min.y;for(const part of parts)part.geometry.translate(0,-floor,0);bounds.translate(new T.Vector3(0,-floor,0));
 for(const surface of surfaces)surface.y-=floor;
 return {parts,bounds,surfaces};
}
const cache=new Map<InteriorObjectId,InteriorObject>();
export function interiorObject(id:InteriorObjectId){let asset=cache.get(id);if(!asset){asset=buildInteriorObject(id);cache.set(id,asset);}return asset;}
