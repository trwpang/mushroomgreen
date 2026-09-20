# Village texture expansion plan

Status: 100-treatment audit complete. Batch A has eight generated treatments with initial Three.js applications. The other 92 remain proposed. See `texture-batch-a.md` for exact coverage and validation; the targets below include future reuse.

This plan covers existing objects and surfaces. It does not add props, buildings or people. A treatment means a useful base surface, a local wear mask, or a small detail sheet. It does not mean one large download. Each row specifies different material structure or a different physical cause of wear. Palette changes do not count as separate items.

The completed quarry-clay, scrubbed-oak, limewash and plain-linen panels are excluded. Existing procedural brick, slate, bark and metal effects remain useful fallbacks. Their inclusion below means replacing or supplementing those effects with more convincing authored detail, not claiming that those surfaces currently have no texture.

## Evidence and limits

This audit inspected the source, existing material receipts and research notes on 20 September 2026. It did not perform new historical research. It is a production plan, not an inventory of Henry's possessions.

- Existing visit references and the workshop plan support the workshop's general construction. See `weaver-house-reference.md` and the reference photographs already used by the project.
- `surface-refinement.md`, `working-props.md`, `interior-objects.md` and `henry-furnishing-plan.md` record existing visual references and model choices.
- Tom's supplied book passage supports heat, hot-iron work and difficult working conditions. Its source, date and locality are pending in `domestic-materials.md`.
- All exact scratches, stains, chips, corrosion, weave and weathering distributions below are artistic interpretations. They must not become claims about a particular household.
- Keep food and washing contact surfaces cared for. Wear and imperfect construction should convey age; uniform filth will not.
- Wood species, metal finishes, plant species and possessions should follow existing models and research. A texture must not silently turn tin into modern galvanised sheet, ordinary clay into decorative Victorian encaustic tile, or a poor cottage into an abandoned ruin.

## Integration key

Targets below refer to these exact files and functions. Object IDs name existing builders inside `interiorObject` or `createPropKit`.

| Key | Code target |
| --- | --- |
| IO | `src/scripts/village/interior-objects.ts` → `interiorObject(id)`, `ObjectPart`, `put`, `vessel`, `board` |
| IR | `src/scripts/village/interiors.ts` → `object`, `objectMats`, `furniture`, room material creation and material batching |
| DW | `src/scripts/village/domestic-wear.ts` → `domesticWear` |
| FW | `src/scripts/village/floor-wear.ts` → `wearFloor` |
| WM | `src/scripts/village/worked-materials.ts` → `workedMaterials`, shared cache |
| RS | `src/scripts/rendering/surfaces.ts` → `refineSurface`, `classifySurface`, `cloneSurface`, `weatherArchitecture` |
| FB | `scripts/forge/build_forge.py` → named mesh/material batches; `scripts/forge/weathering.py` → `atlas`, `apply_atlas` |
| CB | `scripts/village/build_cottages.py` → exported cottage material/geometry builders |
| SC | `src/scripts/village/scene.ts` → ground material, `lowHouse`, `crownMeshes`, `treeTrunks`, `meadow`, smoke sprites |
| DV | `src/scripts/village/dwellings.ts` → `individualise`, added joinery and stacks |
| OB | `src/scripts/village/outbuildings.ts` → `serviceStore`, four material batches |
| SW | `src/scripts/village/workshop-wear.ts` → `wearWorkshop` |
| WP | `src/scripts/village/working-props.ts` → `createPropKit`, named prop builder and seven material batches |
| PP | `src/scripts/village/prop-placement.ts` → `addWorkingProps`, transformed geometry merge |
| CT | `src/scripts/village/cart.ts` → `buildCart`, wood/paint/iron batches |
| YD | `src/scripts/village/yard-details.ts` → `addYardDetails`, soil, boards, coal, plant materials |
| LS | `src/scripts/village/landscape.ts` → `paintLanes`, `addLandscape`, rocks/shrubs/reeds |
| SG | `src/scripts/village/showcase.ts` → `weatherGround`, `addShowcase`, yard/puddle/brambles |
| BW | `src/scripts/village/brook-water.ts` → `brookWater` |
| LA | `src/scripts/village/laundry.ts` → `addLaundry`, `garment` |
| CF | `src/scripts/village/conifers.ts` → `coniferGeometry` |
| SF | `src/scripts/village/spring-flowers.ts` → `flowerGeometry`, `addSpringFlowers` |
| VL | `src/scripts/village/village-life.ts` → `partBuilder`, `animalSurface`, `addVillageLife` |

Maps: **C** base colour; **N** tangent normal; **H** shallow height; **R** roughness; **M** metalness; **A** coverage/opacity; **W** local wear mask; **T** thin-surface transmission mask. Non-colour maps use linear data. Masks can share packed channels when dimensions and filtering agree. N/H alternatives are not a demand to download both.

