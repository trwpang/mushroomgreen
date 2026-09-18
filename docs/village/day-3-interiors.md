# Day 3 — cottage interiors

Each of the 58 visible cottages has a stable, separate plan. Historical household 5 remains represented by the main forge, so there is no replacement cottage interior for that record.

## Scope and evidence

These are **interpreted interiors**, not measured reconstructions. The geographic footprint, cottage orientation, exterior window positions, exterior chimney position and recorded 1861 occupant count come from the project. Furniture, room divisions, finishes and sleeping arrangements are artistic interpretation. The census count is not used to assign beds to named people or infer their possessions. Larger households have additional beds or a floor pallet where physical space allows. The rendered daytime arrangement does not claim to account for every historical sleeping place.

The modest setting uses timber furniture, unbleached bedding, plain earthenware, a small open hearth and a washstand. There is no indoor plumbing, modern cooker, electrical fitting or ornate Victorian parlour set.

Reference context:

- [National Trust: Birmingham Back to Backs](https://www.nationaltrust.org.uk/visit/birmingham-west-midlands/birmingham-back-to-backs) presents small homes across dates including the 1840s and 1870s. It supports the crowded working household context, not these exact plans.
- [Black Country Living Museum: Cosy Days](https://bclm.com/plan-your-visit/trails/cosy-days/) distinguishes original building dates from later museum room settings. Later electric appliances and wallpapers are deliberately excluded.
- [Black Country Living Museum: Chainmaker's House information](https://bclm.com/wp-content/uploads/2021/08/thechainmakershouse-information-1.pdf) dates that building to 1886. It is not evidence for the precise contents of an 1865 Mushroom Green home.

No source images are bundled. All mesh geometry and surface pixels are generated in this project.

## Plans and visual treatment

- Actual metre dimensions follow each placed cottage; furniture is not stretched with the exterior asset.
- The entrance faces positive local Z, matching the cottage's door after Blender/glTF conversion.
- A clear central passage connects the door to the room. Furniture keeps a minimum 0.43 m separation, except usable stools set 0.16 m clear of the table.
- The hearth lies beneath the existing left-gable chimney. Its opening faces the room, with a stone hearth, fire basket, pot, mantel and restrained ember light.
- Three exterior cottage types produce one or two selectable floors. The 16 two-storey homes have an upper sleeping floor and matching stairs with a real floor opening.
- Floorboards have staggered ends and nail heads. Rough lime walls have small glass windows in proper openings, timber mullions, stone sills and catches.
- Beds have posts, rails, mattress, pillow and folded blankets. Tables have individual top boards, legs and stretchers. Cupboards have hinges, doors and catches. Small crockery pieces have hollow profiles.
- Wide single-storey homes have a short, partly drawn curtain beside the head of the bed. Roof, front wall and right wall are cut back for inspection.
- The renderer creates only the active house interior, then disposes its geometry, textures and materials on close or change. Static parts are merged by material.

## Integration

```ts
const interiors = createInteriors(scene);
const view = interiors.show(home); // Default ground floor.
// Hide the selected cottage exterior root. Move camera to view.camera,
// aim controls at view.target, and refresh static shadows.
interiors.update(time); // Use existing paused/reduced-motion clock.
const upstairs = interiors.setFloor(1); // Returns updated camera and target.
interiors.hide(); // Restore exterior root and refresh shadows.
```

`view.plan` includes dimensions, recorded occupant count, floors and each furnishing rectangle. `view.floor` and `view.floors` support an accessible floor selector. The parent controls the selected exterior root and all camera transitions. Use the label **“An interpreted interior”** beside the view.

## Validation

Run:

```sh
node_modules/.bin/esbuild scripts/village/check-interiors.ts --bundle --platform=node --format=esm --outfile=/tmp/mushroom-interiors-check.mjs
node /tmp/mushroom-interiors-check.mjs
```

The report `artifacts/village/day-3/interior-plans.json` contains all 58 plans and 74 floors. It checks furniture bounds, furniture collisions, the central entrance route, a person-sized navigation route to every furnishing, usable table seating, chimney/hearth alignment and stable plans across regeneration. Furniture routes are checked on a 12 cm grid with a 21 cm person radius. This validates the model's layout, not the historical interpretation.

## Visual refinement

The eating/work table and stools form a group near the hearth. The table moves into the room where space permits. Washstands and chests sit near the sleeping area. Some homes have a modest woven floor mat below the table. The camera now sits 20% farther out to retain the front corners.

## Second visual review: lived-in rooms

The independent review found that the first upper rooms looked too empty. Every upper room now has a small linen bench, a woven laundry basket, a bed-foot trunk and either a clothes horse or a cupboard. Wall pegs hold spare cloth. Bedside mats, folded linen and a candle give the sleeping area a coherent use. The main chimney breast continues through the upper room. Wider homes have a low timber partition that marks a separate sleeping bay in the cutaway.

Spacious single-floor homes also gain a linen bench. Some have a laundry basket. Small fuel buckets, fire irons and wall pegs add domestic detail around the hearth without filling the entrance. These objects remain artistic interpretation, with no claims about the belongings of named residents.

Stairs now leave 0.60 m clear at their lower end. The upper guard rails cover both long edges and the low end. The top landing stays open. The navigation checks explicitly reach the upper and lower landings; upper floor furniture uses 0.53 m separation. All 58 plans and 74 floors pass after these changes.

Ground-floor material variation: selected households use worn clay squares or stone flags, with timber upstairs. These are artistic choices, not claims about recorded household finishes.
