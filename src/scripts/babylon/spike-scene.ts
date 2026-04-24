import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';

const canvas = document.getElementById('babylon-root') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('babylon-spike: #babylon-root canvas missing');
}

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
// Warm green, matches the Phaser spike background colour for the side-by-side frame
scene.clearColor = new Color4(140 / 255, 180 / 255, 89 / 255, 1);

// Task 1 has no camera yet — scene.render() is a no-op without one, so we
// explicitly clear to scene.clearColor each frame. Task 2 adds the camera
// and the scene.render() call below starts doing real work.
engine.runRenderLoop(() => {
  engine.clear(scene.clearColor, true, true, true);
  scene.render();
});
window.addEventListener('resize', () => engine.resize());
