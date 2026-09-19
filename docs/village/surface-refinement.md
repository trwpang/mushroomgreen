# Surface refinement — 19 September 2026

This pass refines existing content. It does not add buildings, props, people, routes or room plans.

## Material changes

- Fourteen material profiles add different grain, shallow relief, colour wear and roughness to brick, plaster, stone, slate, timber, bark, iron, coal, cloth, leather, leaves, glass, glazed pottery and hot cinders.
- Original Blender colour and normal atlases remain in use. Detail operates in metres and includes instance transforms. Subpixel grain fades to avoid sparkling during movement.
- Cottage walls and both chainshops get uneven damp bases and restrained rain staining. Each workshop has its own ground datum, despite sharing the same source asset.
- Trunks now have independent bark materials. Leaves have slight transmission and tonal variation while retaining the current tree types and positions.
- Yard boards, coal bins, privies, laundry, interior cloth, worn floorboards and plaster use the same surface system. Interior canvas textures add soft stains, fading and fine lime cracks.
- Road and yard shaders add fine grit relief and a clearer damp/dry roughness difference. All existing road joins and rut geometry remain intact.
- Brook reflections use five filtered samples, irregular flow normals and broken bank tint. Current direction remains the interpreted terrain fall.
- Cold forge cinders no longer become emissive merely because Three.js defaults emissiveIntensity to 1. Only the existing live ember material glows, through cracks in a dark crust.
- Village and forge output use slight warm-highlight/cool-shadow colour separation in the existing output pass. No extra full-screen pass or asset download is required.
- Village sun shadows track the target elevation and use tighter normal bias with a softer filter.

## Checks

`npm run surfaces:check` covers shader composition, independent workshop datums, clipping-material clones and protected water/skin/ember materials. `village:check`, `forge:check`, `chainmaker:check`, `village:layouts`, `village:workshop` and production build pass. Layout checks still cover all 58 cottages and 74 floors.

Browser images are under `artifacts/village/surface-pass/`. Browser inspection covers the approach, brook, cottage cutaway, laundry, main workshop and standalone studies. This is a visual pass, not a physical-device performance certification. The extra detail adds fragment work; it does not add draw calls or increase the GLB downloads.
