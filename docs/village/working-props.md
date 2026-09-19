# Working objects — 19 September 2026

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

## First pass placement

The main forge gains a grindstone and timber stack. Henry’s rear yard gains a tub and leaning washboard, a wheelbarrow, tools and a coal scuttle. Other examples appear in selected working yards, with one shared pump near household 40. Each placement is interpreted.

The planner checks the full footprint against house walls, rear stores, fences, coal bunkers, both workshops, the existing cart, paths, roads, streams, vegetable beds and tree trunks. It avoids the existing animal footprints. It rejects steep ground. Washboards deliberately share their tub’s group and lean over its rim. Landscape shrub generation excludes the new prop centres.

The final scene has 22 placed objects, 80,932 triangles and five material batches. Ten templates are kept as independent source models. The local `/props` study allows individual inspection with orbit and zoom controls. `/props?item=grindstone` and equivalent item names open a selected model.

## First pass validation and evidence

- `npm run village:props`: all ten templates; finite positions, normals, UVs and colours; dimensions; per-template 15,000-triangle limit; deterministic placements; all ten types present; maximum five placed material batches and 180,000 triangles.
- `npm run village:check`: scene type check.
- Production build includes the existing runtime asset guard.
- Browser review inspected all ten models individually, then the forge and laundry placements. Corrections moved the barrow wheel clear of its tray, added axle brackets, packed the firewood stack, added cross bearers and moved the grindstone clear of the coal pile.
- `artifacts/village/props/validation.json` records geometry and placements with paths. The browser receipt records live counts with tree exclusions.
- Screenshots in the same folder show the object study and village placements.

Changes stay local. No push or deployment.


## Second pass: twenty types across the village

The first ten now appear in more yards. Six household combinations mix washing, fuel, gardening, repairs and storage. Two pumps, two churns and two trestle sets remain scarce. Placement belongs to the interpreted yard, not a recorded household inventory.

The final second-pass plan contains **218 placed objects across 53 household areas**. Of these, 97 use the first ten models, up from 22. The ten new models account for 121 objects. All twenty types are present. Road, path, building, animal and workshop exclusions remain active.

