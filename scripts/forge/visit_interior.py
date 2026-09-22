"""Original geometry informed by Tom's IMG_4261–4280 visit. Dimensions estimated, not surveyed."""
import math
import random
from mathutils import Matrix


def build_surfaces(box, mesh, mat, front_hole, end_hole):
    rng=random.Random(42614280)
    lime=[mat('Chalk limewash %d'%i,c) for i,c in enumerate([(218,213,195),(205,202,187),(229,224,208),(198,194,177)])]
    joint=mat('Recessed lime mortar',(159,154,137))
    paving=[mat('Worn sandstone paver %d'%i,c) for i,c in enumerate([(131,122,103),(116,111,96),(142,129,105),(120,116,105),(108,105,94)])]
    # Small flat pavers, rounded/chipped shoulders, narrow earth-filled joints.
    # Tops remain at the existing 125 mm floor datum for the working figure.
    for row in range(36):
        y=-2.04+row*.115
        for col in range(41):
            x=-4.46+col*.22+(row%2)*.11
            if x>4.35:continue
            left=max(-4.39,x-.104);right=min(4.39,x+.104)
            if right-left<.045:continue
            z=.123+rng.uniform(-.004,.003);cut=rng.uniform(.005,.013)
            outline=[(left+cut,y-.053),(right-cut,y-.053),(right,y-.044),(right,y+.044),(right-cut,y+.053),(left+cut,y+.053),(left,y+.044),(left,y-.044)]
            vertices=[(a,b,.089) for a,b in outline]+[(a+(0.002 if a<(left+right)/2 else -.002),b+(0.002 if b<y else -.002),z) for a,b in outline]
            faces=[tuple(range(8,16))]+[(k,(k+1)%8,(k+1)%8+8,k+8) for k in range(8)]
            mesh('Interior floor pavers',vertices,faces,rng.choice(paving))
    # Real brick courses beneath thin limewash, not separated plaster boards.
    for row in range(31):
        z=.055+row*.082
        x=-4.5-.15*(row%2)
        while x<4.5:
            a=max(x,-4.38);b=min(x+.295,4.38)
            if b>a+.02:
                for side in [-1,1]:
                    if side<0 and front_hole((a+b)/2,z):continue
                    box('Interior lime joints',((a+b)/2,side*1.973,z),(b-a,.018,.079),joint)
                    box('Interior lime brick',((a+b)/2,side*1.955,z),(b-a-.009,.022,.069),rng.choice(lime))
            x+=.30
    for side in [-1,1]:
        for row in range(49):
            z=.055+row*.082;half=2.1 if z<2.55 else max(0,2.1*(4.15-z)/1.6)
            y=-2.1-.15*(row%2)
            while y<2.1:
                a=max(y,-half);b=min(y+.295,half)
                if b>a+.02 and not end_hole((a+b)/2,z,side):
                    box('Interior lime joints',(side*4.367,(a+b)/2,z),(.02,b-a,.079),joint)
                    box('Interior lime brick',(side*4.349,(a+b)/2,z),(.022,b-a-.009,.069),rng.choice(lime))
                y+=.3
    return lime,joint


def build_stations(box,rod,mesh,rock,mat,brick,wood,iron,iron_edge,coal,ember,dark,lime,joint):
    rng=random.Random(4273)
    # Preserve the centre anvil face and hot-link height used by the approved worker.
    for x in [-3.,0.,3.]:
        fire_x=x-.43
        box('Hearth core',(fire_x,-1.59,.49),(1.30,.86,.73),joint)
        for row in range(8):
            for col in range(5):
                box('Hearth lime brick',(fire_x-.52+col*.26,-1.146,.17+row*.083),(.248,.035,.071),rng.choice(lime if row<5 else brick))
        box('Hearth plate',(fire_x,-1.56,.89),(1.42,.96,.10),iron)
        # Raised back/side fire bricks and a small recessed fuel bed.
        box('Hearth back',(fire_x,-1.98,1.04),(1.36,.13,.30),brick[2])
        for side in [-1,1]:box('Hearth cheek',(fire_x+side*.64,-1.63,1.0),(.12,.58,.22),brick[3])
        for i in range(58):
            xx=fire_x+rng.uniform(-.48,.48);yy=-1.60+rng.uniform(-.26,.24)
            live=abs(xx-fire_x)<.21 and abs(yy+1.6)<.16
            rock('Cinders',(xx,yy,.96+rng.uniform(0,.035)),(.045,.035,.04),ember if live and i%3 else coal)
        # White masonry breast, blackened only within the actual opening.
        box('Hood soot throat',(fire_x,-1.59,1.54),(1.17,.72,.04),dark)
        for row in range(17):
            z=1.59+row*.082;t=min(1,row/10);cx=fire_x*(1-t)+x*t
            w=1.28*(1-t)+.61*t;depth=.78*(1-t)+.52*t
            box('Hood lime joints',(cx,-1.46,z),(w,depth,.081),joint)
            count=max(2,round(w/.27))
            for col in range(count):
                box('Hood lime brick',(cx-w/2+(col+.5)*w/count,-1.46+depth/2+.009,z),(w/count-.009,.034,.071),rng.choice(lime))
            for side in [-1,1]:box('Hood lime brick',(cx+side*(w/2+.008),-1.46,z),(.028,depth-.012,.071),rng.choice(lime))
        # Square timber block extends at 90 degrees from the long hearth.
        # A short rear return joins it to the hearth without crossing the worker's feet.
        box('Anvil timber return',(x,-1.145,.68),(.83,.27,.16),wood[0])
        for n in range(5):
            xx=x-.40+(n+.5)*.16
            box('Anvil square base',(xx,-.72,.43),(.154,.96,.60),wood[n%len(wood)])
            box('Anvil square top',(xx,-.72,.756+rng.uniform(-.002,.002)),(.156,.98,.066),wood[(n+1)%len(wood)])
        for yy in [-1.13,-.31]:
            box('Anvil iron strap',(x,yy,.43),(.84,.021,.065),iron)
            for xx in [x-.32,x+.32]:rod('Anvil bolts',(xx,yy-.018,.43),(xx,yy+.018,.43),.017,iron_edge,sides=6)
        box('Anvil foot',(x,-.72,.807),(.46,.31,.07),iron)
        box('Anvil waist',(x,-.72,.899),(.26,.21,.14),iron)
        box('Anvil face',(x,-.72,.99),(.67,.29,.13),iron_edge)
        rod('Anvil horn',(x+.32,-.72,.97),(x+.67,-.72,1.00),.115,iron_edge,.009,10)
        box('Hammer',(x-.12,-.72,1.14),(.22,.12,.10),iron)
        rod('Hammer',(x-.1,-.72,1.15),(x-.22,-.23,1.09),.025,wood[2])
