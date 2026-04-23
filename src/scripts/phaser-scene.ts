import Phaser from 'phaser';

type SceneData = {
  clusters: unknown[];
  brook: unknown[];
  roads: unknown[];
  boundary: unknown[];
};

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
  scene: {
    preload() {},
    create() {
      this.registry.set('sceneData', sceneData);
    },
    update() {},
  },
});

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
