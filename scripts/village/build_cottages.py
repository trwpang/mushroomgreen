"""Original reusable Black Country cottage kit. Metres, Blender Z-up.
Uses the forge's mesh and material helpers so both studies share the same surface language.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
helper=ROOT/'scripts/forge/build_forge.py'
namespace={'__file__':str(helper),'__name__':'village_materials'}
exec(compile(helper.read_text().split('# Building: long, low shop')[0],str(helper),'exec'),namespace)
globals().update({k:v for k,v in namespace.items() if not k.startswith('__')})
OUT=ROOT/'public/village';SOURCE=ROOT/'assets/village'
OUT.mkdir(exist_ok=True,parents=True);SOURCE.mkdir(exist_ok=True,parents=True)
import json
random.seed(1865)
# Local guidance describes darkened clay tiles. Reuse the relief with a fired-clay colour.
im=bpy.data.images.get('slate aged colour atlas')
px=np.array(im.pixels[:],dtype=np.float32).reshape((-1,4))
px[:,:3]*=np.array([1.18,.85,.66])
im.pixels.foreach_set(px.ravel());im.pack()
plaster=[mat('Old limewash '+str(i),c) for i,c in enumerate([(148,139,116),(162,153,129),(129,125,107)])]
glass=mat('Small dark glass',(33,43,39),.3,.25)
cloth=mat('Unbleached washing',(158,150,124),1)
rust=mat('Rust stained iron',(79,54,35),.88,.3)
moss=mat('Damp green mortar',(67,75,39))
# Keep walls economical. Individual bricks are still full relief, without extra bevel topology.
for style in range(3):
    batches.clear();face_uvs.clear()
    L=[6.4,7.2,9.2][style];W=[4.6,4.8,4.5][style];E=[2.65,4.45,2.85][style];R=E+1.65
    def hole(x,z,back=False):
        if not back and abs(x)<.46 and z<1.98:return True
        return any(abs(x-c)<.48 and a<z<a+.90 for c in [-L*.32,L*.32] for a in ([.88,3.0] if style==1 else [.85]))
    for side in [-1,1]:
        for row in range(int(E/.09)):
            z=.055+row*.09;x=-L/2-.15*(row%2)
            while x<L/2:
                a=max(x,-L/2);b=min(x+.30,L/2)
                if b>a+.025 and not hole((a+b)/2,z,side>0):
                    box('Walls',((a+b)/2,side*W/2,z),(b-a,.20,.086),mortar)
                    dirty=z<.30 or (z>E-.26 and random.random()<.65)
                    material=random.choice(sootbrick if dirty else brick)
                    if style==2 and z>.35 and random.random()>.17:material=random.choice(plaster)
                    box('Brick',((a+b)/2,side*(W/2+.112),z),(b-a-.013,.035,.073),material)
                x+=.30
    for side in [-1,1]:
        for row in range(int(R/.09)):
            z=.055+row*.09;half=W/2 if z<E else max(0,W/2*(R-z)/(R-E));y=-half
            while y<half:
                w=min(.30,half-y)
                if w>.018:
                    box('Gables',(side*L/2,y+w/2,z),(.22,w,.086),mortar)
                    box('Brick',(side*(L/2+.12),y+w/2,z),(.035,max(.005,w-.012),.073),random.choice(brick if style!=2 or random.random()<.24 else plaster))
                y+=.30
    # Recessed small-paned windows, timber frames and brick arches.
    for side in [-1,1]:
        for x in [-L*.32,L*.32]:
            for z in ([1.32,3.45] if style==1 else [1.30]):
                y=side*(W/2+.12)
                box('Glazing',(x,y-.025*side,z),(.91,.026,.87),glass)
                for dx in [-.49,0,.49]:box('Frames',(x+dx,y+side*.032,z),(.038,.068,.97),wood[2])
                for dz in [-.48,0,.48]:box('Frames',(x,y+side*.035,z+dz),(1.02,.069,.036),wood[2])
                box('Sills',(x,y+side*.04,z-.53),(1.15,.32,.105),stone[1])
                for k in range(8):box('Lintels',(x+(k-3.5)*.137,y,z+.59),(.127,.18,.19),brick[k%len(brick)],Matrix.Rotation((k-3.5)*-.025,3,'Y'))
    # Six uneven oak door planks, worn threshold, latch and nail heads.
    for i in range(6):box('Door',((i-2.5)*.146,-W/2-.02,.98),(.138,.06,1.94),wood[i%4])
    for z in [.23,1.58]:box('Door braces',(0,-W/2-.068,z),(.88,.045,.085),wood[1])
    box('Latch',(.26,-W/2-.103,.95),(.12,.02,.024),iron)
    box('Threshold',(0,-W/2-.23,.075),(1.18,.55,.15),stone[2])
    # Worn overlapping slate courses with irregular corners.
    slope=(R-E)/(W/2)
    for side in [-1,1]:
        rot=Matrix.Rotation(-side*math.atan(slope),3,'X')
        count=int((W/2+.26)/.18)
        for row in range(count+1):
            ay=.06+row*.18
            for col in range(int((L+.5)/.277)+1):
                x=-L/2-.21+col*.277+(row%2)*.136
                if x>L/2+.3:continue
                worn_tile((x,side*ay,R-ay*slope+.10+random.uniform(-.008,.008)),random.choice(slate),rot)
        for x in [-L/2-.25,L/2+.25]:rod('Barge boards',(x,0,R+.05),(x,side*(W/2+.28),E-.14),.053,wood[1],sides=5)
        rod('Gutters',(-L/2-.23,side*(W/2+.26),E-.14),(L/2+.23,side*(W/2+.26),E-.14),.041,iron,sides=8)
    for i in range(int(L/.28)+2):box('Ridge',(-L/2+i*.28,0,R+.15),(.275,.16,.065),slate[1],Matrix.Rotation(.65,3,'X'))
    cx=-L/2+.55
    for row in range(18):
        z=R-.40+row*.087
        for sy in [-1,1]:
            for k in [-1,1]:box('Chimney',(cx+k*.135,sy*.23,z),(.263,.14,.076),random.choice(sootbrick if row>10 else brick))
        for sx in [-1,1]:box('Chimney',(cx+sx*.23,0,z),(.14,.33,.076),random.choice(sootbrick if row>10 else brick))
    box('Chimney cap',(cx,0,R+1.17),(.70,.65,.10),sootbrick[0])
    for xx in [cx-.15,cx+.15]:
        verts=[]
        for radius,z in [(.12,R+1.22),(.115,R+1.69),(.079,R+1.69),(.075,R+1.24)]:
            for i in range(16):
                a=i*math.tau/16;verts.append((xx+radius*math.cos(a),radius*math.sin(a),z))
        faces=[]
        for ring_index in range(3):
            for i in range(16):
                j=(i+1)%16;faces.append((ring_index*16+i,ring_index*16+j,(ring_index+1)*16+j,(ring_index+1)*16+i))
        mesh('Open chimney pots',verts,faces,brick[2])
        rod('Recessed flue darkness',(xx,0,R+1.235),(xx,0,R+1.24),.078,dark,sides=16)
    # Small patched lean-to at the rear; stove fuel and a rain barrel.
    box('Outhouse',(L/2-.8,W/2+.76,.87),(1.55,1.5,1.74),dark)
    for i in range(10):box('Shutters',(L/2-1.51+i*.15,W/2+1.52,.86),(.144,.07,1.70),wood[i%4])
    box('Lean roof',(L/2-.8,W/2+.80,1.86),(1.82,1.85,.08),slate[0],Matrix.Rotation(-.16,3,'X'))
    for i in range(18):
        a=i*math.tau/18
        box('Barrel',(-L/2-.65+.32*math.cos(a),.8+.32*math.sin(a),.47),(.107,.055,.91),wood[i%4],Matrix.Rotation(a+math.pi/2,3,'Z'))
    for z in [.16,.70]:ring('Barrel hoops',(-L/2-.65,.8,z),.35,.35,.02,iron)
    rod('Barrel water',(-L/2-.65,.8,.72),(-L/2-.65,.8,.73),.29,water,sides=18)
    for i in range(16):
        rock('Coal',(-L/2-.55+random.uniform(-.3,.3),-.55+random.uniform(-.45,.45),.13),(.10,.14,.10),coal)
    # Earth-dark moss at the damp foot of the wall.
    for i in range(36):
        x=random.uniform(-L/2,L/2)
        if abs(x)<.65:continue
        rock('Wall moss',(x,-W/2-.17,.12),(.10,.03,random.uniform(.08,.2)),moss)
    root=bpy.data.objects.new('cottage_'+str(style),None);bpy.context.collection.objects.link(root)
    root['width']=L;root['depth']=W;root['ridge']=R;root['chimney_x']=cx
    for (name,mname),(verts,faces,material) in batches.items():
        data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.materials.append(material);data.update()
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root
        uv=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            custom=face_uvs[(name,mname)][poly.index]
            axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
            for j,li in enumerate(poly.loop_indices):
                co=data.vertices[data.loops[li].vertex_index].co
                uv.data[li].uv=custom[j] if custom else (co[axes[0]]*2,co[axes[1]]*2)
        obj.modifiers.new('Portable triangles','TRIANGULATE')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'cottages.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'cottages.glb'),export_format='GLB',export_apply=True,export_tangents=True,export_extras=True)
(OUT/'asset-manifest.json').write_text(json.dumps({'asset':'cottages','seed':1865,'source':'scripts/village/build_cottages.py','provenance':'Original scripted meshes and surface pixels. Building forms are artistic interpretations of modest Black Country homes.','types':3},indent=2))
