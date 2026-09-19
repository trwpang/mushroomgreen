# Objects of home — interior reference and production pass

## Result and scope

112 distinct catalogue entries: 109 objects and three floor/ceiling fitting kits. See [Henry’s furnishing plan](henry-furnishing-plan.md) for the latest arrangement and references. They furnish the 58 visible cottages across 74 floors. Historical household No. 5 retains its record, but its visible site is the main forge, not an additional cottage.

These are original procedural meshes. No museum photograph pixels, purchased models, external textures, or generated-image bytes are included. The photographs guide shapes and room arrangements. This is an interpretation of 1865, not a claim that a named family owned any particular item.

- `/interior-objects` lets you inspect each model, turn it, and see its dimensions.
- `/interior-objects/catalogue.glb` contains 112 named models on a 2.5 m inspection grid for Blender. Portable PBR colours are included. The live village adds its shared texture maps, household colours, and procedural surface finishes.
- `src/scripts/village/interior-catalogue.ts` is the stable inventory.
- `src/scripts/village/interior-objects.ts` builds the meshes and records their actual support surfaces.
- `src/scripts/village/interior-dressing.ts` chooses and places household selections.
- `artifacts/village/interior-objects/validation.json` contains dimensions, geometry hashes, counts, and every placement.

## Reference review

The user's Google Images tab was reviewed directly, including its selected range photograph, the kitchen/outer room photograph, and the hovel photograph. Other visible results showed a dresser, blue-and-white plates, mantels, plain dining furniture, hearth implements, curtains, and tiled floors.

