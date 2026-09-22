# Chainshop visit: interior refinement

22 September 2026. Sources: Tom’s `photos/IMG_4261` through `IMG_4280`.

## Evidence and limits

Reviewed eleven still photographs and three sampled frames from each of nine videos: 38 views in total. Sample times are in `artifacts/forge/visit-reference/sources.json`. The samples cover the beginning, middle and later part of each clip; this was not a full frame-by-frame video review.

These show the surviving museum workshop during a modern demonstration. They establish useful construction, tool and surface references. They do not establish the exact equipment or arrangement in 1865. Dimensions below are modelling estimates, not measurements. Some very large links may be display stock. Henry’s shop remains an interpretation based on the family account.

## Applied details

| Detail | Main reference | Model specification and placement |
|---|---|---|
| Small floor pavers | 4261; 4277 video | Approx. 220 × 110 mm pitch in the main shop; narrow joints, chipped shoulders and small height changes. Brown-grey palette with dark scale near anvils. |
| Limewashed brick walls | 4261, 4264, 4273 | Individual courses under a thin, varied pale finish. Recessed mortar stays visible. Smoke deposits concentrate near the fires. |
| Pale chimney breasts | 4264, 4273 | Three tapered masonry breasts replace the black metal hoods. The internal throats stay soot-dark. |
| Pale chimney stacks | 4264 | Matching pale masonry, with dark upper courses and retained open flues. |
| L-shaped stations | 4273; 4265 video | A rear hearth joins a timber workbench at right angles. Three main stations; one in Henry’s shop. |
| Square timber bases | 4273 | Separate vertical timbers and rough top boards, iron straps and bolts. Main top is about 0.79 m above the model datum. |
| Small chains | 4273; 4277 video | 75 mm link centreline length, 7 mm bar radius. Uneven coils near work areas. |
| Medium chains | 4261, 4273 | 150 mm link centreline length, 13 mm bar radius. Wall-side stock, with clear central passage. |
| Large chains | 4261 | 440 mm link centreline length, 40 mm bar radius; occasional centre studs. Two main-shop piles only. |
| Cut iron stock | 4273 | Short rods on timber bearers beside walls, separated from the working aisle. |
| Unclosed links | 4273 | Open C-shaped blanks on the bench, kept clear of the working anvil face. |
| Forming mandrels | 4273 | Short tapered iron tools beside the blanks. |
| Pokers and tongs | 4264, 4273 | Wall rails with hanging iron tools. This storage arrangement is an interpretation. |
| Supported hand vices | 4273 | Jaws, screw, sliding handle, timber support and metal leg. Main-shop vices use the idle stations. |
| Quench vessels | 4264, 4273 | Open metal vessels with visible water and handles, placed beside stations. Vessel dimensions are interpreted. |
| Fuel beds | 4273; 4265 video | Dark coal around the existing live embers, within the raised firebrick cheeks. |

No modern visitor barriers, electric lights or demonstration clothing were added. The approved working figure and its hand animation remain unchanged.

## Smaller shop

Henry’s shell keeps its existing scale. Its anvil and timber base retain useful working width and height. The contents use physical dimensions independent of the shell scale. It receives 54 small links, 12 medium links, 14 straight blanks, two open links, seven tools, one quench vessel and one coal bed. It has no large stud-link pile.

The main shop receives 84 small, 63 medium and 18 large links; 42 straight blanks; six open links; 15 tools; two quench vessels; and three coal beds. Counts include the new props, not the pre-existing yard stock or the worker’s held tools.

## Browser cost and checks

Original local geometry; no Tripo job or new texture image was needed. Metal uses the existing shared iron atlas. Repeated pieces use instancing: 17 batches in the main shop and 13 in Henry’s shop. The new props add 73,144 and 28,976 drawn triangles respectively.

The rebuilt compressed forge is 11,913,776 bytes and 516,020 triangles, within its existing 12 MB / 600,000 triangle limits. This budget covers the GLB, not the complete village or added runtime props. Khronos validation reports zero errors; decoded position and index checks pass.

Checks: TypeScript; compressed workstation extraction; prop bounds, entrance and worker clearance; batch/triangle limits; production build. Browser review covered both cutaways, rotated views and the working figure. The cutaways now hide the external yard stock, which otherwise appeared unsupported when the ground was hidden.

## Further details visible in the references

A suspended large ring and support rod, dense chain-filled bins, more specific bench fixtures, and worn shutter catches offer useful future modelling references. Their exact forms and historical use need individual checks. These are not claimed as completed in this pass.
