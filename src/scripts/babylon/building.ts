import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { NoiseProceduralTexture } from '@babylonjs/core/Materials/Textures/Procedurals/noiseProceduralTexture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/instancedMesh';

const WALL_HEIGHT = 1.5;
const WALL_THICK = 0.15;
const WALL_LEN = 1.0;
const ROOF_APEX = 1.2;

export interface CottageMetadata {
  clusterId: number;
  primaryFamily: string;
  memberCount: number;
  members: number[];
}

export interface BuildingTemplates {
  corner: Mesh;
  roof: Mesh;
}

/**
 * Build a corner module — an L-shape wall (two walls meeting at 90°).
 * Origin at the inner corner so four rotated instances assemble into a
 * closed 2×2 square cottage footprint.
 */
function makeCornerTemplate(scene: Scene): Mesh {
  // Two walls combined into one mesh. Wall 1 runs +X from origin, wall 2
  // runs +Z from origin. Each wall is a thin box.
  const wallX = MeshBuilder.CreateBox('corner-wall-x', {
    width: WALL_LEN, height: WALL_HEIGHT, depth: WALL_THICK,
  }, scene);
  wallX.position = new Vector3(WALL_LEN / 2, WALL_HEIGHT / 2, WALL_THICK / 2);

  const wallZ = MeshBuilder.CreateBox('corner-wall-z', {
    width: WALL_THICK, height: WALL_HEIGHT, depth: WALL_LEN,
  }, scene);
  wallZ.position = new Vector3(WALL_THICK / 2, WALL_HEIGHT / 2, WALL_LEN / 2);

  const corner = Mesh.MergeMeshes([wallX, wallZ], true, true, undefined, false, true);
  if (!corner) throw new Error('building: failed to merge corner walls');
  corner.name = 'cottage-corner-template';
  corner.setEnabled(false);

  const mat = new StandardMaterial('mat-brick', scene);
  mat.diffuseColor = new Color3(0.63, 0.34, 0.24); // Staffordshire red brick
  mat.specularColor = new Color3(0.03, 0.02, 0.02);
  const noise = new NoiseProceduralTexture('brick-noise', 256, scene);
  noise.brightness = 0.48;
  noise.octaves = 4;
  noise.persistence = 0.5;
  noise.animationSpeedFactor = 0;
  mat.diffuseTexture = noise;
  corner.material = mat;
  return corner;
}

/**
 * Build a 4-sided pitched roof — square base 2×2, apex 1.2 above base centre.
 * Origin at the centre of the bottom face. Constructed as a pyramid (4
 * triangular faces from apex down to base corners) for simplicity.
 */
function makeRoofTemplate(scene: Scene): Mesh {
  const m = new Mesh('cottage-roof-template', scene);
  const vd = new VertexData();
  // 5 vertices: 4 base corners + 1 apex. We also add the base quad so the
  // roof renders from below when the camera peeks under eaves.
  const APEX_Y = ROOF_APEX;
  const BASE = 1.1; // slight overhang vs the 2×2 cottage footprint
  vd.positions = [
    // Base corners (y=0)
    -BASE, 0, -BASE,  // 0: -X -Z
     BASE, 0, -BASE,  // 1: +X -Z
     BASE, 0,  BASE,  // 2: +X +Z
    -BASE, 0,  BASE,  // 3: -X +Z
    // Apex
     0, APEX_Y, 0,    // 4
  ];
  vd.indices = [
    // 4 triangular side faces
    0, 4, 1,
    1, 4, 2,
    2, 4, 3,
    3, 4, 0,
    // Base quad (two tris) — faces -Y so visible from below
    0, 1, 2,
    0, 2, 3,
  ];
  // Compute normals on demand via VertexData
  const normalsBuf: number[] = new Array(vd.positions.length).fill(0);
  VertexData.ComputeNormals(vd.positions, vd.indices, normalsBuf);
  vd.normals = normalsBuf;
  vd.applyToMesh(m);

  const mat = new StandardMaterial('mat-roof', scene);
  mat.diffuseColor = new Color3(0.29, 0.36, 0.42); // slate blue-grey
  mat.specularColor = new Color3(0.06, 0.07, 0.08);
  const noise = new NoiseProceduralTexture('roof-noise', 256, scene);
  noise.brightness = 0.52;
  noise.octaves = 3;
  noise.persistence = 0.55;
  noise.animationSpeedFactor = 0;
  mat.diffuseTexture = noise;
  m.material = mat;
  m.setEnabled(false);
  return m;
}

export function loadBuildingTemplates(scene: Scene): BuildingTemplates {
  return {
    corner: makeCornerTemplate(scene),
    roof: makeRoofTemplate(scene),
  };
}

/**
 * Assemble a square cottage at `position`. 4 rotated corner instances +
 * 1 roof instance under a single TransformNode parent. Metadata is
 * attached to the root and every child instance so hover/click ray-picks
 * resolve to the cluster even if they hit a corner or the roof.
 */
export function placeCottage(
  scene: Scene,
  templates: BuildingTemplates,
  position: { x: number; z: number },
  name: string,
  metadata: CottageMetadata,
): TransformNode {
  const root = new TransformNode(`cottage-${name}`, scene);
  root.position = new Vector3(position.x, 0, position.z);
  (root as unknown as { metadata: CottageMetadata }).metadata = metadata;

  for (let i = 0; i < 4; i += 1) {
    const inst = templates.corner.createInstance(`cottage-${name}-corner-${i}`);
    inst.parent = root;
    inst.rotation = new Vector3(0, (i * Math.PI) / 2, 0);
    (inst as unknown as { metadata: CottageMetadata }).metadata = metadata;
  }
  const roofInst = templates.roof.createInstance(`cottage-${name}-roof`);
  roofInst.parent = root;
  roofInst.position = new Vector3(0, WALL_HEIGHT, 0);
  (roofInst as unknown as { metadata: CottageMetadata }).metadata = metadata;
  return root;
}
