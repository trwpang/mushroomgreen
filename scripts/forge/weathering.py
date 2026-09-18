"""Original surface atlases: 16 distinct pieces each, with matched relief and roughness."""
import bpy
import numpy as np

def field(n, cells, rng):
    grid = rng.random((cells+1,cells+1))
    q=np.arange(n)/n*cells
    i=q.astype(int); f=q-i; f=f*f*(3-2*f)
    return (grid[i[:,None],i[None,:]]*(1-f[:,None])*(1-f[None,:])
        +grid[i[:,None]+1,i[None,:]]*f[:,None]*(1-f[None,:])
        +grid[i[:,None],i[None,:]+1]*(1-f[:,None])*f[None,:]
        +grid[i[:,None]+1,i[None,:]+1]*f[:,None]*f[None,:])

def image(name, pixels, noncolor=False):
    h,w=pixels.shape[:2]
    out=bpy.data.images.new(name,width=w,height=h)
    if noncolor:out.colorspace_settings.name='Non-Color'
    rgba=np.ones((h,w,4),dtype=np.float32)
    rgba[:,:,:3]=pixels if pixels.ndim==3 else pixels[:,:,None]
    out.pixels.foreach_set(rgba.ravel());out.pack()
    return out

def atlas(kind):
    rng=np.random.default_rng({'slate':421,'oak':712,'brick':903}[kind])
    n=192;size=n*4
    color=np.zeros((size,size,3));heights=np.zeros((size,size));rough=np.zeros((size,size))
    y,x=np.mgrid[0:n,0:n]/n
    for piece in range(16):
        cloud=field(n,4,rng);patch=field(n,13,rng);fine=field(n,48,rng)
        grit=rng.random((n,n));height=.1*grit+.24*fine+.3*patch
        if kind=='slate':
            base=np.array([.28,.29,.275])*rng.uniform(.83,1.19)
            strata=np.sin(y*115+cloud*12+x*9)*.025
            col=base[None,None,:]*(.72+.40*cloud+.23*patch+strata)[:,:,None]
            # Rain tracks and exfoliated slate layers.
            rain=(np.sin(x*81+cloud*4)>.87)*(.12+.12*y)
            col*=1-rain[:,:,None]
            cracks=np.zeros((n,n))
            for _ in range(2):
                path=rng.uniform(.08,.92)+np.sin(y*rng.uniform(4,14)+rng.uniform(0,6))*.015
                cracks=np.maximum(cracks,np.exp(-((x-path)/.0035)**2)*(y>rng.uniform(.15,.7)))
            col*=1-cracks[:,:,None]*.48;height-=cracks*.2
            edge=np.minimum.reduce([x,1-x,y,1-y])
            col+=np.exp(-edge*62)[:,:,None]*.046
            lichen=np.clip((cloud*.45+patch*.48+fine*.22-.77)*5,0,.7)
            if piece%3==0:lichen*=.12
            col=col*(1-lichen[:,:,None])+np.array([.40,.39,.235])*lichen[:,:,None]
            height+=lichen*.17+strata
        elif kind=='oak':
            # Warped grain flows around knots rather than straight stripes.
            kx=rng.uniform(.2,.8);ky=rng.uniform(.25,.8)
            knot=np.sqrt(((x-kx)*1.7)**2+((y-ky)*.42)**2)
            phase=x*145+np.sin(y*8)*1.5+np.exp(-knot*7)*np.sin((y-ky)*12)*12
            grooves=(.5+.5*np.sin(phase))**10
            fibres=(.5+.5*np.sin(phase*3.7+fine*2))**12
            knotring=np.sin(knot*170)**10*np.exp(-knot*19)
            base=np.array([.30,.26,.205])*rng.uniform(.78,1.30)
            col=base[None,None,:]*(.70+.45*cloud+.18*fine)[:,:,None]
            silver=np.clip((patch-.40)*.55,0,.35)
            col=col*(1-silver[:,:,None])+np.array([.49,.46,.38])*silver[:,:,None]
            col*=1-(grooves*.22+fibres*.16+knotring*.28)[:,:,None]
            splits=np.zeros((n,n))
            for _ in range(4):
                sx=rng.uniform(.03,.97);end=rng.uniform(.15,.62)
                line=sx+np.sin(y*18+sx*18)*.003
                splits=np.maximum(splits,np.exp(-((x-line)/.004)**2)*(y<end))
            col*=1-splits[:,:,None]*.64
            endrot=np.exp(-y*14)*(.10+patch*.32)
            col*=1-endrot[:,:,None]
            col+=np.exp(-np.minimum(x,1-x)*85)[:,:,None]*.07
            height=.6-grooves*.20-fibres*.07-splits*.4-knotring*.12+fine*.1
        else:
            base=np.array([.43,.285,.20])*rng.uniform(.78,1.17)
            col=base[None,None,:]*(.78+.3*cloud+.18*fine)[:,:,None]
            pits=(grit>.977)*patch
            col*=1-pits[:,:,None]*.4;height-=pits*.22
            # Scuffed lime deposits and firing marks.
            salt=np.clip((patch+cloud*.35-1.05)*1.8,0,.25)
            col=col*(1-salt[:,:,None])+np.array([.65,.60,.48])*salt[:,:,None]
            col*=1-np.clip((cloud-.66)*.8,0,.24)[:,:,None]
        r,c=divmod(piece,4);region=np.s_[r*n:(r+1)*n,c*n:(c+1)*n]
        color[region]=np.clip(col,0,1);heights[region]=height;rough[region]=.77+patch*.20
    dy,dx=np.gradient(heights)
    normals=np.stack([-dx*2.5,-dy*2.5,np.ones_like(dx)],axis=-1)
    normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
    return image(kind+' aged colour atlas',color),image(kind+' surface relief',normals*.5+.5,True),image(kind+' worn roughness',rough,True)

def apply_atlas(materials,kind):
    color,normal,rough=atlas(kind)
    for m in materials:
        nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
        for im,socket in [(color,'Base Color'),(rough,'Roughness')]:
            tex=nodes.new('ShaderNodeTexImage');tex.image=im
            links.new(tex.outputs['Color'],p.inputs[socket])
        tex=nodes.new('ShaderNodeTexImage');tex.image=normal
        norm=nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.55
        links.new(tex.outputs['Color'],norm.inputs['Color']);links.new(norm.outputs['Normal'],p.inputs['Normal'])
