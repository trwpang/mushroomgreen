import * as T from 'three';
import {poseAt} from './rig';
import {workingStroke} from './work-cycle';
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
   const b=bone(side+'Hand'+name+n),child=b.children.find(c=>c instanceof T.Bone),direction=child?position(child).sub(position(b)).normalize():i===1?position(b).sub(position(b.parent!)).normalize():forward.clone();
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
  root.updateMatrixWorld(true);
  const motion=workingStroke(time),p=poseAt(0,floorHeight);
  p.phase=motion.phase;p.lift=motion.lift;
  // Compact shoulder/elbow stroke. The older tall lift read like a repeated salute.
  const angle=-.10+motion.lift*.64;
  const axis=new T.Vector3(0,Math.sin(angle),Math.cos(angle));
  const up=new T.Vector3(0,1,0).addScaledVector(axis,-axis.y).normalize();
  const across=new T.Vector3().crossVectors(axis,up);
  p.hammer={x:axis,y:up,z:across,q:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(axis,up,across))};
  p.grip.y+=motion.lift*.11;p.grip.z-=motion.lift*.022;
  p.arms[1].tool=p.hammer;
  p.hammerFace.copy(p.grip).addScaledVector(axis,.32).addScaledVector(up,-.063);
  // Feet and hips remain planted. The working lean comes from the spine.
  const lean=.23+.018*(1-motion.lift)+.013*motion.impact-.018*motion.inspect;
  for(const [name,share] of [['Spine',.55],['Spine1',.3],['Spine2',.15]] as const){
   const b=bone(name),parent=rotation(b.parent!);
   const localX=new T.Vector3(1,0,0).applyQuaternion(parent.invert());
   b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(localX,lean*share));
   b.updateMatrixWorld(true);
  }
  const head=bone('Head');
  orient(head,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.38+.018*motion.impact-.035*motion.inspect).multiply(rest.get(head)!.world));
  for(let i=0;i<rigs.length;i++){
   const r=rigs[i],a=p.arms[i];
   // Keep the accepted overhand tong grip. The hammer needs a different
   // palm frame: its knuckle row crosses the shaft and thumb faces the head.
   const gripSide=i===1?-1:1;
   // Roll each grip around its shaft so the palm continues the forearm.
   // A tool's arbitrary mesh up-axis must never dictate a person's wrist bend.
   const shoulder=position(r.upper),shaft=a.tool.x.clone();
   const solve=(roll:number)=>{
    const y=a.tool.y.clone().applyAxisAngle(shaft,roll),z=new T.Vector3().crossVectors(shaft,y);
    const rake=i===1?.3:.9; // Recovered hands have different knuckle-row angles.
    const forward=y.clone().multiplyScalar(-Math.cos(rake)).addScaledVector(shaft,Math.sin(rake));
    const wrist=a.grip.clone().addScaledVector(forward,i===1?-.085:-.095).addScaledVector(z,gripSide*(i===1?.028:.034));
    const delta=wrist.clone().sub(shoulder),distance=delta.length(),axis=delta.normalize();
    const pole=i===1?new T.Vector3(.6,-.5,.4):new T.Vector3(r.side*.55,-.8,-.28);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
    const along=(r.upperLength**2-r.lowerLength**2+distance**2)/(2*distance);
    const height=Math.sqrt(Math.max(0,r.upperLength**2-along**2));
    const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height);
    const foreDirection=wrist.clone().sub(elbow).normalize();
    const cost=1-forward.dot(foreDirection)+Math.max(0,distance-r.upperLength-r.lowerLength+.015)*50;
    return {y,z,forward,wrist,elbow,foreDirection,cost};
   };
   let roll=0,best=Infinity;
   for(let n=0;n<72;n++){const value=-Math.PI+n*Math.PI/36,c=solve(value).cost;if(c<best){best=c;roll=value;}}
   for(const step of [.025,.008,.002])for(let n=0;n<3;n++){
    const lo=solve(roll-step).cost,hi=solve(roll+step).cost;
    if(lo<best){best=lo;roll-=step;}else if(hi<best){best=hi;roll+=step;}
   }
   const chosen=solve(roll);a.wrist.copy(chosen.wrist);a.elbow.copy(chosen.elbow);a.shoulder.copy(shoulder);
   a.tool={x:shaft,y:chosen.y,z:chosen.z,q:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(shaft,chosen.y,chosen.z))};
   aim(r.upper,r.fore,chosen.elbow);
   const forward=chosen.forward,across=shaft.clone().addScaledVector(forward,-shaft.dot(forward)).normalize().multiplyScalar(gripSide*r.palmSign),normal=new T.Vector3().crossVectors(across,forward);
   const targetFrame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,forward,normal));
   const handRotation=targetFrame.multiply(r.palmFrame.clone().invert()).multiply(rest.get(r.hand)!.world);
   // Transport palm roll into the forearm, rather than twisting only the wrist skin.
   const foreRest=rest.get(r.hand)!.position.clone().sub(rest.get(r.fore)!.position).normalize();
   const transport=handRotation.clone().multiply(rest.get(r.hand)!.world.clone().invert());
   const foreRotation=new T.Quaternion().setFromUnitVectors(foreRest.applyQuaternion(transport),chosen.foreDirection).multiply(transport).multiply(rest.get(r.fore)!.world);
   orient(r.fore,foreRotation);orient(r.hand,handRotation);
   const applyFingers=()=>{for(const f of r.fingers){f.b.quaternion.copy(rest.get(f.b)!.q);if(f.adduction)f.b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(f.adductionAxis,f.adduction));f.b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(f.axis,f.angle));}root.updateMatrixWorld(true);};
   applyFingers();
   if(!calibrated){
    // Start within the power-grip bounds: candidate limits alone allow an open
    // initial pose to win. Close the knuckles first, then fit the fingertips.
    for(const digit of ['Index','Middle','Ring','Pinky']){
     const chain=r.fingers.filter(f=>f.b.name.includes(digit));
     chain.forEach((f,j)=>f.angle=[1.3,1.2,.65][j]);
     const base=position(chain[0].b).sub(a.grip).dot(a.tool.x);
     const target=a.grip.clone().addScaledVector(a.tool.x,base+.008).addScaledVector(a.tool.z,-gripSide*.017);
     const score=()=>{applyFingers();const contact=new T.Vector3(0,.018,0).applyMatrix4(relative(chain[2].b)).distanceToSquared(target);return contact+.00015*chain.reduce((sum,f,j)=>sum+(f.angle-[1.3,1.2,.65][j])**2,0);};
     for(const step of [.3,.15,.06,.02])for(let round=0;round<5;round++)for(const f of chain){
      const initial=f.angle;let best=score(),value=initial;
      for(const change of [-step,step]){f.angle=T.MathUtils.clamp(initial+change,f.b===chain[0].b?1.3:f.b===chain[1].b?1.2:.5,f.b===chain[2].b?1.35:f.b===chain[0].b?1.4:1.65);const cost=score();if(cost<best){best=cost;value=f.angle;}}
      f.angle=value;
     }
     applyFingers();
    }
    // The hammer thumb closes across the fingers, rather than chasing the
    // shaft through them. Preserve the accepted tong-thumb contact.
    const thumb=r.fingers.filter(f=>f.b.name.includes('Thumb'));
    const index=position(bone((i===0?'Right':'Left')+'HandIndex2')).sub(a.grip).dot(a.tool.x);
    const target=i===1
     ?position(bone('LeftHandIndex3')).lerp(position(bone('LeftHandMiddle3')),.35).addScaledVector(a.tool.z,.008)
     :a.grip.clone().addScaledVector(a.tool.x,index).addScaledVector(a.tool.z,-gripSide*.023);
    const score=()=>{applyFingers();const tip=new T.Vector3(0,.022,0).applyMatrix4(relative(thumb[2].b));return tip.distanceToSquared(target);};
    const parameters=[{f:thumb[0],key:'adduction' as const,min:-1.3,max:1.3},...thumb.map((f,j)=>({f,key:'angle' as const,min:j===0?-.35:0,max:1.25}))];
    let seedScore=Infinity,seed=[0,0,.6,.6];
    for(const turn of [-1.2,-.6,0,.6,1.2])for(const bend of [-.3,.2,.8]){
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
  tools.Tongs.position.copy(p.tongGrip);tools.Tongs.quaternion.copy(p.arms[0].tool.q);
  root.updateMatrixWorld(true);return p;
 }
 return {update,grips:()=>rigs.map(r=>r.fingers.map(f=>({name:f.b.name,angle:f.angle,adduction:f.adduction})))};
}
