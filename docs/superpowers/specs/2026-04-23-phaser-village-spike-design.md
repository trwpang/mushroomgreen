# Phaser village spike — design

Date: 2026-04-23
Status: approved — ready for implementation plan
Author: Tom Weaver (Claude drafting)

## Goal

Build a new `/phaser-spike` Astro page that renders Mushroom Green as a painterly 2.5D isometric village in Phaser 3. The Leaflet-overlay approach in `src/pages/spike-isometric.astro` has hit a visual ceiling — painted iso sprites plonked on a top-down map still read as "decorated Leaflet" rather than "one painted village." This spike tests whether Phaser closes that gap.

Success criterion: side-by-side against the Stitch reference, the Phaser scene feels meaningfully closer to "one painted village" than the Leaflet spike. If one good iteration does not land there, the approach is wrong — stop and rethink.

## Non-goals

- Replacing the `/` Leaflet hero
- Replacing or modifying `/spike-isometric` (stays as-is for comparison)
- Mobile touch gestures (stretch only)
- Historical accuracy of sprite-to-household mapping
- Sound, weather, day/night, characters
- Unit tests (this is a visual spike — verification is by screenshot)

## Camera & projection

**True tilted isometric.** Classic AoE / Stardew / FFT angle. The 3/4-view painted sprites in `public/spike-sprites/` were drawn for this angle and will finally stop fighting the basemap.

Trade-off accepted: the hamlet shape rotates on screen, so "real map shape" legibility is lost on this page. That grounding stays on `/` and `/spike-isometric`.

Projection pipeline:

```
lat, lng
  → metres (flat-earth with cos(lat) correction relative to hamlet centre)
  → iso screen (screenX = (xM − yM)·cos30°·k,  screenY = (xM + yM)·sin30°·k)
```

At ~300 m × 250 m hamlet scale, flat-earth distortion is < 0.5% — acceptable.

Constants:
- `HAMLET_CENTRE = [52.4757932163071, -2.0936364426410514]`
- `M_PER_DEG_LAT = 111320`
- Initial iso scale `k ≈ 10 px/m` (tuned so the hamlet fits the viewport at default zoom)

## Flagged decisions (locked)

1. **Isometric engine: hand-rolled transforms.** No `phaser3-plugin-isometric`, no tilemap iso. A ~30-line `projection.ts` + painter's-algorithm y-sort covers the ~30 total sprites in the scene.
2. **Painted background: hybrid.** One nanaban-generated painterly meadow texture as the ground layer. Brook and roads drawn in Phaser Graphics from the existing `brook.json` / `roads.json` using stacked painted-edge strokes (same recipe as the Leaflet spike). Preserves geographic fidelity.
3. **Coordinate mapping: simple affine.** See projection pipeline above.
4. **Sprite packing: individual PNGs.** 20ish sprites — atlas optimisation is not worth the iteration cost at this size.
5. **Clustering: distance-threshold merge → committed JSON.** One-shot `build-clusters.ts` script runs a 15 m merge over the 59 household positions, dumps `src/data/clusters.json` committed to the repo. Hand-tweakable.
6. **Island wiring: vanilla, no React.** Astro `<script type="module">` dynamically imports `phaser`. Scene data passed via `<script type="application/json" id="scene-data">` plus `define:vars`.

## Architecture

### Files

```
src/pages/phaser-spike.astro           route + data bridge
src/scripts/phaser-scene.ts            entry — boots Phaser, constructs the scene
src/scripts/scene/VillageScene.ts      Phaser.Scene subclass
src/scripts/scene/projection.ts        latLngToIso(), isoDepth(), world bounds
src/scripts/scene/clusterLayout.ts     reads clusters.json, returns placed sprite entries
src/scripts/scene/brookAndRoads.ts     draws brook + roads into a Graphics object
src/scripts/scene/interactions.ts      hover / click → DOM tooltip, household links
src/scripts/build-clusters.ts          one-shot Node script (npm run build:clusters)

src/data/clusters.json                 committed output of build-clusters.ts

public/spike-sprites/meadow.png                 new: nanaban master meadow texture
public/spike-sprites/12-bridge-v1-keyed.png     new: nanaban wooden bridge
public/spike-sprites/smoke-sheet.png            new: smoke puff frames (or procedural)
```

