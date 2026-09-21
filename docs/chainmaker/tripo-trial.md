# Chainmaker v2: reference-led trial

## Aim

Replace the current figure's assembled appearance with a continuous, detailed human form. Hands must have distinct fingers and thumbs, and grip the actual tools. Keep the worker's cap, moustache, shirt, waistcoat and worn leather apron. The figure remains an interpretation, not a portrait of an identified resident.

## Reference preparation

Built-in ImageGen produced two images. The first establishes identity and clothing; the second opens both arms and hands for reconstruction. The source images and exact prompts are in `assets/chainmaker/reference-v2/`. The open pose exposes all fingers against the background. It does not establish unseen back details; those remain generated interpretations.

Reference workflow inspected: https://x.com/NickDevFE/status/2094047491230675362 and https://github.com/img2threejs/img2threejs/blob/main/docs/GLB_CHARACTER_PROMPT.md . Its GLB reconstruction is useful, but translating the finished model into code is not required by this project. Keep the existing GLB/Three.js delivery path and retain high-quality textures.

## Provider request

- Tripo Studio, v3.1, Geometry & Texture, no 8K or parts options.
- Source: `chainmaker-a-pose.png`.
- One generation at 55 credits, submitted after Tom independently upgraded the account.
- Account balance: 3,200 before submission, 3,145 after acceptance.
- Model identity: `2bf82aaa-1009-4dc9-985b-3899edf32916`.
- Workspace: https://studio.tripo3d.ai/workspace/generate/2bf82aaa-1009-4dc9-985b-3899edf32916
- Privacy: Sharing Only, as shown by the account at submission.
- No subscription or cash purchase was made by the agent.
- The first generation POST failed with no response, with unchanged balance and no job card. The subsequent request created the model above; record only the accepted model as generated.

Tripo's paid-user rights summary permits modification, distribution and commercial use of outputs generated on the paid plan: https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially . Our submitted image is original generated concept art. Keep provider provenance when exporting and modifying the model; do not relabel its geometry as locally authored.

## Acceptance checks

1. Front, side and rear: coherent proportions, intact apron, plausible back of waistcoat and cap.
2. Close views: five distinct digits per hand; no fused fingers, flat palms or extra limbs.
3. Rig: shoulder, elbow and wrist bend without collapse; hand pose can hold hammer/tongs; apron does not pull with arms.
4. Scale: approximately 1.72 m; soles on brick floor; reachable anvil and clear doorway.
5. Browser: validated GLB; bounded textures and triangles; inspect at actual forge lighting and close camera.

The original figure stays in the village until the replacement passes these checks. A successful generation is not proof of rig quality or readiness for the village.

## First visual review and processing

The generated face, cap, shirt folds, waistcoat and separated fingers are a substantial improvement over the assembled figure. Front and side proportions are plausible. The rear apron is incorrect: it wraps around the legs like a skirt. It needs a local mesh correction before village admission. These are visual findings from the Tripo viewport, not a deformation pass.

The source has 1,979,801 triangles and 1,017,331 vertices. Triangle retopology with Smart Mesh disabled reduced it to 99,999 faces and 57,449 vertices, for 5 credits. Humanoid rigging with the Mixamo preset was then submitted for 20 credits. Total accepted spend is 80 existing credits; the verified balance is 3,120.

Export of the original source did not yield a local file or a browser download event. Do not infer a successful download from the export button returning to its normal state. `scripts/chainmaker/inspect-import.mjs` is ready to inspect the eventual GLB without publishing it. It was checked on the existing character: 40,100 triangles, 1,407,608 bytes, no glTF validation errors.

## Rig review and handoff

Mixamo auto-rigging completed. The free `chop` preset runs for 6.58 seconds. Inspection covered rest, lowered two-hand grip, and raised two-hand grip at 1.64 seconds. The shoulders and elbows bend without obvious detached limbs in these views, and the fingers close into grip shapes. The apron follows the torso without pulling up with the arms. This is a limited browser check: it does not certify all joint weights, finger contact or a chainmaking animation. The two-handed chopping preset is only a deformation test, not the intended hammer stroke.

Export was tried again for the reduced, rigged model: GLB, 2K textures, Export Skeleton enabled, name `mushroom-chainmaker-v2-rigged`. No matching local file arrived. Tom was asked to download this GLB manually to Downloads. The model and rig remain saved in Tripo. No live village asset has been replaced.

Next steps after receipt: inspect GLB/skin/texture payload; correct the wraparound rear apron in Blender; normalize to 1.72 m; compress within the 4 MB and 120,000-triangle budget; add skeletal hammer/tongs grips and test full motion against the anvil; review in forge lighting before replacement.
