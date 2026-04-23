# Phaser Village Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Coding delegation model:** All code (`.ts`, `.astro`, config) is written by OpenAI Codex via the `codex:rescue` skill / `/codex:rescue` slash command. Claude orchestrates: dispatches Codex per task, verifies output via `browser-harness` screenshots, commits. Claude (not Codex) runs `nanaban` for image generation because the loop needs human visual review.

**Goal:** Ship `/phaser-spike` — a painterly 2.5D isometric village of Mushroom Green in Phaser 3 that feels meaningfully closer to "one painted village" than the Leaflet-based `/spike-isometric`.

**Architecture:** Astro route renders a `<div>` + data-bridge `<script type="application/json">`; a module script dynamically imports Phaser, projects real lat/lng onto an iso plane via hand-rolled affine transforms, paints ground/brook/paths in Phaser Graphics, places cluster+willow+bridge sprites with painter's-algorithm y-sort, emits particles for forge smoke, and wires DOM tooltip interactions. 59 households merge into 10–15 committed clusters via a one-shot Node script.

**Tech Stack:** Astro 5 (static), vanilla TypeScript, Phaser 3.x (new dep), existing `-keyed.png` sprites, `nanaban --pro` for new assets, `browser-harness` for verification.

**Spec:** `docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md` — the single source of truth for any disambiguation. Every task below should point Codex at the spec for context.

**Verification pattern:** Every task ends with (a) a browser-harness screenshot or nanaban-produced image, (b) a visual compare against the spec's "in v1" checklist, (c) a commit. No unit tests.

---

## File map (locked by spec)

**New files Codex will create:**
- `src/pages/phaser-spike.astro` — route + data bridge
- `src/scripts/phaser-scene.ts` — entrypoint (parse JSON, boot Phaser)
- `src/scripts/scene/VillageScene.ts` — Phaser.Scene subclass
- `src/scripts/scene/projection.ts` — pure projection helpers
- `src/scripts/scene/clusterLayout.ts` — cluster → sprite placements
- `src/scripts/scene/brookAndRoads.ts` — draws brook + roads via Phaser.Graphics
- `src/scripts/scene/interactions.ts` — hover/click → DOM tooltip
- `src/scripts/build-clusters.ts` — one-shot Node script; run via `npm run build:clusters`
- `src/data/clusters.json` — committed output of the above

**New files Claude will create via nanaban:**
- `public/spike-sprites/meadow.png`
- `public/spike-sprites/12-bridge-v1-keyed.png`

**Existing files Codex may modify:**
- `package.json` — add `phaser` dep, add `build:clusters` script
- `.gitignore` — ensure new screenshots dir is ignored (`spike/screenshots/phaser/`)

**Existing files Codex must NOT touch:**
- `src/pages/index.astro` (Leaflet hero)
- `src/pages/spike-isometric.astro` (the comparison baseline)
- Anything in `legacy/`
- `src/content/households/*.md` (read-only)

---

## Task 1: Generate meadow ground texture (Claude + nanaban)

**Files:**
- Create: `public/spike-sprites/meadow.png`

- [ ] **Step 1: Run nanaban with the painterly meadow prompt**

```bash
nanaban --pro -o public/spike-sprites/meadow.png \
  "A seamless painterly English meadow groundplane in the style of Age of Empires and Final Fantasy Tactics — warm mid-green grass with subtle painterly variation, patches of darker olive-green tussocks, hints of wildflowers, soft light from upper-left, hand-painted brushwork. NO buildings, NO paths, NO trees, NO water, NO people, NO fences, NO frame, NO border. Pure unbroken meadow surface. Chunky simple forms with gentle texture variation so the colour doesn't read flat, but no small sharp details — this is a background layer that sprites sit on top of. Aspect ratio 4:3. Background fills entirely with meadow — no chroma green, no transparency, the meadow IS the image."
```

- [ ] **Step 2: Visually review**

```bash
open public/spike-sprites/meadow.png
```

Accept if: painterly brush feel, no obvious repeating seams, warm green palette, no baked-in buildings or paths. Reject if any of those miss.

- [ ] **Step 3: Regenerate if rejected** — tweak the prompt (e.g., more/less texture, warmer/cooler green) and re-run Step 1. Budget: up to 2 rejects before escalating to Tom.

- [ ] **Step 4: Commit**

```bash
git add public/spike-sprites/meadow.png
git commit -m "feat(spike): add painterly meadow ground texture for phaser-spike"
```

---

## Task 2: Generate wooden-bridge sprite (Claude + nanaban)

**Files:**
- Create: `public/spike-sprites/12-bridge-v1-keyed.png`

- [ ] **Step 1: Run nanaban with the bridge prompt**

```bash
nanaban --pro -o spike/sprites/raw/12-bridge-v1-nb2pro.png \
  "An isometric 3/4 view sprite of a small rustic 1860s wooden plank footbridge across a narrow English stream, at the same tactical-RPG isometric angle as the reference. Weathered dark oak planks laid across two sturdy timber supports, low plank handrails on both sides, a hint of worn earth path leading onto each end of the bridge. Style: hand-painted, warm, illustrative, storybook, reminiscent of Final Fantasy Tactics and a painterly 2.5D Age of Empires village asset — NOT pixel art, NOT photoreal. Chunky simple forms, strong silhouette, reads cleanly when downscaled. Background must be an exact flat chroma green #00FF00 everywhere, no gradient, no shadow, no water, no grass. No environment, no other objects, no people, no text, no labels, no frame, no cast shadow, no watermark."
```