Existing `public/spike-sprites/*-keyed.png` cottage/forge/willow assets are reused unchanged.

### Dependency adds

- `phaser` (latest 3.x) to `dependencies`

No other packages. No React, no typescript config changes (project already has TS via `typescript: ^5.6.0`).

### Layer order (painter's algorithm)

1. Meadow groundplane — single sprite sized to projected world extent
2. Brook ribbon — Phaser Graphics, stacked strokes (green riversides + dark blue body + light cream highlight)
3. Roads/paths — Phaser Graphics, three-stroke recipe (dark edge + earth body + walked cream strip)
4. Bridge sprite — placed at the single brook/road intersection, y-sorted with buildings
5. Willows and cluster sprites — all y-sorted together by iso depth (descending screenY first, ascending screenY last)
6. Smoke particle emitters — above forge sprites
7. DOM tooltip overlay — outside Phaser, positioned by pointer coords

### Data flow

Build-time (one-shot, committed):

```
59 household .md files  →  build-clusters.ts  →  src/data/clusters.json
```

Page render (Astro SSG):

```
clusters.json + brook.json + roads.json + boundary.json
  → <script type="application/json" id="scene-data" set:html={JSON.stringify(sceneData)} />
```

Uses Astro's `set:html` to inline the serialised JSON into a `type="application/json"` tag (the right pattern for a module script to consume; `define:vars` is for JS globals, not JSON blobs).

Client boot:

```
phaser-scene.ts
  → parse #scene-data JSON
  → new Phaser.Game({ scene: VillageScene, parent: '#phaser-root' })
  → preload assets
  → create(): project data → iso coords → build layers
  → interactions bound
```

### Clustering (build-clusters.ts)

Input: parse all `src/content/households/*.md` frontmatter for `number`, `family`, `household_name`, `founder`, `position.{lat,lon}`.

Algorithm:
1. Convert each position to metres in a flat plane around the hamlet centroid.
2. Single-link cluster: walk households in `number` order; for each, if its position is within `THRESHOLD_M = 15` of any existing cluster centroid, add it to that cluster; else start a new cluster.
3. Recompute each cluster centroid as the mean of its member positions.
4. Assign each cluster a sprite key by majority-family rule (founder → `cottage-large`; Billingham/Weaver-heavy clusters → occasional `forge` by `cluster.id % 3` for variety; rest cycle through `cottage-master` / `cottage-terrace` / `cottage-lshape` / `cottage-small`).
5. Emit `clusters.json`: array of `{ id, centroid: [lat,lng], members: [householdNumbers...], spriteKey, primaryFamily, hasForge: boolean }`.

Output is committed. Tom can hand-edit if a cluster looks wrong. Re-running only needed if household positions change.

Target count: the 15 m threshold produces ~10–15 clusters on the current layout. Threshold is a constant in the script — bump/lower it if the count falls outside that range. Output is regenerated and committed again; no runtime sensitivity.

### Interactions

- **Pan**: right-click-drag or middle-click-drag moves camera. Clamped to world bounds + 20% padding.
- **Zoom**: mouse wheel adjusts `camera.zoom` between 0.5× (fit whole hamlet) and 2.5× (close-up). Zoom anchors on cursor position.
- **Hover on cluster sprite**: subtle tint + cursor pointer + DOM tooltip shows cluster member names.
- **Click on cluster**:
  - If single household → navigate to `/households/{slug}`
  - If multiple → open a small popup `<div>` (inline in the page, not a component) listing each member with its `/households/{slug}` link, dismissable by clicking outside
