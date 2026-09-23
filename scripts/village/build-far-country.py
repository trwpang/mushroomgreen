"""Build the far country around the model from the OS six-inch sheets (surveyed 1881-82).

Tiles: National Library of Scotland georeferenced OS Six Inch county layers (CC-BY, NLS).
The script caches zoom-17 tiles, extracts water (blue ink), buildings (solid black), field and
road boundaries (long ink lines), tree symbols (small ringed marks) and enclosed parcels, then writes:
  public/far-country/ground-1882.webp   ground colour texture over x,z in [-EXTENT, EXTENT]
  public/far-country/far-country.json   buildings, trees, water ribbons and a real-height grid
Model coordinates: metres, east +X, north -Z, Henry Weaver's house (#22) at the origin.
The map is 16-17 years later than the 1865 scene; everything derived here is interpretation.
"""
from pathlib import Path
import io, json, math, os, sys, urllib.request, concurrent.futures
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.graph import route_through_array
from skimage.morphology import skeletonize

root = Path(__file__).resolve().parents[2]
cache = Path(os.environ.get('FAR_TILE_CACHE', root / 'artifacts/village/far-country/tiles'))
cache.mkdir(parents=True, exist_ok=True)
out_dir = root / 'public/far-country'; out_dir.mkdir(parents=True, exist_ok=True)
LAT0, LON0 = 52.47575918, -2.09357062
Z, R = 17, 9
LAYERS = ['staffordshire', 'gloucestershire', 'worcestershire']

def tile_xy(lat, lon, z):
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n

cx, cy = tile_xy(LAT0, LON0, Z); x0, y0 = int(cx) - R, int(cy) - R; N = 2 * R + 1
OX, OY = (cx - x0) * 256, (cy - y0) * 256
MPP = 156543.03392 * math.cos(math.radians(LAT0)) / 2 ** Z

def fetch(job):
    layer, x, y = job; f = cache / f'{layer}-{Z}-{x}-{y}.png'
    if f.exists(): return
    try: data = urllib.request.urlopen(f'https://mapseries-tilesets.s3.amazonaws.com/os/six-inch-{layer}/{Z}/{x}/{y}.png', timeout=30).read()
    except Exception: data = b''
    f.write_bytes(data)

with concurrent.futures.ThreadPoolExecutor(12) as ex:
    list(ex.map(fetch, [(l, x0 + i, y0 + j) for l in LAYERS for i in range(N) for j in range(N)]))
mosaic = Image.new('RGBA', (N * 256, N * 256), (240, 234, 214, 255))
for layer in LAYERS:
    for i in range(N):
        for j in range(N):
            d = (cache / f'{layer}-{Z}-{x0+i}-{y0+j}.png').read_bytes()
            if len(d) > 100: mosaic.alpha_composite(Image.open(io.BytesIO(d)).convert('RGBA'), (i * 256, j * 256))
im = np.asarray(mosaic.convert('RGB')).astype(np.int16)
H, W = im.shape[:2]
EXTENT = min(OX, OY, W - OX, H - OY) * MPP - 5
to_model = lambda px, py: ((px - OX) * MPP, (py - OY) * MPP)
to_px = lambda x, z: (OX + x / MPP, OY + z / MPP)
inside = lambda x, z, grow=0: (x / (210 + grow)) ** 2 + ((z + 60) / (240 + grow)) ** 2 < .97
print('mosaic', W, H, 'm/px', round(MPP, 4), 'extent ±', round(EXTENT))

r, g, b = im[..., 0], im[..., 1], im[..., 2]; lum = (r + g + b) / 3
water = ndi.binary_opening((b - r > 14) & (b > 105), iterations=1); water = ndi.binary_dilation(water, iterations=1)
# Reservoirs and pools carry a pale blue-green wash rather than blue ink.
pale = ndi.binary_opening((g - r > 3) & (b > 185) & (lum > 190) & (lum < 228), structure=np.ones((5, 5)))
plab, pn = ndi.label(pale); psize = ndi.sum(np.ones(plab.shape), plab, range(1, pn + 1))
water |= ndi.binary_closing(np.isin(plab, np.nonzero(psize > 600)[0] + 1), structure=np.ones((7, 7)))
ink = (lum < 168) & ~water
solid = ndi.binary_opening(lum < 118, structure=np.ones((5, 5)))
# Keep only building-like solids: bold serif lettering is solid ink too, but far from rectangular.
slab, sn = ndi.label(solid); keep_solid = np.zeros(sn + 1, bool)
for k, sl in enumerate(ndi.find_objects(slab)):
    ys, xs = np.nonzero(slab[sl] == k + 1)
    if len(xs) < 25: keep_solid[k + 1] = True; continue
    pts = np.stack([xs - xs.mean(), ys - ys.mean()], 1); w_, v_ = np.linalg.eigh(np.cov(pts.T))
    a_, b_ = pts @ v_[:, 1], pts @ v_[:, 0]; box = (np.ptp(a_) + 1) * (np.ptp(b_) + 1)
    comp = slab[sl] == k + 1; holes = ndi.binary_fill_holes(comp).sum() - comp.sum()
    keep_solid[k + 1] = len(xs) / box > .7 and holes < 6
