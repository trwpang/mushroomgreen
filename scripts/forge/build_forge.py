"""Mushroom Green chain shop. Run with Blender --background --python this_file.

Original, deterministic geometry. Metres; Z up in Blender, Y up in exported glTF.
The surviving shop's photographs guide the shell; the working yard is interpretive.
"""
import bpy
import math
import random
import json
import hashlib
from pathlib import Path
from mathutils import Vector, Matrix
import numpy as np
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from weathering import apply_atlas

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/forge'
SOURCE = ROOT / 'assets/forge'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
random.seed(1865)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def linear(v):
    v = v / 255
    return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4

def mat(name, rgb, rough=.85, metal=0, emission=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    col = tuple(linear(v) for v in rgb)
    p.inputs['Base Color'].default_value = (*col, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emission:
        p.inputs['Emission Color'].default_value = (*col, 1)
        p.inputs['Emission Strength'].default_value = emission
    return m

brick = [mat('Hand-fired brick %02d' % i, c) for i,c in enumerate([
    (122,75,54),(137,84,60),(110,69,53),(146,99,71),(103,75,61),
    (127,88,65),(155,106,77),(91,79,70),(115,89,72),(137,96,73)])]
sootbrick = [mat('Soot-dark brick %02d'%i,c) for i,c in enumerate([(63,57,48),(75,62,49),(84,66,51),(68,63,55)])]
slate = [mat('Weathered slate %02d' % i,c) for i,c in enumerate([
    (60,66,67),(66,72,72),(72,76,72),(59,64,67),(69,73,74),(77,78,72)])]
wood = [mat('Old oak %02d'%i,c) for i,c in enumerate([(62,50,36),(76,61,44),(90,75,54),(69,59,46)])]
green = [mat('Leaf %02d'%i,c) for i,c in enumerate([(75,87,43),(94,104,52),(109,118,65),(60,75,38),(127,130,72)])]
grass = [mat('Meadow blade %02d'%i,c) for i,c in enumerate([(86,98,51),(108,117,65),(124,125,73),(71,88,47),(145,136,86)])]
stone = [mat('Sandstone %02d'%i,c) for i,c in enumerate([(114,112,97),(131,127,109),(102,104,92),(143,135,111)])]
mortar = mat('Warm lime mortar',(106,97,80))
iron = mat('Blackened iron',(42,43,38),.52,.65)
iron_edge = mat('Worn iron edges',(91,93,87),.38,.8)
coal = mat('Coal',(27,29,27),.8)
ember = mat('Live embers',(255,94,15),.65,0,5)
hot = mat('Hot iron',(255,166,38),.55,0,3)
earth = mat('Yard earth',(96,85,62))
soilside = mat('Earth cut',(66,60,45))
groundgreen = mat('Grass ground',(88,99,58))
dark = mat('Interior soot',(39,35,29))
water = mat('Quench water',(42,57,51),.19,.35)

# Exportable material grain. A shared image replaces Blender-only procedural nodes.
rng = np.random.default_rng(1865)
n = 256
noise = rng.uniform(.67,1,(n,n))
for k in (4,16,64):
    small = rng.uniform(.7,1,(k,k))
    noise *= np.repeat(np.repeat(small,n//k,axis=0),n//k,axis=1) ** .14
rgba = np.ones((n,n,4), dtype=np.float32)
rgba[:,:,:3] = noise[:,:,None]
grain = bpy.data.images.new('Mineral grain',width=n,height=n)
grain.pixels.foreach_set(rgba.ravel())
grain.pack()
for m in brick+sootbrick+slate+stone+[mortar,earth,soilside,groundgreen]:
    nodes=m.node_tree.nodes; links=m.node_tree.links
    base=nodes.get('Principled BSDF').inputs['Base Color'].default_value
    def srgb(v):return 12.92*v if v<.0031308 else 1.055*v**(1/2.4)-.055
    pixels=np.ones((n,n,4),dtype=np.float32)
    tint=np.array([srgb(v) for v in base[:3]])
    pixels[:,:,:3]=np.clip(tint[None,None,:]*(noise[:,:,None]*1.22),0,1)
    im=bpy.data.images.new(m.name+' surface',width=n,height=n)
    im.pixels.foreach_set(pixels.ravel());im.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=im
    links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
# Use a real normal map so close views retain pitting in glTF.
normal_rgba=np.ones((n,n,4),dtype=np.float32)
normal_rgba[:,:,0]=.5+rng.uniform(-.12,.12,(n,n))
normal_rgba[:,:,1]=.5+rng.uniform(-.12,.12,(n,n))
normal_rgba[:,:,2]=.98
normal=bpy.data.images.new('Fine surface pits',width=n,height=n)
normal.colorspace_settings.name='Non-Color'
normal.pixels.foreach_set(normal_rgba.ravel());normal.pack()
for m in brick+sootbrick+slate+stone+[mortar,earth]:
    nodes=m.node_tree.nodes; links=m.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.image=normal
    node=nodes.new('ShaderNodeNormalMap');node.inputs['Strength'].default_value=.32
    links.new(tex.outputs['Color'],node.inputs['Color'])
    links.new(node.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])

# Sixteen independently aged surfaces for each building material.
apply_atlas(wood,'oak')
apply_atlas(slate,'slate')
apply_atlas(brick,'brick')

# Batch geometry by material and semantic part: modest draw-call count in Three.js.
batches={}
face_uvs={}
def mesh(name, verts, faces, material, uvs=None):
    key=(name,material.name)
    if key not in batches: batches[key]=[[],[],material]
    vs,fs,_=batches[key]; off=len(vs)
    vs.extend(verts);fs.extend(tuple(i+off for i in face) for face in faces)
    face_uvs.setdefault(key,[]).extend(uvs if uvs else [None]*len(faces))

def piece_uv(vs,faces,material):
    if material not in wood+slate+brick:return None
    tile=random.randrange(16);r,c=divmod(tile,4)
    out=[]
    for face in faces:
        spans=[max(vs[i][a] for i in face)-min(vs[i][a] for i in face) for a in range(3)]
        axes=sorted(sorted(range(3),key=lambda a:spans[a],reverse=True)[:2])
        lo=[min(vs[i][a] for i in face) for a in axes]
        out.append([((c+.035+.93*(vs[i][axes[0]]-lo[0])/max(spans[axes[0]],.0001))/4,
                     (r+.035+.93*(vs[i][axes[1]]-lo[1])/max(spans[axes[1]],.0001))/4) for i in face])
    return out

def box(name, pos, size, material, rot=None):
    x,y,z=[s/2 for s in size]
    vs=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    if name in ['Shutters','Door','Quench tub']:
        # Each board has its own worn ends and slight twist.
        dx=random.uniform(-.009,.009);dz=random.uniform(-.025,.012)
        vs=[(a+(dx if k>3 else 0),b+random.uniform(-.003,.003),c+(dz if k>3 else random.uniform(-.009,.009))) for k,(a,b,c) in enumerate(vs)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    uvs=piece_uv(vs,faces,material)
    if rot is not None: vs=[rot@Vector(v) for v in vs]
    mesh(name,[tuple(Vector(pos)+Vector(v)) for v in vs],faces,material,uvs)

def worn_tile(pos,material,rot):
    # Chipped corners and a subtly bowed, individually tilted slate.
    w=random.uniform(.130,.140);h=.16
    outline=[(-w,-h+random.uniform(0,.022)),(-w+random.uniform(.004,.023),-h),(w-random.uniform(.003,.018),-h),(w,-h+.018),(w,h),(-w,h)]
    vs=[(x,y,z+random.uniform(-.002,.002)) for z in [-.018,.018] for x,y in outline]
    faces=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]
    uvs=piece_uv(vs,faces,material)
    tilt=rot@Matrix.Rotation(random.uniform(-.022,.022),3,'Y')
    mesh('Roof tiles',[tuple(Vector(pos)+tilt@Vector(v)) for v in vs],faces,material,uvs)

def rod(name, a,b,r,material,r2=None,sides=8):
    a,b=Vector(a),Vector(b);d=(b-a).normalized()
    t=d.cross(Vector((0,0,1)))
    if t.length<.01:t=d.cross(Vector((0,1,0)))
    t.normalize();u=d.cross(t);r2=r if r2 is None else r2
    vs=[tuple(p+rr*(math.cos(i*math.tau/sides)*t+math.sin(i*math.tau/sides)*u)) for p,rr in [(a,r),(b,r2)] for i in range(sides)]
    fs=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]
    fs += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    mesh(name,vs,fs,material)

def ring(name,center,rx,ry,tube,material,rot=None):
    vs=[];N=20;M=6
    for i in range(N):
        a=i*math.tau/N
        for j in range(M):
            b=j*math.tau/M
            p=Vector(((rx+tube*math.cos(b))*math.cos(a),(ry+tube*math.cos(b))*math.sin(a),tube*math.sin(b)))
            vs.append(tuple(Vector(center)+(rot@p if rot else p)))
    mesh(name,vs,[(i*M+j,((i+1)%N)*M+j,((i+1)%N)*M+(j+1)%M,i*M+(j+1)%M) for i in range(N) for j in range(M)],material)

def rock(name,p,s,material):
    # Irregular, rounded low-poly rubble.
    vs=[];N=7
    for z,r in [(-.4,.65),(.0,1),(.45,.58)]:
        for i in range(N):
            a=i*math.tau/N
            vs.append((p[0]+math.cos(a)*s[0]*r*random.uniform(.85,1.15),p[1]+math.sin(a)*s[1]*r*random.uniform(.85,1.15),p[2]+z*s[2]))
    fs=[tuple(range(N-1,-1,-1)),tuple(range(2*N,3*N))]
    fs += [(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(2) for i in range(N)]
    mesh(name,vs,fs,material)

# Building: long, low shop, three flues on the near roof slope.
L=9.;W=4.2;EAVE=2.55;RIDGE=4.15
OPENINGS=[(-3.25,.95,1.55),(-1.05,1.12,1.55),(1.25,1.12,1.55),(3.38,.90,1.55)]
def front_hole(x,z):
    return any(abs(x-c)<w/2+.03 and .80<z<2.18 for c,w,h in OPENINGS)
def end_hole(y,z,side):
    if side>0:return abs(y)<.69 and z<2.13
    return (abs(y-.95)<.45 or abs(y+.95)<.45) and .8<z<2.15

# Wall cores split around openings, then individual weathered bricks.
for side in [-1,1]:
    for row in range(31):
        z=.055+row*.082
        x=-4.5-.15*(row%2)
        while x<4.5:
            a=max(x,-4.5);b=min(x+.295,4.5)
            if b>a and (side>0 or not front_hole((a+b)/2,z)):
                box('Masonry',((a+b)/2,side*2.1,z),(b-a,.23,.079),mortar)
                weathered = (z<.38 and random.random()<.55) or (z>2.2 and random.random()<.3)
                box('Brickwork',((a+b)/2,side*2.225+random.uniform(-.008,.008),z),(b-a-.012,.045,.068),random.choice(sootbrick if weathered else brick))
            x+=.30
for side in [-1,1]:
    for row in range(50):
        z=.055+row*.082
        half=2.1 if z<EAVE else max(0,2.1*(RIDGE-z)/(RIDGE-EAVE))
        y=-2.1-.15*(row%2)
        while y<2.1:
            a=max(y,-half);b=min(y+.295,half)
            if b>a+.018 and not end_hole((a+b)/2,z,side):
                box('Masonry',(side*4.5,(a+b)/2,z),(.23,b-a,.079),mortar)
                box('Brickwork',(side*4.625+random.uniform(-.006,.006),(a+b)/2,z),(.045,b-a-.012,.068),random.choice(brick))
            y+=.30
box('Interior',(0,0,.04),(9,4.2,.10),dark)
# Visit photographs show an uneven brick floor and smoke-marked pale inner walls.
for row in range(17):
    for col in range(30):
        x=-4.35+col*.295+(row%2)*.14;y=-1.98+row*.235
        if x<4.4:box('Interior floor bricks',(x,y,.102+random.uniform(-.006,.006)),(.282,.221,.045),random.choice(sootbrick if random.random()<.25 else brick))
inner_lime=mat('Smoke stained interior lime',(123,119,103))
for i in range(28):
    box('Interior lime',( -4.28+i*.315,1.975,1.21),(.30,.018,2.30),inner_lime)
for side in [-1,1]:
    for y in [-1.64,-1.31,1.31,1.64]:box('Interior lime',(side*4.365,y,1.20),(.018,.30,2.28),inner_lime)

def shutter(cx,cy,width,height,angle=0,side=0):
    rot=Matrix.Rotation(angle,3,'Z')
    origin=Vector((cx,cy,.86))
    for i in range(max(3,int(width/.14))):
        count=max(3,int(width/.14));w=width/count
        p=origin+rot@Vector((i*w+w/2,0,height/2))
        box('Shutters',p,(w-.009,.058,height),random.choice(wood),rot)
        # Long raised fibres, split ends, and iron nail heads.
        for j in range(3):
            q=origin+rot@Vector((i*w+random.uniform(.02,w-.02),-.034,random.uniform(.1,height-.1)))
            box('Wood grain',q,(.006,.004,random.uniform(.13,.5)),wood[0],rot)
    for z in [.20,height-.20]:
        p=origin+rot@Vector((width/2,-.046,z))
        box('Shutter braces',p,(width+.02,.065,.10),wood[1],rot)
        p=origin+rot@Vector((width/2,-.087,z))
        box('Ironmongery',p,(width*.80,.016,.025),iron,rot)
        for x in [.09,width-.09]:
            p=origin+rot@Vector((x,-.10,z))
            rock('Ironmongery',p,(.014,.008,.014),iron_edge)

for i,(c,w,h) in enumerate(OPENINGS):
    for x in [c-w/2-.035,c+w/2+.035]:box('Window frames',(x,-2.23,1.5),(.085,.17,1.49),wood[0])
    box('Window frames',(c,-2.23,2.22),(w+.22,.22,.14),wood[1])
    box('Window sills',(c,-2.28,.80),(w+.24,.38,.13),stone[0])
    if i in [1,3]:
        shutter(c-w/2,-2.29,w,1.33,-1.28)
        for x in [c-w*.27,c,c+w*.27]:rod('Window bars',(x,-2.24,.85),(x,-2.24,2.15),.012,iron)
    else:shutter(c-w/2,-2.29,w,1.33)
for y in [-.95,.95]:
    # Closed shutters on the left gable.
    shutter(-4.69,y+.43,.86,1.3,math.pi/2)
    box('Window frames',(-4.67,y,2.22),(.19,1.04,.14),wood[0])
    box('Window sills',(-4.7,y,.80),(.3,1.07,.13),stone[0])
# Right gable doorway; a swung-open oak door exposes the working hearth.
for y in [-.76,.76]:box('Door frame',(4.59,y,1.06),(.25,.15,2.15),wood[0])
box('Door frame',(4.59,0,2.16),(.28,1.7,.20),wood[1])
box('Threshold',(4.65,0,.06),(.72,1.8,.15),stone[1])
for i in range(9):box('Door',(5.20,.85+i*.13,1.04),(.075,.12,2),wood[i%4])
for z in [.35,1.55]:box('Door',(5.15,1.35,z),(.11,1.15,.12),wood[1])

# Roof structure and overlapping individual slates.
slope=(RIDGE-EAVE)/2.1
angle=math.atan(slope)
for side in [-1,1]:
    rot=Matrix.Rotation(-side*angle,3,'X')
    box('Roof structure',(0,side*1.15,RIDGE-1.15*slope),(9.55,2.95,.12),wood[0],rot)
    for row in range(15):
        ay=.10+row*.174
        z=RIDGE-ay*slope+.08
        for col in range(35):
            x=-4.78+col*.277+(row%2)*.135
            if x>4.79:continue
            y=side*ay
            worn_tile((x,y,z+random.uniform(-.012,.012)),random.choice(slate),rot)
    for x in [-4.82,4.82]:
        rod('Roof trim',(x,0,RIDGE+.07),(x,side*2.70,2.15),.055,wood[0],sides=5)
    rod('Gutters',(-4.8,side*2.69,2.18),(4.8,side*2.69,2.18),.055,iron,sides=10)
moss=[mat('Roof moss %d'%i,c) for i,c in enumerate([(70,76,39),(89,94,49),(103,105,59)])]
for i in range(240):
    x=random.uniform(-4.6,4.6);y=random.choice([-1,1])*random.uniform(2.25,2.66)
    if math.sin(x*2.1)+random.random()<.45:continue
    z=RIDGE-abs(y)*slope+.13
    rock('Roof moss',(x,y,z),(random.uniform(.025,.075),random.uniform(.03,.10),.025),random.choice(moss))
for i in range(33):
    box('Ridge tiles',(-4.68+i*.293,0,4.22),(.284,.17,.1),slate[2],Matrix.Rotation(math.pi/4,3,'X'))
for x in [-3.,0.,3.]:
    # Continuous recessed mortar walls close the brick joints, leaving an open flue.
    for side in [-1,1]:
        box('Chimney mortar',(x,-1.3+side*.24,3.955),(.60,.12,2.12),mortar)
        box('Chimney mortar',(x+side*.24,-1.3,3.955),(.12,.36,2.12),mortar)
    for row in range(25):
        z=2.94+row*.083
        for s in [-1,1]:
            for k in range(2):
                box('Chimneys',(x+(k-.5)*.27,-1.3+s*.255,z),(.261,.12,.071),random.choice(sootbrick if row>16 or random.random()<.24 else brick))
            box('Chimneys',(x+s*.255,-1.3,z),(.12,.39,.071),random.choice(sootbrick if row>16 else brick))
    for y in [-1.60,-1.]:box('Chimney caps',(x,y,5.06),(.69,.14,.10),sootbrick[0])
    for xx in [x-.275,x+.275]:box('Chimney caps',(xx,-1.3,5.06),(.14,.48,.10),sootbrick[0])
    box('Flue darkness',(x,-1.3,4.65),(.43,.43,.02),coal)
    for sy in [-1,1]:box('Lead flashing',(x,-1.3+sy*.35,3.23-sy*.25),(.82,.10,.19),slate[0])

# Exposed rafters, tie beams, hearth and chimney hood inside.
for x in [-3.6,-1.8,0,1.8,3.6]:
    rod('Roof structure',(x,-2.16,2.5),(x,0,4.07),.075,wood[0],sides=4)
    rod('Roof structure',(x,0,4.07),(x,2.16,2.5),.075,wood[0],sides=4)
    box('Roof structure',(x,0,2.5),(.15,4.3,.17),wood[0])
for x in [-3,0,3]:
    box('Hearth',(x,-1.60,.47),(1.15,.85,.85),brick[2])
    box('Hearth',(x,-1.60,.92),(1.35,1.04,.14),dark)
    for i in range(25):
        rock('Cinders',(x+random.uniform(-.41,.41),-1.58+random.uniform(-.27,.27),1.02),(random.uniform(.05,.12),.08,.09),ember if i%3 else coal)
    # Tapered sheet-iron smoke hood.
    mesh('Hood',[(x+xx,-1.62+yy,z) for z,s in [(1.5,.72),(2.4,.24)] for xx,yy in [(-s,-s*.6),(s,-s*.6),(s,s*.6),(-s,s*.6)]],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],iron)
    box('Hood',(x,-1.62,2.7),(.45,.30,.7),iron)

def anvil(x,y):
    rod('Anvil stump',(x,y,.03),(x,y,.57),.34,wood[0],.29,12)
    ring('Anvil band',(x,y,.43),.30,.30,.018,iron)
    box('Anvil',(x,y,.62),(.48,.30,.12),iron)
    box('Anvil',(x,y,.80),(.25,.21,.29),iron)
    box('Anvil face',(x,y,.99),(.67,.29,.13),iron_edge)
    rod('Anvil horn',(x+.32,y,.97),(x+.67,y,1.00),.115,iron_edge,.009,10)
    box('Hammer',(x-.12,y,.1+1.04),(.22,.12,.10),iron)
    rod('Hammer',(x-.1,y,1.15),(x-.22,y+.49,1.09),.025,wood[2])
# Three hearth-side stations, leaving the gable door and centre aisle clear.
for station_x in [-3.,0.,3.]:anvil(station_x,-.72)
for i in range(14):
    ring('Finished chain',(5.48+.12*math.sin(i*.9),-1.3-i*.105,.14+i*.004),.083,.055,.014,iron,Matrix.Rotation(math.pi/2*(i%2),3,'Y'))
for i in range(7):
    rod('Stock iron',(4.86+i*.07,1.63,.1),(4.57+i*.075,1.56,1.58),.016,iron)
# Quench tub with staves, iron hoops and visible water.
cx,cy=5.66,.97
for i in range(18):
    a=i*math.tau/18
    box('Quench tub',(cx+.38*math.cos(a),cy+.38*math.sin(a),.38),(.115,.064,.71),wood[i%4],Matrix.Rotation(a+math.pi/2,3,'Z'))
for z in [.12,.59]:ring('Tub hoops',(cx,cy,z),.405,.405,.025,iron)
rod('Quench water',(cx,cy,.53),(cx,cy,.54),.36,water,sides=32)
# Coal heap, barrow, spare timber and small workshop objects.
for i in range(110):
    x=random.uniform(2.8,4.1);y=random.uniform(-3.6,-2.8)
    z=.06+.32*max(0,1-((x-3.45)/.8)**2-((y+3.2)/.6)**2)
    rock('Coal heap',(x,y,z),(.09,.075,.09),coal)
for i in range(5):box('Timber stock',(-4.1,-3.2+i*.17,.10+i%2*.05),(1.7,.13,.13),wood[i%4])
for x in [-2.1,-1.3]:
    for y in [-3.4,-2.98]:box('Bench',(x,y,.36),(.085,.085,.65),wood[0])
box('Bench',(-1.7,-3.2,.71),(1.15,.60,.11),wood[2])
rod('Tongs',(-1.9,-3.3,.80),(-1.35,-3.11,.80),.015,iron)
rod('Tongs',(-1.9,-3.07,.80),(-1.35,-3.30,.80),.015,iron)

# Irregular ground island. The yard is an interpretation, not survey geometry.
def terrain_z(x,y):return -.08+.045*math.sin(x*1.7)*math.sin(y*1.9)
N=80;rings=20
vs=[(0,0,-.08)]
for r in range(1,rings+1):
    for i in range(N):
        a=i*math.tau/N
        edge=1+.035*math.sin(a*7)+.023*math.sin(a*13)
        x=9.5*r/rings*math.cos(a)*edge;y=7.2*r/rings*math.sin(a)*edge
        vs.append((x,y,terrain_z(x,y)-.11*(r/rings)**8))
fs=[(0,1+i,1+(i+1)%N) for i in range(N)]
for r in range(rings-1):
    for i in range(N):fs.append((1+r*N+i,1+(r+1)*N+i,1+(r+1)*N+(i+1)%N,1+r*N+(i+1)%N))
mesh('Ground',vs,fs,earth)
edge=vs[-N:]
mesh('Earth edge',edge+[(x,y,-.53) for x,y,z in edge],[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],soilside)

def yard(x,y):
    # Swept strip along the working wall and a path to the door.
    return (-4.85<x<5.3 and -3.65<y<2.55) or (x>4.3 and abs(y+.5)<1.3) or abs(y+4.35+.17*x)<.64

# Continuous painted terrain texture with mottled turf and worn dirt tracks.
Ntex=1024
yy,xx=np.mgrid[0:Ntex,0:Ntex]/Ntex*20-10
patch=np.zeros((Ntex,Ntex))
for k,amount in [(8,.22),(32,.18),(128,.09),(1024,.10)]:
    patch+=np.repeat(np.repeat(rng.random((k,k)),Ntex//k,0),Ntex//k,1)*amount
distpath=np.abs(yy+4.35+.17*xx)
track=np.clip((.84+patch*.3-distpath)*4,0,1)
workstrip=(xx>-4.9)&(xx<5.4)&(yy>-3.55)&(yy<2.55)
doorpath=(xx>4.4)&(np.abs(yy+.5)<1.23)
worn=np.maximum(track,(workstrip|doorpath).astype(float))
worn=np.clip(worn+np.sin(xx*4)*np.sin(yy*4)*.07,0,1)
turf=np.array([.28,.32,.17])[None,None,:]*(.70+patch[:,:,None]*1.0)
dirt=np.array([.35,.29,.20])[None,None,:]*(.78+patch[:,:,None]*.62)
rgba=np.ones((Ntex,Ntex,4),dtype=np.float32)
rgba[:,:,:3]=turf*(1-worn[:,:,None])+dirt*worn[:,:,None]
im=bpy.data.images.new('Mottled turf and worn paths',width=Ntex,height=Ntex);im.pixels.foreach_set(rgba.ravel());im.pack()
terrainmat=mat('Turf and trodden earth',(255,255,255))
tex=terrainmat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
terrainmat.node_tree.links.new(tex.outputs['Color'],terrainmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
# Replace the ground batch material without touching the small earth props.
groundkey=('Ground',earth.name)
data=batches.pop(groundkey);data[2]=terrainmat;batches[('Ground',terrainmat.name)]=data
for i in range(1900):
    x=random.uniform(-9.3,9.3);y=random.uniform(-6.9,6.9)
    if (x/9.2)**2+(y/6.8)**2>1 or (abs(x)<4.7 and abs(y)<2.4):continue
    if random.random()<(.5 if yard(x,y) else .04):
        s=random.uniform(.025,.085)
        rock('Yard grit',(x,y,terrain_z(x,y)+.018),(s,s*.7,s*.7),random.choice(stone))

def leaf(p,size,material,name='Foliage',angle=None):
    a=random.uniform(0,math.tau) if angle is None else angle
    # Folded leaf with a raised vein; reads as foliage without alpha sorting.
    rot=Matrix.Rotation(a,3,'Z')@Matrix.Rotation(random.uniform(-.9,.9),3,'Y')
    vs=[(-size,0,0),(0,-size*.47,0),(size,0,0),(0,size*.47,0),(0,0,size*.16)]
    mesh(name,[tuple(Vector(p)+rot@Vector(v)) for v in vs],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],material)

# Thousands of fine curved grass blades, irregular height and seed heads.
for i in range(22000):
    x=random.uniform(-9.1,9.1);y=random.uniform(-6.8,6.8)
    if (x/9.1)**2+(y/6.8)**2>1:continue
    if yard(x,y) and random.random()>.028:continue
    if abs(x)<4.8 and abs(y)<2.55:continue
    h=random.uniform(.07,.26);a=random.uniform(0,math.tau);w=random.uniform(.009,.022)
    z=terrain_z(x,y);d=Vector((math.cos(a),math.sin(a),0));t=Vector((-d.y,d.x,0));p=Vector((x,y,z))
    verts=[p-t*w,p+t*w,p+d*h*.19+Vector((0,0,h*.62))+t*w*.5,p+d*h*.19+Vector((0,0,h*.62))-t*w*.5,p+d*h*.52+Vector((0,0,h))]
    mesh('Meadow',list(map(tuple,verts)),[(0,1,2,3),(3,2,4)],random.choice(grass))
    if i%43==0:
        rod('Seed stems',(x,y,z),(x+.05,y,z+h*1.8),.004,grass[4],sides=4)
        for j in range(3):leaf((x+.05,y,z+h*1.8-j*.04),.034,grass[4],'Seed heads')

# Low brambles around the edge and at the masonry feet.
for cx,cy,sz in [(-6.5,1.7,1.15),(-5.8,-1.8,.8),(1.8,3.8,1.0),(6,3.5,1.1),(-3.8,4.1,.7),(7,-3.8,.6)]:
    for i in range(360):
        a=random.uniform(0,math.tau);r=sz*math.sqrt(random.random())
        x=cx+r*math.cos(a);y=cy+r*math.sin(a);z=.1+sz*.8*math.sqrt(max(0,1-(r/sz)**2))*random.uniform(.5,1)
        leaf((x,y,z),random.uniform(.065,.12),random.choice(green))
    for i in range(12):rod('Twigs',(cx,cy,0),(cx+random.uniform(-sz,sz),cy+random.uniform(-sz,sz),sz*.7),.012,wood[1],.004,5)

# Ash tree: branched trunk, fine twigs and separated leaf sprays.
tx,ty=-6.15,2.1
rod('Tree',(tx,ty,-.08),(tx+.18,ty,3.7),.23,wood[1],.095,11)
for i in range(14):
    a=i*2.4;z=random.uniform(2.6,4.5);r=random.uniform(1.15,2.05)
    end=Vector((tx+math.cos(a)*r,ty+math.sin(a)*r,z+1.3))
    start=Vector((tx+.12,ty,z*.64))
    mid=start.lerp(end,.56)+Vector((0,0,.16))
    rod('Branches',start,mid,.075,wood[1],.033,7);rod('Branches',mid,end,.033,wood[1],.009,6)
    for j in range(12):
        tip=end+Vector((random.uniform(-.7,.7),random.uniform(-.7,.7),random.uniform(-.25,.6)))
        rod('Twigs',mid.lerp(end,.65),tip,.013,wood[2],.003,5)
        for k in range(50):
            p=tip+Vector((random.uniform(-.53,.53),random.uniform(-.53,.53),random.uniform(-.24,.27)))
            leaf(p,random.uniform(.07,.14),random.choice(green))

# Nettles and wall plants: small enough to keep the historical brickwork readable.
for i in range(110):
    x=random.uniform(-4.3,4.3);y=-2.37-random.uniform(.02,.22);h=random.uniform(.12,.48)
    rod('Nettle stems',(x,y,0),(x,y,h),.006,green[0],sides=4)
    for j in range(4):leaf((x+random.uniform(-.10,.10),y+random.uniform(-.08,.08),h*.25+j*h*.2),.065,random.choice(green),'Nettles')

# Low rustic boundary fence, with broken, leaning pales.
for x in [-5,-2.7,-.4,1.9,4.2,6.5]:
    box('Fence posts',(x,4.85,.5),(.14,.15,1.13),wood[1],Matrix.Rotation(random.uniform(-.08,.08),3,'Y'))
for a,b in [(-5,-2.7),(-2.7,-.4),(-.4,1.9),(1.9,4.2),(4.2,6.5)]:
    for z in [.36,.84]:rod('Fence rails',(a,4.83,z),(b,4.83,z+random.uniform(-.08,.08)),.055,wood[2],sides=5)

print('Building batched meshes',flush=True)
for (name,material_name),(verts,faces,material) in batches.items():
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.materials.append(material);data.update()
    obj=bpy.data.objects.new(name+' | '+material_name,data);bpy.context.collection.objects.link(obj)
    uv=data.uv_layers.new(name='UVMap')
    # Face-local box UVs for fine surface pitting.
    for poly in data.polygons:
        custom=face_uvs.get((name,material_name),[None]*len(faces))[poly.index]
        if custom:
            for li,coord in zip(poly.loop_indices,custom):uv.data[li].uv=coord
            continue
        axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in poly.loop_indices:
            co=data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv=((co.x+10)/20,(co.y+10)/20) if name=='Ground' else (co[axes[0]]*3,co[axes[1]]*3)
    if name in ['Brickwork','Roof tiles','Chimneys','Anvil face','Window sills','Threshold']:
        mod=obj.modifiers.new('Soft worn edges','BEVEL');mod.width=.006 if name!='Roof tiles' else .003;mod.segments=1
        mod=obj.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    # N-gon stone caps need triangulation before the exporter can calculate tangents.
    obj.modifiers.new('Portable triangles','TRIANGULATE')

# Camera and lights remain in the editable source, not the runtime export.
scene=bpy.context.scene
scene.world.color=(.22,.22,.22)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.73,.77,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
def area(name,pos,power,color,size,target):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Late afternoon',(1,-7,12),2100,(1,.83,.64),7,(0,0,0))
area('Sky fill',(-5,4,10),1700,(.73,.84,1),9,(0,0,0))
for x in [-3,0,3]:
    d=bpy.data.lights.new('Hearth glow','POINT');d.energy=75;d.color=(1,.23,.025);d.shadow_soft_size=.35
    o=bpy.data.objects.new('Hearth glow',d);bpy.context.collection.objects.link(o);o.location=(x,-1.3,1.3)
d=bpy.data.cameras.new('Camera');o=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(o)
o.location=(14,-18,12);o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=21;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'mushroom-green-forge.blend'))
RAW=ROOT/'artifacts/forge/raw';RAW.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(RAW/'mushroom-green-forge.glb'),export_format='GLB',export_apply=True,export_tangents=True,export_cameras=False,export_lights=False,export_yup=True)
model=RAW/'mushroom-green-forge.glb'
receipt={'asset':'mushroom-green-forge','seed':1865,'units':'metres','source':'scripts/forge/build_forge.py','blender':bpy.app.version_string,'sha256':hashlib.sha256(model.read_bytes()).hexdigest(),'bytes':model.stat().st_size,'mesh_batches':len(batches),'source_vertices':sum(len(v[0]) for v in batches.values()),'reference_photos':['photos/IMG_7256.HEIC','photos/IMG_7257.HEIC','photos/IMG_7258.HEIC','photos/IMG_4259.HEIC'],'historical_status':'Interpretive study from present-day photographs; not a surveyed reconstruction of 1865.','provenance':'Original scripted geometry; no third-party meshes or textures.'}
(RAW/'asset-manifest.json').write_text(json.dumps(receipt,indent=2)+'\n')
if '--render' in __import__('sys').argv:
    scene.render.filepath=str(ROOT/'artifacts/forge/blender-preview.png')
    bpy.ops.render.render(write_still=True)
print(json.dumps(receipt),flush=True)
