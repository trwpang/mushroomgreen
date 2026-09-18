# The chain shop

A standalone, explorable forge at `/forge`. Python builds the geometry in Blender.
Three.js renders the exported GLB. The existing map and earlier studies remain in place.

## References and scope

- [Mohamed's reference scene](https://x.com/zavrenn/status/2100672315780460720): detailed small architecture, natural plants, soft light, and an explorable browser scene.
- `photos/IMG_7256.HEIC`, `IMG_7257.HEIC`, `IMG_7258.HEIC`: the surviving Mushroom Green shop's brick, slate, shutters, and three tall flues.
- `photos/IMG_4259.HEIC`: gable and entrance context.
- `legacy/Map/Mushroom Green — 1865 v12.png`: village context. This study does not place a new building on the household map.
- [Black Country Living Museum industrial trail](https://bclm.com/plan-your-visit/trails/industrial-enthusiasts/): small chain shops and backyard working spaces. The museum's chain shop display represents 1900; it is a trade reference, not proof of an 1865 layout.

The shell follows the photographs. Dimensions, interior layout, tools, tree, fence, and yard are artistic estimates.
This is not a measured reconstruction. All meshes and material pixels are original scripted work; no stock assets were used.

## Files

- `scripts/forge/build_forge.py`: seeded geometry and material generator, using metres and Blender Z-up coordinates.
- `assets/forge/mushroom-green-forge.blend`: editable source with camera, materials, lights, and named mesh parts.
- `scripts/forge/optimize.mjs`: Meshopt geometry compression, WebP colour textures, decoded geometry checks, and Khronos validation.
- `public/forge/mushroom-green-forge.glb`: browser asset, exported Y-up.
- `public/forge/asset-manifest.json`: size, hash, provenance, geometry count, and validation result.
- `src/scripts/forge/scene.ts`: Three.js viewer, contact shading, lights, smoke, sparks, and controls.
- `artifacts/forge/gltf-validation.json`: validation receipt. The Khronos validator cannot decode Meshopt; the script separately decodes and checks vertices and triangle indices.
- `artifacts/forge/preview-0001.png`: Blender still. Browser lighting and smoke are separate from this still.

## Build and view

Requirements: Node with npm, plus Blender on `PATH`. Tested with Blender 5.2.1.

```sh
npm install
npm run forge:model
npm run forge:check
npm run build
npm run preview -- --host 127.0.0.1 --port 4326
```

Open `http://127.0.0.1:4326/forge`. Ordinary frontend edits do not need a new model export.
`npm run forge:model` replaces only this study's generated `.blend`, `.glb`, manifest, and validation receipt.

To render a still from the source:

```sh
blender --background assets/forge/mushroom-green-forge.blend --render-output ./artifacts/forge/preview- --render-frame 1
```

## Controls

- Drag to orbit. Right-drag to pan. Scroll or pinch to zoom.
- The yard, roof, and brickwork buttons select camera views.
- The roof view inspects the intact exterior. Interior cutaway controls are removed.
- Daylight switches to dusk. Pause stops smoke, sparks, and fire flicker.
- Reset restores the yard camera.
- The information button opens reference notes and a GLB download.
- With the canvas focused, Left/Right orbit, +/− zoom, and Home resets the camera.
- Reduced-motion settings stop ambient movement and camera transitions.

## Checks and limits

The production build, focused TypeScript check, glTF validation, and decoded mesh checks pass.
Browser checks cover loading, exterior camera views, day/dusk, pause/play, notes, reset, and phone framing.
The GLB budget is 12 MB and 600,000 triangles for this single study. See the manifest for actual counts.
This detailed model is a study asset. A village with many copies will need instancing and lower-detail versions.

Transparent smoke uses a separate render layer so the ambient-occlusion pass cannot turn billboards into solid walls.
Hearth shadow maps update at load; flame flicker does not force six new shadow renders each frame.

The weathering pass uses `scripts/forge/weathering.py`: sixteen unique slate, oak, and brick surfaces, with colour, normal, and roughness maps. Each piece has local atlas coordinates. Slates have chipped corners and uneven tilt; boards have uneven ends and slight twist. Moss gathers along damp eaves. Smoke has an irregular soft silhouette.

## Next visual decisions

Review the overall direction against the X reference. Confirm the desired balance of realism and model-like presentation.
Use measured dimensions if a historically exact shell is required. Approve this building before expanding the village.
