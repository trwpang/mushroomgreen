# Isometric sprite spike

Exploration only. Sprite PNGs are gitignored (`public/spike-sprites/`); prompts are committed in `prompts.md` for reproducibility.

## Round 1 — Leaflet overlay spike (2026-04-23 morning)

Goal: decide whether AI-generated isometric building sprites can sit coherently over the existing Leaflet map, in the Mushroom Green "tactile historical" aesthetic.

Pattern adapted from [chongdashu/vibe-isometric-sprites](https://github.com/chongdashu/vibe-isometric-sprites) (FF Tactics character pipeline), with two changes:

- `gpt-image-2` replaces `gpt-image-1.5` — same role (high-fidelity anchor), newer model, free via ChatGPT Plus/Pro sub through `nanaban`.
- Small grids first, extend later — one master sprite per building type, variants via reference-guided edits.

Tool: [`nanaban`](https://github.com/paperfoot/nanaban-cli) — wraps `gpt-image-2` and `nb2-pro`.

### Outcome

`/spike-isometric` loads 7 painted building types + willows + hedge + stream sprites over the real OSM polygons on a Leaflet basemap. Result: well-decorated Leaflet map. Never cohered into "one painted village" because the top-down ortho projection fights the iso 3/4 sprite angle. Moved to Phaser.

## Round 2 — Phaser 2.5D village spike (2026-04-23 evening → 2026-04-24 morning)

Goal: prove Phaser 3 with hand-rolled tilted-iso transforms can close the "decorated Leaflet" ceiling.

Spec: `docs/superpowers/specs/2026-04-23-phaser-village-spike-design.md`
Plan: `docs/superpowers/plans/2026-04-23-phaser-village-spike.md`

### What shipped (`/phaser-spike`)

- Astro route → Phaser 3.90 game instance inside a `<div id="phaser-root">`
- Hand-rolled `lat/lng → iso` affine projection (flat-earth at hamlet scale)
- Painterly meadow texture (new nanaban asset) as the ground layer
- Black Brook as a 5-stroke Phaser Graphics ribbon from `brook.json`
- Dirt paths as 3-stroke Graphics from `roads.json`
- Wooden plank bridge (new nanaban asset) at the brook-nearest-road point
- 14 clusters generated from 59 household positions via `build-clusters.ts` (27m threshold), committed to `src/data/clusters.json`
- 7 existing cottage/forge sprite variants (round 1 survivors) + 17 willow scatter positions (copied verbatim from the Leaflet spike)
- Painter's-algorithm y-sort on all iso-placed sprites
- Live Phaser particle emitters on each forge chimney (warm-soot tint, upward drift, fade) — required a workaround for a Phaser 3.90 + Astro/Vite regression where emitters weren't auto-registering on `scene.sys.updateList`
- Mouse-wheel zoom (cursor-anchored, 0.35×–2.5×) and right/middle-click pan
- Hover tooltip + click-to-open-household popup DOM built via `createElement`/`textContent` (no `innerHTML`, respects the project's security hook)
- New dynamic route `/households/[id]` for all 59 households so the click links resolve — Victorian card layout with IM Fell English serif header, family badge, facts, sources, and an inline Leaflet showing the polygon

### Does it clear the ceiling?

Yes. Side-by-side against `/spike-isometric`:

- The meadow, brook, and paths read as ONE painted surface instead of a decorated map
- Cottages sit in the scene, not on top of it — slate-blue pitched roofs catch the light, warm Staffordshire brick reads through the whole palette
- The forge at zoom ~1.4× is the postcard: glowing orange interior through open doors, soot-stained brick, a live smoke plume drifting up alongside the baked-in painted plume, painterly willow beside it — this is the AoE/FFT/Stardew reference we were aiming at

### What's still rough (polish candidates)

- The brook doesn't literally cross the road anywhere in OSM (closest pair is ~41m apart), so the bridge lands on the water nearest a road, which requires a pan to see at default zoom. Could hand-route the brook through a road crossing in a separate `brook-story.json` if the story demands it.
- Cluster density is uneven — the south of the hamlet is crowded, the north is sparse. Accurate to the actual 1861 layout.
- Smoke plumes are visible but subtle at default (~0.4×) zoom. Bigger particles would read better at fit-zoom but overwhelm the close-up view. Left tuned for close-up; stretch goal is a zoom-reactive scale curve.
- Willow `-keyed.png` sprite is a cluster of three trees, not one tree — scatter feels a touch chunky at scale 0.25. Stretch: generate a single-willow sprite and re-scatter.

### Stretch items explicitly deferred

- Animated brook flow (UV-scroll shader)
- Willow sway
- Touch gestures for mobile pan/zoom
- Sprite atlas packing

### New assets

- `public/spike-sprites/meadow.png` (2048×1536, painterly, no baked-in features)
- `public/spike-sprites/12-bridge-v1-keyed.png` (chroma-keyed iso plank bridge)
- Both PNGs stay gitignored per existing convention; prompts committed in `prompts.md` (#12, #13).

### Build / deploy notes

- `/phaser-spike` is dev-only at time of writing — sprite PNGs are gitignored, so the page 404s its images in production (same pattern as `/spike-isometric`).
- To ship: `git add -f public/spike-sprites/*.png` (or un-gitignore the directory), rebuild, redeploy. The route itself, the clustering script, the detail pages (`/households/[id]`), and the Phaser chunks ARE in the build already.

## Layout

- `sprites/references/` — style anchors pulled from Stitch and hand-picked inspiration (committed)
- `sprites/raw/` — unedited model output, chroma or transparent bg (gitignored)
- `sprites/keyed/` — background removed, ready for overlay (gitignored)
- `sprites/final/` — the chosen set, if the spike succeeds (committed)
- `prompts.md` — exact prompts used, keyed to filenames