solid = keep_solid[slab] & solid
lab, n = ndi.label(ink & ~solid); objs = ndi.find_objects(lab)
area = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1))
lines = np.zeros_like(ink); trees = []
for k, s in enumerate(objs):
    h, w = s[0].stop - s[0].start, s[1].stop - s[1].start
    # Boundaries are long or strongly elongated; lettering is compact and is dropped.
    # Lettering strokes are shorter than 130 px or thick for their length; boundaries are long and hairline.
    if max(h, w) >= 130: lines[s] |= lab[s] == k + 1
    elif 7 <= h <= 16 and 7 <= w <= 16 and 20 <= area[k] <= 110:
        # Ringed tree marks enclose paper; most letters do not at this size.
        comp = lab[s] == k + 1
        if ndi.binary_fill_holes(comp).sum() - comp.sum() >= 4: trees.append(((s[1].start + s[1].stop) / 2, (s[0].start + s[0].stop) / 2))
lines_all = lines.copy()  # full network, used only to close parcels
# Lettering: large italic names join the boundary network but their strokes are thick.
# Remove ink wherever the stroke is wider than a hairline boundary (EDT core >= 2.9 px).
core = ndi.distance_transform_edt(lines) >= 2.9
lines &= ~ndi.binary_dilation(core, iterations=3)
lab2, n2 = ndi.label(lines, structure=np.ones((3, 3))); sl2 = ndi.find_objects(lab2)
lines &= np.concatenate([[False], np.array([max(s[0].stop - s[0].start, s[1].stop - s[1].start) >= 40 for s in sl2], bool)])[lab2]
# Sheet neatlines: long, exactly axis-aligned ink runs are map edges, not hedges.
for axis in (0, 1):
    run = ndi.uniform_filter1d(lines.astype(np.float32), 400, axis=1 - axis) > .55
    lines &= ~ndi.binary_dilation(run, iterations=2)
barrier = ndi.binary_dilation(lines_all | solid | water, iterations=1)
parcels, count = ndi.label(~barrier)
dist = ndi.distance_transform_edt(~barrier)
thick = ndi.maximum(dist, parcels, range(1, count + 1)); size = ndi.sum(np.ones(parcels.shape), parcels, range(1, count + 1))
kind = np.zeros(count + 1, np.uint8)  # 0 field, 1 lane/track, 2 tiny
for k in range(count):
    if size[k] < 80: kind[k + 1] = 2
    elif thick[k] <= 7.5 and size[k] > 250: kind[k + 1] = 1
print('parcels', count, 'lanes', int((kind == 1).sum()), 'tree marks', len(trees))

