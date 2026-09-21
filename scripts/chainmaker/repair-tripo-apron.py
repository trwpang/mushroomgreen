"""Replace the generated wraparound skirt with a front apron and heavy trousers."""
import bpy, bmesh, math
import numpy as np

def repair_apron(mesh):
    bm=bmesh.new();bm.from_mesh(mesh.data)
    for point,normal in [((0,-.020,0),(0,1,0)),((0,0,.445),(0,0,1)),((0,0,1.065),(0,0,1))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=point,plane_no=normal,dist=.00001)
    rear=[f for f in bm.faces if .445<f.calc_center_median().z<1.065 and abs(f.calc_center_median().x)<.28 and f.calc_center_median().y>-.020]
    bmesh.ops.delete(bm,geom=rear,context='FACES');bm.to_mesh(mesh.data);bm.free();mesh.data.update()
    mat=bpy.data.materials.new('Worn brown wool trousers');mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.96
    # Original pixels: a fine weave, broken nap and low-contrast wear, no provider image alteration.
    size=512;y,x=np.mgrid[0:size,0:size];rng=np.random.default_rng(1865)
    tone=.78+.09*np.sin(x*.054+y*.029)+.05*np.cos(y*.13-x*.025)+.06*rng.random((size,size))
    weave=np.where((x+y)%4<2,1.015,.985);tone*=weave
    rgb=np.stack([tone*.19,tone*.151,tone*.115,np.ones_like(tone)],axis=-1).astype(np.float32)
    image=bpy.data.images.new('Trouser wool weave',width=size,height=size,alpha=True);image.pixels.foreach_set(rgb.ravel());image.pack()
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    mesh.data.materials.append(mat);idx=len(mesh.data.materials)-1
    uv=mesh.data.uv_layers.active
    for p in mesh.data.polygons:
        centre=p.center
        if .17<centre.z<.445:
            p.material_index=idx
            for li in p.loop_indices:
                v=mesh.data.vertices[mesh.data.loops[li].vertex_index].co
                uv.data[li].uv=(v.x*5+v.y*3,v.z*5)
    verts=[];faces=[];sides=40;rings=30
    for side in [-1,1]:
        start=len(verts)
        for j in range(rings+1):
            t=j/rings;z=.385+t*.70
            cx=side*(.126-.047*t);rx=.071+.030*t;ry=.067+.025*t
            for i in range(sides):
                a=i/sides*math.tau
                wrinkle=.0035*math.sin(a*6+z*43)+.002*math.cos(a*11-z*65)
                verts.append((cx+math.cos(a)*(rx+wrinkle),.013+math.sin(a)*(ry+wrinkle),z+.003*math.sin(a*4+z*28)))
        for j in range(rings):
            for i in range(sides):
                a=start+j*sides+i;b=start+j*sides+(i+1)%sides
                faces.append((a,b,b+sides,a+sides))
        faces.append(tuple(start+i for i in reversed(range(sides))))
        faces.append(tuple(start+rings*sides+i for i in range(sides)))
    data=bpy.data.meshes.new('Trouser upper legs');data.from_pydata(verts,[],faces);data.update();data.materials.append(mat)
    layer=data.uv_layers.new(name='UVMap')
    for poly in data.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            v=data.vertices[data.loops[li].vertex_index].co;layer.data[li].uv=(v.x*5+v.y*3,v.z*5)
    obj=bpy.data.objects.new('Trouser upper legs',data);bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=mesh;bpy.ops.object.join()
    return len(rear)
