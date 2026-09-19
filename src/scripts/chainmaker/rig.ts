import * as T from 'three';
export const PERIOD=2.8;
export const LINK=new T.Vector3(.10,1.062,.72);
const down=new T.Vector3(0,-1,0);
const smooth=(t:number)=>t*t*(3-2*t);
/** Slow recovery, short decisive downstroke, small rebound, then a held inspection. */
export function stroke(time:number){const p=((time%PERIOD)+PERIOD)%PERIOD/PERIOD;
 let lift=0;if(p<.38)lift=smooth(p/.38);else if(p<.53)lift=1;else if(p<.68)lift=1-smooth((p-.53)/.15);else if(p<.79)lift=.09*Math.sin((p-.68)/.11*Math.PI);return {phase:p,lift};}
export function solveArm(shoulder:T.Vector3,wrist:T.Vector3,side:number){
 const upper=.30,lower=.285,delta=wrist.clone().sub(shoulder),distance=delta.length();
 if(distance>upper+lower||distance<Math.abs(upper-lower))throw new Error(`Unreachable wrist: ${distance}`);
 const axis=delta.clone().normalize();const pole=new T.Vector3(side,.03,-.3);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 return shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height);
}
function basis(axis:T.Vector3){const x=axis.clone().normalize();const y=new T.Vector3(0,1,0).addScaledVector(x,-x.y).normalize();const z=new T.Vector3().crossVectors(x,y);return {x,y,z,q:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z))};}
export function poseAt(time:number){
 const {phase,lift}=stroke(time);const follow=-.006*Math.sin(phase*Math.PI*2);
 const a=-.10+lift*1.06;const hammer=basis(new T.Vector3(0,Math.sin(a),Math.cos(a)));
 const contact=LINK.clone().add(new T.Vector3(0,.007,0));
 const strike=basis(new T.Vector3(0,Math.sin(-.1),Math.cos(-.1)));
 const grip=contact.clone().addScaledVector(strike.x,-.32).addScaledVector(strike.y,.063);
 grip.y+=lift*.105;grip.z-=lift*.035;
 const tongGrip=new T.Vector3(-.225,1.133,.425),tongTip=LINK.clone().add(new T.Vector3(-.037,0,0));
 const tongs=basis(tongTip.clone().sub(tongGrip));
 // Jaws are .43m from grip, so solve grip from the contact, preserving the physical reins length.
 tongGrip.copy(tongTip).addScaledVector(tongs.x,-.43);
 const arms=[{side:-1,label:'L',grip:tongGrip,tool:tongs},{side:1,label:'R',grip,tool:hammer}].map(a=>{
  const shoulder=new T.Vector3(a.side*.235,1.38+follow,.12);
  const wrist=a.grip.clone().addScaledVector(a.tool.y,.053);
  return {...a,shoulder,wrist,elbow:solveArm(shoulder,wrist,a.side)};
 });
 return {phase,lift,follow,arms,hammer,grip,tongs,tongGrip,contact,hammerFace:grip.clone().addScaledVector(hammer.x,.32).addScaledVector(hammer.y,-.063)};
}
export function createChainmakerRig(root:T.Object3D){
 const required=['Body','Torso','Head','Upper_L','Upper_R','Fore_L','Fore_R','Hand_L','Hand_R','Hammer','Tongs'];
 const nodes=Object.fromEntries(required.map(name=>{const node=root.getObjectByName(name);if(!node)throw new Error(`Missing character node ${name}`);return[name,node];}));
 const bridges=new Map<string,T.Mesh>();
 const sleeve=nodes.Upper_R.children.find(o=>o instanceof T.Mesh&&(o as T.Mesh).material instanceof T.MeshStandardMaterial&&((o as T.Mesh).material as T.Material).name==='Unbleached linen') as T.Mesh;
 if(!sleeve)throw new Error('Missing sleeve material');
 const rings=12,sides=32;
 for(const label of ['L','R']){
  const g=new T.BufferGeometry(),positions=new Float32Array((rings+1)*(sides+1)*3),uvs:number[]=[],indices:number[]=[];
  for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){uvs.push(i/sides,j/rings);if(j<rings&&i<sides){const a=j*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}}
  g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);
  const m=new T.Mesh(g,sleeve.material);m.castShadow=m.receiveShadow=true;root.add(m);bridges.set(label,m);
 }
 function update(time:number){const p=poseAt(time);
  nodes.Torso.position.y=p.follow;
  const pivot=new T.Vector3(0,1.465,.145);nodes.Head.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),.32+p.lift*.035);nodes.Head.position.copy(pivot).sub(pivot.clone().applyQuaternion(nodes.Head.quaternion));nodes.Head.position.y+=p.follow;
  for(const a of p.arms){
   const upper=nodes['Upper_'+a.label],fore=nodes['Fore_'+a.label],hand=nodes['Hand_'+a.label];
   upper.position.copy(a.shoulder);upper.quaternion.setFromUnitVectors(down,a.elbow.clone().sub(a.shoulder).normalize());
   fore.position.copy(a.elbow);fore.quaternion.setFromUnitVectors(down,a.wrist.clone().sub(a.elbow).normalize());
   hand.position.copy(a.wrist);hand.quaternion.copy(a.tool.q);
   // Continuous fabric bridge from the torso armhole into the moving sleeve.
   const start=new T.Vector3(a.side*.194,1.373+p.follow,.119),dir=a.elbow.clone().sub(a.shoulder).normalize();
   const end=a.shoulder.clone().addScaledVector(dir,.111),c1=start.clone().add(new T.Vector3(a.side*.05,0,0)),c2=end.clone().addScaledVector(dir,-.04);
   const path=new T.CubicBezierCurve3(start,c1,c2,end),geometry=bridges.get(a.label)!.geometry,attr=geometry.getAttribute('position');
   for(let j=0;j<=rings;j++){
    const t=j/rings,centre=path.getPoint(t),tangent=path.getTangent(t),q=new T.Quaternion().setFromUnitVectors(down,tangent);
    for(let i=0;i<=sides;i++){const angle=i/sides*Math.PI*2,r=.070+.007*Math.sin(t*Math.PI);const v=new T.Vector3(Math.cos(angle)*r,0,Math.sin(angle)*(.073+.005*Math.sin(t*Math.PI)));v.applyQuaternion(q).add(centre);attr.setXYZ(j*(sides+1)+i,v.x,v.y,v.z);}
   }
   attr.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  }
  nodes.Hammer.position.copy(p.grip);nodes.Hammer.quaternion.copy(p.hammer.q);nodes.Hammer.visible=true;
  nodes.Tongs.position.copy(p.tongGrip);nodes.Tongs.quaternion.copy(p.tongs.q);nodes.Tongs.visible=true;
  return p;
 }
 return {update};
}
