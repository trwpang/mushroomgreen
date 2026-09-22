"""Recover an inspection rig from retained inverse binds; preserve the provider source."""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/chainmaker/tripo-v2/static-preview.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
import runpy
repair=runpy.run_path(str(ROOT/'scripts/chainmaker/repair-tripo-apron.py'))['repair_apron']
bones=json.loads((ROOT/'artifacts/chainmaker/tripo-v2/recovered-bind.json').read_text())
data=bpy.data.armatures.new('Recovered skeleton');rig=bpy.data.objects.new('ChainmakerRig',data);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);mesh.select_set(False);bpy.ops.object.mode_set(mode='EDIT')
byname={b['name']:b for b in bones}
for item in bones:
    b=data.edit_bones.new(item['name']);b.head=item['head']
    children=[c for c in bones if c['parent']==item['name']]
    # Spine follows its central child rather than a leg or shoulder branch.
    preferred=next((c for c in children if any(c['name'].endswith(x) for x in ['Spine','Spine1','Spine2','Neck','Head'])),None)
    if preferred: tail=Vector(preferred['head'])
    elif children: tail=Vector(children[0]['head'])
    else:
        parent=byname.get(item['parent']);direction=(b.head-Vector(parent['head'])).normalized() if parent else Vector((0,0,1));tail=b.head+direction*.022
    if (tail-b.head).length<.002:tail=b.head+Vector((0,0,.025))
    b.tail=tail
    if item['name'].endswith('Head'):b.tail=b.head+Vector((0,0,.14))
    if item['name'].endswith('_End'):b.use_deform=False
for item in bones:
    if item['parent'] in data.edit_bones:data.edit_bones[item['name']].parent=data.edit_bones[item['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
# A watertight temporary proxy avoids heat-weight failure on generated internal faces.
proxy=mesh.copy();proxy.data=mesh.data.copy();bpy.context.collection.objects.link(proxy)
bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True);bpy.context.view_layer.objects.active=proxy
remesh=proxy.modifiers.new('Weighting proxy','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.006
bpy.ops.object.modifier_apply(modifier=remesh.name)
rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
removed_apron_faces=repair(mesh)
from mathutils.kdtree import KDTree
kd=KDTree(len(proxy.data.vertices))
for v in proxy.data.vertices:kd.insert(v.co,v.index)
kd.balance()
for group in proxy.vertex_groups:mesh.vertex_groups.new(name=group.name)
for v in mesh.data.vertices:
    _,index,_=kd.find(v.co)
    for group in proxy.data.vertices[index].groups:
        mesh.vertex_groups[group.group].add([v.index],group.weight,'REPLACE')
# Thin, separate fingers need local capsule weights; heat transfer misses terminal digits.
# Limit this correction to hand vertices and blend into the forearm near the wrist.
import math
for side in ['Left','Right']:
    hand=data.bones['mixamorig:'+side+'Hand'];sign=1 if hand.head_local.x>0 else -1
    candidates=[b for b in data.bones if b.use_deform and (b.name.startswith('mixamorig:'+side+'Hand') or b.name=='mixamorig:'+side+'ForeArm')]
    for vertex in mesh.data.vertices:
        if vertex.co.x*sign<abs(hand.head_local.x)-.045:continue
        values=[]
        for b in candidates:
            delta=b.tail_local-b.head_local;along=max(0,min(1,(vertex.co-b.head_local).dot(delta)/max(delta.length_squared,1e-9)))
            distance=(vertex.co-b.head_local-along*delta).length
            values.append((distance,b.name))
        values.sort();near=values[:2];minimum=near[0][0]
        weights_local=[math.exp(-((d-minimum)/.005)**2) for d,_ in near];total=sum(weights_local)
        for group in mesh.vertex_groups:group.remove([vertex.index])
        for weight,(_,name) in zip(weights_local,near):mesh.vertex_groups[name].add([vertex.index],weight/total,'REPLACE')
mesh.parent=rig
modifier=mesh.modifiers.new('Recovered skeletal deformation','ARMATURE');modifier.object=rig
bpy.data.objects.remove(proxy,do_unlink=True)
weights={g.name:0 for g in mesh.vertex_groups}
unweighted=0
for v in mesh.data.vertices:
    if not v.groups:unweighted+=1
    for g in v.groups:
        if g.weight>.001:weights[mesh.vertex_groups[g.group].name]+=1
report={'removedRearApronFaces':removed_apron_faces,'vertices':len(mesh.data.vertices),'unweighted':unweighted,'influencedVerticesByBone':weights,'note':'Recovered bind positions and Blender automatic weights. Requires deformation and anatomical review.'}
(ROOT/'artifacts/chainmaker/tripo-v2/recovered-rig-check.json').write_text(json.dumps(report,indent=2))
if unweighted:raise RuntimeError(f'{unweighted} unweighted vertices')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/chainmaker/tripo-v2/recovered-rig.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/chainmaker/tripo-v2/recovered-rig.glb'),export_format='GLB',export_animations=False,export_yup=True)
