# Mobile controls verification

- Built with `npm run build`; `npm run village:check` passed.
- Chrome headless with `--use-angle=metal`, waiting for `dataset.villageReady === 'true'`.
- Phone sizes: 390 × 844 and 430 × 932, device scale 3, touch/mobile enabled.
- Desktop: 1440 × 900, device scale 1. All 1,296,000 screenshot pixels match the baseline. All 114 existing header/footer/navigation elements retain their layout and measured styles.
- Main captures use `?still=1` to hold scene time fixed. Interior captures use `?view=forge&inside=main&house=5&still=1`.
- Both phone overview baselines already show a fog-coloured scene; this layout change preserves the scene. The additional forge capture and interior captures show the model.
- `checks.json` records interaction, keyboard focus, minimum 40px control targets, header scrolling, and desktop restoration checks.
- `capture.mjs` and `verify.mjs` reproduce the checks with the local preview at port 4331. Run from the repository root. Capture `before` on the original revision and `after` on this revision.
