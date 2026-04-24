import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import '@babylonjs/core/Meshes/instancedMesh';

const WALL_HALF = 1.0;
const WALL_H = 1.5;
const ROOF_APEX = WALL_H + 1.2;

export interface PropTemplates {
  chimney: Mesh;
  door: Mesh;
  windowPane: Mesh;
}

function makeChimneyTemplate(scene: Scene): Mesh {
  const m = MeshBuilder.CreateBox('prop-chimney-template', { width: 0.3, height: 0.5, depth: 0.3 }, scene);
  const mat = new StandardMaterial('mat-chimney', scene);
  mat.diffuseColor = new Color3(0.55, 0.30, 0.22); // same brick family as cottage
  mat.specularColor = new Color3(0.03, 0.02, 0.02);
  m.material = mat;
  m.setEnabled(false);
  return m;
}

function makeDoorTemplate(scene: Scene): Mesh {
  const m = MeshBuilder.CreateBox('prop-door-template', { width: 0.4, height: 0.8, depth: 0.02 }, scene);
  const mat = new StandardMaterial('mat-door', scene);
  mat.diffuseColor = new Color3(0.23, 0.16, 0.10); // dark weathered wood
  mat.specularColor = new Color3(0.02, 0.01, 0.01);
  m.material = mat;
  m.setEnabled(false);
  return m;
}

function makeWindowTemplate(scene: Scene): Mesh {
  const m = MeshBuilder.CreateBox('prop-window-template', { width: 0.4, height: 0.4, depth: 0.02 }, scene);
  const mat = new StandardMaterial('mat-window', scene);
  mat.diffuseColor = new Color3(0.90, 0.85, 0.55);
  mat.emissiveColor = new Color3(0.55, 0.48, 0.28); // warm interior glow
  mat.specularColor = new Color3(0.2, 0.2, 0.2);
  m.material = mat;
  m.setEnabled(false);
  return m;
}

export function loadPropTemplates(scene: Scene): PropTemplates {
  return {
    chimney: makeChimneyTemplate(scene),
    door: makeDoorTemplate(scene),
    windowPane: makeWindowTemplate(scene),
  };
}

/**
 * Attach chimney + south-facing door + east/west windows to a cottage.
 * Offsets are in cottage-local coordinates (cottage TransformNode parents
 * these props).
 */
export function attachProps(
  scene: Scene,
  templates: PropTemplates,
  cottage: TransformNode,
  name: string,
): void {
  const rootMeta = (cottage as unknown as { metadata?: unknown }).metadata;

  const chimney = templates.chimney.createInstance(`${name}-chimney`);
  chimney.parent = cottage;
  chimney.position = new Vector3(0.5, ROOF_APEX - 0.15, 0.5);
  if (rootMeta) (chimney as unknown as { metadata?: unknown }).metadata = rootMeta;

  const door = templates.door.createInstance(`${name}-door`);
  door.parent = cottage;
  door.position = new Vector3(0, 0.4, WALL_HALF + 0.02);
  if (rootMeta) (door as unknown as { metadata?: unknown }).metadata = rootMeta;

  const winE = templates.windowPane.createInstance(`${name}-window-e`);
  winE.parent = cottage;
  winE.position = new Vector3(WALL_HALF + 0.02, 0.9, 0);
  winE.rotation = new Vector3(0, Math.PI / 2, 0);
  if (rootMeta) (winE as unknown as { metadata?: unknown }).metadata = rootMeta;

  const winW = templates.windowPane.createInstance(`${name}-window-w`);
  winW.parent = cottage;
  winW.position = new Vector3(-(WALL_HALF + 0.02), 0.9, 0);
  winW.rotation = new Vector3(0, -Math.PI / 2, 0);
  if (rootMeta) (winW as unknown as { metadata?: unknown }).metadata = rootMeta;
}

/**
 * Attach a warm-soot smoke plume to the chimney of the given cottage.
 * Uses a DynamicTexture to avoid an extra asset file.
 */
export function attachForgeSmoke(
  scene: Scene,
  cottage: TransformNode,
  name: string,
): void {
  const tex = new DynamicTexture(`smoke-tex-${name}`, 64, scene, false);
  const ctx = tex.getContext();
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  tex.update();

  const ps = new ParticleSystem(`smoke-${name}`, 120, scene);
  ps.particleTexture = tex;
  ps.emitter = cottage;
  ps.minEmitBox = new Vector3(0.5, ROOF_APEX, 0.5);
  ps.maxEmitBox = new Vector3(0.5, ROOF_APEX, 0.5);
  ps.color1 = new Color4(0.24, 0.18, 0.13, 0.85);
  ps.color2 = new Color4(0.36, 0.28, 0.21, 0.6);
  ps.colorDead = new Color4(0.48, 0.39, 0.33, 0);
  ps.minSize = 0.15;
  ps.maxSize = 0.45;
  ps.minLifeTime = 2.0;
  ps.maxLifeTime = 3.2;
  ps.emitRate = 30;
  ps.gravity = new Vector3(0, 0.1, 0);
  ps.direction1 = new Vector3(-0.15, 0.8, -0.15);
  ps.direction2 = new Vector3(0.15, 1.2, 0.15);
  ps.start();
}