- [ ] **Step 2: Chroma-key the green background**

```bash
magick spike/sprites/raw/12-bridge-v1-nb2pro.png \
  -fuzz 18% -transparent '#00FF00' -trim +repage \
  public/spike-sprites/12-bridge-v1-keyed.png
```

- [ ] **Step 3: Visually review**

```bash
open public/spike-sprites/12-bridge-v1-keyed.png
```

Accept if: same painterly line weight as existing cottages, clean chroma-key edges, reads as a plank bridge at small size. Reject if silhouette is weak or handrails are missing.

- [ ] **Step 4: Regenerate if rejected** — up to 2 rejects.

- [ ] **Step 5: Commit**

```bash
git add public/spike-sprites/12-bridge-v1-keyed.png
git commit -m "feat(spike): add wooden plank bridge sprite for phaser-spike"
```

---

## Task 3: Install Phaser + scaffold `/phaser-spike` route with empty canvas (Codex)

**Files:**
- Modify: `package.json` (add dep + script)
- Create: `src/pages/phaser-spike.astro`
- Create: `src/scripts/phaser-scene.ts`

- [ ] **Step 1: Dispatch to Codex with this brief**

```
Task: Install Phaser and scaffold a new Astro route /phaser-spike showing a blank
Phaser canvas, wired via a vanilla module script (no React).

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md (entire file)
- src/pages/spike-isometric.astro (for the Astro+BaseLayout pattern this site uses)
- .claude/napkin.md (conventions — especially the define:vars vs set:html note
  and the is:inline script pattern)

Do:
1. npm install phaser (add to dependencies, not devDependencies)
2. Add an npm script "build:clusters": "node --input-type=module src/scripts/build-clusters.ts"
   (Node 22 imports .ts directly per the napkin)
3. Create src/pages/phaser-spike.astro:
   - Uses BaseLayout with title "Phaser Spike — Mushroom Green"
   - Renders <div id="phaser-root" style="width:100vw;height:100vh;"></div>
   - Embeds an empty JSON payload for now: <script type="application/json"
     id="scene-data" set:html={JSON.stringify({ clusters: [], brook: [], roads: [],
     boundary: [] })} />
   - Loads src/scripts/phaser-scene.ts via <script type="module" src=...>
   - No inline body styles beyond setting body margin:0 and overflow:hidden for this page
     (use a scoped <style> block)
4. Create src/scripts/phaser-scene.ts:
   - Import Phaser from 'phaser'
   - Parse #scene-data textContent as JSON
   - new Phaser.Game({
       type: Phaser.AUTO,
       parent: 'phaser-root',
       width: window.innerWidth,
       height: window.innerHeight,
       backgroundColor: '#8cb459',  // same warm green as the Leaflet spike
       scene: { preload(){}, create(){}, update(){} },
     })
   - On window resize, call game.scale.resize(window.innerWidth, window.innerHeight)

Definition of done:
- `npm run dev` starts clean
- GET /phaser-spike returns 200 with no console errors
- The page shows a solid green canvas filling the viewport
- /index and /spike-isometric still render identically (do NOT touch them)

Constraints:
- No React, no tilemap plugin
- No edits to src/pages/index.astro, src/pages/spike-isometric.astro, or legacy/
- Follow napkin.md conventions (polygons stay [lat, lon], etc.)
```

- [ ] **Step 2: Wait for Codex result via `/codex:status` → `/codex:result`**

- [ ] **Step 3: Verify with browser-harness**

```bash
npm run dev &  # background
# wait ~3s for Astro
# use browser-harness to screenshot http://localhost:4321/phaser-spike
```

Accept if: screenshot shows a full-viewport green canvas, no console errors in devtools output. Check `/` and `/spike-isometric` still render.

- [ ] **Step 4: Reject-and-retry if verification fails**

Send Codex the screenshot + failure description via `/codex:rescue` follow-up.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/pages/phaser-spike.astro src/scripts/phaser-scene.ts
git commit -m "feat(spike): install phaser, scaffold /phaser-spike route with blank canvas"
```

---

## Task 4: Coordinate projection helper (Codex)

**Files:**
- Create: `src/scripts/scene/projection.ts`

- [ ] **Step 1: Dispatch to Codex**

```
Task: Write a pure TypeScript module for lat/lng → iso-screen projection.

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md §"Camera & projection"
- src/pages/spike-isometric.astro lines 307-318 for the existing metersToLat/metersToLng helpers