- **Willows, bridge, brook, roads**: decorative. No pointer events.

Tooltip is a plain `<div id="phaser-tooltip">` positioned in absolute coordinates over the canvas via pointer events. Styled in the page's scoped `<style>`. No Phaser text objects — avoids font-in-canvas issues.

### Animations

- **Forge smoke (v1)**: `Phaser.GameObjects.Particles.ParticleEmitter` on the forge sprite's chimney anchor. ~1 particle / 200 ms, upward with slight random drift, fade from 0.6 → 0 over 2.5 s, scale from 0.4 → 1.2. Uses either a single white-puff PNG or the 6-frame `smoke-sheet.png`.
- **Brook flow (stretch)**: either a UV-scroll shader on the brook ribbon or a simple texture scroll on a repeating blue-wash PNG. Defer unless v1 lands clean.
- **Willow sway (stretch)**: tiny sine offset on sprite `y` over 3 s period. Defer.

## Error handling

Minimum-viable — this is a client-side painted view over static data.

- Sprite texture load failure: skip that sprite, log once, scene continues.
- `clusters.json` missing at dev time: page shows "run `npm run build:clusters`" message.
- Household slug fails to resolve on click: link still renders, the site's 404 page handles the rest.
- No retry loops, no timeouts, no telemetry.

## Verification plan

After each Codex-delivered chunk:

1. Start `npm run dev` (runs on 4321 or 4322).
2. Use `browser-harness` (not Playwright — see napkin) to screenshot `/phaser-spike`.
3. Eyeball diff against the prior screenshot and against the Stitch reference.
4. If regression or visual miss → reject back to Codex with the screenshot attached.
5. If good → commit the chunk, move to the next.

Screenshots collected in `spike/screenshots/phaser/` (not committed, gitignored like the rest of `spike/`).

## Delegation model

All coding delegated to Codex via the codex-plugin-cc (`/codex:rescue` slash command or `codex:rescue` skill).

Each chunk is a self-contained brief with:
- Files to create or edit (exact paths)
- What to read for context (spec + any prior chunk outputs)
- Definition of done (e.g., "`/phaser-spike` loads, shows a solid-colour placeholder groundplane sized to the world extent, no console errors")
- Constraints (no new deps beyond `phaser`; no React; follow `.claude/napkin.md` conventions; polygons stay `[lat, lon]`)

Claude orchestrates, verifies, commits. Codex writes code.

## New nanaban assets

Within the £30 generation budget:

1. **`meadow.png`** — one painterly English meadow texture, ~2048×1536, no buildings / brook / paths, subtle variations, chroma-free. 1–2 generations to land.
2. **`12-bridge-v1-keyed.png`** — small wooden-plank iso bridge for the brook crossing, chroma green background, keyed. 1–2 generations.
3. **`smoke-sheet.png`** — 6–8 frames of a warm drifting chimney smoke puff. Stretch: replace with procedural Phaser particles if the sheet doesn't land on first try.

Existing sprites (`01-cottage-master-v3-nb2pro-keyed.png`, `02-forge-v3-nb2pro-keyed.png`, etc.) are reused verbatim. No regeneration unless a specific cluster sprite reads badly in the new scene.

## Scope fence

### In v1 (locked)

- 10–15 painted clusters in rough hamlet layout (data-driven from `clusters.json`)
- Black Brook ribbon + bridge + ≥6 willows + dirt paths
- Mouse wheel zoom + pan
- Smoke plume on at least one forge
- Hover + click tooltips linking back to household detail pages
- `/` and `/spike-isometric` untouched

### Stretch (only if v1 lands cleanly)

- Animated brook flow
- Willow sway
- Touch gesture pan/zoom
- Sprite atlas packing

### Out of scope

- Replacing `/` Leaflet hero
- Day/night, weather, sound, characters
- CMS / auth / comments
- Mobile-first layout work
