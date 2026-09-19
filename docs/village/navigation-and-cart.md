# Navigation and forge cart — 19 September 2026

The household panel has two primary actions: **View house** closes the panel and frames the exterior; **Go inside** enters the furnished room. **View cutaway** is available from the room controls. **Back outside** and Escape return outside. Henry’s separate chainshop retains its own named action.

Four direction buttons beside zoom translate the camera and its target together across the ground. Dragging still rotates the view. Arrow keys perform the same pan when the canvas has focus. Zoom eases over 0.32 seconds and pan over 0.25 seconds. Buttons support holding and repeated input; each command continues from the pending destination. Reduced-motion preferences retain immediate movement.

## Cart

Original scripted Three.js geometry, based on the selected photograph in Tom’s Google Images tab for “black country horse and cart”. The Alamy result was titled “UK England West Midlands Dudley Black Country Museum shirehorse drawn cart in the street”. The photograph was used for visual reference only; no photograph or third-party mesh is included.

The unhitched cart has a faded red board body, flared sides, separate floor boards, two iron-tyred wheels with fourteen spokes each, turned hubs, retaining pins, chassis beams, tailboard hinges, chains and lowered shafts. No horse or driver is included. Dimensions are interpreted: body 1.83m wide by 2.44m long, shafts 3.05m long. Existing village oak maps and surface shaders provide consistent material detail.

The cart sits beside the main forge. Its fitted ground plane follows the wheel and shaft support samples. The entrance route and cottage footprints remain clear. Geometry totals 8,832 triangles in three merged material draws, below the 30,000-triangle check budget.

## Checks

- `npm run village:navigation`: pan preserves viewing angle and distance across several headings and heights; zoom preserves heading and respects limits.
- `npm run village:cart`: finite geometry, ground support tolerance, geometry budget, cottage clearance and principal forge doorway clearance.
- `npm run village:check`: TypeScript check.
- `npm run build`: production build and runtime asset guard.
- Browser review: exterior navigation, directional pan, smooth zoom, household entry and cutaway return. Cart placement reviewed in the forge view.

Evidence: `artifacts/village/cart/forge-cart.png` and `validation.json`. Changes remain local; no push or deployment.