Create src/scripts/scene/projection.ts:

    // Hamlet centre (mean of household positions; matches spike-isometric).
    export const HAMLET_CENTRE: [number, number] = [52.4757932163071, -2.0936364426410514];

    const M_PER_DEG_LAT = 111320;

    // Flat-earth metre conversion with cos(lat) correction. Valid to <0.5% over
    // the ~300x250m hamlet, per spec.
    export function latLngToMetres(lat: number, lng: number): { xM: number; yM: number } {
      const [cLat, cLng] = HAMLET_CENTRE;
      const xM = (lng - cLng) * M_PER_DEG_LAT * Math.cos(cLat * Math.PI / 180);
      const yM = (lat - cLat) * M_PER_DEG_LAT;
      return { xM, yM: -yM };  // flip so north-in-metres becomes up in world; iso flips it again
    }

    // Classic 2:1 iso projection: 30° tilt. k is pixels-per-metre.
    export function metresToIso(xM: number, yM: number, k = 10): { x: number; y: number } {
      const cos30 = Math.cos(Math.PI / 6);
      const sin30 = Math.sin(Math.PI / 6);
      return {
        x: (xM - yM) * cos30 * k,
        y: (xM + yM) * sin30 * k,
      };
    }

    // Convenience: full pipeline.
    export function latLngToIso(lat: number, lng: number, k = 10): { x: number; y: number } {
      const { xM, yM } = latLngToMetres(lat, lng);
      return metresToIso(xM, yM, k);
    }

    // Depth key for painter's-algorithm sort. Higher = drawn LATER (on top).
    export function isoDepth(lat: number, lng: number, k = 10): number {
      return latLngToIso(lat, lng, k).y;
    }

    // Compute iso bounding box for an array of [lat,lng] points.
    export function isoBounds(points: [number, number][], k = 10): {
      minX: number; maxX: number; minY: number; maxY: number;
    } {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [lat, lng] of points) {
        const { x, y } = latLngToIso(lat, lng, k);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      return { minX, maxX, minY, maxY };
    }

Also add a tiny manual sanity check at the bottom of the file, guarded so it
does not run in the bundle:

    // Manual sanity check — run with: npx tsx src/scripts/scene/projection.ts
    if (import.meta.url === `file://${process.argv[1]}`) {
      console.log('centre:', latLngToIso(HAMLET_CENTRE[0], HAMLET_CENTRE[1]));
      const M = 111320;
      const lngOffset = 10 / (M * Math.cos(HAMLET_CENTRE[0] * Math.PI / 180));
      console.log('east 10m ~:', latLngToIso(HAMLET_CENTRE[0], HAMLET_CENTRE[1] + lngOffset));
    }

Definition of done:
- File exists, TypeScript compiles via `npx tsc --noEmit src/scripts/scene/projection.ts`
  (or just `npm run build` if the Astro check passes)
- Running the sanity check prints a centre very close to (0,0) and the east
  point with positive x, negative y.
- No other files modified.
```

- [ ] **Step 2: Wait for Codex, review code**

- [ ] **Step 3: Run the sanity check**

```bash
npx tsx src/scripts/scene/projection.ts
```

Accept if: centre prints `{ x: ~0, y: ~0 }` (within 1e-9) and the east offset prints positive `x` and small negative `y`. Reject otherwise — the projection is wrong.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scene/projection.ts
git commit -m "feat(spike): add lat/lng → iso projection helpers for phaser-spike"
```

---

## Task 5: Clustering script + committed clusters.json (Codex)

**Files:**
- Create: `src/scripts/build-clusters.ts`
- Create: `src/data/clusters.json` (committed output)

- [ ] **Step 1: Dispatch to Codex**

```
Task: Write a one-shot Node script that reads all 59 household markdown files
and emits src/data/clusters.json per the spec's clustering algorithm.

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md §"Clustering"
- src/content/households/06-henry-weaver-1827.md (example frontmatter shape)
- src/scripts/scene/projection.ts (for latLngToMetres — reuse it)
- .claude/napkin.md (polygons are [lat, lon], not GeoJSON)

Create src/scripts/build-clusters.ts:

- Uses `import { readFileSync, readdirSync, writeFileSync } from 'node:fs'`.
- Uses a small inline YAML frontmatter parser: read the file, split on `---\n`,
  extract the frontmatter block, parse only the keys we need:
  number (int), household_name (string), family (string), founder (bool|undef),
  position.lat (float), position.lon (float). Do NOT add a yaml dep — hand-parse.
- Imports latLngToMetres from '../scripts/scene/projection.ts' — adjust path.
- Algorithm (exact, per spec):
  1. Load all households from src/content/households/*.md sorted by number.
  2. Convert each position to {xM, yM} via latLngToMetres.
  3. Single-link merge with THRESHOLD_M = 15:
     - For each household in order, measure Euclidean distance to every existing
       cluster centroid (recomputed as mean of members after each add).
     - If min distance < THRESHOLD_M, assign to that cluster; else start a new
       cluster.
  4. For each cluster, set primaryFamily = mode of member families (founder wins
     if any member has founder: true; primaryFamily then = "Founder").
  5. Assign spriteKey per spec's rules:
     - primaryFamily === "Founder" → "cottage-large"
     - cluster.id (1-indexed) % 3 === 0 AND at least one member family is
       Billingham or Weaver → "forge"
     - else cycle: ["cottage-master","cottage-terrace","cottage-lshape",
       "cottage-small"][cluster.id % 4]
  6. hasForge = (spriteKey === "forge")
  7. Output shape:
     {
       "generatedAt": "<ISO-8601>",
       "thresholdMetres": 15,
       "clusters": [
         { "id": 1, "centroid": [lat,lng], "members": [householdNum,...],
           "primaryFamily": "Weaver", "spriteKey": "cottage-master",
           "hasForge": false },
         ...
       ]
     }
- Prints to stderr: cluster count, largest cluster size, any cluster within 25m
  of another (so Tom can sanity-check by eye).
- Writes src/data/clusters.json (pretty-printed, 2-space indent).

Definition of done:
- `npm run build:clusters` succeeds with exit 0.
- Prints cluster count between 10 and 15 inclusive (adjust THRESHOLD_M if not
  and note the new value in the script).
- src/data/clusters.json is valid JSON and contains that number of clusters,
  each with non-empty members array and a valid spriteKey from the allowed set.

Constraints:
- No new deps (no yaml package).
- Do not modify any markdown files.
- Script must be idempotent — running twice gives byte-identical JSON except
  for generatedAt.
```

