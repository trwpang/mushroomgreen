# Henry’s small family statue

The modern family Easter egg appears only in Henry Weaver’s downstairs room (historic house 22), on a bracketed timber shelf beside the sleeping partition. It is 457.2 mm tall including the plinth. It is not presented as an 1865 possession.

Tom’s commissioned statue photograph is retained in `assets/henry-statue/reference.jpg`. Tripo H3.1 generated a static PBR model, job `50a02249-33c2-47e3-80f4-92d20eefb4c9`, using 55 credits from the approved 60-credit limit. Generation used the image-only form. The unused text art direction is retained in the provider record. Unseen surfaces and the small base inscription are approximations.

The original 1,962,856-triangle model is retained as `assets/henry-statue/source.glb`. The pack command reduces it to 58,000 triangles with 1K WebP textures and Meshopt compression. The runtime download is about 0.66 MB. It validates without GLTF errors. Rebuild with `npm run henry-statue:pack` after source or packing changes.

The model faces +X in its original coordinates. The room instance rotates 180 degrees to face the kitchen. Its 186 × 218 mm horizontal envelope fits entirely within the 390 × 380 mm shelf. The bottom of the plinth sits on the shelf top, with no ground offset.

The asset loads only when Henry’s room is requested by nearby-room streaming or a cutaway. Instances share geometry, textures and materials; room cleanup removes the instance before disposing room-owned resources. Late loading cannot attach to a room that has already closed. Bronze uses the scene’s existing filtered environment reflection; it creates no extra reflection texture or capture.

Checks: TypeScript, production build and asset hash/budget checks; all 58 house layouts; browser inspection of front, side, rear, and placement within Henry’s room. `artifacts/henry-statue/three-sides.png` records the model review.
