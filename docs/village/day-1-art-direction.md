# Day 1 — The chainshop approach

## Direction

A damp afternoon after rain. Warm light catches brick and worn slate. Smoke and pale distance separate the village layers. The yard shows work: coal, stored timber, salvaged brick, worn flags, cinders, and small damp hollows. Keep the palette quiet and the setting modest.

The first study covers the chainshop and approximately 32 metres of surrounding ground. The complete village remains accessible from its original north-up opening view.

## Repeatable comparison views

Use the same desktop viewport when comparing revisions. Add `still=1` to pause at the fixed four-second scene state. The fixed seeds preserve the yard layout. Add `clean=1` for a view without the interface, or press H; Escape restores controls. The Save picture button creates a clean 1920 × 1080 PNG preview with a download link. Camera positions below are in local scene metres; the forge remains at the modern pin.

| View | Link | Purpose |
| --- | --- | --- |
| Map | `/village?still=1` | Orientation, site placement, and overall colour balance |
| Approach | `/village?view=approach&still=1` | Main composition: forge, working yard, neighbouring cottages, distant village |
| Entrance | `/village?view=forge&still=1` | Slate, shutters, brickwork, threshold, and yard detail |

Approach target: forge position + (1.2, ground height + 1.6, −1.8). Camera offset from target: (17, 2.9, −11), with a 34° field of view. Entrance target: forge position + (0, ground height + 1.5, 0), camera offset (16, 3.6, −4), with a 38° field of view. Narrow screens pull back to retain the building. The approach follows the actual right-gable doorway, not a front-wall shutter opening.

## Reference notes

- User's Mushroom Green photographs and original X visual reference remain the primary building and style references.
- [Black Country Living Museum industrial trail](https://bclm.com/plan-your-visit/trails/industrial-enthusiasts/) describes small chain production in backyard shops. Its shop represents 1900, so use it for workshop character rather than exact 1865 reconstruction.
- [Chainmaking, Cradley Heath, 1907 — Staffordshire Past Track](https://www.search.staffspasttrack.org.uk/Details.aspx?ResourceID=40691&ThemeID=490), image courtesy of Birmingham Library. Visually inspected: dark brick, rough floor, tightly packed working materials, and small window openings. This is a later interior reference, not evidence for the Mushroom Green yard layout. Image is not bundled or redistributed.

## Implemented

- Fixed approach and closer entrance cameras, with direct comparison links.
- Lower warm sunlight, longer shadows, local forge glow, and distance haze.
- Original seeded yard surface, faint cart tracks, gravel, small puddles, and doorway flags.
- Salvaged brick coal bay and varied timber stack.
- Finer grass blades and rounded tree crowns.
- One local planar puddle reflection, with an irregular feathered edge and damp surround. It follows camera movement; stationary updates are throttled. It is excluded from the AO normal pass.
- Shadow-casting warm entrance light, dimmer orange cinders, and a clear foreground track leading to the real gable doorway.
- Fine-leaf brambles, textured earth, and broken rut margins.
- Clean-interface mode, PNG picture preview/download, fixed-time comparison links, and resize handling.

## Independent review and completion

Day 1 passed an independent visual gate using **gpt-5.6-sol**. See [the signed review record](../../artifacts/village/day-1/second-model-review.md). The reviewer inspected a fresh rendered approach, clean cover frame, entrance, lane, and north-up map. An earlier review rejected several drafts; the accepted frame has a clear arrival path, warm entrance, readable water reflection, work materials, and separated foreground/background layers.

### Scope audit

| Requirement | Evidence |
| --- | --- |
| One strong chainshop cover view | Independent rendered 16:9 review: PASS |
| Map, lane, entrance compositions | Fixed view controls and comparison URLs; independently inspected |
| Damp ground and modest working setting | Muddy ruts, planar puddle, damp rim, coal, salvaged brick, timber and flags visible in accepted frame |
| Low afternoon light, warm interior, subdued plants | Directional light, shadow-casting entrance glow, fine-leaf brambles and haze visible in accepted frame |
| Focused research | Original local photographs/X reference plus the dated primary sources above |
| Saved comparison views | `artifacts/village/day-1/views.json`; fixed-time URLs and PNG export preview |
| Functional checks | TypeScript, production build, all 59 household/layout invariants, clean/restore controls and picture preview |

The independent 390 × 844 follow-up was unavailable because its browser surface disappeared. Do not treat Day 1 as a phone-device benchmark. The browser already had desktop/phone controls, but full device performance testing remains in Day 7.

### Nonblocking next-stage work

Day 2 should extend wet ground and clustered cover along the lane, soften the mirror-sharp puddle reflection, refine distant tree crowns, and improve smoke shape. These do not block the accepted Day 1 benchmark. Further historical precision needs source evidence; do not infer exact 1865 yards from later reference photographs.
