# Bounded surface texture loading

Implemented 20 September 2026. This covers the authored material atlases, not all scene memory.

- A shared 64 MiB RGBA-plus-mipmap budget reserves memory before each download starts.
- At most two atlas downloads run together. Repeated material requests share one load.
- Drawing a material records use. Maps unused for 30 seconds release their GPU texture and decoded image reference.
- Under memory pressure, the cache can release maps unused for two seconds. Active maps remain protected.
- Stable shader uniform slots switch to procedural fallback during loading and return to the texture after loading. Cached rooms do not need shader recompilation.
- Failed downloads use the procedural surface and retry after 30 seconds. Page teardown invalidates pending loads and releases resources.
- New atlas URLs must register their dimensions. The loader rejects unexpected image dimensions.

The six current 1774 × 887 sheets use 50,320,272 bytes (47.99 MiB) including mip levels. WebP download size is not decoded GPU size. Geometry, embedded GLB textures, terrain, reflections, shadows and postprocessing render targets have separate costs. The 64 MiB limit is not a guarantee for total browser memory or performance on every device.

## Validation

`npm run village:textures` tests deduplication, concurrency, reservations, active-map protection, eviction, fallback/reload, failure cooldown and disposal during an in-flight load. `village:check`, `surfaces:check`, `village:inhabited` and the production build also pass.

Browser check: Henry's room reached six ready maps, zero failed/queued/loading, and no console errors. Moving to the full village released two maps after the idle period: 33,546,848 bytes remained. Returning through the household menu and Go inside restored all six maps and the same room surfaces, with no console errors. This uses normal navigation without reloading the document.

DOM diagnostics on `#village-canvas`: `data-surface-texture-memory` reports the atlas cache; `data-gpu-textures` reports Three.js's total texture count, not total bytes.

## Next expansion

Keep materials shared across houses. Extend the registry and tests when adding sheets. Use camera distance and visible benefit to select future detail levels. GPU-compressed KTX2/Basis textures are a possible next step; they are not implemented here. Three.js's [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) can transcode Basis data to a supported device format after renderer capability detection.
