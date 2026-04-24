import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { NoiseProceduralTexture } from '@babylonjs/core/Materials/Textures/Procedurals/noiseProceduralTexture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
// Side-effect import: Babylon 8.x modular imports require InstancedMesh's
// side effects to be loaded before createInstance() works on a Mesh.
import '@babylonjs/core/Meshes/instancedMesh';
import { latLngToScene } from './projection';

const TILE_W = 2;
const TILE_D = 1;

/**
 * Build a procedural iso-diamond tile mesh (2×1 in the XZ plane) with a
 * painterly green material. Simpler and more reliable than loading the
 * Blender glTF for such a trivial shape — same painterly feel via a
 * NoiseProceduralTexture on a StandardMaterial. The Blender recipe at
 * spike/blender-scripts/tile-grass.py stays committed for reference /
 * future swap-out if we want Blender-baked brush strokes.
 */
function makeGrassTileTemplate(scene: Scene): Mesh {
  const m = new Mesh('tile-grass-template', scene);
  const vd = new VertexData();
  vd.positions = [
    1, 0, 0,      // +X corner
    0, 0, 0.5,    // +Z corner
    -1, 0, 0,     // -X corner
    0, 0, -0.5,   // -Z corner
  ];
  vd.indices = [0, 1, 2, 0, 2, 3];
  vd.normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  vd.uvs = [1, 0.5, 0.5, 1, 0, 0.5, 0.5, 0];
  vd.applyToMesh(m);

  const mat = new StandardMaterial('mat-grass', scene);
  mat.diffuseColor = new Color3(0.52, 0.68, 0.32);
  mat.specularColor = new Color3(0.05, 0.06, 0.04);
  // Noise gives visible brush-stroke variation across the carpet.
  const noise = new NoiseProceduralTexture('grass-noise', 256, scene);
  noise.brightness = 0.45;
  noise.octaves = 3;
  noise.persistence = 0.6;
  noise.animationSpeedFactor = 0;
  mat.diffuseTexture = noise;
  mat.backFaceCulling = false;
  m.material = mat;
  m.setEnabled(false);
  return m;
}

export async function buildGround(
  scene: Scene,
  boundary: [number, number][],
): Promise<void> {
  const bounds = boundary.map(([lat, lng]) => latLngToScene(lat, lng));
  const xs = bounds.map((p) => p.x);
  const zs = bounds.map((p) => p.z);
  const minX = Math.min(...xs) - TILE_W;
  const maxX = Math.max(...xs) + TILE_W;
  const minZ = Math.min(...zs) - TILE_D;
  const maxZ = Math.max(...zs) + TILE_D;

  const template = makeGrassTileTemplate(scene);

  for (let z = minZ; z <= maxZ; z += TILE_D) {
    const rowIndex = Math.round((z - minZ) / TILE_D);
    const xOffset = rowIndex % 2 === 0 ? 0 : TILE_W / 2;
    for (let x = minX + xOffset; x <= maxX; x += TILE_W) {
      const inst = template.createInstance(
        `grass-${x.toFixed(2)}-${z.toFixed(2)}`,
      );
      inst.position = new Vector3(x, 0, z);
    }
  }
}

/**
 * Procedurally build a dirt-path tile template — same diamond footprint
 * as the grass tile so they interlock on the same grid. Colour keyed to
 * Staffordshire dirt (warmer than generic brown).
 */
function makeDirtTileTemplate(scene: Scene): Mesh {
  const m = new Mesh('tile-dirt-template', scene);
  const vd = new VertexData();
  vd.positions = [
    1, 0, 0,
    0, 0, 0.5,
    -1, 0, 0,
    0, 0, -0.5,
  ];
  vd.indices = [0, 1, 2, 0, 2, 3];
  vd.normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  vd.uvs = [1, 0.5, 0.5, 1, 0, 0.5, 0.5, 0];
  vd.applyToMesh(m);

  const mat = new StandardMaterial('mat-dirt-path', scene);
  mat.diffuseColor = new Color3(0.58, 0.44, 0.28);
  mat.specularColor = new Color3(0.04, 0.03, 0.02);
  const noise = new NoiseProceduralTexture('dirt-noise', 256, scene);
  noise.brightness = 0.5;
  noise.octaves = 4;
  noise.persistence = 0.55;
  noise.animationSpeedFactor = 0;
  mat.diffuseTexture = noise;
  mat.backFaceCulling = false;
  m.material = mat;
  m.setEnabled(false);
  return m;
}

/**
 * Stamp dirt-path tiles along road polylines, quantised to the same grid
 * as the grass carpet so paths interlock without gaps or overlaps. Tiles
 * are lifted 1 mm above grass to avoid z-fighting.
 */
export function paintRoads(
  scene: Scene,
  roads: Array<{ polyline: [number, number][] }>,
): void {
  const template = makeDirtTileTemplate(scene);
  const stamped = new Set<string>();
  for (const road of roads) {
    for (const [lat, lng] of road.polyline) {
      const { x, z } = latLngToScene(lat, lng);
      // Quantise to the same diamond grid used by buildGround
      const qx = Math.round(x / (TILE_W / 2)) * (TILE_W / 2);
      const qz = Math.round(z / TILE_D) * TILE_D;
      const key = `${qx}:${qz}`;
      if (stamped.has(key)) continue;
      stamped.add(key);
      const inst = template.createInstance(`dirt-${qx}-${qz}`);
      inst.position = new Vector3(qx, 0.001, qz);
    }
  }
}
