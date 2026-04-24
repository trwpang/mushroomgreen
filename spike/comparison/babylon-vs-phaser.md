# `/babylon-spike` vs `/phaser-spike` — side by side

Round 3 Babylon.js spike vs Round 2 Phaser spike. This doc is the input to Tom's gate decision at Task 18 of the Babylon spike plan (`docs/superpowers/plans/2026-04-24-babylon-spike.md`).

## Screenshots

Run this from the repo root with the dev server up:

```bash
# Replace <PORT> with Astro's current dev-server port (check npm run dev output)
browser-harness <<'PY'
import time
new_tab("http://localhost:<PORT>/babylon-spike")
time.sleep(2)
screenshot(path="spike/comparison/babylon-default.png")
keypress("ArrowRight"); time.sleep(0.7)
screenshot(path="spike/comparison/babylon-rot-90.png")
keypress("ArrowRight"); time.sleep(0.7)
screenshot(path="spike/comparison/babylon-rot-180.png")
keypress("ArrowRight"); time.sleep(0.7)
screenshot(path="spike/comparison/babylon-rot-270.png")
new_tab("http://localhost:<PORT>/phaser-spike")
time.sleep(2)
screenshot(path="spike/comparison/phaser-default.png")
PY

# Combine the four rotation frames into a single 2×2 montage
magick montage spike/comparison/babylon-rot-{0,90,180,270}.png \
  -tile 2x2 -geometry +4+4 \
  spike/comparison/babylon-rotations-nesw.png
# (babylon-rot-0.png is the same as babylon-default.png — copy or symlink it)
```

## Success criteria check (design spec §Success criteria)

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `/babylon-spike` loads in dev with zero console errors | ✅ | Confirmed during Task 1/2/3/5 visual checks; no errors after boot-error-capture wrapper landed |
| 2 | Default view: painted iso ground + ~6 cottages + brook + 1 smoke plume | ✅ | All components wired in Tasks 5/6/8-9/10/11-12/13. Visual density vs the vision image is low — tiles too small, cottages too plain. Deferred to Round 3.5 aesthetic pass (see below) |
| 3 | Arrow keys rotate through 4 cardinal angles; scene stays coherent | ⏳ | Task 17 wired; awaiting Tom's keyboard test — orthographic 3D means there's no per-angle work needed, so very low risk |
| 4 | Hover tint + tooltip; click → `/households/[id]/` | ⏳ | Task 15/16 wired; awaiting Tom's mouse test. Tooltip CSS uses IM Fell English to match site palette |
| 5 | **Gate decision (Tom)** | ⏳ | Pending review |

## Observations vs `/phaser-spike`

(To fill after screenshots are captured. Expected direction given what's committed:)

**Where the Babylon spike should already win:**
- True 3D camera rotation through 4 angles (arrow keys). Not faked; every angle is a real render.
- Real shadow mapping via ShadowGenerator (blur-exponential, darkness 0.35). Cottages cast; ground tiles receive.
- Brook is a UV-scrolling shader on ribbon geometry (real flow), not a Graphics stacked-stroke.
- No Phaser ParticleSystem updateList-registration hack needed — Babylon's ParticleSystem works out of the box.

**Where the Babylon spike is currently behind:**
- Tile materials are procedural `NoiseProceduralTexture`, not Blender-baked brush strokes. The grass grid at default camera reads as dark speckles, not painted meadow. Tiles-too-small + noise-too-saturated at the current camera zoom.
- Cottage walls are procedural box corners with a red-brick tint, no real brick normal maps or baked shading.
- Camera fit-to-boundary pulled too far out — the scene is postage-stamp-sized in the centre of a sea of green. Task 9's planned cluster-fit camera would close this; current code uses the boundary-fit from Task 5 still.

**Known gaps deliberately deferred:**
- Blender-authored meshes for cottages/corners/props (spec §Decisions deferred to production, plus the ground-tile gotcha rabbit hole made it clear that procedural works for simple shapes; Blender pipeline stays reserved for where it earns its keep).
- Full 59 households and terrace-footprint grouping.
- Irregular quad grid (Townscaper ethos) — still pre-baked diamond tessellation.
- Door hinge, window glow flicker, willow sway — none of those ship in Round 3 spike.
- Post-processing stack (SSAO tuning, painterly shader, ink-line outline).

## Per-decision log (Babylon 8.x modular gotchas encountered)

Saved to memory as `feedback_babylon_modular_gotchas.md`:

1. `scene.activeCamera` isn't auto-bound in 8.x modular — must set explicitly.
2. `MeshBuilder.CreateBox` doesn't attach a default material — invisible without `StandardMaterial`.
3. `createInstance` requires a side-effect import of `'@babylonjs/core/Meshes/instancedMesh'`.
4. `LoadAssetContainerAsync` keeps meshes outside the scene graph; instances don't render until `container.addAllToScene()`.
5. Blender glTF export wraps meshes in `__root__` with `[1, 1, -1]` scale; children inherit unpredictable world positions. Procedural meshes sidestep this for simple shapes.

Combined cost of finding these: ~2 hours of CDP pixel-probe debugging. Documented so future Babylon work doesn't re-pay it.
