# Furnished rooms in the village

The main village now uses the same individual furnishing plans as the cutaway room viewer: 58 cottages and 74 floors. The main forge already contains its workstations and worker, so household 5 is excluded from cottage streaming.

`createInteriors(parent, true)` builds enclosed rooms inside the exterior. It retains complete side and front linings, aligned window and door openings, ceiling surfaces, and simultaneous upper floors with stair openings. Cutaways still use the original open-sided mode. The vertical seed now consumes the same three roof draws as the exterior before selecting the height scale.

`inhabitHouses` streams by the camera's position, independent of the orbit target. Up to four nearby cottages are visible; at most eight remain cached. It builds one missing cottage per frame, disposes the oldest unused rooms, and hides the whole collection during isolated inspection. The overview does not render these rooms. Embedded rooms add no global ambient lights.

Detailed exterior glazing now transmits the view. The window reveals cover the rough brick edges seen from within. Nearby exterior detail also follows camera proximity, so a distant orbit target cannot leave a low-detail solid shell around the camera.

The household panel offers **Go inside** for an eye-level view within the village. **Back outside** or Escape returns to the house view. **View cutaway**, available after entering the room, opens the separate cutaway and floor selector. The room view is bookmarkable with `room=1`. This is still the existing orbit camera, not a walking controller with collisions or opening doors.

Validation:
- `npm run village:check`
- `npm run village:layouts`: individual plans and circulation, 58 cottages / 74 floors.
- `npm run village:inhabited`: constructs all room geometries with a no-op canvas; checks open windows and entrance routes, closed gables, camera-based selection, overview culling, resource disposal, and bounded caching.
- `npm run build`: asset validation and static build.
- Browser: house 9 furnished view, transmitted exterior through glass, outside return, and cutaway floor switching.
