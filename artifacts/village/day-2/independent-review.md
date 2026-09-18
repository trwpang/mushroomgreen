# Day 2 independent visual review

**Result: FAIL**

Reviewed on 18 September 2026 in a fresh Codex in-app browser tab at a desktop viewport. Fixed-time routes inspected:

- `/village?view=approach&still=1`
- `/village?view=lane&still=1`
- `/village?view=brook&still=1`
- `/village?still=1`

## Blocking fixes

1. **Repair the lane camera.** The fixed lane view starts inside or behind building geometry. Large roof and wall polygons fill the frame. The lane and its circulation cannot be reviewed.
2. **Clear the brook camera sightline.** A nearby conifer trunk and large branch sprays cover most of the frame. The brook is only partly visible through the crown. Move the camera or exclude nearby crowns from this composition.
3. **Refine the approach puddle.** It reads as a soft, near-black oval with little useful reflected detail. The hard mirror edge is gone, but the result looks like a dark hole. Raise its local value, reduce the black centre, and retain a subtle readable reflection.

## Findings

- **Tree mix:** PASS in the approach and map views. Conifers and broadleaf crowns are visibly different. The broadleaf canopy has useful irregularity. The brook view shows that conifer sprays can become large flat occluders at close range.
- **Grass and damp ground:** PASS with reservations. The approach shows varied grass colonies, bare gaps, short edge growth, and wet wheel-track patches. Some foreground blade groups still form repeated rows, but this does not block Day 2.
- **Smoke:** PASS with reservations. Pale smoke separates from the trees and fades with height. At the fixed frame, it is faint and slightly blob-like, but it does not show a severe regression.
- **Approach circulation:** PASS. The track curves clearly from the left foreground to the lit chainshop entrance. Yard materials do not block the route.
- **Village map:** PASS. The north-up overview gives a clear settlement shape, lane network, woodland boundary, and brook context. The 80/10/10 tree mix does not damage the overview.
- **Lane circulation:** NOT REVIEWABLE because the fixed camera is inside geometry.
- **Brook composition:** FAIL because foreground conifer geometry obscures the subject.
- **Visible regressions:** The lane and brook fixed compositions are major presentation regressions. The approach and village map remain coherent.

Day 2 must not claim an independent visual pass until the lane and brook fixed views are repaired and checked again. The puddle needs another visual iteration in the same pass.

## Retry — 18 September 2026, after first corrections

**Result: INCOMPLETE. The earlier FAIL remains the last result supported by this reviewer’s direct visual evidence.**

The production build completed successfully at 21:58:12. The retry could not inspect the corrected frames because the reviewer’s in-app browser surface disappeared. A new independent tab was unavailable. No lane, brook, or puddle result is inferred from code changes or another reviewer’s screenshots.

Reported changes awaiting this reviewer’s direct visual check were:

- immediate placement for the initial lane camera;
- a 5.5 metre tree-clearance corridor along the brook camera sightline;
- a stronger puddle reflection with a small ambient lift.

Another visual reviewer must verify all three corrected frames before Day 2 receives an independent pass.
