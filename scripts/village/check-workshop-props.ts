import assert from 'node:assert/strict';
import * as T from 'three';
import {addWorkshopProps} from '../../src/scripts/village/workshop-props';
for(const small of [false,true]){
 const root=new T.Group();if(small)root.scale.set(.55,.72,.70);
 const result=addWorkshopProps(root,small);root.updateMatrixWorld(true);
 let triangles=0,instances=0;
 result.group.traverse(o=>{
  if(!(o instanceof T.InstancedMesh))return;
  assert.ok(o.geometry.getAttribute('position').array.every(Number.isFinite));
  const bounds=new T.Box3().setFromObject(o);
  assert.ok(bounds.min.y>=-.001,`${o.name} below ground`);
  // Actual link extents, not nominal placement circles, must stay within the walls.
  if(/^Workshop_chain-/.test(o.name)){
   assert.ok(bounds.min.x>-4.38*root.scale.x&&bounds.max.x<4.38*root.scale.x,`${o.name} crosses gable`);
   assert.ok(bounds.min.z>-1.94*root.scale.z&&bounds.max.z<1.94*root.scale.z,`${o.name} crosses long wall: ${bounds.min.z} ${bounds.max.z}`);
   const m=new T.Matrix4();for(let i=0;i<o.count;i++){
    o.getMatrixAt(i,m);const c=new T.Vector3().setFromMatrixPosition(m);
    assert.ok(!(Math.abs(c.z)<.34&&Math.abs(c.x)<.65),'Keep working figure stance free');
    assert.ok(!(Math.abs(c.z)<.55&&c.x>3.8*root.scale.x),'Keep the gable entrance clear');
   }
  }
  triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3*o.count;instances+=o.count;
 });
 assert.ok(result.draws<=20,'Keep workshop props batched');assert.ok(triangles<130000,'Bound repeated link triangles');
 if(small)assert.equal(result.counts.large,0,'Domestic shop has lighter chain stock');
 assert.ok(result.counts.small>30&&result.counts.blanks>=10);
 console.log(JSON.stringify({shop:small?'Henry':'main',...result.counts,draws:result.draws,instances,triangles}));
}
