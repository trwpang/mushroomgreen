# Mushroom Green village

Open `/village` for the continuous Three.js landscape. `/forge` remains the individual building study.

The three stages are implemented: the complete mapped layout, Henry Weaver's cottage and yard, and three reusable cottage types across all 59 households. Near homes have detailed Blender meshes; distant homes use textured, simpler shapes. The browser currently shows up to 18 detailed cottages within 85 metres of the focus point, when the camera is within 160 metres of that point.

## Source and interpretation

- Roads, Black Brook, Mousesweet Brook, greens, and settlement boundary come from existing `src/data` coordinates.
- Household positions, footprint directions, names, and links come from the existing content collection through `/households.json`.
- Local projection uses metres, east = +X, north = -Z, with Henry Weaver (#22) at the origin.
- The overlay displays the original mapped footprint polygons and family colours. Cottage shells use bounded proportions derived from those footprints; they are not exact extrusions of the polygons.
- Ground height, house elevations, building types, gardens, trees, small paths, and yard contents are artistic estimates. This is a visual interpretation, not an 1865 survey.
- The forge is anchored to the modern Google Maps chainshop pin supplied by Tom: 52.4754217, -2.0931022. The cottage mesh at household #5 is suppressed to prevent overlap. The historical household and its record remain. This fixes the present-day landmark location; it does not prove the 1865 use or boundaries of that plot.
- Each house is selectable and links to its existing household record. No household data is changed.

## Visual research

[Dudley Council, Mushroom Green Planning Guidance Note 22](https://www.dudley.gov.uk/media/3xcfak1v/mushroom-green-guidance-note-22.pdf) describes early nailmakers' homes using local clay, slag, and brick; irregular paths and lanes; cottages and terraces; and nearby workshops. It also describes darkened clay-tile roofs and brick or rendered walls. These informed the three cottage types and their worn surfaces.

[Black Country Living Museum, Cosy Days trail](https://bclm.com/plan-your-visit/trails/cosy-days/) describes Jerushah's cottage as built around 1847 and the back-to-backs as built in 1852. Their current museum settings represent later dates. We use their modest building forms as context, not their later interiors as proof of 1865 conditions.

[The museum's Chainmaker's House notes](https://bclm.com/wp-content/uploads/2021/08/thechainmakershouse-information-1.pdf) date that house to 1886, with a 1914 setting representing a fairly prosperous household. It is not the default dwelling for this scene.

The user's selected Google/Alamy “traditional coal house” image informed the preference for simple, undecorated brick forms. Its caption is not treated as proof of a domestic building type. No stock-photo pixels or downloaded meshes are used.

## Files and build

- `scripts/village/build_cottages.py`: original seeded Blender cottage kit; reuses the forge's mesh and surface helpers.
- `assets/village/cottages.blend`: editable three-type source.
- `public/village/cottages.glb`: compressed, validated runtime kit, about 7.25 MB.
- `scripts/village/optimize.mjs`: decoded geometry checks, glTF validation, texture and mesh compression. Budget: 600,000 triangles / 16 MB for the kit.
- `src/scripts/village/layout.ts`: projection and placement logic.
- `src/scripts/village/scene.ts`: landscape, paths, yards, trees, level of detail, selection, overlay, smoke, lights, and cameras.
- `src/pages/village.astro`: accessible controls and household picker.
- `artifacts/village/`: asset, layout, and browser validation receipts.

```sh
npm run village:model
npm run village:check
npm run build
node_modules/.bin/esbuild scripts/village/check-layout.ts --bundle --platform=node --format=esm --outfile=/tmp/mushroom-village-check.mjs
node /tmp/mushroom-village-check.mjs
npm run preview -- --host 127.0.0.1 --port 4326
```

The model command rebuilds the three cottages only. The village also loads the existing forge GLB and removes its separate landscape at runtime. No paid generation services are required. `game-dev` is unavailable on this host; the direct Blender and glTF validation path is used.

## Controls

Drag to orbit; right-drag to pan; scroll/pinch to zoom. Five views show the north-up village, Henry's house, the lane, Black Brook, and the chainshop. Select a house in the scene or from the complete household picker. The overlay shows mapped lines and household numbers. Daylight, pause, and notes controls work independently. Canvas keyboard controls: arrows orbit, +/− zoom, Home restores the village. Escape closes notes and household panels. Reduced motion disables ambient motion and camera transitions.

## Limits

The scene is an exterior study. Interiors, people, and historical railway reconstruction are not implemented. The map lacks enough elevation and railway alignment evidence for a surveyed reconstruction. The settlement's proportions and routes are retained; surrounding terrain and vegetation are composed for atmosphere. The maximum detailed-house count is bounded, but all 59 household records can be explored individually. There are 58 cottage placements plus the chainshop.

## Landscape refinement

The opening camera now uses a steep north-up view based on Tom’s screenshot. The chainshop location follows the selected [Google Maps pin](https://www.google.co.uk/maps/place/Mushroom+Green+Chain+Workshop/@52.4761201,-2.0932754,17.21z/data=!4m6!3m5!1s0x4870917b9afbfef1:0x60d7d2568dc09a4b!8m2!3d52.4754217!4d-2.0931022!16s%2Fg%2F11lh52t0z9). Roof orientation remains a visual estimate.

`landscape.ts` paints varied earth lanes, twin wheel tracks, gravel, and damp banks. Joined stream meshes follow lightly rounded versions of the original brook lines. A spatial index carves the bed in the terrain. Water uses animated normals, shallow-edge colouring, and a cached local cube reflection. This is an artistic real-time effect, not a fluid simulation or planar reflection at every bend. A separate layer of instanced stones, reeds, and smaller-leaved shrubs follows the banks and road margins. Pause also stops the water animation.

The original X watermill poster was reviewed again for bank treatment, foliage layering, and water colour. The installed Three.js shader chunks and its water examples informed the implementation. No X bookmarks were needed. No source images or third-party texture pixels are bundled.

### Individual dwelling character

Each household number now seeds a fixed combination of wall and roof colours, joinery, building height, service additions, extra chimneys, shutters, repairs, thresholds, and stored timber or boxes. These are artistic details, not claims about each family's recorded home. Main footprints remain tied to the map. Materials are cloned per home so changes do not spread to neighbouring houses; geometry and textures remain shared. Character stays consistent across the close and distant models.

The visible + / − controls and keyboard shortcuts share the same distance limits. Buttons stop a running camera transition and zoom around the current target.
