# Napkin — Mushroom Green project

Quick-reference notes Claude should internalize on every session start. Update whenever a mistake is corrected, a quirk is discovered, or a pattern is validated.

## Project shape

- Astro static site, content collections drive 59 per-household pages.
- Leaflet 1.9 from CDN (matches the legacy map). Carto Light tiles. Don't swap for MapLibre without explicit ask.
- Tom commits everything. Father supplies content; Tom converts to Markdown.
- Public site, no auth, no CMS.

## Conventions

- Household files: `src/content/households/{NN}-{kebab-name}.md` — two-digit number prefix for natural sort.
- Family enum is fixed: Weaver | Billingham | Hancox | Dimmock | Griffiths | Nicklin | Pearson | Sidaway | Kendrick | Other. Adding a family means updating the enum *and* the colour table in `src/data/families.json`.
- Polygons stored as `[lat, lon]` tuples (matches Leaflet's order, not GeoJSON's `[lon, lat]`). Don't flip them.
- Map visual continuity with the legacy HTML matters. Don't redesign without checking.

## Don't

- Don't move or delete `legacy/`. It's father's source-of-truth reference material.
- Don't add a CMS, auth, comments, or descendant accounts without explicit ask — those were explicitly out of MVP scope.
- Don't reinvent the family colour palette — it's in `Confluence.docx` and the legacy HTML, and father chose it deliberately.

## Codebase quirks