| Source | Observed details used | Limits |
| --- | --- | --- |
| [R1 — Alamy, back-to-back interior](https://www.alamy.com/back-to-back-house-interior-at-the-black-country-living-museum-in-dudley-west-midlands-england-uk-image238592743.html) | Black iron range, grate, oven doors, cooking pots, coal container, water pail, fireguard, mantel plates, curtain, boarded ceiling | Visual reference, not a dated inventory of Mushroom Green |
| [R2 — Learning and Exploring Through Play](https://www.learningandexploringthroughplay.com/2023/05/black-country-living-museum.html) | Worn floor, scrubbed table, cloth, curtain, shelves, jugs, bowls, clock, and kitchen tools in adjoining room | Museum rooms can represent later dates |
| [R3 — Tripadvisor, Victorian house interior](https://www.tripadvisor.co.uk/LocationPhotoDirectLink-g187065-d214015-i354846954-Black_Country_Living_Museum-Dudley_West_Midlands_England.html) | Cast-iron range, mantel, narrow crockery storage, plates and tableware | Used for arrangement and silhouettes, not provenance |
| [R4 — Wikimedia, the hovel interior](https://commons.wikimedia.org/wiki/File:The_hovel_interior_black_country_living_museum.JPG) | Plain benches, table, suspended cloth, a pail, small hearth, exposed timber overhead | Used as the simpler end of the material palette |
| [R5 — V&A, sewing machine history](https://www.vam.ac.uk/blog/design-and-society/pandemic-objects-sewing-machine) | Domestic machine layout: horizontal bed, upright needle, flywheel and spool | Model family introduced in 1865; pictured museum object is later. Machines were costly, so they are scarce here |
| [R6 — Powerhouse, Singer machine, 1860–1861](https://collection.powerhouse.com.au/object/256560) | Early machine and cast-iron table as a reference for the treadle assembly | Supports period plausibility; does not establish local ownership |
| [R7 — BCLM collection overview](https://bclm.com/our-museum/our-collection/) | Domestic object vocabulary, including irons and coffee mills | Collection spans several periods |

The stove types, furniture variations, and many small tools are interpretive extensions of these references. The 100 entries are not presented as 100 individually identified objects in the supplied photographs. Decorative patterns are original and restrained. There are no modern appliances or electrical sewing machines.

## Placement rules

Every home retains a cooking source, dining table with seats, storage, and a bed. Three range forms, three table constructions, three bed frames, and three storage forms vary the larger silhouettes. Kitchen storage is wider where the existing clearance plan can accommodate it.

- Cooking vessels stand on hob surfaces. Hearth tools stay beside the chimney.
- Crockery sits on actual shelves. Display plates stand against the rack. Heavy storage stays in cabinets or close to walls.
- Washing pails sit under washstands, with soap and a jug above. Coal stays at the hearth.
- Bedding rests on mattresses. Boots, clogs, and chamber pots stay in the bed footprint.
- Sewing machines are limited to selected homes. They have supported bases, needle, spool, flywheel, and hand or treadle drive.
- Curtains have rods, rings, and brackets. Hanging objects have visible pegs.
- Extra cradles and sacks enter only when the existing person-sized route test still passes.
- Tile and board modules fit the room edges. Both floors and ceilings leave stair openings clear.
- No additional global room lights are added. Existing camera-based streaming remains capped at four visible cottages and eight cached cottages.

## Validation and review

Run `npm run village:objects`, `npm run village:layouts`, `npm run village:inhabited`, `npm run village:check`, and `npm run build`.

The catalogue check requires 112 unique IDs and distinct geometry hashes, finite positions/normals/UVs, grounded origins, model budgets, deterministic household selection, complete catalogue usage, and core furniture in each home. Ray tests check actual mesh contact between small objects and their supporting furniture. The inhabited-room check retains glazing, door, window-border and streaming regressions, and now checks the ceiling stair opening.

`npm run village:objects:export` regenerates the portable collection. It validates the compressed GLB, decodes it again, checks indices and positions, and records the source and output hashes. The build checks the asset receipt before serving it.

Visual corrections during this pass: remove the strong repeated floor pattern; widen cramped kitchen drawers; remove wood trim from iron range panels; join bed spindles to continuous curved rails; replace oval mattresses with rounded rectangular ticking; replace approximate shelf heights with measured support surfaces; fit curtains and hanging objects to visible supports.

## Catalogue

“Reference-led” means the general object form or fitting is visible in the reviewed room images. “Interpretive” means a related household object or a distinct construction variant, rather than an individually identified photograph object. Dimensions are metres, width × height × depth. Fitting kits cover one metre modules before room fitting.

| No. | Object | Support/use | Basis | Dimensions | Uses |
| --- | --- | --- | --- | --- | --- |
| 1 | Open grate cooking range (open-range) | core | R1–R4, reference-led | 0.96 × 1.18 × 0.55 | 19 |
| 2 | Side-oven kitchen range (oven-range) | core | R1–R4, reference-led | 0.96 × 1.18 × 0.55 | 20 |
| 3 | Compact enclosed hob stove (hob-stove) | core | Interpretive; related to R1–R4/R7 | 0.96 × 1.18 × 0.55 | 19 |
| 4 | Scrubbed plank dining table (scrubbed-table) | core | R1–R4, reference-led | 1.30 × 0.78 × 0.71 | 18 |
| 5 | Turned-leg kitchen table (turned-table) | core | R1–R4, reference-led | 1.30 × 0.78 × 0.71 | 20 |
| 6 | Braced trestle dining table (trestle-table) | core | Interpretive; related to R1–R4/R7 | 1.30 × 0.73 × 0.68 | 20 |
| 7 | Rope-strung timber bed (rope-bed) | core | Interpretive; related to R1–R4/R7 | 1.21 × 1.06 × 1.81 | 32 |
| 8 | Hoop-ended iron bed (iron-bed) | core | Interpretive; related to R1–R4/R7 | 1.21 × 1.06 × 1.81 | 32 |
| 9 | Boarded box bed (box-bed) | core | Interpretive; related to R1–R4/R7 | 1.21 × 1.06 × 1.81 | 28 |
| 10 | Kitchen dresser with plate shelves (dresser) | core | R1–R4, reference-led | 0.77 × 1.74 × 0.46 | 20 |
| 11 | Kitchen chest of drawers (drawers) | core | R1–R4, reference-led | 0.74 × 0.84 × 0.44 | 23 |
| 12 | Ventilated food cupboard (food-cupboard) | core | Interpretive; related to R1–R4/R7 | 0.74 × 1.50 × 0.46 | 59 |
| 13 | Spindle-back chair (spindle-chair) | core | R1–R4, reference-led | 0.43 × 0.95 × 0.38 | 59 |
| 14 | Ladder-back chair (ladder-chair) | core | Interpretive; related to R1–R4/R7 | 0.43 × 0.95 × 0.38 | 51 |
| 15 | Plain settle bench (bench) | core | R1–R4, reference-led | 0.92 × 0.95 × 0.38 | 44 |
| 16 | Splayed four-leg stool (stool) | core | R1–R4, reference-led | 0.38 × 0.44 × 0.36 | 58 |
| 17 | Rocking wooden cradle (cradle) | floor | Interpretive; related to R1–R4/R7 | 0.72 × 0.49 × 0.76 | 6 |
| 18 | Iron-strapped blanket box (blanket-box) | core | Interpretive; related to R1–R4/R7 | 0.79 × 0.50 × 0.46 | 54 |
| 19 | Basin washstand (washstand) | core | Interpretive; related to R1–R4/R7 | 0.59 × 0.94 × 0.38 | 74 |
| 20 | Wall plate rack (plate-rack) | wall | R1–R4, reference-led | 0.75 × 0.75 × 0.26 | 74 |
| 21 | Bail-handled iron cooking pot (cooking-pot) | hearth | R1–R4, reference-led | 0.29 × 0.35 × 0.27 | 29 |
| 22 | Lidded saucepan (saucepan) | hearth | R1–R4, reference-led | 0.48 × 0.24 × 0.27 | 19 |
| 23 | Iron hob kettle (iron-kettle) | hearth | R1–R4, reference-led | 0.41 × 0.33 × 0.27 | 15 |
| 24 | Copper kettle (copper-kettle) | hearth | R1–R4, reference-led | 0.45 × 0.34 × 0.30 | 14 |
| 25 | Handled flat griddle (griddle) | hearth | Interpretive; related to R1–R4/R7 | 0.57 × 0.06 × 0.32 | 20 |
| 26 | Long-handled skillet (skillet) | hearth | Interpretive; related to R1–R4/R7 | 0.55 × 0.06 × 0.29 | 19 |
| 27 | Long toasting fork (toast-fork) | wall | Interpretive; related to R1–R4/R7 | 0.06 × 0.69 × 0.01 | 12 |
| 28 | Loop-ended fire poker (poker) | wall | R1–R4, reference-led | 0.07 × 0.66 × 0.01 | 13 |
| 29 | Fire tongs (tongs) | wall | R1–R4, reference-led | 0.09 × 0.67 × 0.02 | 13 |
| 30 | Small coal shovel (coal-shovel) | wall | R1–R4, reference-led | 0.12 × 0.69 × 0.04 | 11 |
| 31 | Open coal scuttle with coal (coal-scuttle) | floor | R1–R4, reference-led | 0.32 × 0.46 × 0.32 | 58 |
| 32 | Hooped wooden water pail (water-pail) | floor | R1–R4, reference-led | 0.32 × 0.46 × 0.32 | 37 |
| 33 | Lidded domestic slop pail (slop-pail) | floor | Interpretive; related to R1–R4/R7 | 0.32 × 0.46 × 0.32 | 37 |
| 34 | Three-sided iron fireguard (fireguard) | hearth | R1–R4, reference-led | 0.74 × 0.70 × 0.34 | 14 |
| 35 | Leather and timber bellows (bellows) | wall | Interpretive; related to R1–R4/R7 | 0.21 × 0.45 × 0.10 | 11 |
| 36 | Solid flat iron (flat-iron) | shelf | R1–R4, reference-led | 0.15 × 0.12 × 0.21 | 2 |
| 37 | Three-foot iron trivet (trivet) | hearth | Interpretive; related to R1–R4/R7 | 0.21 × 0.08 × 0.21 | 4 |
| 38 | Brass chamber candlestick (candlestick) | surface | R1–R4, reference-led | 0.21 × 0.26 × 0.18 | 29 |
| 39 | Glass-chimney oil lamp (oil-lamp) | surface | Interpretive; related to R1–R4/R7 | 0.18 × 0.43 × 0.18 | 38 |
| 40 | Tin tinderbox (tinderbox) | shelf | Interpretive; related to R1–R4/R7 | 0.13 × 0.09 × 0.13 | 60 |
| 41 | Blue-banded dinner plate (dinner-plate) | surface | R1–R4, reference-led | 0.26 × 0.03 × 0.26 | 107 |
| 42 | Scalloped side plate (side-plate) | surface | R1–R4, reference-led | 0.21 × 0.03 × 0.21 | 105 |
| 43 | Slip-banded soup bowl (soup-bowl) | surface | R1–R4, reference-led | 0.20 × 0.08 × 0.20 | 35 |
| 44 | Earthenware mixing bowl (mixing-bowl) | surface | R1–R4, reference-led | 0.34 × 0.12 × 0.34 | 60 |
| 45 | Brown salt-glazed jug (jug) | surface | R1–R4, reference-led | 0.22 × 0.22 × 0.15 | 112 |
| 46 | Brown pottery teapot (teapot) | surface | R1–R4, reference-led | 0.38 × 0.23 × 0.20 | 10 |
| 47 | Blue-banded teacup (teacup) | surface | R1–R4, reference-led | 0.15 × 0.09 × 0.11 | 56 |
| 48 | Ringed saucer (saucer) | surface | R1–R4, reference-led | 0.15 × 0.03 × 0.15 | 12 |
| 49 | Pewter tankard (tankard) | surface | Interpretive; related to R1–R4/R7 | 0.15 × 0.15 × 0.11 | 55 |
| 50 | Turned wooden egg cup (egg-cup) | surface | Interpretive; related to R1–R4/R7 | 0.07 × 0.12 × 0.07 | 11 |
| 51 | Scored cottage loaf (bread) | surface | Interpretive; related to R1–R4/R7 | 0.27 × 0.15 × 0.20 | 10 |
| 52 | Handled bread board (bread-board) | surface | Interpretive; related to R1–R4/R7 | 0.33 × 0.02 × 0.16 | 10 |
| 53 | Turned rolling pin (rolling-pin) | surface | Interpretive; related to R1–R4/R7 | 0.38 × 0.05 × 0.05 | 10 |
| 54 | Carved wooden spoon (wooden-spoon) | surface | Interpretive; related to R1–R4/R7 | 0.07 × 0.02 × 0.29 | 10 |
| 55 | Deep iron ladle (ladle) | wall | Interpretive; related to R1–R4/R7 | 0.09 × 0.47 × 0.09 | 11 |
| 56 | Wood-handled kitchen knife (knife) | surface | Interpretive; related to R1–R4/R7 | 0.03 × 0.02 × 0.23 | 12 |
| 57 | Two-tined eating fork (fork) | surface | Interpretive; related to R1–R4/R7 | 0.03 × 0.02 × 0.23 | 9 |
| 58 | Wooden salt cellar (salt-cellar) | surface | Interpretive; related to R1–R4/R7 | 0.11 × 0.05 × 0.11 | 26 |
| 59 | Small stoppered spice jar (spice-jar) | shelf | Interpretive; related to R1–R4/R7 | 0.07 × 0.13 × 0.07 | 45 |
| 60 | Lidded stoneware storage crock (storage-crock) | shelf | R1–R4, reference-led | 0.19 × 0.26 × 0.19 | 86 |
| 61 | Stoneware bottle with cork (stone-bottle) | shelf | R1–R4, reference-led | 0.15 × 0.24 × 0.15 | 80 |
| 62 | Dark green glass bottle (glass-bottle) | shelf | Interpretive; related to R1–R4/R7 | 0.15 × 0.28 × 0.15 | 46 |
| 63 | Large covered bread crock (bread-crock) | shelf | Interpretive; related to R1–R4/R7 | 0.32 × 0.31 × 0.32 | 18 |
| 64 | Covered butter dish (butter-dish) | surface | Interpretive; related to R1–R4/R7 | 0.17 × 0.08 × 0.17 | 34 |
| 65 | Cut cheese wedge (cheese) | surface | Interpretive; related to R1–R4/R7 | 0.19 × 0.07 × 0.16 | 10 |
| 66 | Tied flour sack (flour-sack) | floor | Interpretive; related to R1–R4/R7 | 0.28 × 0.40 × 0.22 | 33 |
| 67 | Hanging string of onions (onion-string) | wall | Interpretive; related to R1–R4/R7 | 0.13 × 0.55 × 0.07 | 11 |
| 68 | Hanging dried herbs (herb-bundle) | wall | Interpretive; related to R1–R4/R7 | 0.15 × 0.55 × 0.08 | 11 |
| 69 | Hand coffee mill (coffee-mill) | shelf | Interpretive; related to R1–R4/R7 | 0.20 × 0.28 × 0.19 | 27 |
| 70 | Mortar and pestle (mortar) | surface | Interpretive; related to R1–R4/R7 | 0.17 × 0.18 × 0.17 | 3 |
| 71 | Hand-cranked sewing machine (hand-machine) | surface | R5–R6, interpretive | 0.55 × 0.37 × 0.24 | 3 |
| 72 | Treadle sewing machine (treadle-machine) | core | R5–R6, interpretive | 0.82 × 1.09 × 0.43 | 7 |
| 73 | Woven sewing basket (sewing-basket) | surface | Interpretive; related to R1–R4/R7 | 0.23 × 0.11 × 0.23 | 48 |
| 74 | Three thread spools (thread-spools) | surface | Interpretive; related to R1–R4/R7 | 0.13 × 0.06 × 0.04 | 12 |
| 75 | Tailor’s shears (scissors) | surface | Interpretive; related to R1–R4/R7 | 0.09 × 0.02 × 0.19 | 3 |
| 76 | Pins in a cloth cushion (pincushion) | surface | Interpretive; related to R1–R4/R7 | 0.09 × 0.07 × 0.07 | 3 |
| 77 | Wooden darning mushroom (darning-mushroom) | surface | Interpretive; related to R1–R4/R7 | 0.11 × 0.16 × 0.11 | 3 |
| 78 | Sliding needle case (needle-case) | surface | Interpretive; related to R1–R4/R7 | 0.04 × 0.03 × 0.12 | 2 |
| 79 | Stack of folded linen (folded-linen) | shelf | R1–R4, reference-led | 0.31 × 0.11 × 0.23 | 89 |
| 80 | Pieced patchwork quilt (patchwork-quilt) | bed | Interpretive; related to R1–R4/R7 | 1.20 × 0.05 × 1.30 | 92 |
| 81 | Ticking pillow (pillow) | bed | Interpretive; related to R1–R4/R7 | 0.52 × 0.14 × 0.32 | 46 |
| 82 | Rolled bolster (bolster) | bed | Interpretive; related to R1–R4/R7 | 0.82 × 0.19 × 0.19 | 46 |
| 83 | Handled chamber pot (chamber-pot) | floor | Interpretive; related to R1–R4/R7 | 0.30 × 0.15 × 0.26 | 26 |
| 84 | Laced leather work boots (boots) | floor | Interpretive; related to R1–R4/R7 | 0.31 × 0.24 × 0.29 | 33 |
| 85 | Wood-soled leather clogs (clogs) | floor | Interpretive; related to R1–R4/R7 | 0.31 × 0.13 × 0.29 | 33 |
| 86 | Soft working cap (cap) | shelf | Interpretive; related to R1–R4/R7 | 0.24 × 0.10 × 0.26 | 13 |
| 87 | Hanging working apron (apron) | wall | R1–R4, reference-led | 0.37 × 0.84 × 0.05 | 12 |
| 88 | Hanging woven towel (towel) | wall | R1–R4, reference-led | 0.29 × 0.56 × 0.04 | 13 |
| 89 | Gathered curtain pair and rod (curtains) | wall | R1–R4, reference-led | 1.37 × 1.10 × 0.07 | 260 |
| 90 | Striped rag rug (rag-rug) | floor | R1–R4, reference-led | 0.90 × 0.04 × 1.36 | 39 |
| 91 | Small timber-framed mirror (mirror) | wall | Interpretive; related to R1–R4/R7 | 0.32 × 0.51 × 0.05 | 11 |
| 92 | Wooden pendulum wall clock (wall-clock) | wall | R1–R4, reference-led | 0.26 × 0.57 × 0.07 | 29 |
| 93 | Small framed landscape print (framed-print) | wall | R1–R4, reference-led | 0.39 × 0.37 × 0.06 | 10 |
| 94 | Cloth-bound household book (book) | shelf | Interpretive; related to R1–R4/R7 | 0.15 × 0.05 × 0.19 | 3 |
| 95 | Conical candle snuffer (candle-snuffer) | shelf | Interpretive; related to R1–R4/R7 | 0.19 × 0.07 × 0.05 | 1 |
| 96 | Wooden scrubbing brush (scrub-brush) | shelf | Interpretive; related to R1–R4/R7 | 0.15 × 0.08 × 0.08 | 75 |
| 97 | Soap on a pottery dish (soap-dish) | surface | Interpretive; related to R1–R4/R7 | 0.13 × 0.04 × 0.13 | 76 |
| 98 | Worn quarry-tile floor kit (quarry-tiles) | finish | R1–R4, reference-led | 1.00 × 0.03 × 1.00 | 33 |
| 99 | Uneven flagstone floor kit (flagstones) | finish | R1–R4, reference-led | 1.00 × 0.03 × 1.00 | 6 |
| 100 | Narrow wooden ceiling kit (board-ceiling) | finish | R1–R4, reference-led | 1.00 × 0.09 × 1.00 | 109 |
| 101 | Hoop-back wooden armchair (windsor-armchair) | core | Interpretive; see Henry furnishing references | 0.61 × 1.08 × 0.48 | 37 |
| 102 | Rush-seat ladder armchair (rush-armchair) | core | Interpretive; see Henry furnishing references | 0.61 × 1.02 × 0.49 | 19 |
| 103 | Scrubbed kitchen preparation bench (prep-table) | core | Interpretive; see Henry furnishing references | 1.50 × 0.96 × 0.63 | 23 |
| 104 | Small sewing work table (sewing-table) | core | Interpretive; see Henry furnishing references | 1.04 × 0.81 × 0.57 | 3 |
| 105 | Water crock on timber stand (water-crock-stand) | core | Interpretive; see Henry furnishing references | 0.46 × 0.74 × 0.43 | 42 |
| 106 | Kindling in a wicker basket (log-basket) | floor | Interpretive; see Henry furnishing references | 0.52 × 0.46 × 0.52 | 2 |
| 107 | Peg rack with copper and iron pans (pan-rack) | wall | Interpretive; see Henry furnishing references | 0.91 × 0.45 × 0.11 | 23 |
| 108 | Framed stitched household sampler (wall-sampler) | wall | Interpretive; see Henry furnishing references | 0.37 × 0.47 × 0.05 | 20 |
| 109 | Small oval framed silhouette (oval-portrait) | wall | Interpretive; see Henry furnishing references | 0.26 × 0.33 × 0.03 | 20 |
| 110 | Plain wooden mantel clock (mantel-clock) | surface | Interpretive; see Henry furnishing references | 0.34 × 0.39 × 0.15 | 1 |
| 111 | Basket of potatoes and onions (vegetable-basket) | shelf | Interpretive; see Henry furnishing references | 0.36 × 0.18 × 0.36 | 19 |
| 112 | Wooden drainer with plates (dish-rack) | surface | Interpretive; see Henry furnishing references | 0.38 × 0.19 × 0.26 | 22 |