# Woods: where ringed tree marks are dense (Saltwells Wood, the Coppice, Birchtree Coppice ...).
marks = np.zeros((H, W), np.float32)
for x, y in trees: marks[int(y), int(x)] = 1
wood = ndi.gaussian_filter(marks, 22 / MPP) * (2 * math.pi * (22 / MPP) ** 2) > 1.6
wood = ndi.binary_opening(ndi.binary_closing(wood, iterations=6), iterations=4) & ~water & ~solid
wl, wn = ndi.label(wood); wsize = ndi.sum(np.ones(wl.shape), wl, range(1, wn + 1))
wood = np.isin(wl, np.nonzero(wsize * MPP * MPP > 12000)[0] + 1)  # woods of 1.2 ha and more
print('wood area ha', round(wood.sum() * MPP * MPP / 1e4, 1))
# Ground colours are in the same space as the village canvas (the material tints them identically).
rng = np.random.default_rng(1882)
tone = rng.random(count + 1)
base = np.stack([106 + tone * 14, 113 + tone * 12, 70 + tone * 9], -1)
area_m2 = np.concatenate([[0], size]) * MPP * MPP
field_sized = (area_m2 > 4000) & (area_m2 < 80000)
hay = (tone > .82) & field_sized; plough = (tone > .92) & field_sized
base[hay] = [126, 122, 80]; base[plough] = [112, 96, 70]
# Large unenclosed tracts (commons, pit banks, rough grazing) stay a mid rough-pasture tone.
base[area_m2 >= 80000] = [104, 108, 70]
# Boundary ink, lettering and slivers take the colour of the nearest real parcel.
bad = (parcels == 0) | (kind[parcels] == 2)
near_idx = ndi.distance_transform_edt(bad, return_distances=False, return_indices=True)
filled = parcels[near_idx[0], near_idx[1]]
colour = base[filled].astype(np.float32)
colour[kind[filled] == 1] = [150, 128, 98]
woodland = wood & (kind[parcels] != 1)
colour[woodland] = colour[woodland] * .35 + np.array([62, 72, 42]) * .65
# Hedges drawn from the boundary centre-lines, about 2 m wide and soft-edged.
centre = skeletonize(lines) & ~solid
hedge_soft = np.clip(ndi.gaussian_filter(centre.astype(np.float32), .8) * 2.4, 0, 1)
colour = colour * (1 - hedge_soft[..., None] * .62) + np.array([72, 84, 48]) * hedge_soft[..., None] * .62
colour[solid] = [92, 84, 70]
colour[water] = [58, 70, 66]
# Mottling like the painted village ground.
yy, xx = np.mgrid[0:H, 0:W]
mottle = (np.sin(xx * .021 + np.sin(yy * .017) * 2) * .5 + np.sin(yy * .031 - xx * .013) * .5) * 6 + rng.normal(0, 4, (H, W))
colour += mottle[..., None]
SIZE = 4096
a = int(OX - EXTENT / MPP); b0 = int(OY - EXTENT / MPP); span = int(2 * EXTENT / MPP)
tex = Image.fromarray(np.clip(colour[b0:b0 + span, a:a + span], 0, 255).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS)
tex.save(out_dir / 'ground-1882.webp', quality=78, method=6)

# Buildings: oriented rectangles from solid ink outside the modelled ellipse.
blab, bn = ndi.label(solid); buildings = []
for k, s in enumerate(ndi.find_objects(blab)):
    ys, xs = np.nonzero(blab[s] == k + 1)
    if len(xs) < 30: continue
    px, py = xs + s[1].start, ys + s[0].start
    mx, mz = to_model(px.mean(), py.mean())
    if inside(mx, mz, 14) or abs(mx) > EXTENT - 20 or abs(mz) > EXTENT - 20: continue
    pts = np.stack([px - px.mean(), py - py.mean()], 1) * MPP
    w, v = np.linalg.eigh(np.cov(pts.T)); axis = v[:, 1]; angle = math.atan2(axis[1], axis[0])
    along = pts @ axis; across = pts @ v[:, 0]
    length = float(along.max() - along.min() + MPP); depth = float(across.max() - across.min() + MPP)
    buildings.append([round(mx, 1), round(mz, 1), round(length, 1), round(depth, 1), round(-angle, 3)])
# Tree marks and hedgerow trees (every ~22 m along long boundaries, avoiding lanes and buildings).
tree_out = [[round(v, 1) for v in to_model(x, y)] for x, y in trees]
skel = centre & ~ndi.binary_dilation(solid, iterations=4)
sy, sx = np.nonzero(skel); pick = rng.random(len(sx)) < MPP / 22
hedgerow = [[round(v, 1) for v in to_model(x, y)] for x, y in zip(sx[pick], sy[pick])]
# Woodland canopy: one tree per ~70 m² of wood, plus the marks themselves.
wy, wx = np.nonzero(wood); pick = rng.random(len(wx)) < MPP * MPP / 70
woods = [[round(v, 1) for v in to_model(x + rng.random(), y + rng.random())] for x, y in zip(wx[pick], wy[pick])]
keep = lambda p: not inside(p[0], p[1], 6) and abs(p[0]) < EXTENT - 10 and abs(p[1]) < EXTENT - 10
woods = [p for p in woods if keep(p)]
# Hedge bushes along real boundaries near the model: position and local line direction.
ey, ex = np.mgrid[0:H:4, 0:W:4]; mx_, mz_ = to_model(ex, ey)
band = np.zeros((H, W), bool); ring = ((mx_ / 210) ** 2 + ((mz_ + 60) / 240) ** 2)
band[::4, ::4] = (ring > .97) & (ring < 5.2)
band = ndi.binary_dilation(band, structure=np.ones((5, 5)))
hs = skel & band & ~ndi.binary_dilation(water, iterations=3) & ~wood
hy, hx = np.nonzero(hs); pick = rng.random(len(hx)) < MPP / 1.15
hedges = []
for x, y in zip(hx[pick], hy[pick]):
    wy_, wx_ = np.nonzero(skel[max(0, y - 6):y + 7, max(0, x - 6):x + 7])
    if len(wx_) < 4: continue
    c = np.cov(np.stack([wx_, wy_]).astype(float)); w_, v_ = np.linalg.eigh(c); d = v_[:, 1]
    mx, mz = to_model(x, y)
    if keep((mx, mz)): hedges.append([round(mx, 1), round(mz, 1), round(math.atan2(-d[1], d[0]), 2)])