Prerequisites: **UV** means fix mapping or retain local coordinates before merging. **Tag** means assign a semantic surface ID before batching; current material names alone cannot select it. **G** means texture alone cannot fix the silhouette, seam or joint. **Ready** means the present geometry supports a texture pass, subject to visual checks.

Priorities: **P0** first proof and shared high-impact surfaces; **P1** next visible layer; **P2** close detail after the main materials pass. L1–L10 are material libraries, not mandatory separate images. Implementation batches are defined after the list.

## L1 — Masonry and structural stone

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 1 | P0 | Hand-fired wall brick: clay drag, firing inclusions, shallow spalled faces; retain each physical brick | C, N/H, R | FB `Hand-fired brick` and `Soot-dark brick`; CB brick; OB brick batch; IR brick material. Both workshops and cottage masonry | UV: replace existing piece cells consistently; no painted mortar grid on brick meshes |
| 2 | P0 | Lime mortar: exposed sand, small recesses, crumbly repaired joints | C, N/H, R | FB `Warm lime mortar`; CB mortar; DV added stack joints; OB mortar-coloured parts. Masonry joints only | Tag: separate mortar from brick where merged; G for missing/open joints |
| 3 | P1 | Brick efflorescence: irregular fine mineral bloom, strongest at suitable damp edges | W, R | RS `weatherArchitecture` with building-local height and brick mask. Selected cottage bases and sheltered yard walls | Ready; spatial mask, never all bricks |
| 4 | P1 | Rain streaks below masonry projections: narrow washed paths and deposits beneath sills/coping | W, R | DV sill/coping positions feed RS architecture shader; FB chimney caps. Repeat treatment, vary seed | Tag/UV: actual drip origins; not generic vertical noise |
| 5 | P1 | Frost-worn coping stone: rounded pits, exposed fine grains and small scaling patches | C, N/H, R | DV caps and sill/coping pieces; CB/FB stone-cap materials. Outdoor horizontal stone | Tag; G if a large broken corner is needed |
| 6 | P0 | Sandstone doorstep: grain layers with a smooth shallow central tread hollow | C, N/H, R, W | CB threshold stone; IR entry threshold; FB `Sandstone` steps. Door approaches across homes | Tag; G for a visible tread depression, texture for polish |
| 7 | P1 | Interior flagstone: mineral lamination, softened scratch marks and worn high points | C, N/H, R | IO `flagstones`; IR floor-only clone; FW stone branch. Existing stone-floored rooms | Ready; preserve floor datum and measured routes |
| 8 | P1 | Hearth masonry exposed to fire: local heat scaling and red/grey mineral changes | C, N/H, R, W | IO `open-range`/`oven-range` firebrick parts; FB `Hearth` batches; SW hearth-local masks | Tag; do not recolour all brick as burned |
| 9 | P2 | Threshold joint packing: compacted mineral grit in recessed floor/step joints | C, H, R, W | IR threshold/grout geometry; FW local joint mask; CB doorstep joints. Entry zones | UV/Tag; avoid dark seams across continuous floors |
| 10 | P1 | Lime pointing repairs: small smoother patches surrounded by older coarse joints | C, H, R, W | FB/CB mortar; OB `serviceStore` mortar-tagged portions. Sparse masonry repairs | Tag; use existing joint topology, not random square decals |

## L2 — Roofs, doors and windows

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 11 | P0 | Split slate surface: fine cleavage, shallow flaking and irregular exposed edges | C, N/H, R | FB `Weathered slate`; CB roof atlas; OB slate batch. Existing slate-like roofs | UV; G remains responsible for chipped silhouette and overlapping courses |
| 12 | P1 | Fired clay roof tiles: moulding drag and granular weathered exposed faces | C, N/H, R | CB clay-tile roof variants, DV roof material selection. Existing orange/brown clay roofs only | Tag: distinguish actual clay finish from slate material naming |
| 13 | P1 | Roof lichen: thin crust islands with broken pale rims | C, H, R, W | FB roof/moss pieces; CB roof atlas; RS slate detail. Sparse mature exposed roof zones | UV; no thick green blobs or identical islands on every tile |
| 14 | P1 | Roof moss attachment: tiny damp tufts and darker root contact on existing moss patches | C, N/H, R, A | FB `Roof moss`; roof moss geometry in cottage asset. Current moss only | UV; G for tuft outline, alpha test rather than sorted transparency |
| 15 | P1 | Chimney soot deposition: dry powder at flue lips, streaks below open caps | C, H, R, W | FB/CB `Chimney` material batches; DV extra stacks; YD `openStack`; SW chimney mask | Tag; preserve open holes and continuous mortar backing |
| 16 | P1 | Flaking old paint on exterior joinery: thin chips exposing timber at edges and handles | C, H, R, W | DV added shutters/door wood; CB selected door/shutter pieces. Painted joinery subset | Tag/UV; do not apply painted finish to unpainted doors |
| 17 | P1 | Rain-raised softwood door boards: longitudinal lifted fibres and lower-end checking | C, N/H, R | OB wood; DV shed wood; CB service doors. Rough external boarding | UV along each plank; G for split ends if visible |
| 18 | P0 | Old window glass: slight waviness, isolated tiny seeds and wiped central areas | N/H, R, W | IR window `MeshPhysicalMaterial`; CB/FB glass; RS glass profile. House and workshop windows | UV per pane; keep clear views and no fabricated opaque dirt |
| 19 | P1 | Window putty: shallow tool facets, short shrinkage cracks, dust at the glass edge | C, H, R | CB window joinery; IR window reveal/rail construction. Glazing edges only | G/Tag: add thin putty bead where absent; texture cannot fake its edge |
| 20 | P2 | Sill weathering: runoff stain and abrasion at the outer nose, dry shelter near frame | W, R, H | DV/CB sills; IR inner sills with separate mask. Existing windows | UV local sill axes; outdoor and indoor masks differ |

