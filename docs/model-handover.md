# Mushroom Green: handover for another model

Updated 23 September 2026. Project root: `/Users/tomweaver/GitHub/mushroomgreen`.

## Start here

This is Tom Weaver’s browser reconstruction of Mushroom Green around 1865. The aim is a detailed, lived-in industrial hamlet. Preserve the family records and the established visual work. Improve the requested area in small, checked steps.

1. Read `.claude/napkin.md`. It records corrections, known problems and working methods. Later entries can replace earlier decisions.
2. Read `.project-status.md` for the current position.
3. Read this file, then the specific source and reference notes for your task.
4. Check `git status` before changing files. Preserve unrelated changes and untracked files.

**Commit locally. Do not push or deploy.** Netlify is linked to the repository. An earlier push published the wrong version.

The working branch is currently `master`. The last rendering change is `2aab74e`: Henry’s statue moved slightly back.

## Run and inspect

The active scene is **`/village`**, not the older map or the separate studies.

The existing server at `http://127.0.0.1:4326` serves **built output**. Source edits need a build before a browser refresh shows them.

```sh
cd /Users/tomweaver/GitHub/mushroomgreen
npm run village:check
npm run build
```

If the preview server is not running:

```sh
npm run preview -- --host 127.0.0.1 --port 4326
```

Do not start a second server on an occupied port. `npm run dev` is also available for live source development.

Useful review URLs:

- Village: `http://127.0.0.1:4326/village?view=village&still=1`
- Henry’s furnished room: `http://127.0.0.1:4326/village?view=henry&house=22&room=1`
- Main workshop: `http://127.0.0.1:4326/village?view=forge&house=5&inside=main`
- Worker close view: append `&worker=1` to the workshop URL.
- Henry’s small workshop: `http://127.0.0.1:4326/village?house=22&inside=small`
- Cottage cutaway: `http://127.0.0.1:4326/village?house=22&inside=home`

The interface also has household selection, room/cutaway controls, floor selection where available, camera controls, labels and a compass. Use `still=1` for repeatable still views; inspect live motion too when relevant.

## Source map

Paths below are relative to the project root.

| Area | Main files |
| --- | --- |
| Page and controls | `src/pages/village.astro` |
| Scene, renderer, cameras, loading and integration | `src/scripts/village/scene.ts` |
| Camera movement and room inspection | `src/scripts/village/navigation.ts`, `inspection.ts`, `showcase.ts` |
| Family information panel | `src/scripts/village/household-reader.ts` |
| Labels and compass | `src/scripts/village/house-labels.ts`, `compass.ts` |
| Historical household records | `src/content/households/`; exported by `src/pages/households.json.ts` |
| Map lines, boundary and terrain data | `src/data/` |
| Projection and building placement | `src/scripts/village/layout.ts`, `location.ts` |
| Exterior building variation and wear | `src/scripts/village/dwellings.ts`, `building-age.ts` |
| Furnishing positions and room plans | `src/scripts/village/interior-plans.ts` |
| Room geometry, openings, surfaces and lighting | `src/scripts/village/interiors.ts` |
| Furniture/prop models and catalogue | `src/scripts/village/interior-objects.ts`, `interior-catalogue.ts` |
| Small-object placement and room dressing | `src/scripts/village/interior-dressing.ts` |
| Furnished rooms inside the main village | `src/scripts/village/inhabited-houses.ts` |
| Interior wear and texture detail | `src/scripts/village/domestic-wear.ts`, `floor-wear.ts`, `worked-materials.ts`, `texture-detail.ts` |
| Texture loading and residency | `src/scripts/village/texture-residency.ts` |
| Shared rendering surfaces and finish | `src/scripts/rendering/surfaces.ts`, `finish.ts` |
| Workshop rooms, props and wear | `src/scripts/village/workshop.ts`, `workshop-props.ts`, `workshop-wear.ts` |
| Backyard workshops and other outbuildings | `src/scripts/village/backyard-workshops.ts`, `outbuildings.ts` |
| Yards, boundaries and object placement | `src/scripts/village/working-yards.ts`, `yard-details.ts`, `yard-plots.ts`, `prop-placement.ts`, `site-reservations.ts` |
| Tools, cart and laundry | `src/scripts/village/working-props.ts`, `cart.ts`, `laundry.ts` |
| Ground, roads and vegetation | `src/scripts/village/landscape.ts`, `conifers.ts`, `spring-flowers.ts` |
| Map-derived industrial landscape | `src/scripts/village/historic-plan.ts`, `historic-landscape.ts`, `road-crossing.ts` |
| Brook | `src/scripts/village/brook-water.ts` |
| Animals | `src/scripts/village/village-life.ts` |

For comma-separated filenames, use the directory of the first filename in that row.

The scene uses metres: east is +X, north is −Z, and height is +Y. Blender authoring uses Z-up; exports convert coordinates. Keep local room/forge coordinates separate from village coordinates.

## Models and generated assets

- `scripts/forge/build_forge.py` and `weathering.py`: main Blender forge source and surface generation. `visit_interior.py` adds the visit-led interior; `annex.py` handles the adjoining building.
- `scripts/village/build_cottages.py`: Blender cottage kit.
- `assets/forge/` and `assets/village/`: editable Blender sources.
- `public/forge/` and `public/village/`: compressed runtime models and manifests.
- `scripts/forge/optimize.mjs` and `scripts/village/optimize.mjs`: compression and validation.
- `public/interior-objects/`, `public/interior-materials/`, `public/surface-textures/`: interior and surface assets.
- `scripts/village/export-interior-objects.ts`: interior-object export.
- `artifacts/`: screenshots, inspection outputs and validation records.