tree_out = [p for p in tree_out if keep(p)]; hedgerow = [p for p in hedgerow if keep(p)]

# Water ribbons: follow the blue ink from where each modelled brook leaves the ellipse.
cost = np.where(water, 1.0, 60.0)
def route(points):
    path = []
    for p, q in zip(points, points[1:]):
        (ax, ay), (bx, by) = [tuple(int(round(v)) for v in to_px(*t)) for t in (p, q)]
        m = 120; l, t = max(0, min(ax, bx) - m), max(0, min(ay, by) - m)
        sub = cost[t:max(ay, by) + m, l:max(ax, bx) + m]
        idx, _ = route_through_array(sub, (ay - t, ax - l), (by - t, bx - l), fully_connected=True, geometric=True)
        idx = [(y + t, x + l) for y, x in idx]
        path += idx if not path else idx[1:]
    pts = [to_model(x, y) for y, x in path[::6]]
    return [[round(x, 1), round(z, 1)] for x, z in pts]
brook_routes = {
    'Black Brook, north through Saltwells Wood': [(-200, -285), (-330, -395), (-385, -600), (-400, -900), (-450, -1250)],
    'Mud Brook, west': [(-330, -395), (-480, -430), (-620, -470), (-830, -560), (-1150, -560)],
    'Black Brook, south to the Stour': [(-65, 272), (-60, 420), (-90, 640)],
    'Mousesweet Brook, east': [(450, 25), (700, 110), (950, 250)],
}
ribbons = []
for name, pts in brook_routes.items():
    try: ribbons.append({'name': name, 'line': route(pts)})
    except Exception as e: print('route failed', name, e)

# Real ground heights from the EA 2 m DTM where it reaches, as an 8 m grid (smoothed, datum 82 m).
def wgs84_to_bng(lat, lon):
    # Helmert WGS84 -> OSGB36, then Transverse Mercator (OS formulae). Accurate to a few metres.
    a, b = 6378137.0, 6356752.3141; e2 = 1 - b * b / (a * a); phi, lam = np.radians(lat), np.radians(lon)
    nu = a / np.sqrt(1 - e2 * np.sin(phi) ** 2)
    x = nu * np.cos(phi) * np.cos(lam); y = nu * np.cos(phi) * np.sin(lam); z = (1 - e2) * nu * np.sin(phi)
    tx, ty, tz, s = -446.448, 125.157, -542.060, 20.4894e-6
    rx, ry, rz = [np.radians(v / 3600) for v in (-0.1502, -0.2470, -0.8421)]
    x2 = tx + (1 + s) * x - rz * y + ry * z; y2 = ty + rz * x + (1 + s) * y - rx * z; z2 = tz - ry * x + rx * y + (1 + s) * z
    a, b = 6377563.396, 6356256.909; e2 = 1 - b * b / (a * a); p = np.sqrt(x2 ** 2 + y2 ** 2)
    phi = np.arctan2(z2, p * (1 - e2))
    for _ in range(10): nu = a / np.sqrt(1 - e2 * np.sin(phi) ** 2); phi = np.arctan2(z2 + e2 * nu * np.sin(phi), p)
    lam = np.arctan2(y2, x2)
    F0, phi0, lam0, N0, E0 = 0.9996012717, np.radians(49), np.radians(-2), -100000, 400000
    n = (a - b) / (a + b); nu = a * F0 / np.sqrt(1 - e2 * np.sin(phi) ** 2); rho = a * F0 * (1 - e2) / (1 - e2 * np.sin(phi) ** 2) ** 1.5; eta2 = nu / rho - 1
    Ma = (1 + n + 5 / 4 * n ** 2 + 5 / 4 * n ** 3) * (phi - phi0); Mb = (3 * n + 3 * n ** 2 + 21 / 8 * n ** 3) * np.sin(phi - phi0) * np.cos(phi + phi0)
    Mc = (15 / 8 * n ** 2 + 15 / 8 * n ** 3) * np.sin(2 * (phi - phi0)) * np.cos(2 * (phi + phi0)); Md = 35 / 24 * n ** 3 * np.sin(3 * (phi - phi0)) * np.cos(3 * (phi + phi0))
    M = b * F0 * (Ma - Mb + Mc - Md); c, t = np.cos(phi), np.tan(phi)
    I = M + N0; II = nu / 2 * np.sin(phi) * c; III = nu / 24 * np.sin(phi) * c ** 3 * (5 - t ** 2 + 9 * eta2); IIIA = nu / 720 * np.sin(phi) * c ** 5 * (61 - 58 * t ** 2 + t ** 4)
    IV = nu * c; V = nu / 6 * c ** 3 * (nu / rho - t ** 2); VI = nu / 120 * c ** 5 * (5 - 18 * t ** 2 + t ** 4 + 14 * eta2 - 58 * t ** 2 * eta2)
    d = lam - lam0
    return E0 + IV * d + V * d ** 3 + VI * d ** 5, I + II * d ** 2 + III * d ** 4 + IIIA * d ** 6
