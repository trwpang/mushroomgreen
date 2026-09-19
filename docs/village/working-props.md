# Ten working objects — 19 September 2026

Ten original Three.js models are added to the village. Their construction follows the browsed images below. These are plausible working objects, not claims about recorded possessions or a surveyed pump position. Some surviving references are later objects or come from other regions. Plain timber and iron finishes replace ornate decoration.

| Object | Reference image source | Model details |
| --- | --- | --- |
| Wooden wheelbarrow | [Victorian painted wooden wheelbarrow, Timothy Langston](https://www.timothylangston.com/shop/objects/miscellaneous/19th-century-victorian-painted-wooden-wheelbarrow/) | Separate tray boards, iron bands, eight-spoke wheel, axle brackets, handles, legs and braces. |
| Low handcart | [19th-century Beverley Minster handcart, Hawleys](https://www.hawleys.info/catalogue/lot/5f5da96cb91293600073c47501164846/930676c09557b5f2fb9f2ea106674265/two-churches-one-town-charity-auction-beverley-minste-lot-182/) | Low plank bed, two wheels, pull bar, standing legs and a small timber load. |
| Hand pump | [Somerleyton village pump, dated 1859, Geograph](https://www.geograph.org.uk/photo/1505646) | Plain square iron housing, mouldings, curved lever, open spout, foundation bolts and drainage trough. The model has no invented date or maker. |
| Washing tub | [Washboard and wooden tub, Object Lessons](https://www.objectlessons.org/houses-and-homes-victorians/washboard--wooden-tub-victorian-original/s59/a1060/) | Separate tapered staves, iron hoops, handles and a low water surface. Also informed by the [Auriol museum laundry exhibit](https://www.tourisme-paysdaubagne.fr/decouvrir/culture-patrimoine/salles-dexposition-des-outils-anciens-auriol-fr-2968201/). |
| Washboard | [Object Lessons laundry tools](https://www.objectlessons.org/houses-and-homes-victorians/washboard--wooden-tub-victorian-original/s59/a1060/) | Wooden frame, rubbing ridges, nails and soap. A plain wooden rubbing surface replaces the later glass insert in this example. |
| Coal scuttle | [Victorian helmet scuttle, circa 1870](https://www.1stdibs.com/furniture/building-garden/fireplace-tools-chimney-pots/antique-helmet-fire-bucket-english-copper-coal-scuttle-fireside-bin-victorian/id-f_34084232/) | Open double-walled shell, rolled lip, foot, two handles and coal. Uses black iron instead of the reference’s copper finish. |
| Split firewood | [Stacked logs and chopping block photograph](https://www.antena3.ro/actualitate/pret-metru-cub-lemne-foc-685845.html) | Individual split billets, bark, end grain, radial checks, cross bearers and retaining posts. Modern image used for material and stacking details only. |
| Chopping block and axe | [Firewood preparation photograph, Rakentaja](https://rakentaja.fi/artikkelit/varastoi-polttopuusi-turvallisesti/) | Tapered stump, scored end grain, embedded axe, split billet and chips. Modern image used for construction and material details only. |
| Grindstone | [Hand-cranked grindstone, Hadley Reclaimed](https://www.hadley-reclaimed.co.uk/other-items/antique-grindstone/) | Stone wheel, timber frame, axle bearings, crank, wooden grip and open water trough. |
| Garden tool rack | [Traditional tools, Grancona museum](https://www.museograncona.it/it/gallery/galleria-di-immagini/immagini-del-libro-del-museo/23-gli-attrezzi-del-contadino.html) | Simple wooden rack, iron hooks, spade, four-tine fork and rake. Rack construction and aged hand-tool finishes are interpreted from the exhibit. |

The reference photographs were inspected in the browser. No reference photograph or external mesh is embedded in the project. Geometry and placement code are original project work. Existing cottage oak maps and project surface shaders provide material detail. No paid generation service was used.

## Placement

The main forge gains a grindstone and timber stack. Henry’s rear yard gains a tub and leaning washboard, a wheelbarrow, tools and a coal scuttle. Other examples appear in selected working yards, with one shared pump near household 40. Each placement is interpreted.

The planner checks the full footprint against house walls, rear stores, fences, coal bunkers, both workshops, the existing cart, paths, roads, streams, vegetable beds and tree trunks. It avoids the existing animal footprints. It rejects steep ground. Washboards deliberately share their tub’s group and lean over its rim. Landscape shrub generation excludes the new prop centres.

The final scene has 22 placed objects, 80,932 triangles and five material batches. Ten templates are kept as independent source models. The local `/props` study allows individual inspection with orbit and zoom controls. `/props?item=grindstone` and equivalent item names open a selected model.

## Validation and evidence

- `npm run village:props`: all ten templates; finite positions, normals, UVs and colours; dimensions; per-template 15,000-triangle limit; deterministic placements; all ten types present; maximum five placed material batches and 180,000 triangles.
- `npm run village:check`: scene type check.
- Production build includes the existing runtime asset guard.
- Browser review inspected all ten models individually, then the forge and laundry placements. Corrections moved the barrow wheel clear of its tray, added axle brackets, packed the firewood stack, added cross bearers and moved the grindstone clear of the coal pile.
- `artifacts/village/props/validation.json` records geometry and placements with paths. The browser receipt records live counts with tree exclusions.
- Screenshots in the same folder show the object study and village placements.

Changes stay local. No push or deployment.
