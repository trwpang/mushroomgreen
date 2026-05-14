# Autonomous Execution Protocol

## Loop

1. Read `vision.md` before each visual pass.
2. Generate or edit assets only for a named taxonomy gap.
3. Save production raw sheets and sidecars under `assets/sprite-map/raw/`.
4. Run `npm run sprites:pipeline`.
5. Inspect `/sprite-pipeline-spike/`.
6. Reject bad assets in manifest/audit rules or avoid selecting them.
7. Place accepted assets through scene JSON or the editor.
8. Capture desktop and mobile screenshots with browser-harness.
9. Compare screenshots against the vision target.
10. Log progress and remaining gaps.

## Stop Conditions

Do not call the map done if any of these are true:

- The brook reads as broken pieces rather than a connected stream.
- The first viewport is mostly empty green terrain.
- The buildings do not share one worn visual language.
- The user has to infer where the households are.
- Mobile framing hides the settlement.
- The editor cannot export a reproducible JSON state.

## Verification Commands

```bash
npm run sprites:pipeline
npm run build
npm run dev -- --host localhost
```

Browser-harness captures:

- `/`
- `/sprite-map-editor/`
- `/sprite-pipeline-spike/`
- `/legacy-map/`

## Current Risk

The strongest remaining gap is not framework capability. It is asset quality and composition: roads, water, and props need a dedicated generation pass and a hand-authored placement pass.

Production sprites now come from tracked paths:

- Raw sheets: `assets/sprite-map/raw/`
- Keyed PNGs: `public/sprite-map/generated/`
- Manifest: `src/data/generated-sprite-manifest.json`