dtm = np.asarray(Image.open(root / 'artifacts/village/terrain/ea-dtm-2m.tif'), dtype=np.float32)
bbox = json.loads((root / 'artifacts/village/terrain/elevation-findings.json').read_text())['bbox']  # E0,N0,E1,N1
dtm = ndi.gaussian_filter(dtm, 4)  # sigma 8 m
step = 8; xs = np.arange(-560, 561, step); zs = np.arange(-660, 461, step); xx, zz = np.meshgrid(xs, zs)
lat = LAT0 - zz / 111320; lon = LON0 + xx / (111320 * math.cos(math.radians(LAT0)))
e, nn = wgs84_to_bng(lat, lon)
col = (e - bbox[0]) / 2 - .5; row = (bbox[3] - nn) / 2 - .5
valid = (col >= 0) & (row >= 0) & (col < dtm.shape[1] - 1) & (row < dtm.shape[0] - 1)
heights = np.where(valid, ndi.map_coordinates(dtm, [np.clip(row, 0, dtm.shape[0] - 1), np.clip(col, 0, dtm.shape[1] - 1)], order=1) - 82, np.nan)
# Fill beyond the survey with the nearest surveyed height and publish a smooth confidence weight.
near = ndi.distance_transform_edt(~valid, return_distances=False, return_indices=True)
filled = ndi.gaussian_filter(heights[near[0], near[1]], 1.5)
weight = np.clip(ndi.gaussian_filter(valid.astype(float), 3) * 1.6 - .3, 0, 1) * valid
print('dtm coverage', round(valid.mean(), 3), 'height range', np.nanmin(heights), np.nanmax(heights))

json.dump({
    'source': 'OS Six Inch, Worcestershire/Staffordshire sheets surveyed 1881-82 (NLS georeferenced tiles, CC-BY); EA 2022 DTM 2 m',
    'interpretation': True, 'extent': round(EXTENT, 1), 'texture': 'ground-1882.webp',
    'buildings': buildings, 'treeMarks': tree_out, 'woodTrees': woods, 'hedges': hedges, 'hedgerowTrees': hedgerow, 'brooks': ribbons,
    'heights': {'x0': int(xs[0]), 'z0': int(zs[0]), 'step': step, 'width': len(xs), 'height': len(zs), 'datum': 82,
                'values': [round(float(v), 2) for v in filled.ravel()], 'weight': [round(float(v), 2) for v in weight.ravel()]},
}, open(out_dir / 'far-country.json', 'w'), separators=(',', ':'))
print('buildings', len(buildings), 'hedge bushes', len(hedges), 'wood trees', len(woods), 'tree marks', len(tree_out), 'hedgerow trees', len(hedgerow), 'brooks', [len(r['line']) for r in ribbons])
Image.fromarray(np.clip(colour, 0, 255).astype(np.uint8)).resize((W // 3, H // 3)).save(root / 'artifacts/village/far-country/ground-preview.jpg', quality=84)
