import * as T from 'three';
import {poseAt} from './rig';
/** Skeletal adapter for the recovered continuous mesh. All targets use figure-local metres. */
export function createSkeletalChainmakerRig(root:T.Object3D,floorHeight=0){
 const bones:T.Bone[]=[];root.traverse(o=>{if(o instanceof T.Bone)bones.push(o);});
 const bone=(suffix:string)=>{const b=bones.find(b=>b.name.replace(/[^a-z0-9]/gi,'')==='mixamorig'+suffix);if(!b)throw Error(`Missing skeletal joint ${suffix}`);return b;};
 const carrier=bone('Hips').parent!;carrier.position.z+=.18;root.updateMatrixWorld(true);
 const inv=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3(),s=new T.Vector3();
 const relative=(o:T.Object3D)=>{root.updateMatrixWorld(true);inv.copy(root.matrixWorld).invert();return new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);};
 const position=(o:T.Object3D)=>new T.Vector3().setFromMatrixPosition(relative(o));
 const rotation=(o:T.Object3D)=>{relative(o).decompose(v,q,s);return q.clone();};
 const rest=new Map(bones.map(b=>[b,{q:b.quaternion.clone(),world:rotation(b),position:position(b)}]));
 const rigs=(['Right','Left'] as const).map((side,i)=>{
  const upper=bone(side+'Arm'),fore=bone(side+'ForeArm'),hand=bone(side+'Hand');
  const wrist=position(hand),index=position(bone(side+'HandIndex1')),pinky=position(bone(side+'HandPinky1')),middle=position(bone(side+'HandMiddle1'));
  const across=index.sub(pinky).normalize(),forward=middle.sub(wrist).normalize();across.addScaledVector(forward,-across.dot(forward)).normalize();
  const normal=new T.Vector3().crossVectors(across,forward).normalize();
  const palmNormal=normal.clone().multiplyScalar(normal.z<0?-1:1);
  const palmFrame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,forward,normal));
  const fingers=['Index','Middle','Ring','Pinky','Thumb'].flatMap(name=>[1,2,3].map(n=>{
   const b=bone(side+'Hand'+name+n),child=b.children.find(c=>c instanceof T.Bone),direction=child?position(child).sub(position(b)).normalize():forward.clone();
   const axis=new T.Vector3().crossVectors(direction,palmNormal).normalize().applyQuaternion(rest.get(b)!.world.clone().invert());
   const adduction=name==='Thumb'&&n===1?Math.sign(new T.Vector3().crossVectors(direction,forward).dot(palmNormal))*-1.1:0;
   const adductionAxis=palmNormal.clone().applyQuaternion(rotation(b.parent!).invert());
   return {b,axis,adduction,adductionAxis,angle:name==='Thumb'?(n===1?.6:.8):(n===1?.9:n===2?1.15:.65)};
  }));
  return {palmSign:normal.z<0?-1:1,side:i===0?-1:1,upper,fore,hand,palmFrame,upperLength:position(upper).distanceTo(position(fore)),lowerLength:position(fore).distanceTo(wrist),fingers};
 });
 const tools={Hammer:root.getObjectByName('Hammer')!,Tongs:root.getObjectByName('Tongs')!};
 if(!tools.Hammer||!tools.Tongs)throw Error('Missing skeletal worker tools');
 function orient(b:T.Bone,desired:T.Quaternion){const parent=rotation(b.parent!);b.quaternion.copy(parent.invert().multiply(desired));b.updateMatrixWorld(true);}
 function aim(b:T.Bone,child:T.Bone,target:T.Vector3){
  const base=rest.get(b)!,from=rest.get(child)!.position.clone().sub(base.position).normalize(),to=target.clone().sub(position(b)).normalize();
  orient(b,new T.Quaternion().setFromUnitVectors(from,to).multiply(base.world));
 }
 let calibrated=false;
 function update(time:number){
  for(const [b,r]of rest)b.quaternion.copy(r.q);
  root.updateMatrixWorld(true);const p=poseAt(time,floorHeight);
  const head=bone('Head');orient(head,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.27+p.lift*.03).multiply(rest.get(head)!.world));
  for(let i=0;i<rigs.length;i++){
   const r=rigs[i],a=p.arms[i];
   // This mesh has a longer palm than the earlier assembled hands.
   a.wrist.copy(a.grip).addScaledVector(a.tool.y,.105).addScaledVector(a.tool.z,r.side*.027);
   const shoulder=position(r.upper),delta=a.wrist.clone().sub(shoulder),distance=delta.length(),max=r.upperLength+r.lowerLength;
   if(distance>max+.002)throw Error(`Skeletal wrist unreachable: ${distance.toFixed(3)} > ${max.toFixed(3)}`);
   const axis=delta.normalize(),pole=new T.Vector3(r.side*.65,.48,-.18);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const along=(r.upperLength**2-r.lowerLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,r.upperLength**2-along**2));
   const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height);
   aim(r.upper,r.fore,elbow);aim(r.fore,r.hand,a.wrist);
   const across=a.tool.x.clone().multiplyScalar(r.side*r.palmSign),forward=a.tool.y.clone().negate(),normal=new T.Vector3().crossVectors(across,forward);
   const targetFrame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,forward,normal));
   orient(r.hand,targetFrame.multiply(r.palmFrame.clone().invert()).multiply(rest.get(r.hand)!.world));
   const applyFingers=()=>{for(const f of r.fingers){f.b.quaternion.copy(rest.get(f.b)!.q);if(f.adduction)f.b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(f.adductionAxis,f.adduction));f.b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(f.axis,f.angle));}root.updateMatrixWorld(true);};
   applyFingers();
   if(!calibrated){
    // Fit the thumb pad once in the invariant hand/tool frame. It must oppose the fingers.
    const thumb=r.fingers.filter(f=>f.b.name.includes('Thumb'));
    const index=position(bone((i===0?'Right':'Left')+'HandIndex2')).sub(a.grip).dot(a.tool.x);
    const target=a.grip.clone().addScaledVector(a.tool.x,index).addScaledVector(a.tool.z,r.side*.018);
    const score=()=>{applyFingers();const tip=new T.Vector3(0,.022,0).applyMatrix4(relative(thumb[2].b));return tip.distanceToSquared(target);};
    const parameters=[{f:thumb[0],key:'adduction' as const,min:-2.5,max:2.5},...thumb.map((f,j)=>({f,key:'angle' as const,min:j===0?-1.4:0,max:1.7}))];
    let seedScore=Infinity,seed=[0,0,.6,.6];
    for(const turn of [-2.2,-1.1,0,1.1,2.2])for(const bend of [-1,.2,1.2]){
     thumb[0].adduction=turn;thumb[0].angle=bend;thumb[1].angle=.6;thumb[2].angle=.6;
     const cost=score();if(cost<seedScore){seedScore=cost;seed=[turn,bend,.6,.6];}
    }
    parameters.forEach((p,k)=>p.f[p.key]=seed[k]);
    for(const step of [.25,.12,.05,.02])for(let round=0;round<6;round++)for(const param of parameters){
     const initial=param.f[param.key];let best=score(),value=initial;
     for(const change of [-step,step]){param.f[param.key]=T.MathUtils.clamp(initial+change,param.min,param.max);const test=score();if(test<best){best=test;value=param.f[param.key];}}
     param.f[param.key]=value;
    }
    applyFingers();
   }
  }
  calibrated=true;
  tools.Hammer.position.copy(p.grip);tools.Hammer.quaternion.copy(p.hammer.q);
  tools.Tongs.position.copy(p.tongGrip);tools.Tongs.quaternion.copy(p.tongs.q);
  root.updateMatrixWorld(true);return p;
 }
 return {update};
}
