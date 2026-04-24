# Babylon.js village spike — design

Date: 2026-04-24
Status: approved — ready for implementation plan
Author: Tom Weaver (Claude drafting)

## Goal

Build a new `/babylon-spike` Astro route that renders Mushroom Green as a painterly 3D village using Babylon.js with an orthographic iso camera. The `/phaser-spike` (Round 2) closed the "decorated Leaflet" ceiling but hit a new one — painted 2D sprites with runtime particle/tween overlays cannot reach Townscaper-level quality. This spike tests whether moving to 3D geometry + Blender-authored assets + corner-modular architecture + dual-graph tile placement clears that second ceiling.

Success criterion: side-by-side against `/phaser-spike` at equivalent framing, the Babylon scene visibly advances toward Oscar Stålberg's Townscaper aesthetic — painterly modular architecture, coherent ground plane, organic brook/road integration, and free camera rotation. If one good iteration does not land there, the approach is wrong — stop and rethink the engine choice.

## Reference

Oscar Stålberg's *Beyond the Townscaper* talk. Key takeaways applied here:

- **Irregular quad grid** derived from real geography (brook, roads, boundary), not a regular square/hex tessellation.
- **Dual-graph slicing** so terrain transitions land mid-tile, not on tile edges. Fewer modules, more visual space per transition.
- **Corner-modular architecture** — buildings assemble from 4 rotatable/mirrorable corner pieces + independent prop placement (chimneys, doors, windows). Handcraft the modules; compose procedurally.
- **Feature-appropriate grids, mixed** — quads for architectural things, triangles/edges for organic things (rivers on tile edges).
- **Non-interactive generation needs few tiles.** Our hamlet is fixed; we pre-bake placements offline and skip runtime WFC complexity.
- **Props separate from tiles.** Doors, windows, chimneys, smoke live in their own prop placement system with independent rendering.
- **Aesthetic cheats that come free in 3D:** real SSAO, real shadow mapping, real water reflections (flip-mesh or screen-space), real material-driven ink-line outlines.

The spike adapts the ethos to our 2D-iso-look / true-3D-under-the-hood setup. Townscaper is the north star, not the literal port.

## Non-goals

- Replacing `/` Leaflet hero, `/spike-isometric`, or `/phaser-spike` — all three stay live for comparison.
- All 59 households. Spike uses ~6 cottages placed at the first 6 cluster centroids.
- Full tile set. Spike ships grass + dirt-path tile variants only (~4-6 tile glTFs). No snow, no paving stones, no grass-to-water transition.
- Full animation suite. Spike ships one forge smoke prop + brook UV-scroll. No door hinge, no window glow, no willow sway.
- Offline WFC-lite placement solver. Spike hand-wires positions.
- Mobile touch / gesture handling.
- Final palette match, lighting tuning, SSAO tuning, post-processing stack.
- Unit tests. Verification is by screenshot comparison and visual review.

## Engine and projection

**Babylon.js 8.x** (current stable, ~1 MB core) loaded as ES module inside Astro. Renders to a `<canvas id="babylon-root">` on route `/babylon-spike`.

**Orthographic camera** — Babylon's `ArcRotateCamera` in orthographic mode at 30° elevation angle, 45° azimuth (classic iso look). Fixed zoom; azimuth is player-controllable via arrow keys in 90° increments.

Camera mounting:

```
camera.mode = Camera.ORTHOGRAPHIC_CAMERA
camera.alpha = -Math.PI / 4     // azimuth, rotates on arrow keys
camera.beta  =  Math.PI / 3     // elevation (30° from horizontal) — fixed
camera.radius = 100             // irrelevant in orthographic mode but Babylon requires it
camera.orthoTop / Bottom / Left / Right computed from scene extent at first load
```

Because we're in true 3D with an orthographic camera, depth sorting is handled by the Z-buffer — no painter's-algorithm y-sort needed. This removes an entire category of Phaser spike friction.

## Flagged decisions (locked)