## L3 — Interior timber and furniture construction

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 21 | P0 | Cut timber end grain: growth rings, radial checks and compressed cut fibres | C, N/H, R | IO `board`, table legs and chest sides; WP `Prop end grain`; CT board ends. All exposed cuts | Tag/UV: axis-aware end faces; never stretch side grain around ends |
| 22 | P1 | Hewn ceiling beam faces: broad adze facets and local softened tool ridges | C, N/H, R | IR ceiling beam boxes; IO `board-ceiling`; CB exposed timber. Overhead structure | UV along beam; G for coarse facets, texture for tool marks |
| 23 | P1 | Foot-worn timber boards: lengthwise grain worn flat, local heel abrasion and joint-edge deposits | C, N/H, R, W | IR upper wooden floors; FW wood branch. Existing timber floors only | UV per plank; keep ceiling material separate |
| 24 | P1 | Drawer handling polish: smooth thumb arcs around handles against dull dry wood | W, R | IO `drawers`, `dresser`, `blanket-box`, `food-cupboard`; DW wood. Storage fronts | Tag/local UV anchored to existing handles |
| 25 | P1 | Rush chair seats: flattened twisted stems, frayed worn crossings and darker binding lines | C, N/H, R | IO `rush-armchair` seat. Rush chairs already placed in homes | Tag/UV; G preserves woven seat construction |
| 26 | P2 | Chair rung shoe wear: small polished bands and scuffed lower rungs | W, R | IO `spindle-chair`, `ladder-chair`, `windsor-armchair`, `stool`; DW wood | Tag: select lower rungs, not full furniture |
| 27 | P1 | Food preparation cuts: crossing knife incisions and scrubbed grain on board surfaces | W, H, R | IO `bread-board`, `prep-table`, `rolling-pin`; IR measured top surfaces | UV/Tag; protect utensil support plane and clean food area |
| 28 | P2 | Old woodworm tracks: sparse pinholes and a few exposed shallow channels on stored timber | W, H, R | IO chest/bed back panels, WP stored wood. Limited non-food wood patches | Tag; artistic age detail, not blanket active infestation |
| 29 | P1 | Furniture repair marks: filled former peg holes and flush wooden patches with changed grain direction | C, H, R, W | IO `bench`, `blanket-box`, `drawers`; `board` face detail | UV/Tag; G needed for actual loose pegs, absent panels or joints |
| 30 | P1 | Stair and ladder tread wear: pressure-polished centre and scuffed leading edge | W, H, R | IR stairs; WP `ladder`; IO loft access where present. Existing access steps | Tag/UV; G for worn tread profile rather than deep shader displacement |