- [ ] **Step 2: Wait for Codex**

- [ ] **Step 3: Run the script**

```bash
npm run build:clusters
```

Accept if: exit 0, stderr shows cluster count 10–15, JSON validates (`jq . src/data/clusters.json > /dev/null`), every member number is in [1,59], every spriteKey is one of the allowed set.

- [ ] **Step 4: Visual sanity check** — eyeball cluster assignments against the households. If any cluster looks wildly wrong (e.g. a lone cottage that should be in a cluster of 5), note it for Tom; do not auto-correct.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/build-clusters.ts src/data/clusters.json package.json
git commit -m "feat(spike): add clustering script; emit 59→<N> clusters.json"
```

---

## Task 6: Phaser scene skeleton with pan/zoom camera (Codex)

**Files:**
- Create: `src/scripts/scene/VillageScene.ts`
- Modify: `src/scripts/phaser-scene.ts` (wire the scene class)
- Modify: `src/pages/phaser-spike.astro` (embed real scene data)

- [ ] **Step 1: Dispatch to Codex**

```
Task: Replace the empty inline scene with a VillageScene class that:
(a) loads scene data from the JSON bridge,
(b) supports mouse-wheel zoom (anchored on cursor) between 0.5× and 2.5×,
(c) supports right-click-drag and middle-click-drag panning,
(d) clamps camera to world bounds + 20% padding,
(e) draws a single debug marker per cluster so we can see placement.

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md
  §"Architecture", §"Interactions"
