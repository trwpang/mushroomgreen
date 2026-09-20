"""Photo-informed attached block. Date/use in 1865 are interpretations.

Blender coordinates: at the +X gable, on the +Y side away from the lane.
No new texture images; shared workshop palettes, separate semantic batches.
"""
import math
import random
from mathutils import Matrix


def build_annex(box, rod, worn_tile, mat, brick, sootbrick, mortar, wood, slate, stone, iron, dark):
    state = random.getstate()
    random.seed(141865)
    x0, x1, y0, y1 = 1.3, 4.45, 2.12, 5.3
    cx, cy = (x0+x1)/2, (y0+y1)/2
    eave, ridge = 4.12, 5.12
    step = .083

    def opening(axis, side, horizontal, z):
        return axis == 'x' and side == x1 and (
            abs(horizontal-4.12) < .47 and z < 1.96 or
            abs(horizontal-3.78) < .43 and 2.68 < z < 3.64)

    # Recessed continuous cores close every mortar joint. Openings are built
    # into the wall rather than dark rectangles laid on a solid white box.
    for axis, sides, start, end in [('x', (x0, x1), y0, y1), ('y', (y0, y1), x0, x1)]:
        for side in sides:
            outward = -1 if side == sides[0] else 1
            for row in range(62):
                z = .04+row*step
                if axis == 'x' and z > eave:
                    continue
                half = (x1-x0)/2*max(0, (ridge-z)/(ridge-eave)) if z > eave else (end-start)/2
                lo, hi = ((cx-half, cx+half) if axis == 'y' else (start, end))
                p = start-(row%2)*.125
                while p < end:
                    a, b = max(lo, p), min(hi, p+.25)
                    p += .25
                    if b-a < .025 or opening(axis, side, (a+b)/2, z):
                        continue
                    h = (a+b)/2
                    pos = (side, h, z) if axis == 'x' else (h, side, z)
                    size = (.23, b-a, step+.001) if axis == 'x' else (b-a, .23, step+.001)
                    box('Annex masonry', pos, size, mortar)
                    # Distinct upper/lower campaigns, not uniform random dirt.
                    repair = 1.98 < z < 2.3 or (z > 2.7 and math.sin(h*2.4+z*.7) > .6)
                    palette = sootbrick if z < .30 else brick[2:7] if repair else brick
                    finish = random.choice(palette)
                    pos = (side+outward*.129, h, z) if axis == 'x' else (h, side+outward*.129, z)
                    size = (.032, b-a-.012, .069) if axis == 'x' else (b-a-.012, .032, .069)
                    box('Annex brickwork', pos, size, finish)

    box('Annex floor', (cx, cy, .075), (3.04, 3.05, .15), stone[0])
    for i in range(15):
        box('Annex upper floor', (x0+.18+i*.20, cy, 2.32), (.19, 2.94, .065), wood[i%4])
    for y in (2.55, 3.6, 4.75):
        box('Annex joists', (cx, y, 2.19), (2.95, .13, .20), wood[0])

    # Closed weathered plank door. The green modern paint is not backdated.
    for i in range(7):
        box('Annex door', (x1+.05, 3.71+i*.137, .98), (.085, .128, 1.90), wood[i%4])
    for y in (3.60, 4.64):
        box('Annex door frame', (x1+.14, y, 1.0), (.15, .105, 2.0), wood[0])
    box('Annex door lintel', (x1+.14, 4.12, 2.02), (.25, 1.20, .16), wood[1])
    box('Annex threshold', (x1+.28, 4.12, .06), (.55, 1.18, .12), stone[1])
    for z in (.35, 1.6):
        box('Annex strap hinge', (x1+.107, 3.94, z), (.028, .54, .052), iron)
    rod('Annex latch', (x1+.13, 4.35, 1.07), (x1+.13, 4.53, 1.07), .018, iron)

    # Small recessed four-pane casement, with separate putty and glass planes.
    glass = mat('Annex old window glass', (88, 104, 96), .22, .18)
    putty = mat('Annex worn window putty', (141, 135, 115))
    box('Annex window shadow', (x1-.12, 3.78, 3.16), (.018, .84, .96), dark)
    for y in (3.32, 4.24):
        box('Annex window frame', (x1+.08, y, 3.16), (.17, .075, 1.08), wood[1])
    for z in (2.65, 3.68):
        box('Annex window frame', (x1+.08, 3.78, z), (.17, .96, .075), wood[1])
    for y in (3.56, 4.0):
        for z in (2.92, 3.4):
            box('Annex glazing', (x1+.04, y, z), (.014, .40, .44), glass)
    box('Annex window mullion', (x1+.082, 3.78, 3.16), (.05, .038, .96), putty)
    box('Annex window transom', (x1+.082, 3.78, 3.16), (.05, .86, .035), putty)
    box('Annex window sill', (x1+.18, 3.78, 2.61), (.36, 1.10, .10), stone[0])

    # Transverse ridge. Individual bowed, chipped pieces use existing tile atlas.
    slope = (ridge-eave)/((x1-x0)/2)
    for side in (-1, 1):
        rot = Matrix.Rotation(side*math.atan(slope), 3, 'Y') @ Matrix.Rotation(math.pi/2, 3, 'Z')
        box('Annex roof backing', (cx+side*.86, cy, ridge-.86*slope), (3.60, 2.10, .09), wood[0], rot)
        for row in range(11):
            dx = .08+row*.176
            for col in range(13):
                y = y0-.20+col*.277+(row%2)*.12
                if y > y1+.24:
                    continue
                worn_tile((cx+side*dx, y, ridge-dx*slope+.08), random.choice(slate), rot)
        for y in (y0-.23, y1+.23):
            rod('Annex bargeboard', (cx, y, ridge+.04), (cx+side*1.9, y, ridge-1.9*slope), .05, wood[0], sides=5)
    for i in range(13):
        box('Annex ridge', (cx, y0-.19+i*.277, ridge+.10), (.18, .269, .10), slate[2], Matrix.Rotation(math.pi/4, 3, 'Y'))
    random.setstate(state)
