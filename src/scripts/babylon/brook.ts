import type { Scene } from '@babylonjs/core/scene';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { latLngToScene } from './projection';

const WIDTH = 0.35;

/**
 * Build the brook as a constant-width ribbon mesh along brook.json and
 * apply a hand-rolled UV-scroll water shader so the surface appears to
 * flow. Shader is registered once at module load via Effect.ShadersStore.
 */
export function buildBrook(scene: Scene, engine: Engine, polyline: [number, number][]): void {
  if (polyline.length < 2) return;

  // Register shaders (idempotent — Effect.ShadersStore is a plain object)
  Effect.ShadersStore.brookVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
}`;

  Effect.ShadersStore.brookFragmentShader = `
precision highp float;
varying vec2 vUV;
uniform float time;
void main(void) {
  vec2 uv = vUV;
  uv.y += time * 0.5;
  float w = sin(uv.y * 12.0) * 0.5 + 0.5;
  float s = sin(uv.x * 18.0 + time * 3.0) * 0.15 + 0.85;
  vec3 deep  = vec3(0.12, 0.22, 0.36);
  vec3 light = vec3(0.45, 0.62, 0.78);
  vec3 col = mix(deep, light, w * s);
  gl_FragColor = vec4(col, 0.92);
}`;

  // Build offset rails perpendicular to each segment for a constant-width ribbon.
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  for (let i = 0; i < polyline.length; i += 1) {
    const here = latLngToScene(polyline[i][0], polyline[i][1]);
    const next = polyline[i + 1] ?? polyline[i - 1];
    const there = latLngToScene(next[0], next[1]);
    const dx = there.x - here.x;
    const dz = there.z - here.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    left.push(new Vector3(here.x + (nx * WIDTH) / 2, 0.015, here.z + (nz * WIDTH) / 2));
    right.push(new Vector3(here.x - (nx * WIDTH) / 2, 0.015, here.z - (nz * WIDTH) / 2));
  }
  const ribbon = MeshBuilder.CreateRibbon(
    'brook',
    { pathArray: [left, right], closeArray: false, closePath: false, sideOrientation: 2 },
    scene,
  );

  const mat = new ShaderMaterial(
    'mat-brook',
    scene,
    { vertex: 'brook', fragment: 'brook' },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'time'],
      needAlphaBlending: true,
    },
  );
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    t += engine.getDeltaTime() / 1000;
    mat.setFloat('time', t);
  });
  ribbon.material = mat;
}
