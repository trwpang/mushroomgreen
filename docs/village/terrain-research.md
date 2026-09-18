# Mushroom Green terrain research — 18 September 2026

## Finding

The scene needs a distinct stream valley and slopes. Modern ground at Henry’s mapped home and the chainshop is near 100 m OD. The mapped Black Brook point nearest the chainshop is about 87 m OD. The settlement occupies higher ground beside the valley, with further rising ground to the northeast.

The scene footprint spans about 86–111 m OD. The 59 historical household coordinates sample about 95–102 m OD on modern terrain. These are approximate modern ground heights, not historical building floor levels or survey benchmarks.

## Source and method

- [Environment Agency LIDAR Composite Digital Terrain Model, 2 m](https://environment.data.gov.uk/dataset/09ea3b37-df3a-4e8b-ac69-fb0842227b04).
- Downloaded its 2022 composite through the official WCS on 18 September 2026. The composite contains surveys from 2000–2022; the exact local acquisition date was not checked.
- Coverage: `09ea3b37-df3a-4e8b-ac69-fb0842227b04__Lidar_Composite_Elevation_DTM_2m`.
- British National Grid bounds: E 393300–394200, N 286000–287000; native 2 m pixels, 450 × 500; no missing pixels.
- Heights are metres above Ordnance Datum Newlyn. The DTM removes buildings and vegetation.
- Project coordinates converted from WGS84 to EPSG:27700 with pyproj. Heights sampled at nearest raster pixels. The displayed scene ellipse approximates the Three.js geographic footprint.
- Map shows 2 m contours over shaded terrain; roads, brooks and household points come from the project’s historical layout. Shaded relief has 1.4× vertical emphasis; contour values are unmodified.
- Reproduce with `scripts/village/contour-study.py` using numpy, rasterio, pyproj and matplotlib. Raw crop and findings are in `artifacts/village/terrain/`.

## Implications for the village

Use the measured broad terrain as the next foundation: lower the Black Brook valley, form its banks and valley sides, retain the higher settlement ground, and raise the northeastern background. Seat each house on a small local platform instead of tilting the whole house. Road and footpath grades should follow the ground. Recheck water levels and downstream direction after terrain changes.

Do not transfer every modern cut, bank or platform into 1865. Our southern/eastern mapped watercourse does not consistently follow the modern lowest ground. Check historical water features and any map alignment differences before carving that route into the new terrain. Dudley Council’s [Mushroom Green conservation guidance](https://www.dudley.gov.uk/media/6169/asset.pdf) includes historical maps for comparison. Ground and drainage may have changed through mining, railway work, development or former pools.

## Implemented terrain

The live scene now uses the downloaded DTM. `scripts/village/build-terrain.py` applies a Gaussian smoothing radius (sigma) of 6 m and exports a 4 m height grid. The renderer interpolates the grid without vertical exaggeration. Scene zero is 82 m OD.

Buildings have small level platforms, with 3 m transitions into surrounding slopes. The forge yard and puddle have local level ground. Roads and vegetation use the same ground function. Stream surfaces follow a non-increasing downstream profile along the existing map routes; the terrain blends into their beds. These stream cuts remain an interpretation where the historical routes differ from modern terrain.

TypeScript, production build and layout checks pass. Added checks cover measured landmark heights, valley relief, building platforms and downstream water grades. Browser review covers the brook, forge approach and full-map view.

Attribution: © Environment Agency copyright and/or database right 2022. All rights reserved.
