# Running brook

The channel retains the source map lines. Its water has moving surface normals and broken highlights in metre-based coordinates along each bend. Exposed stones have animated downstream wakes. The shared scene clock controls all motion, including Pause and fixed comparison views.

A 512px planar reflection supplies nearby bank and sky reflections. It updates at most about 11 times per second and fades to the existing environment map at distance. Reflectors and water are hidden during capture to prevent recursive rendering. This follows Three.js's built-in Reflector approach, also used by its [Water2 implementation](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water2.js).

The reflection plane follows the nearest mapped brook point. It approximates the sloping channel locally. The flow direction follows the interpreted terrain's overall fall; it is not surveyed hydrology or a fluid simulation.

Review: `/village?view=brook`. Add `&still=1` for the fixed four-second frame.

Validation: TypeScript check, production build, existing layout tests, and browser review. No browser shader errors during the brook review. Desktop checked; phone performance has not been measured.
