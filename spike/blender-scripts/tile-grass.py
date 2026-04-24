"""
Task 4 recipe — produce public/babylon-sprites/tile-grass.glb.

Diamond iso tile, 2 units wide × 1 unit deep, origin at mesh centre
(for iso interlock offsets). Painterly green material with procedural
noise for brush-stroke variation. Material name: 'mat-grass'.

Run headless:
    /Applications/Blender.app/Contents/MacOS/Blender --background \\
        --python-file spike/blender-scripts/tile-grass.py

Output: public/babylon-sprites/tile-grass.glb
"""
import bpy
import math
from pathlib import Path

PROJECT = Path("/Users/tomweaver/Documents/GitHub/mushroomgreen")
OUT = PROJECT / "public" / "babylon-sprites" / "tile-grass.glb"

# Clean slate
bpy.ops.wm.read_factory_settings(use_empty=True)

# Build diamond tile as a mesh from explicit verts — a plane scaled to
# diamond (2×1) where the long axis is X. Four corner verts in the XZ plane
# (Y up = Blender Z; Babylon's Y-up maps Blender's Z to Babylon's Y on glTF
# export), one quad face.
mesh = bpy.data.meshes.new("tile-grass-mesh")
verts = [
    (1.0, 0.0, 0.0),   # +X corner
    (0.0, 0.5, 0.0),   # +Y corner
    (-1.0, 0.0, 0.0),  # -X corner
    (0.0, -0.5, 0.0),  # -Y corner
]
faces = [(0, 1, 2, 3)]
mesh.from_pydata(verts, [], faces)
mesh.update()

obj = bpy.data.objects.new("tile-grass", mesh)
bpy.context.collection.objects.link(obj)

# Painterly green material — Principled BSDF fed by a Noise texture through
# a ColorRamp so the tile has visible brush-stroke variation rather than a
# flat mat colour. Roughness high so it doesn't read as plastic.
mat = bpy.data.materials.new(name="mat-grass")
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)

out = nt.nodes.new("ShaderNodeOutputMaterial")
out.location = (600, 0)

bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
bsdf.location = (300, 0)
bsdf.inputs["Roughness"].default_value = 0.85
# Principled BSDF in Blender 5.1 dropped 'Specular'; use Specular IOR Level
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.1

ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.location = (0, 0)
# Darker grass green → lighter grass green. Tuned to match the site palette.
ramp.color_ramp.elements[0].color = (0.35, 0.48, 0.22, 1.0)  # deep mossy
ramp.color_ramp.elements[1].color = (0.65, 0.78, 0.38, 1.0)  # sunlit grass

noise = nt.nodes.new("ShaderNodeTexNoise")
noise.location = (-300, 0)
noise.inputs["Scale"].default_value = 8.0
noise.inputs["Detail"].default_value = 2.5
noise.inputs["Roughness"].default_value = 0.5

nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

obj.data.materials.append(mat)

# Origin at mesh centre (already is — verts are symmetric around (0,0,0))
# Select for export
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
    export_animations=False,
)
print(f"TASK4_EXPORTED: {OUT}")