- src/scripts/scene/projection.ts (use latLngToIso, isoBounds)
- src/data/clusters.json (the data you'll be rendering)
- src/data/boundary.json (use for world-bounds extent)

Update src/pages/phaser-spike.astro:
- Import clusters from '../data/clusters.json', boundary from '../data/boundary.json',
  brook from '../data/brook.json', roads from '../data/roads.json'.
- Embed via <script type="application/json" id="scene-data" set:html={JSON.stringify({
    clusters: clusters.clusters,
    boundary, brook, roads
  })} />

Create src/scripts/scene/VillageScene.ts with these behaviours:

- constructor: super('VillageScene')
- init(data): stash sceneData for use in create()
- create():
  - compute iso bounds from sceneData.boundary via isoBounds
  - pad = 20% of the larger extent
  - setBounds, centerOn centre, setZoom to fit
  - draw one red circle per cluster centroid via this.add.graphics()
  - call setupPanZoom()
- setupPanZoom():
  - wheel listener: adjust camera zoom by ±dy * 0.001, clamp [0.5, 2.5],
    anchor zoom on pointer position
  - pointerdown: if rightButtonDown or middleButtonDown, set isDragging=true,
    record dragStart pointer position and cameraStart scroll position
  - pointermove: if isDragging, update camera scroll by delta / zoom
  - pointerup: isDragging = false
  - listen on this.game.canvas for 'contextmenu' and call preventDefault
    (so right-click drag doesn't pop browser menu)

Update src/scripts/phaser-scene.ts:
- register VillageScene in the game config
- call game.scene.start('VillageScene', { sceneData }) after the game boots

Definition of done:
- GET /phaser-spike shows a green canvas with ~10-15 small red dots in the
  approximate shape of the hamlet.
- Mouse wheel zooms in and out; cursor position stays under the pointer.
- Right-click drag pans the camera.
- No console errors.
- /index and /spike-isometric still render identically.
```

- [ ] **Step 2: Wait for Codex**

- [ ] **Step 3: Verify via browser-harness**

Screenshot `/phaser-spike`. Manually test wheel zoom + right-click drag. Save screenshot to `spike/screenshots/phaser/06-debug-markers.png`.

Accept if: ~10-15 red dots visible in hamlet-shaped arrangement, zoom + pan work smoothly, no console errors, other pages still fine.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scene/VillageScene.ts src/scripts/phaser-scene.ts src/pages/phaser-spike.astro
git commit -m "feat(spike): phaser scene skeleton with pan/zoom + debug cluster markers"
```

---

## Task 7: Ground + brook + roads layers (Codex)

**Files:**
- Create: `src/scripts/scene/brookAndRoads.ts`
- Modify: `src/scripts/scene/VillageScene.ts` (preload meadow, call the drawer)

- [ ] **Step 1: Dispatch to Codex**

```
Task: Add three painted background layers to VillageScene:
- Meadow ground sprite covering the full world extent
- Black Brook as stacked painted strokes (5 layers, same recipe as Leaflet spike)
- Roads as stacked three-stroke painted paths (same recipe)

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md §"Layer order"
- src/pages/spike-isometric.astro lines 179-216 (existing stroke recipes — copy
  the widths, colours, opacities exactly; they look right already)
- src/scripts/scene/projection.ts

Create src/scripts/scene/brookAndRoads.ts exporting drawBrook and drawRoads:

- Both functions take (scene, polyline data, depth: number)
- Both internally project every lat/lng to iso via latLngToIso
- Both draw via scene.add.graphics() — one Graphics object per stroke layer
- Each stroke: call lineStyle(width, color, alpha), then beginPath, moveTo first
  point, lineTo each subsequent point, strokePath
- setDepth(depth) on each Graphics object

drawBrook stroke recipe (5 layers, outermost first):
  { color: 0x8fb06a, width: 36, alpha: 0.60 }
  { color: 0xa9c480, width: 22, alpha: 0.65 }
  { color: 0x4a90d9, width: 12, alpha: 0.70 }
  { color: 0x3d7cbd, width: 6.5, alpha: 0.92 }
  { color: 0xc8eaf8, width: 2.4, alpha: 0.95 }

drawRoads stroke recipe per road polyline (3 layers):
  { color: 0x7a6040, width: 9, alpha: 0.55 }
  { color: 0xb5884c, width: 6, alpha: 0.85 }
  { color: 0xe8d69a, width: 2.5, alpha: 0.9 }

Modify src/scripts/scene/VillageScene.ts:
- In preload(): this.load.image('meadow', '/spike-sprites/meadow.png');
- In create(), after isoBounds:
  - Place meadow at the centre of world bounds with setDisplaySize to fill
    the bounds + pad; setDepth(-100)
  - drawBrook(this, this.sceneData.brook, -50)
  - drawRoads(this, this.sceneData.roads, -40)
- Keep the red debug markers for now (remove in Task 8).

Definition of done:
- /phaser-spike shows the painterly meadow texture under everything.
- Black Brook ribbon visible in blue through the hamlet (projected).
- Dirt paths visible as warm three-stroke lines.
- The red debug dots are still on top.
- Pan/zoom still work.
- No console errors.

Constraints:
- Don't change the stroke recipe colours/widths.
- Don't remove the debug markers yet.
```

- [ ] **Step 2: Wait for Codex**

- [ ] **Step 3: Verify via browser-harness**

Screenshot `/phaser-spike`. Save as `spike/screenshots/phaser/07-ground-brook-roads.png`.

Accept if: painterly meadow fills the scene, brook ribbon visible in expected iso position, roads visible, no tile seams. Reject if meadow tiles visibly / brook appears disconnected / roads missing.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scene/brookAndRoads.ts src/scripts/scene/VillageScene.ts
git commit -m "feat(spike): add meadow groundplane, painted brook, and dirt paths"
```

---

## Task 8: Cluster sprites + bridge + willows with y-sort (Codex)

**Files:**
- Create: `src/scripts/scene/clusterLayout.ts`
- Modify: `src/scripts/scene/VillageScene.ts`

- [ ] **Step 1: Dispatch to Codex**

```
Task: Replace debug markers with real cottage/forge sprites per cluster,
place the wooden bridge at the brook/road crossing, and scatter ≥6 willows.
All three layers must y-sort correctly via painter's algorithm.

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md §"Layer order"
- src/pages/spike-isometric.astro lines 264-296 (sprite catalogue + spriteKeyFor)
  and 377-402 (WILLOW_CANDIDATES — copy these lat/lng positions verbatim)
- src/scripts/scene/projection.ts

Create src/scripts/scene/clusterLayout.ts exporting:

- SPRITES record mapping key → { url, anchorY } where anchorY is the
  sprite-relative Y of the ground-contact point as a fraction of sprite height
  (0.92 for cottages/forge, 0.90 for willow, 0.85 for bridge).
  Keys and URLs:
    'cottage-small':   '/spike-sprites/05-cottage-small-v2-nb2pro-keyed.png'
    'cottage-master':  '/spike-sprites/01-cottage-master-v3-nb2pro-keyed.png'
    'cottage-terrace': '/spike-sprites/10-cottage-terrace-v1-nb2pro-keyed.png'
    'cottage-lshape':  '/spike-sprites/11-cottage-lshape-v1-nb2pro-keyed.png'
    'cottage-large':   '/spike-sprites/06-cottage-large-v1-keyed.png'
    'forge':           '/spike-sprites/02-forge-v3-nb2pro-keyed.png'
    'willow':          '/spike-sprites/03-willows-v1-keyed.png'
    'bridge':          '/spike-sprites/12-bridge-v1-keyed.png'

- WILLOW_POSITIONS: [number, number][] — copy the 17 positions verbatim from
  spike-isometric.astro WILLOW_CANDIDATES.

- BRIDGE_POSITION: [number, number] = [52.4770, -2.0950]  // TUNE

- preloadSprites(scene): call scene.load.image(`spr-${key}`, url) for each.

- interface Placement { key: string; lat: number; lng: number; scale: number;
    clusterId?: number }

- interface PlacementResult { all: Placement[]; clusters: Placement[];
    forges: Placement[] }

- buildPlacements(clusters): iterate clusters pushing one Placement per
  cluster with scale: 0.35 and clusterId set; push one bridge Placement at
  BRIDGE_POSITION with scale 0.3; push willow Placements from WILLOW_POSITIONS
  with scale 0.28. Return { all, clusters: [only cluster entries],
  forges: [cluster entries with key === 'forge'] }.

- placeSprites(scene, placements) returning Map<number, Phaser.GameObjects.Image>
  (cluster ID → its sprite, for the interactions task):
    - sort placements by latLngToIso(.lat,.lng).y ascending
    - for each:
      - const { x, y } = latLngToIso(...)
      - sprite = scene.add.image(x, y, `spr-${key}`)
      - sprite.setOrigin(0.5, SPRITES[key].anchorY)
      - sprite.setScale(placement.scale)
      - sprite.setDepth(y)  // iso-y depth sort
      - if clusterId !== undefined, map.set(clusterId, sprite)
    - return the map

Modify VillageScene.ts:
- In preload(): call preloadSprites(this)
- In create(), after drawBrook/drawRoads:
    const result = buildPlacements(this.sceneData.clusters);
    this.clusterSpriteMap = placeSprites(this, result.all);
    this.forgePlacements = result.forges;  // stash for Task 9
- Remove the red debug marker code — replaced.

Definition of done:
- /phaser-spike shows ~10-15 painted cottage/forge sprites in the hamlet shape.
- A wooden bridge sprite sits near where the road crosses the brook.
- ≥6 willow sprites scattered across the scene.
- Sprites y-sort correctly: a willow south of a cottage paints on top of it,
  a willow north of it paints behind.
- Pan/zoom still work.
- No console errors.

Constraints:
- Don't change the sprite URLs or filenames.
- BRIDGE_POSITION may need tuning — leave the TUNE comment.
- Scale 0.35 for buildings is a starting point; if sprites look wildly too big
  or too small, say so in the response so Tom can adjust.
```

- [ ] **Step 2: Wait for Codex**

- [ ] **Step 3: Verify via browser-harness**

Screenshot at default zoom and zoomed-in. Save as `spike/screenshots/phaser/08-sprites.png` and `08-sprites-zoomed.png`. Check that a willow south-of-a-cottage correctly paints over the cottage.

Accept if: all sprites render, rough layout matches hamlet, y-sort correct, bridge approximately at brook/road crossing, no console errors. If bridge position is off, tune `BRIDGE_POSITION` manually and recommit.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scene/clusterLayout.ts src/scripts/scene/VillageScene.ts
git commit -m "feat(spike): place cluster sprites, bridge, and willows with y-sort"
```

---

## Task 9: Forge smoke particle emitter (Codex)

**Files:**
- Modify: `src/scripts/scene/VillageScene.ts`

- [ ] **Step 1: Dispatch to Codex**

```
Task: Add a chimney-smoke particle emitter on each forge placement. Use
procedural particles (a small texture generated at scene boot) — no spritesheet.

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md §"Animations"
- src/scripts/scene/clusterLayout.ts (buildPlacements returns forges array)

Modify VillageScene.ts:
- In create(), BEFORE placing sprites, generate a small soft white-circle
  texture procedurally:
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(16, 16, 14);
    pg.generateTexture('smoke-puff', 32, 32);
    pg.destroy();

- After placing sprites, for each forge placement add an emitter at the forge's
  iso position, offset upward ~72px and slightly into the chimney side:

    for (const f of this.forgePlacements) {
      const { x, y } = latLngToIso(f.lat, f.lng);
      const emitter = this.add.particles(x - 12, y - 72, 'smoke-puff', {
        lifespan: 2500,
        speedY: { min: -28, max: -18 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.35, end: 1.1 },
        alpha: { start: 0.55, end: 0 },
        frequency: 220,
        tint: [0xefe8dc, 0xcbc2b0, 0xb7ae9c],
        blendMode: 'NORMAL',
      });
      emitter.setDepth(y + 100);
    }

Definition of done:
- At least one forge sprite has a visible slow-drifting smoke plume.
- Plume drifts upward, fades over ~2.5s, starts small and grows as it rises.
- Smoke does not render behind the forge — sits above it.
- Performance: no frame drop (eyeball — should be 60fps on a MBP).
- Pan/zoom still work; smoke follows the forge correctly.

Constraints:
- No new sprite file — texture is generated in-scene.
- Don't hard-code forge positions; derive from stashed forgePlacements.
```

- [ ] **Step 2: Wait for Codex**

- [ ] **Step 3: Verify via browser-harness**

Take 3 screenshots ~500ms apart to catch different frames. Save as `spike/screenshots/phaser/09-smoke-{a,b,c}.png`.

Accept if: plume visible above every forge, rises and fades, no frame drop. Reject if smoke hides behind the forge.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scene/VillageScene.ts
git commit -m "feat(spike): add chimney smoke particle emitter on forges"
```

---

## Task 10: Hover + click interactions with DOM tooltip (Codex)

**Files:**
- Create: `src/scripts/scene/interactions.ts`
- Modify: `src/scripts/scene/VillageScene.ts` (wire interactions)
- Modify: `src/pages/phaser-spike.astro` (add tooltip DOM + CSS + slug lookup)

- [ ] **Step 1: Dispatch to Codex**

```
Task: Make each cluster sprite interactive. On hover, tint slightly and show a
DOM tooltip with member household names. On click, navigate to the single
household's detail page OR show an inline popup listing members with links.
Build DOM via createElement/textContent — do NOT use innerHTML (the project's
security hook blocks it and a DOM-builder is clearer).

Read first:
- docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md §"Interactions"
- src/lib/slug.ts (existing slug derivation — reuse it)
- src/content/households/*.md frontmatter

Modify src/pages/phaser-spike.astro:
- At the top, build a slug lookup keyed by household number:
    import { getCollection } from 'astro:content';
    const households = await getCollection('households');
    const byNumber: Record<string, { slug: string; name: string }> =
      Object.fromEntries(households.map(h => [
        String(h.data.number),
        { slug: h.slug, name: h.data.household_name }
      ]));
- Pass byNumber in the JSON payload alongside clusters/boundary/brook/roads.
- Add two DOM nodes inside BaseLayout:
    <div id="phaser-tooltip" hidden></div>
    <div id="phaser-popup" hidden></div>
- Add scoped CSS:
    #phaser-tooltip {
      position: fixed; pointer-events: none; z-index: 10;
      background: #2c1810; color: #f5e6c8; font-size: 0.85em;
      padding: 6px 10px; border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    }
    #phaser-popup {
      position: fixed; z-index: 10;
      background: #2c1810; color: #f5e6c8;
      padding: 12px 16px; border-radius: 6px; min-width: 180px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.4);
    }
    #phaser-popup ul { list-style: none; padding: 0; margin: 0; }
    #phaser-popup li { padding: 4px 0; }
    #phaser-popup a { color: #f5e6c8; text-decoration: none; }
    #phaser-popup a:hover { text-decoration: underline; color: #fff; }

Create src/scripts/scene/interactions.ts:

- interface HouseholdLookup: record of String(number) → { slug; name }
- interface Cluster: { id: number; members: number[]; centroid: [number, number];
    spriteKey: string }
- wireInteractions(scene, spritesByClusterId, clusters, byNumber):
  - const tooltip = document.getElementById('phaser-tooltip')
  - const popup = document.getElementById('phaser-popup')
  - for each cluster with a sprite:
    - sprite.setInteractive({ useHandCursor: true, pixelPerfect: true })
    - pointerover: setTint(0xfff2cc); then build tooltip content via DOM:
        while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
        c.members.forEach((n, i) => {
          if (i > 0) tooltip.appendChild(document.createElement('br'));
          const span = document.createElement('span');
          span.textContent = byNumber[String(n)]?.name ?? `Household ${n}`;
          tooltip.appendChild(span);
        });
        tooltip.hidden = false;
        position at p.event.clientX+12, clientY+12
    - pointermove: reposition tooltip to follow pointer
    - pointerout: clearTint(); tooltip.hidden = true
    - pointerdown:
        if p.rightButtonDown() or p.middleButtonDown(): return
        if c.members.length === 1:
          window.location.href = `/households/${byNumber[String(c.members[0])].slug}`
        else:
          showPopup(popup, c, byNumber, p.event.clientX, p.event.clientY)
  - Add document-level click listener: if popup is visible and the click target
    is not inside popup, hide popup. (Use capture phase if needed so it runs
    before the next sprite's pointerdown reopens it.)

- showPopup(popup, cluster, byNumber, clientX, clientY):
    while (popup.firstChild) popup.removeChild(popup.firstChild);
    const ul = document.createElement('ul');
    for (const n of cluster.members) {
      const entry = byNumber[String(n)];
      const li = document.createElement('li');
      if (entry) {
        const a = document.createElement('a');
        a.href = `/households/${entry.slug}`;
        a.textContent = entry.name;
        li.appendChild(a);
      } else {
        li.textContent = `Household ${n}`;
      }
      ul.appendChild(li);
    }
    popup.appendChild(ul);
    popup.hidden = false;
    popup.style.left = Math.min(clientX, window.innerWidth - 260) + 'px';
    popup.style.top  = Math.min(clientY, window.innerHeight - 220) + 'px';

Modify VillageScene.ts:
- Stash byNumber into sceneData
- After placeSprites (which already returns the cluster sprite map),
  call wireInteractions(this, clusterSpriteMap, sceneData.clusters, byNumber).

Definition of done:
- Hover on any cluster sprite: subtle cream tint + tooltip showing member names.
- Tooltip follows the cursor.
- Click on single-household cluster: navigates to /households/{slug}.
- Click on multi-household cluster: popup opens listing members as clickable
  links; dismissable by clicking outside.
- Right-click and middle-click still pan (not intercepted).
- No console errors; no innerHTML usage anywhere in new code.
- Existing routes unchanged.

Constraints:
- No innerHTML. Use createElement + textContent only.
- Don't break existing pan/zoom.
```

- [ ] **Step 2: Wait for Codex**

- [ ] **Step 3: Verify via browser-harness**

Interact:
- Hover a single-household cluster — verify tooltip + tint.
- Click it — verify navigation to `/households/{slug}`.
- Go back, click a multi-household cluster — verify popup opens with links.
- Click outside — popup dismisses.
- Right-click drag — still pans.

Save before/after screenshots as `spike/screenshots/phaser/10-hover.png` and `10-popup.png`.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scene/interactions.ts src/scripts/scene/VillageScene.ts src/scripts/scene/clusterLayout.ts src/pages/phaser-spike.astro
git commit -m "feat(spike): hover tooltip + click-to-open-household interactions"
```

---

## Task 11: Visual polish pass + final comparison (Claude-led)

Not delegated to Codex. Claude iterates; small tweaks to Codex only if they require new code.

- [ ] **Step 1: Take a full-scene screenshot**

```
browser-harness → /phaser-spike at default zoom, save as
spike/screenshots/phaser/11-final-default.png
and zoomed-in: spike/screenshots/phaser/11-final-zoomed.png
```

- [ ] **Step 2: Compare side-by-side with Stitch reference**

Open both images in Preview.app and answer:
- Does it feel more like "one painted village" than `/spike-isometric`?
- If YES → success criterion met, proceed to Step 4.
- If NO → note the top 3 visual misses in a short diff doc.

- [ ] **Step 3: Targeted tweak** (if needed)

For each visual miss, pick the smallest intervention:
- Sprite too big/small → adjust `scale` in `buildPlacements()` (Codex)
- Meadow tone off → regenerate `meadow.png` via nanaban (Claude)
- Brook stroke widths wrong → tune in `brookAndRoads.ts` (Codex)
- Layout looks wrong → hand-edit `src/data/clusters.json` (Claude)
- Bridge wrong spot → tune `BRIDGE_POSITION` (Codex or Claude)

Commit each tweak separately.

- [ ] **Step 4: Write the final outcome note**

Append to `spike/README.md`:

```markdown
## Phaser spike — outcome (2026-04-23)

- `/phaser-spike` live in dev.
- N clusters rendered, M willows, 1 bridge.
- Smoke plume on forge, mouse pan + wheel zoom, hover tooltips, click-to-open.
- Side-by-side result: [verdict — meaningfully closer / not there yet].
- Next steps (if continuing): [stretch list].
```

- [ ] **Step 5: Commit**

```bash
git add spike/README.md
git commit -m "docs(spike): record phaser-spike outcome vs leaflet baseline"
```

---

## Self-review

**Spec coverage:**
- Goal + non-goals → covered by plan framing.
- Camera & projection → Task 4 (projection.ts) + Task 6 (camera).
- Six flagged decisions → Task 3 (no React, no plugin), Task 4 (affine), Task 5 (clustering), Task 7 (hybrid background), Task 8 (individual PNGs, y-sort).
- Architecture file map → Tasks 3, 4, 5, 6, 7, 8, 9, 10 together create every file listed in the spec's file map.
- Data flow → Task 3 (data bridge) + Task 6 (real data).
- Interactions → Task 10.
- Animations (forge smoke v1) → Task 9. Stretch items (brook flow, willow sway) deferred as spec allows.
- Error handling → Phaser defaults + Node script prints on failure.
- Verification plan → every task ends with browser-harness or nanaban visual check.
- New nanaban assets → Tasks 1 and 2; smoke-sheet dropped in favour of procedural particles (spec allows this — "Stretch: could also do procedural particles, no gen needed").
- Scope fence (in-v1 list) → all six items have a task.
- Delegation model → every Codex task has a self-contained brief with spec/file pointers.

**Placeholder scan:** One intentional `// TUNE` marker on `BRIDGE_POSITION` in Task 8 — actual guidance, not a placeholder. No TBD / TODO / "fill in later" anywhere else.

**Type consistency:** `SceneData`, `Cluster`, `Placement`, `PlacementResult`, `HouseholdLookup`, `SPRITES`, `buildPlacements`, `placeSprites` — names match across Tasks 6 through 10. `clusterSpriteMap` is introduced as the return of `placeSprites` in Task 8 and consumed in Task 10 — consistent. `forgePlacements` stashed in Task 8, consumed in Task 9 — consistent.

**No-innerHTML audit:** Task 10 uses only `createElement` + `textContent` + `appendChild`. Tooltip and popup DOM is built imperatively. No `.innerHTML` or `.insertAdjacentHTML` anywhere in the plan.

Plan locked.
