"""
Task 6 recipe — produce public/babylon-sprites/tile-dirt-path.glb.

Same diamond footprint as tile-grass so paths interlock with grass on the
same grid. Colour: Staffordshire dirt, keyed to the site's warm palette.
Noise scale higher than grass so the two read as visibly different textures
even at default zoom. Material: 'mat-dirt-path'.

Run headless:
    /Applications/Blender.app/Contents/MacOS/Blender --background \\
        --python spike/blender-scripts/tile-dirt-path.py

Output: public/babylon-sprites/tile-dirt-path.glb
"""
import bpy
from pathlib import Path

PROJECT = Path("/Users/tomweaver/Documents/GitHub/mushroomgreen")
OUT = PROJECT / "public" / "babylon-sprites" / "tile-dirt-path.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)

mesh = bpy.data.meshes.new("tile-dirt-path-mesh")
verts = [
    (1.0, 0.0, 0.0),
    (0.0, 0.5, 0.0),
    (-1.0, 0.0, 0.0),
    (0.0, -0.5, 0.0),
]
faces = [(0, 1, 2, 3)]
mesh.from_pydata(verts, [], faces)
mesh.update()

obj = bpy.data.objects.new("tile-dirt-path", mesh)
bpy.context.collection.objects.link(obj)

mat = bpy.data.materials.new(name="mat-dirt-path")
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)

out = nt.nodes.new("ShaderNodeOutputMaterial")
out.location = (600, 0)

bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
bsdf.location = (300, 0)
bsdf.inputs["Roughness"].default_value = 0.9
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.08

ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.location = (0, 0)
# Dirt brown — sun-baked + shadow. Staffordshire soil reads warmer than
# generic dirt; matches the brick palette we'll apply to cottages.
ramp.color_ramp.elements[0].color = (0.36, 0.25, 0.15, 1.0)  # shadowed dirt
ramp.color_ramp.elements[1].color = (0.62, 0.47, 0.30, 1.0)  # sun-dried dirt

noise = nt.nodes.new("ShaderNodeTexNoise")
noise.location = (-300, 0)
noise.inputs["Scale"].default_value = 12.0  # finer grain than grass
noise.inputs["Detail"].default_value = 3.0
noise.inputs["Roughness"].default_value = 0.6

nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

obj.data.materials.append(mat)

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
print(f"TASK6_EXPORTED: {OUT}")