1. **Engine: Babylon.js 8.x.** Over Three.js because the higher-level defaults (scene graph, PBR, shadows, animation) reduce scaffolding Codex has to write. Over Unity/Godot because pure-web (no WASM bundle, no editor dependency, no iframe).
2. **Projection: orthographic 3D, not 2D iso math.** Free depth sort, free 4-angle camera rotation, real shadows and AO.
3. **Asset pipeline: Blender-MCP-driven.** Codex issues Blender MCP calls to author corner/prop/tile modules, exports as `.glb`, Babylon imports via `SceneLoader`. No manual Blender work.
4. **Tile shape: regular iso diamond (2:1 ratio).** The spike uses a regular diamond tessellation. Townscaper's *irregular* quad grid derived from real geography is deferred to production — the spike proves corner-modular + dual-graph + prop-separation at the smallest grid complexity that still reads.
5. **Placement: pre-baked, hand-wired for the spike.** No runtime WFC. Production can add offline constraint solving later.
6. **Brook: dual-graph edge geometry.** Brook ribbons sit on tile edges (not tile faces) per Oscar's rule — transitions get full visual space. Rendered as a `Mesh` with UV-scroll water shader.
7. **Props: independent placement system.** Chimneys, doors, windows, smoke emitters attach to cottages post-assembly, not baked into corner modules. Keeps the module set tiny.
8. **Repo / route: same repo, new route `/babylon-spike`.** Parallel to `/phaser-spike`. Sprite/glTF assets under `public/babylon-sprites/` (gitignored, same pattern).

## Architecture

### Files

```
src/pages/babylon-spike.astro           route + data bridge + canvas mount

src/scripts/babylon/spike-scene.ts      entry — engine, scene, camera, lights, boot
src/scripts/babylon/ground.ts           iso diamond tile grid, dual-graph edge routing
src/scripts/babylon/building.ts         corner-modular cottage assembly from glTF
src/scripts/babylon/brook.ts            polyline ribbon + UV-scroll water shader
src/scripts/babylon/props.ts            chimney / door / window / smoke placement
src/scripts/babylon/interactions.ts     pointer hover, tooltip, click → /households/[id]/
src/scripts/babylon/rotation.ts         keyboard camera rotation (Arrow keys, 4 angles)

public/babylon-sprites/                 gitignored (same pattern as public/spike-sprites/)
  tile-grass.glb                        painted grass tile (variant set inside one glTF)
  tile-dirt-path.glb                    painted dirt path tile + edge variants
  cottage-corner.glb                    4 corner modules (mirror/rotate to cover all 4)
  cottage-roof.glb                      roof mesh
  prop-chimney.glb                      chimney prop
  prop-door.glb                         door prop
  prop-window.glb                       window prop
  prop-smoke-emitter.glb                smoke particle emitter anchor + animation
```

Reuses existing `src/data/clusters.json`, `src/data/brook.json`, `src/data/roads.json`, and `src/content/households/*.md` unchanged.

### Dependency adds

- `@babylonjs/core` (8.x) to `dependencies`
- `@babylonjs/loaders` to `dependencies` (glTF loader)

No other packages. No React, no shader framework, no particle library (Babylon ships its own particle system).

### Data bridge

Astro emits JSON via `<script type="application/json" id="scene-data" set:html={...}>`:

```json
{
  "clusters": [ /* first 6 entries from clusters.json */ ],
  "brook": [ /* brook.json polyline */ ],
  "roads": [ /* roads.json polylines */ ],
  "boundary": [ /* hamlet boundary */ ],
  "byNumber": { /* 6 household lookups for click routing */ }
}
```

`spike-scene.ts` parses this at boot and passes components into each submodule.

## Data flow