## L4 — Fire, iron and working metal

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 31 | P0 | Cast iron stove skin: fine casting sand texture and old black surface dressing | C, N/H, R, M | IO `open-range`, `oven-range`, `hob-stove`; IR iron slot with stove tag | Tag; separate body from polished contact pieces |
| 32 | P0 | Rubbed stove iron: smoother rim, lid and latch wear contrasting with rough cast body | W, R, M | Same three range IDs; IO lids/hobs/handles. Cooking contact zones | Tag/local UV; selective polish, no global chrome |
| 33 | P1 | Cooking soot film: dry soot under pots, thin heat staining up their lower walls | C, H, R, W | IO `cooking-pot`, `saucepan`, `iron-kettle`, `skillet`; DW local object masks | Tag/UV relative to vessel base, not room ground |
| 34 | P0 | Dull tin sheet: shallow rolled marks, hand wiping and restrained spotted oxidation | C, N/H, R, M | IO `tin-bath`, `slop-pail`, `tinderbox`; WP `churn` if its existing finish fits | Tag/UV; do not impose modern zinc-spangle texture |
| 35 | P1 | Hammered copper: tiny hammer dimples with darkened recesses and cleaner handled edges | C, N/H, R, M | IO `copper-kettle`, `pan-rack`; IR copper slot | Tag: exclude brass lamp and candlestick from copper treatment |
| 36 | P1 | Tarnished brass: soft cloudy tarnish with finger-bright edges | C, R, M, W | IO `oil-lamp`, `candlestick`, `yarn-scales`; distinct brass semantic tag | Tag; existing `copper` material is shared with other metals |
| 37 | P0 | Anvil working face: hammer peen traces, rubbed central strike area and dull edges | C, N/H, R, M, W | FB `Anvil` face vs body; SW anvil zones. Main and family chainshops | Tag/UV per anvil; keep striking surface physically level |
| 38 | P1 | Forged iron scale: layered blue-black scale and shallow peened irregularities | C, N/H, R, M | FB chains/tongs/iron stock; IO `tongs`, `poker`, `fireguard`; WP tool heads | Tag; polished blades and anvil face remain separate |
| 39 | P1 | Loose hammer scale and ash: small flakes with dusty gaps, concentrated beneath work | C, H, R, W | SW anvil/hearth floor masks; SG forge-yard threshold | UV/local masks; G only for a few silhouette flakes, no extra floor sheets |
| 40 | P1 | Coal fracture surface: conchoidal breaks, alternating dull and restrained glossy bands | C, N/H, R | YD coal; IO `coal-scuttle`; FB `Coal`. All cold coal stores | UV/Tag; separate emissive ember and hot iron materials |

## L5 — Pottery, glass and food vessels

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 41 | P0 | Salt-glazed stoneware: orange-peel glaze, small kiln specks and soft pooling at the foot | C, N/H, R | IO `jug`, `storage-crock`, `stone-bottle`, `bread-crock`; IR clay | Tag/UV; confirm chosen vessel subset matches intended finish |
| 42 | P0 | Ceramic glaze crazing: fine sparse hairlines visible chiefly in reflections | H/N, R, W | IO `wash-basin`, `water-pitcher`, `dinner-plate`, `teacup`; IR cream/blue | Tag/UV; keep lines subtle and food contact surfaces light |
| 43 | P1 | Unglazed pottery foot: granular exposed clay and shelf contact abrasion below the glaze line | C, H, R | IO `vessel` feet across crockery; IR ceramic mapping | Tag lower-foot band; distinct from the completed floor clay panel |
| 44 | P1 | Slip decoration: slightly uneven band edges and brush overlap on existing bands | C, H, R | IO `soup-bowl`, `mixing-bowl`, `teacup`; current blue/clay band geometry | UV; use existing simple decoration, no new luxury patterns |
| 45 | P2 | Small ceramic chips: sparse dull clay flecks at selected rim knocks | C, H, R, W | IO `jug`, `chamber-pot`, `storage-crock`, `wash-basin` selected rims | Tag; G for silhouette chips, no normal-only missing rim illusion |
| 46 | P1 | Water vessel tide traces: faint mineral drying rings near stored water level | W, R | IO `water-pitcher`, `wash-basin`, `water-crock-stand`; DW object-local wet mask | Tag/UV; infrequent narrow traces, not filthy drinking vessels |
| 47 | P1 | Green bottle glass: shallow mould seams, glass thickness variation and small inclusions | N/H, R, W | IO `glass-bottle`; IR `objectMats.glass` | UV; G for thick rim/base; do not alter lamp glass or windows globally |
| 48 | P1 | Pewter finish: soft grey casting marks, fine wipes and polished rim | C, N/H, R, M | IO `tankard`; IR separate pewter tag | Tag; not generic steel and not mirror metal |
| 49 | P2 | Cork stopper: small cellular pores and darker compressed neck contact | C, N/H, R | IO `stone-bottle`, `spice-jar` stopper parts | Tag/UV; retain existing stopper fit |
| 50 | P2 | Glaze pinholes and firing specks: rare small non-directional imperfections under smooth glaze | C, H, R, W | IO mixing/storage pottery, separately from crazing; IR ceramic finish sheet | Tag; useful close-up detail, not black dots on every plate |

