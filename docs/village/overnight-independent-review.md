# Overnight independent review — Days 3–7

Date: 18 September 2026

## Result

**PASS for source, type, build, layout, interior and animal checks.**

**Browser acceptance is not part of this result.** The parent task owns browser and visual checks. This review does not claim that desktop, phone, keyboard, screen-reader, or performance checks passed in a browser.

## Scope

Reviewed the overnight plan and these additions:

- the in-scene household reader and all 59 source records;
- 58 rendered cottage interiors and their 74 selectable floors;
- interior entry, floor change, exit, deep-link state, resource disposal and scene restoration;
- main chainshop and Henry Weaver's smaller interpreted chainshop inspection;
- nine hens in three yards and one cat by Henry's workshop;
- animal placement rules and use of the shared paused scene clock;
- scene selection, household navigation and URL state integration;
- the Astro reader markup and village controls;
- the historical fact and interpretation labels in the reader and supporting notes;
- the requested omission of Day 6.

Household 5 remains a real household record. The visible building at its map location is the forge. Therefore, 59 records and 58 cottage interiors is internally consistent.

## Checks run

| Check | Result |
| --- | --- |
| `npm run village:check` | PASS |
| `npm run build` | PASS; 74 pages built |
| `scripts/village/check-layout.ts` | PASS; 59 unique records and all record routes resolve |
| `scripts/village/check-interiors.ts` | PASS; 58 unique plans, 74 floors, no bounds, collision, route, seat or hearth errors |
| `scripts/village/check-life.ts` | PASS; 9 hens, 1 cat, 3 hen yards, deterministic placement and time seeking |
| `git diff --check` | PASS |

The production build reports existing large JavaScript chunk warnings. It reports no build error.

## Day 2 saved-frame review

**PASS.** This result supersedes the earlier incomplete Day 2 review.

The saved `approach.png` gives the forge a clear visual focus, a readable entrance, a wet working yard and useful foreground detail. `brook.png` gives the water course, bank stones, reeds and woodland a clear depth order. The first lane frame failed because it was another high village overview. The revised `lane-revised.png` fixes that composition. The road now leads from the foreground through cottage frontages and into the settlement.

This is a review of the saved desktop frames. It is not a browser interaction or phone performance claim.

## Days 3–5 saved-frame review

**PASS after revision.**

The first Coley upper-room and Henry interior frames exposed rooms that were logically valid but visually sparse. They read as layout shells rather than lived-in homes. Revised plans add chimney breasts, sleeping-bay screens, guarded landings, washstands, trunks, linen benches, baskets, clothes horses, wall pegs and candles. `coley-upstairs-revised.png` and `henry-interior-revised.png` now give the rooms a clear domestic hierarchy while preserving open routes. The old unsuffixed interior frames do not represent the accepted result.

`forge-interior.png` passes after the GTAO fix. The wall ghosts are absent. Three hearth workstations, extraction hoods, anvils, barrels and tools form a plausible working arrangement with clear routes. Its default framing could move 10–20 percent closer, but this is not a blocker.

`yard-revised.png` passes. Three hens have believable ground contact and form a restrained group beside household work structures. The old `yard.png` is an invalid capture from inside a wall and does not represent the accepted camera.

`household-panel.png` passes for visual hierarchy and in-scene use. It shows the census count, source and interpretation text, household actions, and the selected home together. Lower content is available through the panel scroll region.

### Final interior examples

`small-forge-interior-revised.png` passes. Henry's smaller chainshop now has one hearth, one anvil and a clear working aisle. This differs appropriately from the three-station main workshop. The extracted workstation position is visually correct after the normalized integer Meshopt fix.

`billingham-interior.png` passes as the third cottage form. Its clay tile floor, two beds, floor pallet, table, hearth and low sleeping-bay screen make the larger household plan distinct. The room does not claim one shown bed for each of the ten 1861 occupants. Its open central floor preserves the validated entrance and furniture routes.

## Findings and fixes

The workshop cutaway enabled renderer clipping but did not restore the prior renderer state. `inspection.ts` now saves and restores `localClippingEnabled`.

The workshop inspection needs a state signal so the scene can disable GTAO during clipped views. GTAO's normal override does not follow the cutaway material clipping and can draw wall ghosts. `inspection.ts` now exposes `workshopActive` and resets it on exit. Scene integration must use that getter when it enables GTAO.

## Findings for the parent task

1. **Keyboard focus after closing a household panel:** `close-house` hides the panel but leaves focus on the hidden close button. Move focus to the village canvas, selected home control, or household selector after close.
2. **Documentation drift:** `docs/village/README.md` still says interiors and animals are not implemented. Update it before treating the overnight work as complete.
3. **Visual gate:** Confirm the main forge and Henry's smaller shop without GTAO wall ghosts. Check the cut plane, low-angle animal contact, interior furniture routes, both floors, narrow phone framing, and panel scroll behavior.

## Historical and data review

The household reader renders the existing content collection. It does not create resident names or relationships. Census totals are labelled as 1861 data. Household text, sources, and recorded connections stay in the scene.

The UI identifies cottage rooms, furniture, daily-life details, animal locations, and the smaller chainshop form as interpretations. Supporting notes distinguish the modern forge pin, family recollection, photographs, modern terrain and museum references from direct evidence for 1865.

The main forge description says that photographs informed the reconstruction. Source notes support this statement. This source review does not prove that the current camera or model visually matches each photograph.

## Limits

This review used source inspection and deterministic checks. It did not use a browser, assistive technology, a physical phone, a GPU profile, or a frame-time capture. Those checks remain necessary for the full Day 7 acceptance gate.
