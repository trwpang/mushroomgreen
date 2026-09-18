# Overnight refinement validation

18 September 2026. Local preview at port 4326. No push or deployment.

## Delivered scope

- In-scene reader for all 59 records: census totals, source text, interpretation notes, neighbours and previous/next navigation. It replaces the old household-page exit from the village.
- 58 individual cottage plans and 74 floors. Household 5 keeps its record but its visible building is the main forge. Rooms differ in proportions, crowding, furniture placement, cloth and timber palette, sleeping arrangement and ground-floor material. Selected ground floors use clay tiles or flags; upper floors use timber. Only one interior is allocated at once.
- Three clear workstations in the main forge; one in Henry's smaller shop. Visit photos informed brick floors, stained lime walls and working layout. Doors open onto a clear aisle. These interiors remain interpretations.
- Nine hens across three yards and a resting cat. Animal poses, water, smoke and laundry share the paused clock. The yard view is available in Henry's record.
- Weathered boarded privy, roof and door hardware; improved lean-to roofs; transparent interior glazing and reflected exterior glass.
- Bookmarkable households, interiors and floors. Existing map, zoom, lighting, pause and clean-picture controls remain.
- Day 6 omitted. People, railway reconstruction and exact historic room layouts remain outside this pass.

## Independent review

`overnight-independent-review.md` records the gpt-5.6-sol source gate and saved-frame visual gate. Initial failures caused changes: lower lane camera, clear brook sightline, lighter puddle, more domestic room detail, protected stair openings, clearer yard camera, and removal of cutaway wall ghosts.

Day 2's final saved-frame gate passed. The first review is retained in `artifacts/village/day-2/independent-review.md`; its retry lost browser access and did not claim a result. The later independent screenshot review supersedes that incomplete retry.

## Automated checks

- Village and standalone forge TypeScript checks pass.
- Astro production build passes: 74 pages.
- All 58 room plans are deterministic and unique; 74 floors pass bounds, overlap, entrance passage, furniture access, seat proximity, hearth alignment and both stair-landing checks.
- Animal placements avoid buildings, paths, workshop areas, coal bins and steep ground. Hens are clear of shrubs. Placement and time seeking are deterministic.
- Forge: 360,740 triangles, 11,897,220 bytes; zero glTF errors.
- Cottage kit: 295,802 triangles, 7,363,944 bytes; zero glTF errors.
- Compressed-workshop extraction regression passes: integer positions decode before world transforms, keeping the domestic hearth intact.
- Asset prebuild checks compare runtime byte count, SHA-256, compression and validation receipt. Raw exports now stage outside `public`.
- Deliberately invalid staged exports fail without changing either public GLB or manifest. Receipt: `artifacts/village/overnight/publication-check.json`.

## Browser checks

Parent checked the running desktop scene with CUA, not a mockup. Evidence is in `artifacts/village/overnight/`.

- Approach, lane and brook views show their subjects without blocking geometry.
- Household 22 opens in the scene, displays the correct source record, and enters/exits its interior.
- Household 3 switches between living and sleeping floors; a direct upstairs URL restores the selected floor.
- Household 10 supplies the long-cottage check and a more crowded sleeping arrangement.
- Main and small forge cutaways show open circulation. GTAO is disabled for clipped workshop walls; exit restores renderer clipping state.
- Hens are visible at ground level in the working yard.
- At 390 × 844, the household panel scrolls as a bottom sheet and the full interior fits above its controls. The temporary viewport override was reset.
- Close and Escape return keyboard focus to visible controls. This is a targeted keyboard check, not a complete assistive-technology audit.
- No browser console errors observed during the checked flows.
- On this Mac's browser, the existing rolling frame counter showed roughly 31–37 fps outdoors and 59 fps in a workshop. These are spot readings, not a controlled GPU benchmark or physical-phone claim.

Known limits: geometry and family facts are validated across every home, but visual inspection samples representative home types. Rooms and animal locations are authored interpretations. More family prose can be added to the existing content collection without changing the reader.