## L6 — Textiles, leather and fibres

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 51 | P1 | Wool blanket nap: dense soft matted fibres with rubbed flatter zones | C, N/H, R | IO `patchwork-quilt`, `cap`; IR cloth variants | Tag/UV; distinct from existing plain linen |
| 52 | P1 | Bed ticking: narrow woven stripes with worn thread interruption | C, N/H, R | IO `pillow`, `bolster`; IR linen replacement for those parts only | UV along stitched panels; G supplies compressed fabric form |
| 53 | P1 | Rag rug strips: several coarse fabric strips with compressed raised joins | C, N/H, R | IO `rag-rug`; IR floor dressing | UV strip direction; G for visible edge fringe, no giant surface bump |
| 54 | P1 | Patched apron cloth: rubbed work area, seam allowance and darker repairs | C, N/H, R, W | IO `apron`; LA apron garment; existing chainmaker apron if cloth finish matches | Tag/UV; retain fold motion; leather apron needs separate treatment |
| 55 | P1 | Coarse sack weave: open irregular yarn crossings, compressed tie folds and fuzz | C, N/H, R | WP `sacks` replacing 256² hemp; IO `flour-sack` | UV; retain closed grounded sacks and no false see-through holes |
| 56 | P1 | Worn boot leather: fine creases, toe scuffs and dull wax with rubbed high points | C, N/H, R | IO `boots`, `clogs`; existing worker boot materials via RS leather | Tag/UV; G for soles and real seam profile |
| 57 | P1 | Bellows leather: stretched creases, dry edge cracks and soot near nozzle | C, N/H, R, W | IO `bellows`; FB bellows leather if present in asset. Existing bellows only | Tag/UV; G for fold silhouette, keep nozzle stain local |
| 58 | P2 | Braided rope: twisted strand crossings and compressed knots | C, N/H, R | IO `rope-bed`; LA line; WP bucket/basket rope bindings | Tag/UV along rod length; G preserves knot shape |
| 59 | P2 | Thread windings: fine parallel wraps with crossed loose turns and used patches | C, N/H, R | IO `thread-spools`, `yarn-reel`, `spinning-wheel` bobbin | Tag/UV cylindrical wrap; don't amplify subpixel sparkle |
| 60 | P2 | Woven stitch work: raised stitch direction on existing sampler, restrained fading | C, H, R | IO `wall-sampler`, quilt patch seams | UV/Tag; no invented family names or unreadable generated text |

## L7 — Household small surfaces and stored goods

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 61 | P1 | Household wicker: split reed skin, rubbed intersections and shaded weave gaps | C, N/H, R | IO `sewing-basket`, `vegetable-basket`, `log-basket`; WP `basket` | Tag/UV along existing strands; G still defines open weave |
| 62 | P1 | Rush/fibre brush bristles: uneven fibre colour and compressed darkened working ends | C, R, A | IO `scrub-brush`; WP `broom` bristle parts | UV/Tag; keep grounded bristles and supported broom placement |
| 63 | P2 | Bound book cloth: fine pressed weave, worn spine edges and faded handling patches | C, H, R | IO `book`; IR paper/cloth split | Tag/UV; no invented printed content |
| 64 | P2 | Paper edges: slightly uneven leaf layers and mild age at exposed edges | C, H, R | IO `book` page block; `framed-print` sheet | UV/Tag; G for substantial page curl, no dark mould default |
| 65 | P1 | Print surface: quiet period-style ink linework, faded image and lightly foxed margins | C, R | IO `framed-print`, `oval-portrait` existing panels | UV; source an appropriate image or label original art as interpretation |
| 66 | P2 | Clock face: readable worn dial numerals, hairline enamel/paint wear and soft edge grime | C, H, R | IO `wall-clock`, `mantel-clock`; dial face | UV; manually authored correct text, hands remain geometry |
| 67 | P2 | Sewing-machine finish: worn black coating, rubbed hand contact and metal scratches | C, H, R, M, W | IO `hand-machine`, `treadle-machine`; case/flywheel parts | Tag/UV; avoid invented maker names or lavish new ornament |
| 68 | P1 | Bread crust: irregular pores, split scoring edges and flour caught in shallow folds | C, N/H, R | IO `bread`; IR food-specific material | Tag/UV; G controls loaf/scoring silhouette, not leather material |
| 69 | P2 | Onion skins: fine longitudinal papery layers and dry neck fibres | C, N/H, R | IO `onion-string`, `vegetable-basket`; YD existing onion crops | Tag/UV by bulb axis; not a generic wood texture |
| 70 | P2 | Soap surface: pressed edges, shallow wet smears and tiny dry cracks | C, H, R | IO `soap-dish` soap piece | Tag; subtle waxy soap distinct from pottery dish |

