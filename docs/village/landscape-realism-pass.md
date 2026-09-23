# Landscape realism pass (23 September 2026)

Five landscape improvements to `/village`, plus the garden hedges and vegetable beds Tom flagged during review. Before/after pairs (same camera, same `still=1` time) are in `artifacts/village/landscape-pass/`.

All new placement uses **its own seeds**. Where an old generator was replaced, its draws from the shared RNG are still consumed, so every house, tree, rock, bush and reed stays where it was. Houses, records and historic numbering are unchanged.

## 1. Trees: leaf-cluster crowns on branching trunks (`foliage.ts`)

**Before:** each broadleaf crown was 1,500 loose folded triangles (≈6,000 tris per tree, ≈11 M in total). Close up it read as green confetti. Trunks were a 7-sided pole with four straight 90° sticks. Firs and pines were flat dark "flags".

**Now:**
- There is a procedural **leaf atlas** (a 2048×1024 canvas): oak-type and beech/ash-type sprays, hawthorn, bramble, fir shoots, pine brushes, and fresh and overwintered fern fronds. Custom mipmaps **preserve alpha coverage**, so distant crowns keep their density.
- Crowns are **alpha-cut cards**, built as lumpy clumps at the branch tips. Each card has a volume normal (crown-plus-clump), so the canopy shades as masses. The AO is baked into vertex colour. There is a mild sun transmission term, a slow sway on the scene clock (still on `still=1` and when paused), and a fade for cards seen edge-on.
- **Three broadleaf variants** with curved trunks and limbs, root flare, secondary twigs and bark UVs scaled by length. All stay inside the original crown envelope, so clearances and crown hiding are unchanged.
- **Scots pine** (clean upper stem, flat brush clumps) and **fir/spruce** (drooping arms, flat sprays and hanging branchlets).
- **Shrubs** use the same cards.
- Crowns render on `FOLIAGE_LAYER` (2). The main, planar-reflection and environment cameras see this layer. The GTAO camera does not, because its override pass ignores alpha cut-outs.

## 2. Brook banks: bedded stones and soft rush (`riverbank.ts`)

- Four stone shapes: water-rounded cobbles and split sandstone with bedding faces. Displacement is position-based, with vertices merged for smooth normals, and the bottoms are flat so the stones bed into the bank. There are pebble LODs.
- Moss grows on exposed tops, with a dark wet band and a damp sheen low down.
- A separate seed breaks the old continuous "kerb" into irregular groups, with gravel gathered around the larger stones.
- **Soft-rush clumps** (13 tapered, arching blades with dark bases and some spent tips, swaying at the tips) replace the two-triangle reeds.

## 3. Woodland floor (`woodland-floor.ts`)

Under the dense valley trees, and clear of roads, paths, yards, brook banks, workshops and fixed camera lines:
- 460 **male-fern** colonies (1,767 shuttlecocks), with fresh and overwintered fronds.
- 237 **bramble** mounds.
- 120 **fallen limbs** and 80 **snapped stumps**. The bark shares the tree bark detail, and the cut ends are pale.
- Russet leaf and dead-bracken **litter** painted onto the ground canvas.

The season follows the existing bluebells and daffodils (spring).

## 4. Sky, haze and the far country (`sky.ts`)

- A **sky dome** with a graded zenith, smoke-stained horizon haze, sun glow and soft drifting cumulus. It follows the Daylight/dusk control. The fog takes the haze colour.
- Fog changed from mist (fully fogged at camera distance + 145 m) to **haze** (distance + 520 m).
- The model no longer ends at a cliff. A **far-country ring** (to 2.2 km) continues the ground: hedged, irregular parcels, mostly pasture with some hay and ploughed ground; hedgerow oaks; small copses; a brook valley carried on; and the two outside roads fading out. Near the seam it takes the village ground's grain and colour.
- The same field function runs in GLSL and in JavaScript, so hedge bushes and hedgerow trees stand on the painted hedge lines.
- **Interpretation:** the far country is generic enclosure landscape, not mapped fields. Only its rise toward the north-east (the Rowley Hills direction) echoes the real setting.

## 5. Lane margins (`lane-verges.ts`)

- An irregular grass edge is painted over the lane shoulders (footpath mouths stay clear).
- Clustered verge tussocks, with bare gaps.
- A sparse grassy crown between the ruts of the hamlet's own lanes (not the outside road, and not at junctions).
- Grit and cinders in the wheel tracks. Cinder surfacing is plausible locally, but it is **not documented** for these lanes.
- Spring dandelions on the verges.

## Garden hedges and vegetable beds (`yard-plots.ts`, from Tom's review)

- The plot-boundary hedges (stakes carrying faceted icosahedron blobs) are now dense leaf-card runs of clipped hedge, about 0.9–1.1 m high.
- The plot vegetable beds (flat icosahedron "leaves") now hold instanced **cabbage** plants with cupped, veined outer leaves.
- The earlier triangle-pyramid shrubs are replaced by item 1.

## Checks

