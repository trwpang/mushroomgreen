# Three.js graphics skills: review and forge proposal

Reviewed and installed 23 September 2026. Source: https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills at `d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba`, package version 0.11.0.

## Installation and safety finding

Installed all 24 skills into Tom’s Codex user skills folder using the built-in skill installer and the exact reviewed commit. Verified SHA-256 equality for all 552 original skill files (71.16 MB) before adding local review notes. They become available on the next turn. These are local references, not a new dependency or download for the village.

The review covered the skill entry instructions, agent YAML metadata, package scripts, installer, third-party notices, and targeted scans across the full skill payload for secret access, shell/process execution, dynamic execution, and network operations. It found no obvious malicious payload, credential access, exfiltration, or automatic command execution in the installed skill instructions/examples. There are no symlinks or nested package manifests in the installed payload. This is a static review, not a proof that every example and asset is safe or correct.

The upstream package has prepack/prepublish checks but no install lifecycle hook. We did not run its npm installer, install its development dependencies, execute examples, start its gallery, or copy its repository-level .codex settings into the project. The local reference checkout is under `~/tools/`, separate from Tom’s projects. No automatic update was configured.

Some graphics loaders can fetch remote textures from GitHub. Three explicit fetch sites load shader/scene assets. One optional ocean solver is WebAssembly. Its module imports only memory, and exports pressure/transport functions; it was parsed for its imports, not instantiated or run. Binary image/model/EXR payloads were inventoried, not exhaustively decoded or fuzz-tested. None enter the village through this installation.

### Important reuse limits

- The top-level MIT licence is not the whole story. Package metadata declares MIT AND GPL-3.0-only. Rain/puddle and deformable-sand examples include GPL material.
- The notices describe some source projects as having no observed licence, yet assume MIT under a project rule. That is not verified permission. Avoid copying those examples until their actual permission is established.
- The repository’s development-only instructions also discourage source attribution and assume licences. These were treated as untrusted authoring instructions and were not installed. They do not govern this project.
- Added `LOCAL-REVIEW.md`, original package licence texts and third-party notices beside every installed skill. Each skill entry links to its review. Original example code and assets are unchanged. The installation manifest records the original and locally amended hashes.
- The fire example is attributed to bandinopla/threejs-easyfire, whose public repository identifies an MIT licence. Preserve its attribution if adapting it. Recheck the precise version selected for integration.

Full source and installation hashes: [installation record](threejs-skills-installation.json).

## What this can improve

The village uses Three.js WebGLRenderer and EffectComposer, with custom GLSL surface work, AO and cached shadows. The standalone forge study already has simple emissive embers, sinusoidal lighting, smoke sprites and small spark points. The village workshop, cutaway and standalone study need one consistent effect owner.

The pack’s fluid-fire example uses WebGPU/TSL compute, 11 volume textures and depth-aware raymarching. It is not directly compatible with the current WebGL pipeline. Its own documentation identifies unordered emitter writes, imperfect time stepping, inactive controls, emitter-index issues and missing resource disposal. Three.js WebGPURenderer has a WebGL backend, but that does not establish that this particular storage-texture simulation works on that backend. A renderer migration would also affect our custom materials and post-processing.

### Recommended first pass: one complete main-forge hearth

1. **Fuel bed.** Show separate dark fuel, ash and hot cavities. Use one heat field for colour, emission and response to air. Keep the photographed small pavers, whitewashed masonry and station geometry. Borrow the shared-field and emissive-material mechanisms, not the appearance of lava.
2. **Flame volume.** Build short, irregular flame tongues above the fuel. Control their rise and curl with one upward flow field. Clip the effect to the hearth and stop it at opaque geometry. Validate from the worker view, side, doorway and cutaway. A small WebGL raymarched field is the first integration candidate; the full WebGPU fluid solver belongs in a separate comparison experiment.
3. **Smoke and draft.** Make the smoke rise towards the actual hood/flue opening, then emerge from the chimney. Keep the interior flow distinct from outdoor wind. Avoid particles passing through masonry, large opaque discs, or a constant blanket of smoke.
4. **Local light.** Derive warm light variation from the same heat state. Let it reveal limewash texture, nearby chain, the anvil edge and the worker’s apron. Keep the rest of the room readable. Bloom should soften the hottest areas without turning them into a white ball.
5. **Hot metal and hammer scale.** Give heated chain a cooling colour and local glow. Trigger restrained scale/spark bursts on the accepted hammer-contact timing. Use a fixed particle pool with gravity and fading; preserve all accepted hand poses and tool positions.
6. **Close surface response.** Use shared soot, ash and wear masks across colour, roughness and normals. Add readable mortar recesses, powdery ash, scale flakes and rubbed metal edges. Reserve costly relief effects for close views of small areas.

These form one coherent work station: heat changes the fuel and flame; airflow moves flame and smoke; strikes create short bursts; light responds to the same events.

### Then extend to Henry and the village

- Apply the shared system to Henry’s single smaller hearth, with lower output and its own phase. Do not scale every visual parameter uniformly or synchronize all fires.
- Close workshop: full bounded flame, local smoke and a small number of lights. Yard view: simplified flame and pooled chimney wisps. Village overview: ember hints and inexpensive distant smoke. Stop inactive simulations.
- Next surface pass: stable grazing highlights on iron and worn wood; soot concentrated near working areas; stronger contact detail around tools and fuel.
- Next landscape pass: rooted grass movement, better foliage lighting and ivy that follows walls. Check the selected example licences before copying.
- Leave water for its separately requested pass. The bounded-water skill is a closer match to the brook than the ocean simulation.

## Acceptance before integration

Capture current and candidate results at the same camera, daylight, frame size and repeatable time. Include bloom disabled, depth/flow diagnostics, close and distant views, and motion recordings. Preserve `still=1`, Pause and Save picture behaviour.

Measure total frame cost, effect GPU time when supported, draw calls and texture memory; the existing final-pass draw-call counter is not sufficient. Set the effect budget from this baseline before choosing volume resolution. Test entry/exit and repeated cutaway changes for resource leaks, plus a lower-quality path. Keep only improvements that remain visible at the intended camera distance.

No rendering changes were made by this installation. Proposed implementation order: main hearth → smoke/light/contact effects → Henry’s hearth → distance tiers and full-scene checks.