| New object | Browsed reference image source | Construction used |
| --- | --- | --- |
| Wicker carrying basket | [Vest-Agder museum exhibit](https://agderkultur.no/pages/museer/vest-agder-fylkesmuseum-bondedrakter/vest-agder-fylkesmuseum-bondedrakter.html) | Woven reeds, upright stakes, crossed base, rolled rim and bound handle. The model uses an interpreted oval carrying shape. |
| Oak water bucket | [Nineteenth-century oak and iron bucket](https://www.antiques-delaval.com/en/various-collectibles/12934-bucket-old-wood-oak-circle-wrought-iron-nineteenth-century.html) | Separate staves, two iron hoops, bail handle, wooden grip and recessed water. |
| Conical milk churn | [Seven-gallon steel churn, Hemswell](https://www.hemswell-antiques.com/antiques/kitchenalia/7-gallon-steel-conical-milk-churn--116068.html) | Broad foot, tapered body, flared neck, lid, hasp, side handles and riveted seam. No maker or date copied. |
| Wooden step ladder | [Oak folding steps](https://www.sellingantiques.co.uk/670170/vintage-oak-folding-shop-steps-ladder/) | Treads, platform, four splayed rails, cross brace, hinges and spreaders. The reference is Edwardian; this simpler form is an interpretation. |
| Birch besom broom | [Former village museum hand tools](https://auctionet.com/sv/3364802-tunna-med-4-st-redskap-tra-metall) | Ninety fanned twigs, smaller branches, two bindings and a worn timber handle. |
| Carved feeding trough | [Eighteenth-century hollow timber trough](https://www.sellingantiques.co.uk/410451/18th-century-french-cattle-water-trough) | Shortened hollow body, thick ends, bearers and a little grain. French reference used for timber construction. |
| Rain barrel and tap | [Nineteenth-century oak barrel](https://www.historic-gallery.com/katalog/item/derevjannaja-posuda/porohovaja-bochka-s-bronzovym-kranom/) | Bulged staves, four hoops, rivets, partial cover, water and a wooden tap. Reference is a powder barrel; rain collection is an interpreted use. |
| Three-tine hay fork | [Museum tool group](https://auctionet.com/sv/3364802-tunna-med-4-st-redskap-tra-metall) | Long handle, iron socket, three curved tines and a low timber rest. |
| Tied grain sacks | [Wittelshofen local museum](https://www.wittelshofen.de/kultur-und-freizeit/heimatmuseum) | Three soft bags with folds, sewn edges, tied necks and timber support boards. No reference lettering copied. |
| Saw trestles and hand saw | [Norsk Skogmuseum working trestle](https://digitaltmuseum.no/011022738404/arbeidsbukk) | Braced legs, transverse beams, loose boards, saw teeth, open wooden grip and sawdust. Early-twentieth-century reference used for construction. |

References from other places and dates inform the surfaces and construction. They do not establish exact local use in 1865. All geometry remains original. Reference images are not redistributed.

### Second-pass checks

- Twenty templates pass finite geometry, dimension and 15,000-triangle checks.
- Textured and untextured templates have identical bounds. Atlas selection cannot change geometry random draws.
- Placement is deterministic, with at least 100 examples and at least 35 household areas required by the check.
- Final geometry: **890,154 placed triangles in six material batches**. This is below the explicit one-million-triangle placement budget. This check is not a frame-rate guarantee.
- Scene type check and guarded production build pass.
- Browser review inspected all ten new models. Corrections tightened the wicker weave, fitted the bucket hoops, smoothed the sacks, added tie ends and gave the sacks continuous support boards.
- The live browser counts match the placement check. The forge, Henry’s yard and another household are reviewed in the scene.
- Second-pass evidence is in `artifacts/village/props-round-2/`. `/props` opens the new set, with first-ten, all-twenty and individual controls.

Local commit only. No push or deployment.


## Broom support correction

The original placement rule allowed brooms to stand without support. It also used an unrotated footprint and placed the origin above terrain. This was visible as a floating broom near household 31.

Brooms are now placed after other objects. Seven lean against existing barrels. Fourteen lie on the ground, with pitch adjusted so the brush and handle tip both have support. Four unsafe broom placements are omitted. The current plan contains 215 objects; deferring brooms also allows one additional scuttle to fit.

The planner tests rotated footprints. Terrain fitting uses contact extrema for pitch search, then all mesh vertices for the final height. Regression checks test the complete broom mesh against the terrain, the handle tip against the ground, and the handle against its recorded support barrel. Scene type checks and production build pass.


### Property-wall placement (supersedes barrel and ground storage)

At the user's request, all 28 brooms now lean against blank cottage gable walls. The handle reach uses the rotated mesh. The support face includes the authored brick relief and each cottage's horizontal scale. The bristles touch terrain; doors and windows are on the other elevations. Existing authored rain barrels also have explicit clearance.

The regression check now requires wall support for every broom. It checks all vertices for wall penetration, handle-to-wall contact and bristle-to-ground contact. Current total: 222 objects. Type checks and production build pass.


## Working-area pass (supersedes individual scatter placement)

Props are now arranged by use. A placement transaction must fit the whole required group; it cannot leave a lone axe or basket behind.

- Fuel: wood stack and chopping block within two metres, beside a cottage wall.
- Garden: rack beside a blank gable, with optional barrow or fork within 2.5 metres.
- Washing: tub, leaning washboard, basket and bucket in a working yard. Henry’s original tub and board remain in their wash-day position; companions are optional if space is blocked.
- Storage: sacks and a carrying basket beside a wall, on timber support boards.
- Water: barrel or pump with a bucket; shared facilities stay scarce.
- Delivery: handcart and churn together.
- Repairs: saw trestles beside a timber stack.
- Feeding: troughs near existing hens, outside their motion envelopes.
- Coal: scuttles beside existing coal bunkers.
- Housekeeping: brooms retain their wall and terrain supports.

Rotated rectangles now prevent overlap between group members as well as unrelated props. Only the washboard/tub pair has deliberate overlap. Roads, paths, foundations, fences, rear stores, authored barrels, workshops, animals and tree trunks remain excluded. Unrelated types no longer have an arbitrary empty-ground fallback.

All twenty types remain in use: 189 placed objects across 58 household areas. Geometry and purpose checks pass, including partner distance and actual rack/wall spacing. Scene type check and guarded build pass. Evidence is in `artifacts/village/props-logic/`.

The grain sacks now have darker woven hemp cloth, original repeating yarn texture, visible ties and seams, stronger folds, faded woven stripes, outward normals and closed bases. Their identity and contents are interpreted; no household inventory establishes these sacks.