## L8 — Yard timber, tools and cart surfaces

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 71 | P0 | Cart paint: rubbed red coating, scratches exposing wood and chips around fasteners | C, H, R, W | CT paint batch; WP painted cart areas only if already painted | UV/Tag; keep cart's established colour and construction |
| 72 | P1 | Cart tyre wear: smooth running band, rough forged sides and dirt caught at timber interface | C, N/H, R, M, W | CT iron wheel rims; WP wheelbarrow/handcart tyres | Tag/UV tyre circumference; not rust across the contact band |
| 73 | P1 | Axle grease: thin dark grease at bearing ends with dust stuck at outer edges | C, R, W | CT axle/hubs; WP wheelbarrow, handcart, grindstone bearing points | Tag/local UV; sparse, no oil puddles or new props |
| 74 | P1 | Tool handle polish: sweat-darkened hand positions, flattened grain and rough unused ends | W, R | WP `tools`, `hayfork`, `block`, `trestles`; IO poker and kitchen handles where wooden | Tag/UV per handle and grip position |
| 75 | P1 | Grinding sandstone: concentric use striations and worn abrasive grains | C, N/H, R | WP `grindstone` circular stone surface | UV radial/tangent; G for real wheel shape, not concentric painted grooves alone |
| 76 | P1 | Axe block impact face: deep irregular cuts with compressed fibres and split wedges | C, N/H, R | WP `block` top, separate from timber end-grain base | UV/Tag; G for a few deep bites, keep axe support intact |
| 77 | P1 | Fresh split firewood: torn longitudinal fibres and irregular exposed sapwood | C, N/H, R | WP `woodpile` split faces; IO `log-basket` billets; FB stored wood | Tag/UV; distinct from cut end grain and exterior bark |
| 78 | P1 | Water-worn staves: dark wet band, swollen grain and dry upper wood | C, N/H, R, W | WP `barrel`, `tub`, `bucket`, `trough`; IO `water-pail` | Tag/UV object-local waterline; not all exterior timber |
| 79 | P1 | Outdoor iron corrosion: thin layered rust near fixings, rubbed areas remain dark metal | C, N/H, R, M, W | WP iron tools/hoops, OB hinges, YD bin fasteners, CT parked fittings | Tag/UV; corrosion mask tied to recesses/contact, not uniform orange |
| 80 | P2 | Timber ground contact: damp fibres and soil compacted into lower post checks | C, N/H, R, W | DV fences, YD coal bin boards, OB ground-level boarding, WP trestle feet | UV/Tag; use actual terrain contact and preserve foundation geometry |

## L9 — Ground, banks and water

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 81 | P0 | Compacted dirt lane: fine embedded grit, compressed earth and irregular scraped patches | C, N/H, R | SC terrain material; LS `paintLanes` supplies lane mask; SG `weatherGround` detail | UV in metres; explicit road mask, not colour-channel guessing |
| 82 | P0 | Wheel rut surface: flattened tread base, dragged gravel and damp compressed sides | C, N/H, R, W | LS lane track masks; SG ground detail; existing rut terrain | UV along road arc; G already supplies depression, retain seamless joins |
| 83 | P1 | Dry path edge: small crumbly clods blending into root-bound turf | C, N/H, R, W | LS feathered road/footpath margins; SG ground detail | UV/mask; no hard strip at junctions |
| 84 | P1 | Yard trodden earth: mixed ash, grit and flattened boot scuff arcs near work/storage stations | C, N/H, R, W | SG yard texture; YD/PP existing station footprints feed mask | Tag/mask by activity; never scatter the same debris over every garden |
| 85 | P1 | Garden soil: turned dark clods, shallow crust and occasional small stones between plants | C, N/H, R | YD soil material and existing vegetable beds | Ready; G for large clods only if needed, maintain neat cultivated rows |
| 86 | P1 | Woodland leaf litter: crushed leaves, veins and fragments over moist earth | C, N/H, R | SC tree-understory ground mask; SG ground shader | UV/mask under tree colonies; no new leafy plane covering paths |
| 87 | P1 | Exposed brook bank: damp fine silt, small roots and washed granular layers | C, N/H, R, W | LS bank/carved channel geometry; SG ground detail using stream distance/height | Tag/UV; G for protruding roots, keep channel shape unchanged |
| 88 | P0 | Brook stone: mineral grain, waterline darkening and locally worn smooth face | C, N/H, R, W | LS `rockMaterial`/`rockMesh`, object-height plus `streamSurface` contact | UV/triplanar; retain position-based stone displacement, no opened cracks |
| 89 | P1 | Flowing water detail: fine stretched ripple normals and broken foam strands following the current | N, R, A | BW `brookWater` downstream coordinates; LS wake material | UV flow-aligned; dynamic shader, not a static blue photograph |
| 90 | P1 | Puddle margin: thin mud skin and drying rings around reflective water | C, H, R, W | SG puddle/yard shoreline mask; WP still water only where applicable | UV/mask; preserve reflection ordering and avoid coincident planes |

## L10 — Vegetation and existing animals

