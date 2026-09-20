# Oil lamp and room navigation

Henry’s dining table now carries a lit, portable oil lamp. The existing catalogue lamp has been rebuilt rather than duplicated. The catalogue remains at 112 models.

## Reference and construction

[Islington Education Library Service’s 1860s oil lamp](https://www.objectlessons.org/houses-and-homes-victorians/oil-lamp-victorian-original/s59/a959/) provides a dated reference. Its photograph and object record show a brass reservoir, carrying handle, side wick adjuster, and long glass chimney. The record gives a height of 35 cm and base diameter of 16.6 cm. The new model follows these proportions, with an interpreted chimney profile and aged brass finish. This does not establish Henry’s ownership.

The original procedural mesh has a hollow, open chimney, separate transparent glass, burner cage, cotton wick, filling cap and adjustment wheel. Henry’s table lamp has a small flame and local warm light. Stored lamps stay unlit. The flame respects the existing pause control. No reference image pixels are included in the model.

## Controls

- **Turn** is above **Move**, with separate labels and accessible button names.
- Outside, Turn orbits the subject. Inside, it turns the view while keeping the eye in place.
- Move uses 16 cm steps inside. Outside steps still scale with the view distance.
- Arrow keys move; Shift plus arrow keys turn. Buttons ease into their new position and repeat when held.
- Indoor dragging turns the view. Right-drag panning and wheel zoom are slower indoors.
- Room wall, floor and ceiling limits keep the eye inside. This is shell containment, not furniture collision or a walking simulation.
- Back outside restores the outdoor camera settings.

## Checks

Navigation checks cover repeated turns, fixed eye position, indoor step size, and rotated room bounds. Object checks verify table support and the chimney material. All 58 homes and 74 floors pass the interior geometry checks. The portable GLB passes validation, and TypeScript and the production build pass.