- `npm run village:check` and `npm run build`: pass.
- Layouts, objects, inhabited, navigation, roads, historic, surfaces, textures, workshop, workshop-props, props, outbuildings, cart, life: all pass. The historic check needed a DOM-free placeholder in `leafAtlas()`.
- Browser (headless Chrome with a Metal GPU, 1600×1000): the preset views village, lane, brook, outside, workings, approach, washing and yard. Also Henry's room, the main-workshop cutaway and the cottage cutaway. Custom `?cam=` views: wood, bank, oblique, south and garden.
- Relative frame time, same machine, headless (median ms): village 29.8 → 20.8, lane 31.5 → 20.5, brook 22.2 → 11.7, oblique 23.2 → 17.9. This is not a device benchmark.

## Review hook

`/village?cam=x,y,z,tx,ty,tz` fixes an exact outdoor camera for repeatable comparisons, for example `&still=1&clean&cam=-98,8,40,-104,5.5,26` for the brook bank.

## Known limits and next steps

- Needle and leaf textures are painted procedurally, not scanned. Close up they read as illustration-grade.
- The pond and brook water surfaces are unchanged (water is still deferred).
- Hedges in the far country appear only within about 190 m of the edge. Beyond that, the painted hedge lines carry them.
- Possible next steps: bark moss and ivy on trunks, autumn and seasonal palettes, and far-country LOD for mobile.

## Follow-up (same day): mapped far country, trunk ivy and moss, continuous limewash

Tom asked for three changes: less of an artificial rim, with the brook and roads continuing; ivy and moss on some trunks; and a more authentic limewash than the mixed white and red bricks. Comparisons are in `artifacts/village/landscape-pass-2/`.

### Far country from the OS six-inch sheets (`scripts/village/build-far-country.py`, `sky.ts`)
- **Source:** NLS georeferenced OS Six Inch county tiles (Worcestershire and Staffordshire, zoom 17, about 0.73 m per pixel; CC-BY NLS). These are the 1881–82 survey, **16–17 years after the 1865 scene**, so the result is an interpretation. The tiles are cached, and ignored by git, under `artifacts/village/far-country/tiles/`.
- **Extraction:**
  - Blue ink and pale reservoir wash become water. Rectangular solid ink becomes buildings; bold lettering is rejected because it has holes or is not rectangular.
  - Long hairline ink becomes field and lane boundaries. Thick lettering strokes are removed, and sheet neatlines are dropped.
  - Enclosed parcels are coloured as pasture, hay or ploughed ground, and narrow parcels as lanes.
  - Dense ringed tree marks become woods (Saltwells Wood, the Coppice, Birchtree Coppice).
- **Outputs** (`public/far-country/`): a 4096² ground texture (0.8 MB) and a JSON file (1.1 MB). The JSON holds 2,296 buildings, woodland, tree marks, hedgerow trees, hedge centre-lines with direction, four brook routes, and real ground heights from the EA 2 m DTM where the survey reaches (8 m grid with a confidence weight; about 70% coverage).
- **Brook routes** are traced along the map's blue ink with a least-cost path: Black Brook north through Saltwells Wood, Mud Brook west, Black Brook south, and Mousesweet Brook east. They render as water ribbons.
- **In the scene:**
  - The ring mesh uses real DTM heights and settles into the model's own ground at the seam.
  - The same map texture fades into the outer band of the village's painted ground canvas, from 74% to 97% of the ellipse. This removes the rim.
  - Map buildings are brick boxes with slate or tile roofs; large works get stacks.
  - Hedges within 200 m follow the mapped boundaries. Near trees reuse the village broadleaf models.
- Beyond the sheet extent (±1.7 km), the procedural parcels continue under the haze.
- The brook ribbons use the historic pools' water material. The brook's own material samples its planar reflection, which caused a framebuffer feedback loop.
- To regenerate: `python3 scripts/village/build-far-country.py`. It needs numpy, scipy, scikit-image and Pillow, plus the local (untracked) `artifacts/village/terrain/ea-dtm-2m.tif`.

### Ivy and moss (`foliage.ts`)
- A new ivy cell in the leaf atlas: palmate, glossy, three-to-five-lobed leaves on wiry stems.
- Ivy cards climb the curved stem of each broadleaf variant on one broad side, thinning with height, up to 2.2–4.4 m. About a third of woodland broadleaves carry ivy (199 trees). It uses its own seed, and it hides together with its trunk in close house views.
- `mossyBark()` adds green moss on the damp north (−Z) side and upper surfaces, strongest low down, with pale lichen crusts higher up. It applies to all trunks and, through the shared bark, to fallen logs and stumps.

### Limewash (`dwellings.ts`, `building-age.ts`)
- **Cause:** the Blender cottage kit painted about 83% of individual bricks on style-2 cottages with "Old limewash" materials. Runtime tinting then made some houses pale. The result read as randomly white-painted bricks.
- **Now:** style-2 cottages carry one continuous limewash coat over bricks and joints, applied after all colour layers. It uses the interior lime atlas (plaster half of `lime-linen-v1.webp`), projected on the wall planes. The brick coursing reads through the thin coat.
- The coat has worn back to brick in the splash zone and in a few larger scaled areas. It has green damp at the foot and rain runs below the eaves.
- Chimney stacks stay bare brick. The distant LOD already used a lime surface. No Blender rebuild was needed.