| # | Priority | Surface and visible detail | Maps | Precise integration target and reuse | Prerequisite |
| --- | --- | --- | --- | --- | --- |
| 91 | P0 | Broadleaf bark: fissured plates, shallow lenticels and worn branch-collar transitions | C, N/H, R | SC `treeTrunks`; RS bark profile. Majority woodland | UV along trunks/branches; G for collars if absent, not deep shader dents |
| 92 | P1 | Conifer bark: smaller overlapping scaly plates with resin-dark fissure traces | C, N/H, R | SC conifer trunk instances selected from existing species array | Tag: split species material selection while preserving positions; no extra trees |
| 93 | P1 | Broadleaf leaves: fine midrib/veins, restrained edge damage and uneven thin-leaf light transmission | C, N/H, R, T, A | SC `leafGeo`/`canopyMat`; RS leaf; LS shrub leaves where shape fits | UV: leaf geometry has no UVs; G defines credible leaf shape |
| 94 | P1 | Pine needles: longitudinal lines, brighter fine edges and darker sheath bases | C, R, T, A | CF `coniferGeometry(true)`; SC pine crown material | UV/Tag for needle sprays; use alpha test and limited overdraw |
| 95 | P1 | Fir sprays: comb-like needle grouping, subtle underside bands and twig texture | C, R, T, A | CF `coniferGeometry(false)`; SC fir crown material | UV/Tag; keep distinct needle arrangement, not recoloured pine panel |
| 96 | P1 | Meadow blades: lengthwise veins, dried tips and scuffed lower blades | C, R, T, A | SC `grassGeo`/`meadow`; LS reeds use a separate size/mask | UV per blade; respect current patchiness and path exclusions |
| 97 | P2 | Bramble leaves: serrated-edge veins, older spots and pale underside | C, N/H, R, T, A | SG bramble `leafGeo`; LS matching shrubs | UV/Tag; avoid assigning specific species to every generic shrub |
| 98 | P2 | Spring petals: translucent ribbing, soft throat shading and fine surface variation | C, R, T | SF `flowerGeometry` bluebell/daffodil petal subsets, one botanical detail sheet | UV/Tag; species-specific cells within one treatment sheet, not extra count |
| 99 | P2 | Hen plumage: overlapping feather barbs and fine vane directions on existing wing/body forms | C, N/H, R | VL hen `partBuilder`/`animalSurface` | UV/Tag: builder deletes UVs and merges colours; G retains feather outline |
| 100 | P2 | Cat fur: directional short hairs, soft coat variation and rubbed muzzle/ear surfaces | C, N/H, R | VL cat `partBuilder`/`animalSurface` | UV/Tag: preserve articulated local mapping; do not add shell-fur overdraw first |

## What the current code cannot select reliably

1. IO merges each object into `ObjectMaterial` buckets. IR then merges room instances again. All brass, copper and some other fittings share the same material slots. Add semantic surface IDs and metre-based local texture coordinates before these merges. A `surfaceId` attribute plus local coordinates can retain a small material count. Do not create one material per prop.
2. The same simple material name can cover a plank side, its end and an adjacent textile/metal-like approximation. Face-aware mapping is necessary for end grain, tool handles and vessel bands. World-space stripes cannot solve this.
3. WP originally kept six batches; Batch A adds a seventh for cut faces. PP bakes world transforms. Preserve object-local coordinates and wear anchors before PP merges. Ground-height masks alone will put wear in the wrong place on raised buckets and tilted tools.
4. Leaf geometry lacks useful UVs. VL explicitly deletes UVs. Retain/add UVs and semantic face tags before generating leaf or animal sheets. Source detail alone cannot fix low-detail silhouettes.
5. Material.clone drops shader callbacks. Continue using `cloneSurface`, composing callbacks and cache keys. Replacing a material wholesale can remove clipping, wear, or export assumptions.
6. Cottage high and low detail variants need compatible colour and roughness. Match distant appearance; load fine texture only for the close form. Both chainshops share an asset at different scales, so use their independent inverse-root transforms.
7. Interior collection export is already 179,391 triangles against a 180,000 limit. Only 609 triangles remain. Avoid casual geometry additions. If a geometry correction is essential, remove redundant geometry or explicitly revise and validate the asset budget. Textures are the main work here.

## Implementation batches and status

Batch A has initial applications; all other items remain **proposed**. Broader reuse within a Batch A row is not automatically complete. The row numbers below identify exact treatments; L1–L10 only group the library by material.

**Batch A: 1, 2, 11, 91, 31, 34, 41, 21.** Exterior brick, lime mortar, split slate, broadleaf bark, stove cast iron, dull tin bath, salt-glazed pottery and exposed timber end grain. These are the eight treatments selected for the first implementation pass.

A practical initial pack has four source pairs: brick/mortar, slate/bark, cast-iron/tin, salt-glaze/end-grain. Keep generated masters at source resolution, but select runtime resolution from visible detail and memory. Each material still needs correct local mapping and appropriate relief. End grain must only occupy cut faces. Stove iron must not replace glass, food, leather or all metal indiscriminately.

**Batch B: 32, 42, 71, 88.** Rubbed stove contact iron, subtle ceramic glaze crazing, worn cart paint and brook stone. These complete the remaining four treatments from the initial twelve-item recommendation. The first two are detail masks over Batch A surfaces, not full extra colour downloads.

**Batch C: 18, 25, 35, 36, 51, 55, 61, 81, 82.** Window glass, rush seating, copper, brass, wool, sack weave, wicker, lane earth and ruts. These need distinct material tags, local wear anchors, or improved UVs.

