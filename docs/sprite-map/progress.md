# Sprite Map Progress

## 2026-04-24

- Promoted the sprite renderer to the default homepage.
- Preserved the Leaflet version at `/legacy-map/`.
- Added `/sprite-map-editor/` for cluster sprite selection, scale, drag offset, local persistence, and JSON export.
- Added pipeline categories/warnings/notes.
- Explicitly rejected `09-stream-v1` as black water.
- Added forge smoke particles.
- Added initial prop and vegetation dressing.

## 2026-04-24 Continued

- Added source-of-truth docs in `docs/sprite-map/`.
- Moved camera, brook accents, vegetation, props, and labels into `src/data/sprite-scene.json`.
- Added JSON apply/import to the editor.
- Made cluster dragging persist after pointer-up.
- Added accepted/rejected status to the sprite pipeline manifest.
- Filtered rejected sprites out of renderer/editor selection.
- Added data-driven road sprite dressing along real road polylines.
- Generated and processed a 16-cell water/road/prop sheet using strict magenta-grid sprite-forge style rules.
- Swapped the default brook and road dressing to the new blue-water and muddy-track sprites.
- Moved production sprite inputs to `assets/sprite-map/raw/` and generated deployable assets under `public/sprite-map/generated/`.
- Tightened the default camera framing toward the illustrated hamlet.
- Added visible brook, pool, and bridge accents to the authored scene layer.
- Added configurable drawn-road strength so sprite lane texture can take visual priority.
- Added authored ground/yard patches behind buildings to break up the flat green plane.
- Added curve-aware road sprite selection, using bend sprites on sharper road turns.
- Added deterministic horizontal flipping for non-forge clusters to reduce repeated silhouettes.
- Hardened the sprite pipeline so helper-mode sheets fall back to border-sampled ImageMagick keying when the imagegen helper cannot run.
- Captured desktop, mobile, and editor screenshots under `spike/screenshots/townscaper/codex-stint-*`.
- Verified the Codex in-app browser path through the `browser-client` `iab` backend and used it for visual checks.
- Added deterministic hamlet infill: small worn satellite dwellings now derive from household counts around each cluster, moving the homepage from 14 isolated icons toward a denser village fabric.
- Restricted infill to the grubbier `16-worn-*` sprite family so the new density follows the worn forge/cottage reference direction.
- Changed opening camera framing to prioritize inhabited clusters and non-water props instead of allowing raw brook/road/vegetation extents to pull the composition away from the village.
- Saved the current verified browser shot at `spike/screenshots/townscaper/codex-app-01-infill-framing.png`.
- Switched brook rendering from raw polyline spray to authored scene props via `water.mode = "authored"`, so blue water appears only where the composition has been art-directed.
- Added subtle sprite animation support for scene water props in `sprite-village-map.ts`.
- Built the first forge/brook slice: extra damp ground patches, soot yard patches, muddy lane overlays, coal/cart/barrel/fence/puddle props, brook ripples, and pulled-in willow/scrub vegetation.
- Tuned the compact browser/mobile panel and narrow camera crop for a more usable Codex app browser view.
- Captured verified Codex browser screenshots at `spike/screenshots/townscaper/codex-app-02-forge-brook-slice.png` and `spike/screenshots/townscaper/codex-app-02-editor.png`.
- Replaced the ellipse/shadow-based ground treatment with a subtle configurable tile substrate in `src/data/sprite-scene.json`.
- Removed cluster base shadows and infill oval shadows so building scale reads against floor tiles rather than large circular blobs.
- Captured the tile-substrate browser baseline at `spike/screenshots/townscaper/codex-app-03-tile-substrate.png`.
- Made cluster sprites and deterministic hamlet infill snap to the new tile centers by default, while keeping authored brook/road props free-positioned.
- Captured the tile-snapped browser check at `spike/screenshots/townscaper/codex-app-04-tile-snapped.png`.
- Switched the active substrate from isometric diamonds to Civ-style hexes, while leaving the diamond path configurable for A/B comparison.
- Captured the hex substrate browser check at `spike/screenshots/townscaper/codex-app-06-civ-hex-tiles.png`.
- Changed Civ-style hexes from screen-space drawing to ground-plane metre drawing projected through the same isometric transform as the map, so the tile grid reads as lying on the flat terrain plane.
- Captured the ground-projected hex browser check at `spike/screenshots/townscaper/codex-app-07-ground-projected-hexes.png`.
- Researched tile/sprite placement and perspective tradeoffs; wrote the placement architecture notes in `docs/sprite-map/grid-placement-research.md`.
- Added a cell-addressed building placement layer: `src/data/cluster-tile-placements.json` now pins each 1865 cluster to an explicit hex coordinate, and `src/data/sprite-footprints.json` defines one-, two-, and three-cell sprite footprints.
- Changed main cluster rendering to draw each footprint under the sprite, anchor each sprite from its footprint baseline, and depth-sort by occupied cells rather than raw centroid position.
- Added editor Cell Q/R controls so selected clusters can be moved by grid coordinate and exported as placement overrides.
- Captured verified browser shots at `spike/screenshots/townscaper/codex-app-09-explicit-footprint-placements.png` and `spike/screenshots/townscaper/codex-app-10-editor-cell-controls.png`.
- Improved editor usability: editor now auto-selects the first building, stale pre-footprint local overrides are ignored, scale/cell controls start enabled, empty-tile clicks can move the selected footprint, and left-drag on empty map pans the camera.
- Rebalanced default footprint scales and changed multi-cell building anchoring to footprint centroids so houses sit more deliberately inside their occupied cells.
- Captured the editor usability shot at `spike/screenshots/townscaper/codex-app-11-editor-usability.png`.
- Made the tile grid itself part of the editor interaction model: rendered tiles are tracked as visible/selectable cells, hover draws a tile highlight, selected cells draw a stronger outline, and click-to-place is constrained to actual visible tiles.

## Next Required Work

- Replace the remaining traced road feel with tile-native road/yard/brook terrain.
- Convert deterministic hamlet infill, authored props, and vegetation from free points into cell placements or derived decoration rules.
- Generate more worn building variants so repeated clusters stop looking like copies.
- Reduce remaining green/chroma fringe on older single-sprite nanobanana assets.
- Capture desktop and mobile screenshots after each composition pass.
- Create the next true sprite sheet for Black Country lane/bank/reed/yard pieces so the forge/brook slice can stop relying on repeated generic prop sprites.
- Decide whether the full map should use authored water-only placement or generate a new brook path fitted to the illustrated green.
