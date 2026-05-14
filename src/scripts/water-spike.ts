import Phaser from 'phaser';
import { isoBounds, latLngToIso } from './scene/projection';

type LatLng = [number, number];

interface SpriteManifest {
  sprites: Array<{ key: string; url: string; anchorX: number; anchorY: number }>;
}

interface WaterData {
  brook: LatLng[];
  boundary: LatLng[];
  manifest: SpriteManifest;
}

const EMPTY_DATA: WaterData = { brook: [], boundary: [], manifest: { sprites: [] } };

function readData(): WaterData {
  const el = document.getElementById('water-data');
  if (!el?.textContent) return EMPTY_DATA;
  return JSON.parse(el.textContent) as WaterData;
}

function drawPolyline(
  graphics: Phaser.GameObjects.Graphics,
  points: Phaser.Math.Vector2[],
  color: number,
  alpha: number,
  width: number,
): void {
  if (points.length < 2) return;
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.strokePath();
}

class WaterScene extends Phaser.Scene {
  private dataModel: WaterData = EMPTY_DATA;
  private manifest = new Map<string, SpriteManifest['sprites'][number]>();
  private shimmerLayers: Array<{ graphics: Phaser.GameObjects.Graphics; points: Phaser.Math.Vector2[] }> = [];
  private tick = 0;

  constructor() {
    super('WaterScene');
  }

  init(data: { sceneData: WaterData }): void {
    this.dataModel = data.sceneData;
    this.manifest = new Map(this.dataModel.manifest.sprites.map((sprite) => [sprite.key, sprite]));
  }

  preload(): void {
    for (const key of [
      '15-blue-stream-straight-imagegen',
      '15-blue-stream-curve-imagegen',
      '15-blue-water-ripple-imagegen',
      '15-blue-bridge-imagegen',
    ]) {
      const sprite = this.manifest.get(key);
      if (sprite) this.load.image(`water-${key}`, sprite.url);
    }
  }

  create(): void {
    const brookIso = this.dataModel.brook.map(([lat, lng]) => latLngToIso(lat, lng));
    const rawBounds = isoBounds(this.dataModel.boundary.length ? this.dataModel.boundary : this.dataModel.brook);
    const panels = [
      { title: 'Drawn', x: this.scale.width * 0.18, mode: 'drawn' },
      { title: 'Sprites', x: this.scale.width * 0.5, mode: 'sprites' },
      { title: 'Combo', x: this.scale.width * 0.82, mode: 'combo' },
    ] as const;

    for (const panel of panels) {
      const points = this.fitPoints(brookIso, rawBounds, panel.x, this.scale.height * 0.57);
      this.drawPanel(panel.title, panel.x);
      if (panel.mode === 'drawn' || panel.mode === 'combo') {
        const g = this.add.graphics();
        drawPolyline(g, points, 0x7aa9c8, 0.32, 34);
        drawPolyline(g, points, 0x3f82ae, 0.86, 17);
        drawPolyline(g, points, 0xb9e8ef, 0.7, 5);
        const shimmer = this.add.graphics();
        this.shimmerLayers.push({ graphics: shimmer, points });
      }
      if (panel.mode === 'sprites' || panel.mode === 'combo') {
        this.placeWaterSprites(points, panel.mode === 'combo' ? 0.72 : 1);
      }
    }
  }

  update(_time: number, delta: number): void {
    this.tick += delta;
    for (const layer of this.shimmerLayers) {
      layer.graphics.clear();
      for (let i = 0; i < layer.points.length - 1; i += 5) {
        const alpha = 0.16 + Math.sin(this.tick * 0.002 + i) * 0.08;
        drawPolyline(layer.graphics, [layer.points[i], layer.points[i + 1]], 0xffffff, alpha, 4);
      }
    }
  }

  private fitPoints(
    points: Array<{ x: number; y: number }>,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    centerX: number,
    centerY: number,
  ): Phaser.Math.Vector2[] {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scale = Math.min((this.scale.width * 0.24) / width, (this.scale.height * 0.62) / height);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return points.map((point) => new Phaser.Math.Vector2(
      centerX + (point.x - cx) * scale,
      centerY + (point.y - cy) * scale,
    ));
  }

  private drawPanel(title: string, x: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x9fbb69, 0.95);
    g.fillRoundedRect(x - this.scale.width * 0.135, this.scale.height * 0.23, this.scale.width * 0.27, this.scale.height * 0.68, 8);
    g.lineStyle(1.5, 0x6f8a4b, 0.22);
    g.strokeRoundedRect(x - this.scale.width * 0.135, this.scale.height * 0.23, this.scale.width * 0.27, this.scale.height * 0.68, 8);
    this.add.text(x, this.scale.height * 0.26, title, {
      color: '#2c1810',
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
    }).setOrigin(0.5, 0);
  }

  private placeWaterSprites(points: Phaser.Math.Vector2[], alpha: number): void {
    const placements = [
      { i: 8, key: '15-blue-stream-straight-imagegen', scale: 0.2, angle: -34 },
      { i: 16, key: '15-blue-stream-curve-imagegen', scale: 0.2, angle: 14 },
      { i: 24, key: '15-blue-water-ripple-imagegen', scale: 0.15, angle: 0 },
      { i: 32, key: '15-blue-bridge-imagegen', scale: 0.2, angle: -8 },
    ];
    for (const item of placements) {
      const point = points[item.i];
      const meta = this.manifest.get(item.key);
      if (!point || !meta) continue;
      const image = this.add.image(point.x, point.y, `water-${item.key}`);
      image.setOrigin(meta.anchorX, meta.anchorY);
      image.setScale(item.scale);
      image.setAngle(item.angle);
      image.setAlpha(alpha);
    }
  }
}

const stage = document.getElementById('water-stage');
if (stage) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'water-stage',
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    antialias: true,
    scene: [WaterScene],
  });
  game.scene.start('WaterScene', { sceneData: readData() });
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
}