1. Astro renders `/babylon-spike` with BaseLayout, canvas, JSON `scene-data`, scoped CSS.
2. `spike-scene.ts` creates `Engine`, `Scene`, `ArcRotateCamera` (orthographic), `HemisphericLight` + `DirectionalLight` (for shadows).
3. `ground.ts` reads boundary + roads, lays iso diamond tiles covering scene extent. Tiles alternate between `tile-grass` instances and `tile-dirt-path` instances along road polylines.
4. `building.ts` loads corner + roof glTFs once, then instantiates 6 cottages at the first 6 cluster centroids. Each cottage is a square footprint assembled from 4 instances of the single corner glTF, rotated to 0° / 90° / 180° / 270°, plus 1 roof mesh. Non-rectangular footprints (pentagon, hexagon) are deferred to production.
5. `props.ts` attaches chimneys + doors + windows to each cottage (offsets computed from corner geometry). Smoke emitter attaches only to the hero cottage — the cottage at the first cluster-centroid whose `hasForge` flag is `true` in `clusters.json`.
6. `brook.ts` builds a ribbon mesh from `brook.json` polyline, assigns the UV-scroll water shader material, places it on tile edges.
7. `interactions.ts` attaches `scene.onPointerMove` + `scene.onPointerDown` observers, uses ray-picking with mesh metadata to identify cottage hits. Pointer-over shows DOM tooltip (createElement only, no innerHTML — project hook blocks it). Click sets `window.location` to `/households/[id]/`.
8. `rotation.ts` listens for `keydown` on `ArrowLeft` / `ArrowRight`, animates `camera.alpha` in 90° steps with a short easing.

## Error handling (spike-level)

- glTF load failure → `console.error(assetName, err)`, scene continues with that asset missing.
- Missing `scene-data` JSON → render a visible warning banner ("scene data missing"), scene still boots empty.
- No WebGL2 support → page-level error div: "This spike requires WebGL2. Try a recent Chrome / Firefox / Safari build."
- Explicitly NOT adding: retry, asset caching, fallback models, graceful degradation. Spike failures should be visible and stop us, not hide.

## Testing

- **Visual comparison:** browser-harness screenshot at the default cinematic view, side-by-side with the current `/phaser-spike` screenshot.
- **Rotation correctness:** four screenshots at 0° / 90° / 180° / 270° azimuth. Depth-sort stays coherent at every angle.
- **Click routing:** one manual click test per rotation angle confirms the ray-pick still resolves to the right household.
- No unit tests, no Playwright. Spike is verified by eyeballing output against the reference and by Tom's gate decision.

## Success criteria (gate for writing the production plan)

1. `/babylon-spike` loads in dev (`npm run dev`) with zero console errors.
2. Default view shows: painted iso tile ground covering the scene + ~6 corner-modular cottages + brook as a flowing ribbon on tile edges + one animated forge smoke plume.
3. Arrow keys rotate the camera through 4 cardinal angles. Scene remains coherent — no visual glitching, no broken depth sorting, no disappearing geometry — at every angle.
4. Hovering a cottage tints/highlights it and shows a DOM tooltip with the household name. Click navigates to the correct `/households/[id]/` detail page.
5. **Gate decision:** Tom reviews side-by-side screenshots of `/babylon-spike` vs `/phaser-spike` and declares either "clears the Phaser ceiling — proceed to production plan" or "specific gaps remain — iterate within the spike."

## Decisions deferred to production (explicitly not in the spike)

- All 59 households, with terrace-footprint grouping
- Irregular quad grid derived from real geography (brook + roads + boundary define the mesh)
- Non-rectangular cottage footprints (pentagon, hexagon) built from corner modules
- Offline WFC-lite placement solver that respects real hamlet topology
- Full tile set (paving, terrace stones, grass-to-water, snow)
- Full animation suite (door hinge, window glow flicker, willow sway, character walk)
- Post-processing stack (SSAO tuning, painterly shader, ink-line outline)
- Palette matching against the site's IM Fell English + Staffordshire brick palette
- Mobile touch / gesture handling
- Zoom-out to pannable mode (the hybrid we locked in Q1 — default cinematic view only in the spike)
- Production build and Netlify deploy

## Timeline

Spike is scoped to days, not weeks. No external dependency on timelines. Tom's "quality trumps everything, time doesn't phase me" stance applies to production, not the spike — the spike's job is to learn fast.