**Later batches:** take the remaining P1 entries by viewed location, then the P2 entries. Update a manifest row by row. Do not state that all 100 are applied when only their source images or shared shader hooks exist.

## Practical atlas and resource plan

Maintain ten logical libraries L1–L10, but pack by shared maps, UV scale and runtime residency. Do not make one 4K sheet per group by default. Do not put data maps in an sRGB colour atlas.

- Store each original generated/source tile and its prompt, provenance, physical scale and version. Build runtime atlases from these masters. Atlas packing and format conversion must preserve source pixels.
- Start large near-view materials at roughly 512–1024 useful pixels per source tile. Tiny masks and detail sheets often need only 128–512 pixels. Tune by visible texel density at room distance.
- Use per-piece crops/rotations and measured texture scale. Leave mip-safe padding around cells. Highly distinctive knots, chips and stains should not repeat in a regular grid.
- Share a base texture between several treatments. Examples: 31+32 share cast iron; 1+3+4+10 use brick/mortar plus packed masks; 21+76 combine end grain with an impact mask. All 100 entries remain distinct treatments, not 100 necessarily unique images.
- C uses sRGB; N/H/R/M/W/A use non-colour data. Prefer one packed R/M/W data texture where all channels use compatible resolution and filtering. Normal maps need their own decode. Do not derive metalness from brightness.
- The two current 1774×887 WebP atlases each cost approximately **8 MiB decoded RGBA with mipmaps**, despite a transfer size near 700 KiB. Fifty always-resident pairs would add about **400 MiB**. Do not use this architecture for all 100.
- Existing embedded assets already cost approximately **30 MiB cottage images**, **36 MiB forge images**, and **21 MiB worker images**, before terrain, render targets and room canvas textures. These are image-dimension estimates, not a measured total GPU allocation.
- Initial planning target: **24 MiB additional decoded texture memory** for simultaneously visible detail. The first production pass retains four full-resolution pairs for close detail, revising its working allowance to **40 MiB**; its calculated cost is about **32 MiB**, before other textures. This is not a measured total GPU allocation. For example, four 1024×512 colour atlases cost about 10.7 MiB RGBA plus mipmaps, leaving room for selected data maps. Four full current-size pairs alone would exceed this cap. Downsample runtime copies only after close-view inspection; retain full source masters. Replacing duplicate existing maps is better than stacking new maps on top. Track estimated resident bytes in a manifest and confirm textures actually release when unused.
- Keep the full village view to one small shared exterior detail set. Load room/workshop material groups on entry and retain a bounded shared cache. Remove references and dispose only after no visible or cached room needs a set. The existing unbounded `workedMaterials` map needs an explicit ownership policy before dozens of sets are added.
- Reuse existing generated oak/linen/limewash/clay where appropriate rather than duplicating them per house. Share room canvas textures where possible; audit repeated generated maps before adding more.
- Consider KTX2/Basis after implementing and testing the decoder path. GPU compression can reduce memory, but a `.webp` extension does not. Do not quote a compression saving until device capability, format and memory are measured.
- Keep normal detail distance-filtered. Prefer one base and one packed-detail lookup per visible material. Avoid triplanar lookup for every tiny object; reserve it for irregular stones where useful.
- Every generated colour sheet is colour artwork. Any relief inferred from its luminance is approximate. Do not label it a scanned PBR material. Separate height and roughness must represent material structure, not baked image lighting.

## Validation and acceptance

For each batch, record requested IDs, produced files, applied targets and reviewed views. Use status values: **proposed → sourced/generated → mapped → applied → visually checked**. A texture file alone does not complete an item.

1. Capture fixed `still=1` views before and after: Henry kitchen, Henry sewing corner, another cottage, approach, main forge, family shop, brook and a near tree.
2. Inspect from normal navigation distance and close range. Pan for at least 30 seconds. Reject glitter, crawling normals, blurry repeats, atlas-edge lines and view-dependent z-fighting.
3. Check material identity: clay stays matt, glazing stays smooth, cast iron stays rough, rubbed metal reflects selectively, cloth remains soft and windows stay transparent.
4. Check all relevant geometry paths: high/low cottages, additions, both workshop scales, cutaway and embedded interiors, instanced trees and merged prop placements.
5. Run `npm run surfaces:check`, `npm run village:check`, applicable layout/object/workshop checks and the production build. If IO/CB/FB changes, regenerate and validate the corresponding exported asset. Shader errors require a browser check; TypeScript does not compile GLSL.
6. Record downloaded bytes, estimated resident decoded bytes, renderer texture count and representative frame timing before/after. Inspect a constrained device before declaring performance complete.
7. Keep furniture support, clear routes, floor level, window reveals and animal placement tests passing. Do not solve texture defects by moving furniture or changing exposure.
8. Commit reviewed batches locally. Do not push; Netlify is linked.
