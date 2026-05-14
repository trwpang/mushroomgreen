// Phaser 4 ships an ESM bundle, but the package metadata currently makes Node
// treat it awkwardly. Vite can import the bundle path directly for the browser.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Phaser from '../../node_modules/phaser4/dist/phaser.esm.js';
import { isoBounds, latLngToIso } from './scene/projection';

type LatLng = [number, number];

interface Cluster {
  id: number;
  centroid: LatLng;
  members: number[];
  spriteKey: string;
}

interface SpriteManifest {
  sprites: Array<{ key: string; url: string; anchorX: number; anchorY: number; width: number }>;
}

interface SceneData {
  clusters: Cluster[];
  boundary: LatLng[];
  roads: { polyline: LatLng[] }[];
  manifest: SpriteManifest;
}

const SPRITE_FOR_CLUSTER: Record<string, string> = {
  forge: '15-forge-imagegen',
  'cottage-small': '15-yellow-cottage-imagegen',
  'cottage-master': '15-brown-cluster-imagegen',
  'cottage-terrace': '15-dense-terrace-imagegen',
  'cottage-lshape': '11-cottage-lshape-v1-nb2pro',
  'cottage-large': '06-cottage-large-v2-gi2',
};

function readData(): SceneData {
  const el = document.getElementById('phaser4-data');
  return JSON.parse(el?.textContent ?? '{"clusters":[],"boundary":[],"roads":[],"manifest":{"sprites":[]}}') as SceneData;
}

function drawPolyline(graphics: any, points: LatLng[], color: number, alpha: number, width: number): void {
  if (points.length < 2) return;
  const first = latLngToIso(points[0][0], points[0][1]);
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(first.x, first.y);
  for (const [lat, lng] of points.slice(1)) {
    const p = latLngToIso(lat, lng);
    graphics.lineTo(p.x, p.y);
  }
  graphics.strokePath();
}

class Phaser4Scene extends Phaser.Scene {
  private dataModel!: SceneData;
  private manifest = new Map<string, SpriteManifest['sprites'][number]>();

  constructor() {
    super('Phaser4Scene');
  }

  init(data: { sceneData: SceneData }): void {
    this.dataModel = data.sceneData;
    this.manifest = new Map(this.dataModel.manifest.sprites.map((sprite) => [sprite.key, sprite]));
  }

  preload(): void {
    for (const sprite of this.dataModel.manifest.sprites) {
      this.load.image(`p4-${sprite.key}`, sprite.url);
    }
  }

  create(): void {
    const bounds = isoBounds(this.dataModel.boundary);
    const pad = 760;
    this.cameras.main.setBounds(
      bounds.minX - pad,
      bounds.minY - pad,
      bounds.maxX - bounds.minX + pad * 2,
      bounds.maxY - bounds.minY + pad * 2,
    );

    const bg = this.add.graphics().setDepth(-1000);
    bg.fillStyle(0x9fbb69, 1);
    const boundaryPoints = this.dataModel.boundary.map(([lat, lng]) => {
      const p = latLngToIso(lat, lng);
      return new Phaser.Math.Vector2(p.x, p.y);
    });
    bg.fillPoints(boundaryPoints, true);

    const roads = this.add.graphics().setDepth(-100);
    for (const road of this.dataModel.roads) {
      drawPolyline(roads, road.polyline, 0x755a3c, 0.42, 18);
      drawPolyline(roads, road.polyline, 0xc59c5b, 0.92, 10);
      drawPolyline(roads, road.polyline, 0xf2dca0, 0.82, 3.5);
    }

    for (const cluster of [...this.dataModel.clusters].sort((a, b) => {
      const ay = latLngToIso(a.centroid[0], a.centroid[1]).y;
      const by = latLngToIso(b.centroid[0], b.centroid[1]).y;
      return ay - by;
    })) {
      const key = SPRITE_FOR_CLUSTER[cluster.spriteKey] ?? '15-yellow-cottage-imagegen';
      const meta = this.manifest.get(key);
      if (!meta) continue;
      const p = latLngToIso(cluster.centroid[0], cluster.centroid[1]);
      this.add.ellipse(p.x, p.y + 22, meta.width * 0.24, 30, 0x3f4c28, 0.18).setDepth(p.y - 1);
      const image = this.add.image(p.x, p.y, `p4-${key}`);
      image.setOrigin(meta.anchorX, meta.anchorY);
      image.setScale(cluster.members.length >= 7 ? 0.34 : cluster.members.length >= 4 ? 0.3 : 0.26);
      image.setDepth(p.y + 100);
    }

    const frame = isoBounds(this.dataModel.clusters.map((cluster) => cluster.centroid));
    const width = Math.max(760, frame.maxX - frame.minX);
    const height = Math.max(520, frame.maxY - frame.minY);
    const zoom = Math.min(this.scale.width / width, this.scale.height / height);
    this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.52, 1.85));
    const centerX = (frame.minX + frame.maxX) / 2;
    const centerY = (frame.minY + frame.maxY) / 2 + 180;
    this.cameras.main.scrollX = centerX - this.scale.width / (2 * this.cameras.main.zoom);
    this.cameras.main.scrollY = centerY - this.scale.height / (2 * this.cameras.main.zoom);

    this.add.text(centerX, frame.minY - 150, `Phaser ${Phaser.VERSION}`, {
      color: '#2c1810',
      fontFamily: 'system-ui',
      fontSize: '32px',
      backgroundColor: '#fff7df',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5, 0.5).setDepth(10000);
  }
}

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'phaser4-stage',
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true,
  antialias: true,
  scene: [Phaser4Scene],
});
game.scene.start('Phaser4Scene', { sceneData: readData() });
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
(window as unknown as { __phaser4Spike?: unknown }).__phaser4Spike = game;
