# Research-led buildings and yards

20 September 2026. Based on Tom's supplied [research report](research/chainmaker-dwellings-report.md). The source file is preserved unchanged. Its ChatGPT citation tokens are not working source URLs in this export. The central architectural claim was checked against the [University of Warwick Modern Records Centre](https://warwick.ac.uk/services/library/mrc/collections/digital/tradeboard/chainmakers/), which describes small-chain work in cramped outbuildings beside homes and identifies the 1906 workshop photograph.

## How the evidence changes the scene

The report concerns late nineteenth-century housing, with its strongest detailed sources from 1906–1912. Our scene remains an interpretation of 1865. The pass uses cautious material and domestic/workshop distinctions; it does not backdate every later fitting.

| Finding | Applied treatment | Limit |
| --- | --- | --- |
| Domestic cooking and industrial forging were normally functionally separate | Preserve the existing two chainshops and domestic cooking ranges. Workshop floors keep their dedicated scale/ash treatment. | Do not invent a workshop for every chainmaker or change an occupation record into a building survey. |
| Work dirt transferred through yards and entrances; domestic housekeeping still mattered | Dark fuel handling marks at each existing coal bin; swept domestic entrance aprons; fuller industrial yard marks at both shops. Indoors, tracked dirt fades inward and softens near beds. | This is a plausible cleanliness gradient, not measured dirt levels. |
| Mushroom Green accumulated repairs and additions | Irregular lime repairs/repointing, isolated roof repairs, weathered timber ends, braced store doors and patched boards. | House-specific repair patterns are seeded art direction, not historical inventories. |
| Furniture and bedding need not be forge-filthy | Preserve aged materials and cooking-hearth smoke; reduce universal floor-level grime and fabric marking around sleeping places. Remove the strong repeated plaster-base stain. | No claim of exact housekeeping standards. |
| Vernacular buildings should not look like identical complete builds | Remove flat rectangular soot blocks from cottage walls. Replace the crude solid storage boxes with planked chests, board lids, straps and latches. | Existing building positions, footprints and usable routes stay intact. |

## Coverage and implementation

- 58 cottage roots and the two existing workshops receive scoped building-age treatments. Low and high cottage models both receive them. Materials use building-local coordinates, so repairs follow rotated and scaled buildings.
- 43 visible service stores receive braced doors; the 29 timber examples get small board-foot patches and fixings. All 58 cottage sheds retain their individual cladding.
- 19 visible front storage boxes are replaced with planked storage chests within their existing dimensions.
- All 74 furnished floors use the updated wear system. Upper-floor foot polish starts at the stair landing. Sleeping areas have less transferred dirt, while the cooking area keeps local hearth deposits.
- The terrain receives all yard marks in its existing 4096-pixel canvas. No new terrain layers, transparent decals, image downloads or atlas sheets.
- The About panel links to the archive and explains the source dates and uncertainty.
- Water, household census counts, map positions, building footprints and inherited textile objects remain unchanged.

The report does not establish individual sanitation, mud/slag construction proportions, tenure, exact room sizes or furniture inventories. This pass does not introduce those as facts. Existing washing and sanitary fittings remain artistic interpretations.

## Validation

TypeScript, the production build, surface shader composition tests, 59 store geometry variants, all inhabited floors, room route/layout checks and workshop extraction pass. Building-age tests cover rotated/scaled instance coordinates, source-material isolation, inherited shader callbacks and protected glass/workshop floors.

Browser checks cover Henry's interior, cottage exteriors and the service-store yard. Texture residency remains within the existing 64 MiB atlas budget. The six current sheets use 50,320,272 bytes including mipmaps. This limit does not include all scene memory. No new atlas downloads were added.
