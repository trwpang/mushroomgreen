# Day 4 — Life in the yards

The animal pass adds nine hens in three cottage yards and one resting cat beside Henry's small chainshop. These animals are an interpretation of domestic life. They do not identify animals recorded at those particular households.

## Models

- Three hens each at homes 22, 10, and 40. Warm brown, buff, and charcoal feathers vary within each group.
- Each hen has a shaped breast, layered wing feathers, raised tail feathers, articulated neck, comb, wattles, beak, eyes, scaled legs, and three forward toes with a rear toe.
- Hens lower their heads to peck. Their bodies remain within a fixed, checked footprint. Quiet head turns and tail movement prevent exact repetition.
- One resting tabby beside the long wall of Henry's chainshop. Folded legs, paws, triangular ears, closed eyes, muzzle, whiskers, markings, and a curled tail give it a clear cat silhouette.
- The cat breathes slowly and moves its tail slightly. Neither animal uses a separate clock.

No goat was added. The current plan has no confirmed enclosed paddock with a clear tether area.

## Placement and integration

`addVillageLife(scene, homes, paths)` returns `update(time)`, `stats`, `placements`, and `root`.

Pass the village's actual access paths to the third argument. Call `update` with the same time used by laundry and water. Pause, reduced motion, and fixed review time then work without a second animation loop.

Each animal footprint avoids cottages, road shoulders, footpaths, water, coal bins, fences, both forges, the wash line, the privy, and the vegetable beds. Steep ground is rejected. Each flock stays in a yard instead of spreading animals uniformly across the map.

Each moving part uses one merged geometry and vertex colours. The full pass adds 29 meshes and 51,540 triangles. It makes no texture requests.

## Checks

Run:

```sh
node_modules/.bin/esbuild scripts/village/check-life.ts --bundle --platform=node --format=esm --outfile=/tmp/mushroom-life-check.mjs
node /tmp/mushroom-life-check.mjs
```

The check uses the built household data and current terrain. It checks safe placement, animal separation, finite geometry, draw budget, deterministic layout, animation progress, paused poses, and repeatable time seeking. Results are saved to `artifacts/village/life-validation.json`.

Browser review must follow scene integration. Inspect the hens in Henry's yard from a low angle and the cat beside the small shop. Check that foreground plants do not hide the animals and that feet meet the ground.
