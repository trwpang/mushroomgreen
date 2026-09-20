# Three.js Roadmap packs

Assessed from the live vendor pages on 20 September 2026. No purchase, signup or integration performed.

| Pack | Listed status | Fit for Mushroom Green | Recommendation |
| --- | --- | --- | --- |
| [Water Pro](https://threejsroadmap.com/assets/threejs-water-pro) | $199; v3.5.1 | Primarily ocean rendering: FFT waves, foam, reflections, depth effects. | Wait. Ocean detail is not the main problem in the narrow brook. |
| [Rivers & Lakes](https://threejsroadmap.com/assets/threejs-water-pro-rivers-and-lakes) | Coming soon; separate paid add-on; requires Water Pro; no listed price | Directional flow, obstacles and shallow water directly match the brook. | Reassess after release, using an obstacle-filled stream example. |
| [Fire Pro](https://threejsroadmap.com/assets/threejs-fire-pro) | Coming soon; no listed price | Volumetric fire/smoke could help the forges. | Strongest future candidate, if small coal-hearth effects and device performance work. |
| [Sky Pro](https://threejsroadmap.com/assets/threejs-sky-pro) | $79; v2.2.0 | Volumetric clouds, atmospheric light, reflections and cloud shadows. | Low priority for this enclosed village and its close views. |

The [river announcement](https://threejsroadmap.com/blog/threejs-water-pro-rivers-and-lakes-announcement) describes static flow maps and planned dynamic shallow-water simulation. The current product page still says coming soon. Do not assume the base Water Pro purchase includes this work.

Our renderer uses Three.js 0.186.0, WebGLRenderer, EffectComposer/GTAO and custom GLSL material callbacks. Water Pro is WebGPU-first and advertises a WebGL fallback. That does not establish direct compatibility with this rendering and postprocessing pipeline. Sky Pro lists r185 minimum and WebGL/WebGPU support; its FAQ says Water/Sky integration still requires adjustments. Source integration and target-device tests remain necessary before replacing our effects.

Vendor archive sizes (Water 37 MB, Sky 21 MB) are download package sizes, not measured scene payload or GPU memory. The offered Water/Sky bundle is $239; this does not change the recommendation to wait.

## Research report intake

The linked conversation exposed only the research brief and starting message. Tom subsequently supplied the completed Markdown report. It is preserved in [research/chainmaker-dwellings-report.md](research/chainmaker-dwellings-report.md). The applied building/yard refinement is recorded in [research-building-pass.md](research-building-pass.md).

## Open-source coastal simulation

Tom supplied [Techartist's source post](https://x.com/techartist_/status/2101379678917521621). Inspected [iamtechartist/coastal-simulation](https://github.com/iamtechartist/coastal-simulation) at commit `2e95e1a3e757ca1268247417dee01606e5e3d55c` on 20 September 2026.

- MIT license, copyright Techartist 2026. Preserve the copyright and permission notice in any copied or substantially derived source.
- This is a complete coastal demonstration, rather than a packaged drop-in river component. The renderer explicitly requires Three.js r185 and uses WebGPURenderer and TSL node materials. It offers a WebGL2 backend through that renderer; this is not our existing WebGLRenderer/GLSL pipeline.
- The shallow-water solver runs in a module worker, with optional WASM arithmetic kernels and a JavaScript fallback. The default grid is 241 × 401 at 0.3 m spacing. The renderer holds six RGBA float field textures, about 8.85 MiB before other textures and render targets; CPU solver arrays and reflection/refraction passes add costs.
- The useful parts are flow-carried foam and material coordinates, depth-sensitive refraction, wet/dry edges, and rock interaction. Ocean swells, tide boundaries and the coastal terrain definition need replacement for a downhill freshwater brook. Our changing stream elevation also makes the demo's flat reflection plane unsuitable as a wholesale replacement.
- The live demo loaded in the in-app browser on WebGPU, balanced quality, with no reported errors. One steady-state diagnostic sample reported 60 fps, p95 frame time 18.5 ms, and startup 2.57 seconds. This is a single-device observation of the demo, not a village integration benchmark.

Recommendation: investigate an adapted small reach of Black Brook before purchasing Water Pro. Keep the village renderer, port the useful shading techniques to GLSL, and either adapt the worker solver to local stream boundaries or bake its flow into a compact map. Test dry-cell stability, downstream direction, continuity at reach boundaries, reflection cost and frame time in the full village. Use the existing inexpensive water at distant views. No source was vendored and no village water behavior changed during this assessment.
