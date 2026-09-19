"""Original chainmaker character study. Metres, authored Y-up then converted to Blender Z-up.
Reference: user-selected Alamy Victorian Cradley Heath group photograph, image 2RWSFPH.
No photograph pixels used. All geometry and material images generated locally.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
from mathutils import Vector
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
RAW=ROOT/'artifacts/chainmaker/raw';RAW.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(1865)
def conv(p):return (p[0],-p[2],p[1])
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
mats={}
def material(name,rgb,rough=.85,metal=0,kind=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*(linear(v/255) for v in rgb),1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if kind:
  n=512;rng=np.random.default_rng(sum(map(ord,name)));yy,xx=np.mgrid[0:n,0:n]/n
  grain=rng.normal(0,.019,(n,n));cloud=np.zeros((n,n))
  for k in (4,8,16,32):
   coarse=rng.uniform(-1,1,(k,k));xs=np.linspace(0,k-1,n);fine=np.array([np.interp(xs,np.arange(k),row) for row in coarse]);fine=np.array([np.interp(xs,np.arange(k),col) for col in fine.T]).T;cloud+=fine/k
  value=1+grain+cloud*.5
  if kind=='cloth':
   value+=.026*np.sin(xx*math.tau*180)+.023*np.sin(yy*math.tau*150)
   if name=='Unbleached linen':value-=.16*np.exp(-((xx-.61)/.26)**2-((yy-.18)/.24)**2)
  if kind=='leather':
   value+=.015*np.sin(xx*math.tau*32+np.sin(yy*19)*2);value-=.24*np.exp(-((yy-.32)/.24)**2)*np.exp(-((xx-.55)/.34)**2);value+=.08*np.exp(-((xx-.1)/.055)**2)+.08*np.exp(-((xx-.9)/.05)**2)
  if kind=='skin':value+=.035*np.sin(yy*37+xx*11);value-=.08*np.exp(-((yy-.15)/.16)**2)
  pix=np.ones((n,n,4),np.float32);pix[:,:,:3]=np.clip(np.array(rgb)[None,None,:]/255*value[:,:,None],0,1)
  im=bpy.data.images.new(name+' grain',width=n,height=n);im.pixels.foreach_set(pix.ravel());im.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
 if kind:
  normal=np.ones((n,n,4),np.float32);normal[:,:,:3]=(.5,.5,1)
  amount=.022 if kind=='skin' else .07
  normal[:,:,0]=.5+rng.normal(0,amount,(n,n));normal[:,:,1]=.5+rng.normal(0,amount,(n,n))
  if kind=='cloth':normal[:,:,0]+=.055*np.sin(xx*math.tau*180);normal[:,:,1]+=.045*np.sin(yy*math.tau*150)
  normal[:,:,:3]=np.clip(normal[:,:,:3],0,1)
  nm=bpy.data.images.new(name+' micro grain',width=n,height=n);nm.colorspace_settings.name='Non-Color';nm.pixels.foreach_set(normal.ravel());nm.pack()
  nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=nm;normalnode=m.node_tree.nodes.new('ShaderNodeNormalMap');normalnode.inputs['Strength'].default_value=.2 if kind=='skin' else .35;m.node_tree.links.new(nt.outputs['Color'],normalnode.inputs['Color']);m.node_tree.links.new(normalnode.outputs['Normal'],p.inputs['Normal'])
 mats[name]=m;return m
skin=material('Weathered skin',(145,110,89),.88,kind='skin');skinshadow=material('Creases',(103,70,52));lip=material('Muted lips',(120,81,65));shirt=material('Unbleached linen',(171,164,142),.96,kind='cloth');shirtshade=material('Linen seam',(112,108,91),kind='cloth');vest=material('Faded charcoal wool',(56,58,53),.96,kind='cloth');seam=material('Worn wool edges',(83,82,70));trousers=material('Brown wool trousers',(75,70,58),.98,kind='cloth');leather=material('Smoke worn apron',(79,56,39),.9,kind='leather');leatheredge=material('Apron edge',(105,77,48));boots=material('Oiled work boots',(43,38,31),.87,kind='leather');sole=material('Boot soles',(31,29,25));hair=material('Grey brown hair',(79,74,62));hairlight=material('Grey whiskers',(130,121,102));eye=material('Eyes',(42,35,28),.55);iron=material('Forged iron',(50,53,49),.48,.8);edge=material('Polished hammer face',(118,119,105),.35,.8);wood=material('Ash hammer shaft',(121,85,47),.7,kind='leather');button=material('Horn buttons',(44,38,29),.48)
batches={}
def mesh(part,mat,vs,fs,uv=None):
 key=(part,mat.name)
 if key not in batches:batches[key]=[[],[],[],mat]
 a,b,c,_=batches[key];off=len(a);a.extend(vs);b.extend(tuple(i+off for i in f) for f in fs);c.extend(uv or [[(vs[i][0]*2,vs[i][1]*2) for i in f] for f in fs])
def loft(part,mat,rings,n=32,fold=0):
 # y, centre x/z, half width/depth. Organic cross sections and coherent fabric folds.
 vs=[]
 for j,(y,x,z,rx,rz) in enumerate(rings):
  for i in range(n):
   t=i*math.tau/n;f=1+fold*(math.sin(7*t+j*.37)+.45*math.sin(11*t-j*.53))
   vs.append((x+rx*math.cos(t)*f,y,z+rz*math.sin(t)*f))
 fs=[];uv=[]
 for j in range(len(rings)-1):
  for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i));uv.append([(i/n,j/(len(rings)-1)),((i+1)/n,j/(len(rings)-1)),((i+1)/n,(j+1)/(len(rings)-1)),(i/n,(j+1)/(len(rings)-1))])
 fs.extend([tuple(range(n-1,-1,-1)),tuple((len(rings)-1)*n+i for i in range(n))]);uv.extend([[(.5,.5)]*n]*2);mesh(part,mat,vs,fs,uv)
def ell(part,mat,c,s,n=24,lat=12):
 if part=='Head' and c[2]>.14 and abs(c[0])<.074 and 1.546<c[1]<1.694:
  c=(c[0],c[1],face_depth(c[0],c[1])+(.004 if mat in [hair,hairlight] else .002))
 rings=[]
 for j in range(lat+1):
  a=-math.pi/2+math.pi*j/lat;r=max(.001,math.cos(a));rings.append((c[1]+math.sin(a)*s[1],c[0],c[2],s[0]*r,s[2]*r))
 loft(part,mat,rings,n)
def tube(part,mat,points,r=.004,n=7):
 if part=='Head':points=[(x,y,face_depth(x,y)+(.003 if mat in [hair,hairlight] else .0015)) if z>.14 and abs(x)<.074 and 1.546<y<1.694 else (x,y,z) for x,y,z in points]
 vs=[];N=len(points)
 for i,p in enumerate(points):
  v=Vector(p);d=Vector(points[min(i+1,N-1)])-Vector(points[max(0,i-1)]);d.normalize();a=d.cross(Vector((0,0,1)))
  if a.length<.01:a=d.cross(Vector((0,1,0)))
  a.normalize();b=d.cross(a)
  for j in range(n):vs.append(tuple(v+r*(a*math.cos(j*math.tau/n)+b*math.sin(j*math.tau/n))))
 mesh(part,mat,vs,[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(N-1) for j in range(n)])
def panel(part,mat,rows,thick=.004):
 # grid rows of positions, softly folded sheet, closed edge thickness.
 vs=[p for row in rows for p in row];w=len(rows[0]);h=len(rows);fs=[];uv=[]
 for j in range(h-1):
  for i in range(w-1):fs.append((j*w+i,j*w+i+1,(j+1)*w+i+1,(j+1)*w+i));uv.append([(i/(w-1),1-j/(h-1)),((i+1)/(w-1),1-j/(h-1)),((i+1)/(w-1),1-(j+1)/(h-1)),(i/(w-1),1-(j+1)/(h-1))])
 # Real leather/cloth edge depth. Front and back retain the same UV coordinates.
 front_count=len(vs);front_fs=list(fs);front_uv=list(uv)
 vs.extend([(x,y,z-thick) for x,y,z in vs])
 fs.extend([tuple(i+front_count for i in reversed(f)) for f in front_fs]);uv.extend([list(reversed(u)) for u in front_uv])
 border=list(range(w))+[j*w+w-1 for j in range(1,h)]+list(range((h-1)*w+w-2,(h-1)*w-1,-1))+[j*w for j in range(h-2,0,-1)]
 for i,a in enumerate(border):
  b=border[(i+1)%len(border)];fs.append((a,b,b+front_count,a+front_count));uv.append([(0,0),(1,0),(1,1),(0,1)])
 mesh(part,mat,vs,fs,uv)
def box(part,mat,c,s,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=conv(c));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft worn edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 vs=[(v.co.x+c[0],v.co.z+c[1],-v.co.y+c[2]) for v in o.data.vertices];fs=[tuple(p.vertices) for p in o.data.polygons];mesh(part,mat,vs,fs);bpy.data.objects.remove(o,do_unlink=True)
# Legs: planted boots, unequal stance, knee shaping and worn cloth gathers.
for side in [-1,1]:
 x=side*.16;z=.035 if side<0 else -.075
 loft('Body',trousers,[(.14,x,z,.071,.072),(.22,x,z,.078,.076),(.28,x,z+.013,.076,.082),(.39,x,z+.01,.075,.09),(.49,x,z+.06,.077,.09),(.57,x,z+.07,.085,.1),(.7,x*.91,z+.02,.095,.11),(.84,x*.76,-.015,.108,.122),(.94,x*.72,-.02,.11,.126)],fold=.042)
 sections=[(-.105,.09,.049,.045),(-.073,.098,.074,.070),(-.015,.090,.081,.061),(.07,.074,.087,.044),(.15,.065,.086,.032),(.215,.061,.060,.028),(.233,.061,.005,.008)]
 vs=[];n=32
 for zz,cy,rx,ry in sections:
  for i in range(n):
   a=i*math.tau/n;vs.append((x+rx*math.cos(a),cy+ry*math.sin(a),z+zz))
 mesh('Body',boots,vs,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(sections)-1) for i in range(n)])
 ell('Body',sole,(x,.025,z+.06),(.093,.018,.178),32,8)
 box('Body',sole,(x,.019,z-.07),(.135,.038,.095),.012)
 for offset in [0,.012]:tube('Body',leatheredge,[(x-.066,.104+offset,z+.065),(x-.035,.116+offset,z+.047),(x,.120+offset,z+.04),(x+.037,.116+offset,z+.047),(x+.067,.104+offset,z+.065)],.0015)
 tube('Body',seam,[(x+.079,.075,z-.065),(x+.075,.14,z-.047),(x+.054,.218,z-.015)],.0017)
 loft('Body',boots,[(.08,x,z,.082,.09),(.16,x,z,.076,.083),(.24,x,z-.009,.066,.071)])
 for k in range(5):tube('Body',seam,[(x-.035,.17-k*.012,z+.08+k*.014),(x+.035,.164-k*.012,z+.088+k*.014)],.0022)
 for dz in [-.13,.22]:tube('Body',leatheredge,[(x-.035,.053,z+dz),(x+.04,.053,z+dz)],.0015)
# Pelvis and torso. A thick working body, narrow neck, slightly forward upper back.
loft('Body',trousers,[(.80,0,-.035,.19,.128),(.92,0,-.015,.205,.134),(1.01,0,-.005,.184,.12)])
loft('Torso',shirt,[(.91,0,-.005,.18,.121),(.99,0,.006,.182,.126),(1.10,0,.022,.194,.133),(1.23,0,.045,.22,.142),(1.34,0,.07,.234,.131),(1.405,0,.078,.208,.119),(1.448,0,.085,.135,.092),(1.456,0,.087,.078,.077)],fold=.012)
# Open waistcoat fitted to the shirt surface with a measurable cloth allowance.
shirt_profile=[(.91,-.005,.18,.121),(.99,.006,.182,.126),(1.10,.022,.194,.133),(1.23,.045,.22,.142),(1.34,.07,.234,.131),(1.405,.078,.208,.119),(1.448,.085,.135,.092),(1.456,.087,.078,.077)]
def shirt_at(y):return tuple(float(np.interp(y,[p[0] for p in shirt_profile],[p[k] for p in shirt_profile])) for k in [1,2,3])
def shirt_front(x,y):
 z,rx,rz=shirt_at(y);return z+rz*math.sqrt(max(0,1-(x/rx)**2))
vest_rows=[]
for j in range(25):
 y=.958+j/24*.474;cz,rx,rz=shirt_at(y);rx+=.008;rz+=.012;row=[]
 for i in range(65):
  a=math.pi/2+.37+i/64*(math.tau-.74);x=rx*math.cos(a);z=cz+rz*math.sin(a)
  row.append((x,y+.005*math.cos(a*3)*(1-j/24),z))
 vest_rows.append(row)
panel('Torso',vest,vest_rows)
for side in [0,-1]:tube('Torso',seam,[row[side] for row in vest_rows],.002)
# Lapels are folded over the curved shirt, never through it.
for side in [-1,1]:
 rows=[]
 for y,inner,outer in [(1.432,.066,.096),(1.38,.065,.115),(1.30,.07,.103),(1.245,.077,.082)]:
  rows.append([(side*x,y,shirt_front(side*x,y)+.022) for x in [inner,outer]])
 panel('Torso',seam,rows)
 # Pocket welts and buttons sit on the wool surface.
 tube('Torso',seam,[(side*x,1.105,shirt_front(side*x,1.105)+.019) for x in [.105,.135,.168]],.0025)
for y in [1.24,1.16,1.08,1.0]:ell('Torso',button,(.074,y,shirt_front(.074,y)+.020),(.005,.005,.0025),12,6)
# Shoulder straps conform to the top of the actual shirt volume.
def shirt_top(x,z):
 for y in np.linspace(1.456,1.34,180):
  cz,rx,rz=shirt_at(y)
  if (x/rx)**2+((z-cz)/rz)**2<=1:return float(y)+.009
 return 1.348
for side in [-1,1]:
 rows=[]
 for z in np.linspace(.186,-.032,24):
  rows.append([(side*x,shirt_top(side*x,z),z) for x in np.linspace(.090,.165,8)])
 panel('Torso',vest,rows)
 for k in [0,-1]:tube('Torso',seam,[row[k] for row in rows],.0013)
# Shirt neck and simple band collar, visible placket.
loft('Torso',skin,[(1.40,0,.084,.064,.065),(1.46,0,.092,.058,.060),(1.49,0,.097,.050,.053),(1.51,0,.1,.023,.025)],32)
loft('Torso',shirt,[(1.429,0,.087,.069,.074),(1.458,0,.091,.07,.075)],32)
tube('Torso',shirtshade,[(.0,1.44,.164),(.0,1.30,.213),(.0,1.16,.184)],.003)
for y,z in [(1.395,.199),(1.34,.215),(1.28,.212)]:ell('Torso',button,(.01,y,z),(.0037,.0037,.002),10,6)
# Leather waist apron: heavy curved drape, broken hem and diagonal creases.
rows=[]
for j in range(25):
 t=j/24;y=.99-t*.65;half=.197+.05*math.sin(t*math.pi)+.012*t;row=[]
 for i in range(33):
  u=i/32*2-1;x=u*half;z=.165+.080*math.sin(t*math.pi*.75)-.040*u*u+.012*math.sin(u*11+t*5)*math.sin(t*math.pi/2)+.009*math.sin(u*22-t*3)*t
  z+=(-.010*math.exp(-((x+.045)/.025)**2)+.012*math.exp(-((x-.09)/.019)**2))*t
  row.append((x,y+.018*math.sin(u*8+.6)*t*t,z))
 rows.append(row)
panel('Body',leather,rows)
for side in [0,-1]:tube('Body',leatheredge,[row[side] for row in rows],.0023)
tube('Body',leatheredge,rows[-1],.0023)
loft('Body',leather,[(.96,0,.001,.197,.151),(.995,0,.001,.197,.151)])
box('Body',iron,(-.126,.979,.131),(.031,.026,.008),.004)
# Stitched repair on lower apron, off-centre and following drape.
panel('Body',leatheredge,[[(-.125,.51,.132),(-.057,.518,.16)],[(-.13,.446,.121),(-.062,.45,.151)]])
for j in range(6):tube('Body',shirtshade,[(-.123+j*.011,.512,.14+j*.003),(-.122+j*.011,.503,.14+j*.003)],.001)
# Creases and soot rubbed into the lower working apron, following the drape.
for i in range(22):
 x=random.uniform(-.17,.17);y=random.uniform(.43,.88);t=(.99-y)/.65;u=x/(.197+.05*math.sin(t*math.pi)+.012*t);z=.165+.080*math.sin(t*math.pi*.75)-.040*u*u+.012*math.sin(u*11+t*5)*math.sin(t*math.pi/2)+.009*math.sin(u*22-t*3)*t
 tube('Body',leatheredge,[(x,y,z+.0015),(x+.003,y-.009,z+.002)],.0008,4)
# Connected facial surface: jaw, cheek planes, eye sockets and nose are one mesh.
profile=[(1.485,.030,.103,.039),(1.51,.064,.102,.064),(1.55,.081,.098,.073),(1.59,.091,.09,.081),(1.625,.095,.086,.085),(1.666,.087,.08,.084),(1.702,.080,.078,.079),(1.735,.066,.078,.065),(1.754,.035,.078,.040)]
def face_depth(x,y):
 rx=float(np.interp(y,[p[0] for p in profile],[p[1] for p in profile]));cz=float(np.interp(y,[p[0] for p in profile],[p[2] for p in profile]));rz=float(np.interp(y,[p[0] for p in profile],[p[3] for p in profile]));front=math.sqrt(max(0,1-(x/rx)**2))
 nose=.038*math.exp(-(x/.018)**2)*math.exp(-((y-1.616)/.034)**4);tip=.014*math.exp(-(x/.025)**2-((y-1.597)/.011)**2);cheek=.010*math.exp(-((abs(x)-.05)/.021)**2-((y-1.603)/.019)**2);socket=-.008*math.exp(-((abs(x)-.041)/.019)**2-((y-1.641)/.011)**2)
 return cz+rz*front+front**8*(nose+tip+cheek+socket)
vs=[];N=64;H=50
for j in range(H):
 y=1.485+(1.754-1.485)*j/(H-1);rx=np.interp(y,[p[0] for p in profile],[p[1] for p in profile]);cz=np.interp(y,[p[0] for p in profile],[p[2] for p in profile]);rz=np.interp(y,[p[0] for p in profile],[p[3] for p in profile])
 for i in range(N):
  a=i*math.tau/N;x=rx*math.cos(a);z=cz+rz*math.sin(a)
  if math.sin(a)>0:
   front=math.sin(a)**8
   # integrated long bridge, round nose tip, cheek planes, recessed eye sockets
   nose=.038*math.exp(-(x/.018)**2)*math.exp(-((y-1.616)/.034)**4)
   tip=.014*math.exp(-(x/.025)**2-((y-1.597)/.011)**2)
   cheek=.010*math.exp(-((abs(x)-.05)/.021)**2-((y-1.603)/.019)**2)
   socket=-.008*math.exp(-((abs(x)-.041)/.019)**2-((y-1.641)/.011)**2)
   z+=front*(nose+tip+cheek+socket)
  vs.append((x,y,z))
fs=[(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(H-1) for i in range(N)]
mesh('Head',skin,vs,fs)
for side in [-1,1]:
 ell('Head',skin,(side*.087,1.604,.093),(.016,.034,.019),20,12)
 tube('Head',skinshadow,[(side*.092,1.622,.108),(side*.098,1.61,.111),(side*.093,1.591,.107)],.0025)

 # Eyes recessed beneath heavy lids, dark irises rather than white beads.
 ell('Head',skinshadow,(side*.040,1.641,.169),(.019,.004,.002),24,8)
 ell('Head',eye,(side*.040,1.640,.174),(.007,.003,.0018),20,8)
 tube('Head',skin,[(side*x,y,face_depth(side*x,y)+.001) for x,y in [(.019,1.644),(.035,1.646),(.050,1.644),(.061,1.640)]],.0018)
 tube('Head',hair,[(side*.021,1.661,.169),(side*.039,1.666,.169),(side*.06,1.66,.162)],.0025)
 tube('Head',skinshadow,[(side*.022,1.635,.174),(side*.042,1.63,.175),(side*.059,1.634,.164)],.0009)
 tube('Head',skinshadow,[(side*.024,1.587,.189),(side*.035,1.573,.177),(side*.038,1.554,.168)],.0008)
 ell('Head',skinshadow,(side*.016,1.59,.219),(.006,.003,.002),12,6)
# Lips and restrained drooping grey moustache.
ell('Head',lip,(0,1.557,.181),(.026,.006,.005),24,8)
tube('Head',skinshadow,[(-.024,1.557,.184),(0,1.555,.188),(.024,1.557,.184)],.0018)
for side in [-1,1]:
 ell('Head',hair,(side*.018,1.574,.188),(.022,.006,.006),24,10)
 for i in range(12):
  x=side*(.002+i*.003);tube('Head',hairlight if i%3==0 else hair,[(x,1.58,.199-abs(x)*.13),(x+side*.008,1.575,.2-abs(x)*.2),(x+side*.013,1.562-abs(x)*.1,.183)],.0012,5)
 # temples beneath cap
 ell('Head',hair,(side*.083,1.663,.07),(.009,.027,.043),16,8)
for y in [1.681,1.691]:tube('Head',skinshadow,[(-.046,y,.165),(-.02,y+.002,.174),(.02,y+.002,.174),(.049,y,.162)],.001)
# Flat cap is a sloped oval crown with band, peak and panel seams.
loft('Head',vest,[(1.698,0,.078,.092,.104),(1.709,0,.078,.096,.107),(1.737,0,.064,.111,.109),(1.764,0,.053,.098,.097),(1.781,0,.05,.06,.060),(1.786,0,.05,.003,.004)],48)
loft('Head',seam,[(1.695,0,.079,.093,.105),(1.708,0,.079,.095,.106)],48)
rows=[]
for j in range(7):
 t=j/6;rows.append([(u*.082,1.707-.024*t-.009*u*u,.135+.081*t-.026*u*u) for u in [i/12*2-1 for i in range(13)]])
panel('Head',vest,rows);tube('Head',seam,rows[-1],.002)
for side in [-1,1]:tube('Head',seam,[(0,1.787,.047),(side*.059,1.77,.056),(side*.099,1.744,.067),(side*.095,1.716,.11)],.0015)
# Smooth shoulder caps connect the sleeve to the torso under the vest armholes.
# Shoulder fabric is bridged continuously to the posed sleeve by the runtime rig.
# Arms exported as independent named parts. Runtime analytic two-bone IK preserves lengths.
for side,label in [(-1,'L'),(1,'R')]:
 loft('Upper_'+label,shirt,[(-.095,0,0,.070,.070),(-.11,0,0,.070,.07),(-.18,0,.003,.066,.065),(-.235,0,.007,.059,.062),(-.276,0,0,.061,.061),(-.30,0,0,.054,.056)],32,fold=.047)
 loft('Upper_'+label,shirtshade,[(-.257,0,0,.059,.060),(-.266,0,0,.063,.064),(-.277,0,0,.064,.065),(-.290,0,0,.060,.062),(-.302,0,0,.053,.054)],32,fold=.022)
 loft('Fore_'+label,skin,[(.048,0,0,.003,.003),(.038,0,0,.03,.032),(.019,0,0,.043,.044),(0,0,0,.049,.05),(-.03,0,0,.049,.05),(-.095,0,.003,.048,.048),(-.16,0,.005,.039,.04),(-.235,0,0,.030,.033),(-.285,0,0,.027,.029)],32)
 tube('Fore_'+label,skinshadow,[(side*.021,-.09,-.038),(side*.019,-.17,-.029),(side*.013,-.25,-.024)],.0012)
 for k in [-1,1]:
  tube('Upper_'+label,shirtshade,[(k*.050,-.18,.035),(k*.050,-.218,.037),(k*.040,-.252,.044)],.0013)
 # Fist: palm behind tool, four curled fingers separately crossing front of grip.
 ell('Hand_'+label,skin,(0,-.034,-.019),(.043,.045,.022),24,12)
 for i in range(4):
  x=-.031+i*.019;pts=[]
  for k in range(13):
   t=-.55+k/12*4.7;pts.append((x,-.053+.024*math.cos(t),.024*math.sin(t)))
  tube('Hand_'+label,skin,pts,.009,9)
  tube('Hand_'+label,skinshadow,[(x-.006,-.064,.022),(x+.006,-.064,.022)],.001)
 tube('Hand_'+label,skin,[(side*.041,-.011,-.008),(side*.044,-.034,.007),(side*.028,-.045,.027),(side*.012,-.039,.028)],.012,12)
# Hammer grip axis +X. Head strikes with its -Y face.
tube('Hammer',wood,[(-.10,0,0),(.0,0,0),(.18,0,0),(.32,0,0)],.017,12)
box('Hammer',iron,(.32,0,0),(.078,.115,.085),.012);box('Hammer',edge,(.32,-.057,0),(.075,.012,.078),.004)
# Forging tongs: two shaped jaws, hinge, long reins.
for side in [-1,1]:
 tube('Tongs',iron,[(-.075,0,side*.026),(.10,0,side*.021),(.26,0,side*.008),(.31,0,-side*.016),(.40,0,-side*.017),(.43,0,-side*.009)],.008,8)
ell('Tongs',edge,(.275,0,0),(.012,.012,.022),16,8)
# Assemble one group per moving part; smooth normals, thickness on cloth and UVs.
for (part,name),(vs,fs,uv,mat) in batches.items():
 if part=='Head' and name in ['Faded charcoal wool','Worn wool edges']:vs=[(x,1.708+(y-1.708)*.68,z+.007) if y>1.708 else (x,y,z) for x,y,z in vs]
 if part=='Head':vs=[(x*.95,1.49+(y-1.49)*.84,.09+(z-.09)*.95) for x,y,z in vs]
 if part in ['Torso','Head']:vs=[(x,y,z+max(0,y-.96)*.10) for x,y,z in vs]
 me=bpy.data.meshes.new(part+' '+name);me.from_pydata([conv(v) for v in vs],[],[tuple(reversed(f)) for f in fs]);me.materials.append(mat);me.update()
 layer=me.uv_layers.new(name='UVMap')
 for polygon,coords in zip(me.polygons,uv):
  for loop,co in zip(polygon.loop_indices,reversed(coords)):layer.data[loop].uv=co
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 for p in me.polygons:p.use_smooth=True
 o=bpy.data.objects.new(part+' '+name,me);bpy.context.collection.objects.link(o)
 parent=bpy.data.objects.get(part)
 if parent is None:parent=bpy.data.objects.new(part,None);bpy.context.collection.objects.link(parent)
 o.parent=parent
 # Panels require a visible back and real edge. All materials are also double sided in glTF.
 mat.use_backface_culling=False
# Put limb groups in a neutral inspection pose before export (runtime overrides these transforms).
for label,x in [('L',-.235),('R',.235)]:
 bpy.data.objects['Upper_'+label].location=conv((x,1.38,.074));bpy.data.objects['Fore_'+label].location=conv((x,1.08,.074));bpy.data.objects['Hand_'+label].location=conv((x,.795,.074))
bpy.data.objects['Hammer'].hide_render=True;bpy.data.objects['Tongs'].hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/chainmaker/chainmaker.blend'))
bpy.ops.export_scene.gltf(filepath=str(RAW/'chainmaker.glb'),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
print('CHAINMAKER_BUILD_COMPLETE')