- Some households have two surnames in one slot (e.g. #51 "Wm Round / Isaac Billingham"). MVP keeps both in `household_name`, picks one for `family`. Refactor to a `co_household` field only if the genealogy needs it.
- Henry Weaver b.1789 (#22) is the only household with biographical content on day one — it's the worked example.
- A few households may have `estimated_position: true` if not yet in OSM — render the amber warning when set.

## Patterns that work

- The `/forge` study uses Python → Blender → GLB → Three.js. Run `npm run forge:model` to regenerate and validate. The original map routes stay independent.
- Blender 5.2 can crash at startup inside the restricted sandbox on this host. An approved external run works. The `game-dev` CLI is not installed; validate GLB with `scripts/forge/optimize.mjs`.
- `sips` converted these HEIC references to black pixels. `pillow-heif` decoded the originals correctly. Always inspect converted pixels before using them.
- Three.js r186 removes `PCFSoftShadowMap`; use `PCFShadowMap`. GTAOPass treats sprites as opaque in its normal pass. Keep smoke on layer 1 and use a layer-0 camera for AO.
- Meshopt quantization can add translations to glTF nodes. Preserve roof mesh base positions before animating them.

- Slug derivation (`src/lib/slug.ts`): split on `/` first, then per-side tokenize. Drop secondary first names by hardcoded set ({mariah, isaac}) — there are only two compound households so a regex isn't worth it. "wm" is dropped wherever it appears (non-distinguishing). Other abbreviations (sml, jos, thos, geo, jas, amb, benj) are kept because they uniquely identify a primary household entry and there's no clean way to distinguish them from real first names.
- Node 22 can `import` `.ts` files directly with `--input-type=module` — useful for one-shot verification scripts without spinning up a test runner.
- `npx astro check` requires `@astrojs/check` — install non-interactively with `npm install --no-save @astrojs/check` (the interactive prompt is shell-bound and won't auto-confirm).
- `<script is:inline define:vars={{...}}>` is the right pattern for handing server-imported JSON to a client-side Leaflet script. Functions can't cross the boundary — inline equivalents of helpers (e.g. `family-style.ts`) into the client script and pass the data table via define:vars instead.
- The security hook flags innerHTML on principle. For trusted data (our own content collection + literal SVG strings), proceed and note the rationale in a comment. The legacy Leaflet code uses the same pattern; Leaflet's `divIcon` accepts an `html` field that ends up as innerHTML internally — there's no safer Leaflet API for HTML markers.
- Astro scopes class names with `data-astro-cid-*` attributes per component. To override a child component's element (e.g. VillageMap's `#map` height) without editing it, use `:global(#selector)` in the parent's `<style>` block — same pattern the existing print CSS uses.
- Multi-ring decorative borders (the title cartouche + outer frame) are built with a single layered `box-shadow: inset 0 0 0 Npx COLOR, ...` declaration rather than nested `<div>`s. One element, no DOM bloat, and the rings stay perfectly centred even at fractional pixel widths (e.g. 1.5px, 3.5px from the source).
- Astro renders `.astro` components statically — for fixed-position decorative chrome there's no need to mirror the legacy file's inline-JS `document.createElement` pattern. Just author the markup in the template and use scoped styles. Legacy did it via JS only because the script was the bootstrapping mechanism for the whole page.

- Blender needs `--python-exit-code 1`: otherwise a Python failure can return success and optimize a stale GLB. Ground changes its material batch key, so optional per-face UV lookup must allow missing keys.

- `/village` uses the original geographic data in local metres, east +X / north -Z, Henry #22 at origin. Building forms and terrain are interpretations. The old `founder-scene.json` forge placement was explicitly fictional; do not present it as surveyed.
- Dudley Planning Guidance Note 22 describes Mushroom Green’s modest brick/rendered homes and dark clay tiles. The BCLM Chainmaker’s House dates from 1886 and depicts a prosperous 1914 household; it is not the default for 1865 cottages.
- Three.js village cameras need distance-aware fog and phone-specific framing. Disable controls until async assets and listeners are ready.

- Tom prefers the village to open steeply from above, north-up. Modern chainshop pin: 52.4754217, -2.0931022; suppress cottage mesh #5 but retain its historical household record. The forge’s earlier (-14,43) placement was wrong.
- Paint lane surfaces before wheel tracks; painting overlapping circles with tracks in one pass makes a repeated scalloped arc pattern. Stream carving and water meshes must share the same rounded source lines.
- Dwelling character uses a separate household seed in `dwellings.ts`; do not consume the global landscape RNG. Clone materials before per-house changes, and cache joinery separately when doors share oak with structural timber.

- Day 1 comparison views are `/village?view=approach` and `?view=forge`. Yard detail in `showcase.ts` uses its own seed. Keep the ordinary `/village` opening north-up. Tiny grass clumps read better than tall paired triangles at low sun angles.

- The forge entry is the right gable at local X +4.6, not the front open shutter. Local Blender Y maps to negative glTF Z. Aim approach paths at the gable.
- Transparent yard overlays can hide a puddle unless its renderOrder is greater. Planar reflectors must skip scene.overrideMaterial passes, or an AO/normal render can contaminate their texture.
- The independent Day 1 gpt-5.6-sol visual gate passed; see artifacts/village/day-1/second-model-review.md. Keep fixed `still=1` comparisons (time=4 seconds) for later art changes.

- Brook water uses metre-based downstream UVs and a local planar reflection. Hide all reflectors during capture to prevent nested reflections. Flow direction follows interpreted terrain fall, not surveyed hydrology.
- IcosahedronGeometry has duplicate vertices across faces. Use position-based displacement; per-index random displacement opens cracks in stones.

- EA 2022 composite DTM 2 m crop is saved in artifacts/village/terrain. Modern chainshop/Henry ground ~100 m OD; nearby mapped Black Brook ~87 m. Scene extent ~86–111 m. See docs/village/terrain-research.md before replacing the invented baseGround function; historical eastern watercourse diverges from modern low ground.

- Live village now reads terrain-heights.json (4 m grid, Gaussian sigma 6 m, datum 82 m OD). Call prepareGround(homes) before scene geometry. Water and rocks use streamSurface, not baseGround offsets. Ground includes level building/puddle platforms and interpreted downhill channel cuts.

- Weaver reference: IMG_2411 ~2:09–2:19 says bathroom replaced old chainshop site (extension reported 1973). Likely white flat-roof addition at eastern/roadside end in IMG_2412, not wooded garden end. Reported house dates 1896/1926 are oral history, not confirmed. See docs/village/weaver-house-reference.md; do not remove historical #13/#26 from modern canopy evidence.

- Henry’s small shop uses weaverWorkshop(founder): negative local X is the east/roadside gable. It shares the forge asset at .55/.72/.70 scale, with chimney meshes replaced by one stack. Exclude that footprint from fences and woodland.

- Laundry now uses laundry.ts subdivided garment meshes with a shared paused scene clock, woven canvas maps and split pegs. Fixed review URL ?view=washing; its camera must stay inside the yard to avoid the neighbouring house.

- Lane painting must layer the whole network (all verges, then all cores, then tracks). Ground ruts and nearestRoad use rounded routes. Chimneys exist in cottage GLB, lowHouse, dwellings extra stacks, and Henry shop; fix all variants. yard-details.ts batches coal bins for 58 visible homes and Henry’s kitchen beds.

- Footpaths must paint after road shoulders and before wheel tracks. Their flared, feathered mouths remove the dark verge stripe at minor junctions.

- Dense woodland uses a separate seed, green-boundary distance, and oriented house/yard exclusions. Keep Henry’s laundry and vegetable beds clear; protect footpaths and both forges.

- Day 2 keeps tree positions, replaces 20% of crowns with pine/fir sprays from conifers.ts, and records scope in docs/village/day-2-art-direction.md. Puddle reflection shader replacement matches the installed Reflector source.

- Tom requests local commits at suitable checkpoints. Do not push: Netlify is linked and a previous push deployed the wrong version.

- Chimney brick courses had real see-through gaps. Both Blender builders now include four continuous recessed mortar walls; retain their Chimney-prefixed mesh names for village extraction. Keep the flue empty above its recessed darkness plate.

- Grass should read as untended ground: seeded patch colonies, dry/bare atlas patches, longer blades away from paths, and discontinuous short wall weeds. Keep planted beds and paths clear.

- Interiors are isolated cutaways. Workshop clipping must disable GTAO because its override normal material leaves wall ghosts; restore renderer.localClippingEnabled on exit. Rooms are interpreted, with 58 cottages/74 floors; #5 is replaced by the visible forge but keeps its record.
- Tree trunks and crowns are now instanced together. Hide both for close-view occlusion; hiding crowns alone leaves distracting bare trunks.
- Household reader clones server-rendered trusted content templates. Keep census year1861 distinct from the1865 scene, and never invent missing family narratives.
- Forge detail pushed its compressed output over the 12MB budget; never assume model export succeeded from Blender exit alone. Both builders now stage under artifacts/*/raw and only validated optimizers replace public assets. prebuild checks hashes, byte budgets and compression receipts.
- Decode normalized integer Meshopt POSITION attributes to Float32 before baking world transforms. Applying transforms directly to quantized attributes clamps coordinates and destroys the small-shop geometry. centralWorkstation plus its regression check covers this.
- Heathcock #41 has a 2m visual setback away from the nearest lane in makeHomes. All attached yard, terrain, path and interior positions follow that transform; source map coordinates stay intact.

- Chainmaker demo lives at /chainmaker, separate from village placement. Character GLB uses named limb groups and a Three.js analytic rig with dynamic shoulder cloth; the GLB download does not embed the animation. Anvil face is 1.055m; link centre 1.062m with 7mm tube, hammer face contact 1.069m. Five adversarial visual rounds recorded in docs/chainmaker/review.md.

- Main forge now owns one Working chainmaker group. Its figure stands at local Y .125 for brick-floor contact; poseAt floorHeight offsets tool targets to keep the link at1.062m. Remove only central idle Hammer geometry with centralWorkstation(..., false). Interior watch-worker camera and pause share village state.

- Surface refinement lives in rendering/surfaces.ts: profiles compose existing shader callbacks, filter subpixel grain, and retain authored atlases. Material.clone drops onBeforeCompile; use cloneSurface for clipped workshop materials. Per-forge surfaceDatum must be independent. Trunks need a separate material from timber props. Cold Cinders use Coal material with default emissiveIntensity=1 but black emissive; test emissive colour before enabling fire.

- Spring flowers use spring-flowers.ts with a separate seed and two instanced draws. The copse in house 5’s camera is northwest of the forge, centred near (12,23). Protect roads, domestic yards, both workshops, streams and tree trunks. The living scene has 1,665 bluebells and 268 daffodils with the current tree layout.

- Generated service extensions now use outbuildings.ts: four merged material batches, individual bricks/boards/tiles, inherited oak/slate atlases, real door recesses. Keep roof slope rising toward the cottage and clear the authored rear shed at local X=w/2-.8. Preserve the original dwelling random draw count when changing additions.

- Main village rooms now stream through inhabited-houses.ts (four visible, eight cached), using createInteriors(parent,true). No per-room global ambient lights; hide the stream during cutaway inspection. Exterior vertical scale consumes three roof RNG draws before height. Embedded linings subtract the .12m floor datum from window heights. Keep glass transparent and detailed exterior LOD camera-aware. Step inside uses room=1; it is an orbit view, not collision-based walking.

- House entry now uses View house / Go inside; View cutaway is inside room controls. household-reader.ts sets button labels dynamically, so update it with the Astro labels. Pan translates camera and target together; repeated zoom/pan uses the pending tween endpoint. Cart uses three merged batches and sampled terrain support, with shafts lowered and the forge door clear.

- working-props.ts supplies ten original models; prop-placement.ts merges all placed examples into five material batches and excludes existing animals and working areas. /props is the inspection study. Half-round logs need closely packed rows and cross bearers; an inverted row reads as floating shelves. Barrow wheel sits forward of the tray with separate axle brackets. Source references and later-object caveats live in docs/village/working-props.md.

- Second prop pass: twenty templates, 218 placements across 53 areas, six merged material batches. Keep atlas cell selection separate from shape RNG: textured and untextured props must have identical bounds. Wicker rows need close spacing. Sack surfaces need shared normals and continuous support boards; separate outer bearers made the sacks look airborne. Exact counts come from the validation JSON, never mental totals.

- Brooms cannot stand unsupported in yards. Defer them until supports exist: lean against a barrel or fit both the brush and handle tip to terrain. Use rotated footprints for clearance, and validate actual mesh contact. Omit a broom if neither supported position fits. User called the upright floating broom a witch problem.