Rebuild Blender assets only when needed. Commands: `npm run forge:model` and `npm run village:model`. Ordinary runtime material or placement changes do not need Blender.

Do not edit `dist/` as source. Do not replace a generated GLB without updating its manifest through the relevant packing script. The build checks runtime asset hashes and size limits.

## The worker: preserve the accepted hands

The village worker now uses a **Tripo skinned model**, not just the original procedural figure described in older notes.

- Original downloaded and recovered assets: `assets/chainmaker/tripo-v2/`.
- Current runtime asset: `public/chainmaker-v2/`.
- Current skeletal control: `src/scripts/chainmaker/skeletal-rig.ts`.
- Current work cycle: `src/scripts/chainmaker/work-cycle.ts`.
- Forge placement and tool integration: `src/scripts/chainmaker/worker.ts`.
- Recovery, packing and validation: `scripts/chainmaker/`.
- Original procedural study: `src/scripts/chainmaker/rig.ts`, `public/chainmaker/`, and `/chainmaker?asset=legacy`. The default `/chainmaker` study now loads the Tripo model too.

Tom accepted the latest right and left grips. Preserve these poses and tool contacts unless explicitly asked to change them. Inspect rendered skin in motion: passing joint/contact tests does not prove a natural pose.

## Henry’s statue

- Runtime placement/material: `src/scripts/village/henry-statue.ts`.
- Reference photo, original Tripo GLB and provider record: `assets/henry-statue/`.
- Packed model: `public/henry-statue/henry.glb`.
- Packing script: `scripts/henry-statue/pack.mjs`.
- Full notes: `docs/henry-statue.md`.

It appears only in historic house 22, downstairs. It is a modern family Easter egg, 457.2 mm tall including its base. It now stands on the floor beside the fireplace at local X −3.94, Z −0.87, facing +X. Its base uses the floor datum `base + .03`. The coal bucket is on the other side, at X −3.74, Z +0.87. The shelf has been removed. Preserve the lighter bronze finish.

## Evidence and references

- `photos/`: Tom’s visit photographs and videos. **IMG_4261 through IMG_4280** are key forge references. IMG_4273 shows the hanging chain-support ring.
- `photos/IMG_2411` through `IMG_2415`: modern Henry-house visit references, with their original extensions.
- `artifacts/forge/visit-reference/`: extracted image/video views for quick inspection.
- `legacy/Map/`: original historical family map and related material.
- `docs/village/research/chainmaker-dwellings-report.md`: retained deep research. Original also exists at `/Users/tomweaver/Downloads/deep-research-report.md`.
- `docs/village/chainshop-book-pages.md`, `weaver-house-reference.md`, `chainshop-annex-review.md`, `forge-cottages-research.md`: further building evidence.
- `docs/village/terrain-research.md`, `outside-road.md`, `historic-landscape-opportunities.md`: terrain and old-map interpretation.
- `docs/village/henry-furnishing-plan.md`, `research-building-pass.md`, `domestic-materials.md`: domestic layout and surface rationale.

Historical household numbers are **not modern postal numbers**. Tom is confident in the historical numbering. Do not remap records to modern addresses.

The model is an interpretation. Modern photographs do not prove an 1865 interior. The detailed NLS sheet was surveyed in 1881–82 and published in 1887. Its layer title does not make it an 1865 survey.

Keep the photographed small forge pavers, pale internal masonry and L-shaped stations. Exterior workshops use weathered exposed brick or timber. Tom rejected the random alternating white/red exterior bricks.

## Plan and graphics skills

`docs/village/overnight-plan.md` records the working Day 1–7 scope reconstructed from the brief. The complete original schedule was not retained. Day 6 was deliberately omitted. Read the day-specific notes and `overnight-independent-review.md` alongside the current code; do not assume the original checklist describes all later work.

The Three.js graphics skills are installed at `/Users/tomweaver/.codex/skills/threejs-*/`. Start with `threejs-skill-router/SKILL.md` if using them.

Read **`docs/village/threejs-skills-review.md` before copying examples**. It contains the forge-effects proposal and licence findings. Some examples have GPL or unresolved licence terms. The advanced fire example uses WebGPU compute; our current village uses WebGL. It is not a direct replacement. The proposal has not been implemented. Water work is deferred.

Older root and study READMEs describe earlier states. In particular, the current village streams nearby furnished rooms and has a Tripo worker. Follow current source and the newer focused notes when these differ.

## Checks before handing back

Run `npm run village:check` and `npm run build`. Then run checks for the area changed. **Run checks that read `dist/households.json` after the build, never alongside a build that replaces `dist/`.**

| Change | Additional checks |
| --- | --- |
| Room layout or furnishings | `npm run village:layouts`, `npm run village:objects` |
| Embedded rooms and cleanup | `npm run village:inhabited` |
| Worker or grips | `npm run chainmaker:skeletal` |
| Workshop | `npm run village:workshop`, `npm run village:workshop-props` |
| Navigation | `npm run village:navigation` |
| Roads or historical landscape | `npm run village:roads`, `npm run village:historic` |
| Surface/texture system | `npm run surfaces:check`, `npm run village:textures` |
| Other systems | See `package.json` and `scripts/village/check-*.ts` |

Inspect the actual browser scene after rebuilding. Check close and wide views, relevant motion, entry/exit, and object contact with floors or walls. Save useful evidence under `artifacts/`.

Reuse textures and geometry, bound room caches, and dispose owned GPU resources. Keep Pause, still views and reduced-motion behaviour. The existing final-pass draw-call counter is not a whole-frame performance measure.

Stage only your files. Many untracked visit photos and old review images are intentional. Update the working notes and status, commit locally, and report what you checked. **Never push without a new explicit instruction.**
