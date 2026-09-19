# Chainmaker: independent visual review

Date: 19 September 2026
Reviewer: separate adversarial Codex agent (`chainmaker_critic`)
Scope: one male chainmaker demonstration at `/chainmaker`.

## Final verdict

**PASS for the crafted miniature demo, after five visual rounds.**

Round 5 shows a coherent human figure, readable period clothing, and plausible working poses. The separate sleeve, neck and apron defects from earlier rounds no longer break the silhouette. No blocking visual defect remains in the four reviewed final frames.

This verdict covers the saved desktop views and source inspection. It does not certify a likeness to a named person, the exact clothing of an 1865 resident, complete chainmaking technique, or integration into the village. The figure remains deliberately stylised. It is not a photoreal character.

## Reference and evidence

The reviewer inspected `artifacts/chainmaker/reference-browser.png`. It contains the user's selected Alamy Cradley Heath photograph, image identifier 2RWSFPH. The older man supplies the visible clothing cues: low cap, moustache, pale shirt, dark waistcoat, long leather apron, dark trousers and boots. The demo interprets these cues; it does not reproduce a known resident.

Final images inspected:

- `artifacts/chainmaker/round-5-work.png`
- `artifacts/chainmaker/round-5-face.png`
- `artifacts/chainmaker/round-5-side.png`
- `artifacts/chainmaker/round-5-raised.png`

The reviewer also inspected `scripts/chainmaker/build_chainmaker.py`, `src/scripts/chainmaker/rig.ts`, the demo scene, and the source forge workstation geometry. The anvil top is approximately 1.055 metres above the floor. The maker stands on its aisle side.

## Review rounds

| Round | Verdict | Findings and required changes |
| --- | --- | --- |
| 1 | Fail | An initial view was hidden by the forge hood. Clear views then showed detached barrel sleeves, a tall neck, separate spherical cheeks, patchy square texture fields, an upright gaze and oversized pale coals. Required continuous anatomy, smaller head proportions, a work-directed gaze and quieter materials. |
| 2 | Fail | Face proportions, smooth textures and gaze improved. Side view revealed trousers passing through the apron. The neck showed a flat exposed joint and the elbow had an abrupt cut surface. Required cloth clearance and continuous neck, shoulder and elbow transitions. |
| 3 | Fail | Shoulders, neck and elbow read continuously, including the raised-arm pose. Apron clearance improved. Waistcoat surfaces intersected the shirt. Required fitted clothing surfaces. Requested a lower cap, clearer boot construction, less rigid apron drape and smaller dark coals. |
| 4 | Fail | Body, planted stance, tool use, boot construction and coal bank passed. Facial detail became flat, striped surface marks. Waistcoat tops looked cut off across the chest. Required restored facial relief and visible shoulder fabric. |
| 5 | Pass | Eyelids and moustache read as features again. Waistcoat shoulder fabric joins the front and back. The side silhouette retains apron clearance. Work and raised views keep the sleeve connections intact. Boots show soles, heels and laces. |

## Acceptance checks

- The figure reads as an older working man, rather than separate primitive body parts.
- Cap, moustache, shirt, waistcoat, leather apron, trousers and boots remain distinct.
- Gaze points toward the work. Knees soften the stance and both feet remain planted in the reviewed poses.
- Separate fingers grip the tongs and hammer. The tools have readable shapes and purposes.
- Strike and raised endpoints show a plausible hammer path. The tongs remain at the link.
- The apron clears the knees in the side view. Shoulder, neck and elbow transitions remain connected.
- The hot link provides the main work detail. Smaller, darker coals no longer dominate the default frame.

Early source inspection found small physical contact gaps between the anvil, link and hammer. These were reported for correction. The parent agent reports 560 sampled rig checks passing after correction. That numerical result is separate from this reviewer's visual endpoint checks.

## Limits and remaining polish

The reviewer inspected saved stills, not a continuous playback recording. Live pause controls, reduced motion, phone layout, browser errors and build validation are checked by the implementing agent.

The miniature retains simplified fabric folds and facial planes. Further art work could add subtler cuff grime, leather wear and body weight transfer. Those are refinements, rather than blockers for this single-person demo. A full work sequence would need heating, turning and joining the link, beyond this hammering study.
