import Phaser from 'phaser';
import VillageScene, { type SceneData } from './scene/VillageScene';

function readSceneData(): SceneData {
  const dataElement = document.getElementById('scene-data');
  if (!dataElement?.textContent) {
    return { clusters: [], brook: [], roads: [], boundary: [] };
  }

  return JSON.parse(dataElement.textContent) as SceneData;
}

const sceneData = readSceneData();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-root',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#8cb459',
  scene: [VillageScene],
});

game.scene.start('VillageScene', { sceneData });

// Dev-only: expose for browser-harness introspection.
(window as unknown as { __phaserGame: Phaser.Game }).__phaserGame = game;

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
