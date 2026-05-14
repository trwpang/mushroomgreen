import Phaser from 'phaser';
import { isoBounds, latLngToIso } from './scene/projection';

type LatLng = [number, number];

interface Cluster {
  id: number;
  centroid: LatLng;
  members: number[];
  primaryFamily: string;
  spriteKey: string;
  hasForge: boolean;
}

interface SpriteManifest {
  sprites: Array<{
    key: string;
    url: string;
    anchorX: number;
    anchorY: number;
    width: number;
    height: number;
  }>;
}

interface SceneData {
  clusters: Cluster[];
  boundary: LatLng[];
  brook: LatLng[];
  roads: { polyline: LatLng[] }[];
  byNumber: Record<string, { id: string; name: string }>;
  manifest: SpriteManifest;
  overrides?: SpriteMapOverrides;
}

interface SpriteMapOverrides {
  clusterDefaults?: Record<string, string>;
  clusters?: Record<string, { sprite?: string; scale?: number; offsetX?: number; offsetY?: number }>;
  water?: { mode?: 'drawn' | 'sprites' | 'combo' | 'authored'; sprites?: string[] };
}

interface ClusterSpriteChoice {
  key: string;
  meta: SpriteManifest['sprites'][number];
  scale: number;
  x: number;
  y: number;
}

const EMPTY_DATA: SceneData = {
  clusters: [],
  boundary: [],
  brook: [],
  roads: [],
  byNumber: {},
  manifest: { sprites: [] },
};

const FALLBACK_SPRITE_FOR_CLUSTER: Record<string, string> = {
  forge: '02-forge-v2-gi2',
  'cottage-small': '16-worn-yellow-cottage-imagegen',
  'cottage-master': '16-worn-family-cluster-imagegen',
  'cottage-terrace': '16-worn-redbrick-terrace-imagegen',
  'cottage-lshape': '16-worn-lshape-workshop-imagegen',
  'cottage-large': '16-worn-family-cluster-imagegen',
};

function readSceneData(): SceneData {
  const el = document.getElementById('sprite-map-data');
  if (!el?.textContent) return EMPTY_DATA;
  return JSON.parse(el.textContent) as SceneData;
}

function drawPolyline(
  graphics: Phaser.GameObjects.Graphics,
  points: LatLng[],
  color: number,
  alpha: number,
  width: number,
): void {
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

function toVectors(points: LatLng[]): Phaser.Math.Vector2[] {
  return points.map(([lat, lng]) => {
    const p = latLngToIso(lat, lng);
    return new Phaser.Math.Vector2(p.x, p.y);
  });
}

function popupCluster(popup: HTMLElement, cluster: Cluster, data: SceneData, x: number, y: number): void {
  popup.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = `${cluster.members.length} households`;
  popup.appendChild(heading);
  const ul = document.createElement('ul');
  for (const n of cluster.members) {
    const li = document.createElement('li');
    const entry = data.byNumber[String(n)];
    if (entry) {
      const a = document.createElement('a');
      a.href = `/households/${entry.id}/`;
      a.textContent = entry.name;
      li.appendChild(a);
    } else {
      li.textContent = `Household ${n}`;
    }
    ul.appendChild(li);
  }
  popup.appendChild(ul);
  popup.hidden = false;
  popup.style.left = `${Math.min(x, window.innerWidth - 340)}px`;
  popup.style.top = `${Math.min(y, window.innerHeight - 300)}px`;
}

class SpriteMapScene extends Phaser.Scene {
  private dataModel: SceneData = EMPTY_DATA;
  private manifest = new Map<string, SpriteManifest['sprites'][number]>();
  private dragStart?: { x: number; y: number };
  private cameraStart?: { x: number; y: number };
  private shimmer?: Phaser.GameObjects.Graphics;
  private shimmerTime = 0;

  constructor() {
    super('SpriteMapScene');
  }

  init(data: { sceneData: SceneData }): void {
    this.dataModel = data.sceneData;
    this.manifest = new Map(this.dataModel.manifest.sprites.map((sprite) => [sprite.key, sprite]));
  }

  preload(): void {
    for (const sprite of this.dataModel.manifest.sprites) {
      this.load.image(`gen-${sprite.key}`, sprite.url);
    }
  }

  create(): void {
    const bounds = this.dataModel.boundary.length > 0
      ? isoBounds(this.dataModel.boundary)
      : { minX: -700, maxX: 700, minY: -500, maxY: 500 };
    const pad = 760;
    this.cameras.main.setBounds(
      bounds.minX - pad,
      bounds.minY - pad,
      bounds.maxX - bounds.minX + pad * 2,
      bounds.maxY - bounds.minY + pad * 2,
    );

    this.drawGround(bounds, pad);
    this.drawWater();
    this.drawRoads();
    this.placeClusters();
    this.frameClusters(bounds);
    this.setupCameraControls();
    (window as unknown as { __spriteMapSpike?: Phaser.Game }).__spriteMapSpike = this.game;
  }

  update(_time: number, delta: number): void {
    this.shimmerTime += delta;
    if (!this.shimmer) return;
    this.shimmer.clear();
    for (let i = 0; i < this.dataModel.brook.length - 1; i += 4) {
      const pulse = 0.16 + Math.sin(this.shimmerTime * 0.0022 + i) * 0.07;
      drawPolyline(this.shimmer, [this.dataModel.brook[i], this.dataModel.brook[i + 1]], 0xffffff, pulse, 4);
    }
  }

  private drawGround(bounds: { minX: number; maxX: number; minY: number; maxY: number }, pad: number): void {
    const bg = this.add.graphics().setDepth(-1000);
    bg.fillGradientStyle(0xcadfd8, 0xcadfd8, 0xf5ead1, 0xf5ead1, 1);
    bg.fillRect(bounds.minX - pad, bounds.minY - pad, bounds.maxX - bounds.minX + pad * 2, bounds.maxY - bounds.minY + pad * 2);

    const g = this.add.graphics().setDepth(-240);
    g.fillStyle(0x9fbb69, 1);
    g.lineStyle(4, 0x6e8c4a, 0.18);
    const boundary = toVectors(this.dataModel.boundary);
    g.fillPoints(boundary, true);
    g.strokePoints(boundary, true, true);
  }

  private drawWater(): void {
    const mode = this.dataModel.overrides?.water?.mode ?? 'sprites';
    if (mode === 'drawn' || mode === 'combo') {
      const water = this.add.graphics().setDepth(-190);
      drawPolyline(water, this.dataModel.brook, 0x7aa9c8, 0.32, 34);
      drawPolyline(water, this.dataModel.brook, 0x3f82ae, 0.86, 17);
      drawPolyline(water, this.dataModel.brook, 0xb9e8ef, 0.7, 5);
      this.shimmer = this.add.graphics().setDepth(-184);
    }

    const streamKeys = this.dataModel.overrides?.water?.sprites ?? [
      '15-blue-stream-straight-imagegen',
      '15-blue-stream-curve-imagegen',
      '15-blue-water-ripple-imagegen',
      '15-blue-bridge-imagegen',
    ];
    if (mode === 'drawn') return;

    for (let index = 4; index < this.dataModel.brook.length - 1; index += 4) {
      const point = this.dataModel.brook[index];
      const next = this.dataModel.brook[Math.min(index + 1, this.dataModel.brook.length - 1)];
      const key = index % 12 === 0 ? streamKeys[1] : streamKeys[0];
      const meta = this.manifest.get(key);
      if (!point || !next || !meta) continue;
      const p = latLngToIso(point[0], point[1]);
      const n = latLngToIso(next[0], next[1]);
      const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(p.x, p.y, n.x, n.y));
      const image = this.add.image(p.x, p.y, `gen-${key}`);
      image.setOrigin(meta.anchorX, meta.anchorY);
      image.setScale(0.18);
      image.setAngle(angle);
      image.setDepth(p.y - 10);
      image.setAlpha(0.94);
    }

    const accents: Array<{ index: number; key: string; scale: number; angle: number; alpha?: number }> = [
      { index: 19, key: streamKeys[3], scale: 0.24, angle: -4 },
      { index: 13, key: streamKeys[2], scale: 0.13, angle: 0, alpha: 0.76 },
      { index: 27, key: streamKeys[2], scale: 0.13, angle: 0, alpha: 0.76 },
      { index: 39, key: streamKeys[2], scale: 0.13, angle: 0, alpha: 0.76 },
    ];
    for (const item of accents) {
      const point = this.dataModel.brook[item.index];
      const meta = this.manifest.get(item.key);
      if (!point || !meta) continue;
      const p = latLngToIso(point[0], point[1]);
      const image = this.add.image(p.x, p.y, `gen-${item.key}`);
      image.setOrigin(meta.anchorX, meta.anchorY);
      image.setScale(item.scale);
      image.setAngle(item.angle);
      image.setDepth(p.y - 5);
      image.setAlpha(item.alpha ?? 1);
    }
  }

  private drawRoads(): void {
    const roads = this.add.graphics().setDepth(-120);
    for (const road of this.dataModel.roads) {
      drawPolyline(roads, road.polyline, 0x755a3c, 0.42, 18);
      drawPolyline(roads, road.polyline, 0xc59c5b, 0.92, 10);
      drawPolyline(roads, road.polyline, 0xf2dca0, 0.82, 3.5);
    }
  }

  private placeClusters(): void {
    const tooltip = document.getElementById('sprite-map-tooltip');
    const popup = document.getElementById('sprite-map-popup');
    const sorted = [...this.dataModel.clusters]
      .map((cluster) => ({ cluster, iso: latLngToIso(cluster.centroid[0], cluster.centroid[1]) }))
      .sort((a, b) => a.iso.y - b.iso.y);

    for (const { cluster, iso } of sorted) {
      const choice = this.resolveClusterSprite(cluster, iso);
      if (!choice) continue;
      const { key, meta, scale, x, y } = choice;
      const shadow = this.add.ellipse(x, y + 22, meta.width * scale * 0.7, 34, 0x3f4c28, 0.18);
      shadow.setDepth(iso.y - 1);
      const image = this.add.image(x, y, `gen-${key}`);
      image.setOrigin(meta.anchorX, meta.anchorY);
      image.setScale(scale);
      image.setDepth(iso.y + 100);
      image.setInteractive({ useHandCursor: true, pixelPerfect: true });
      image.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        image.setTint(0xfff4cc);
        if (!tooltip) return;
        tooltip.textContent = cluster.members
          .map((n) => this.dataModel.byNumber[String(n)]?.name ?? `Household ${n}`)
          .join('\n');
        tooltip.hidden = false;
        tooltip.style.left = `${pointer.event.clientX + 14}px`;
        tooltip.style.top = `${pointer.event.clientY + 14}px`;
      });
      image.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!tooltip) return;
        tooltip.style.left = `${pointer.event.clientX + 14}px`;
        tooltip.style.top = `${pointer.event.clientY + 14}px`;
      });
      image.on('pointerout', () => {
        image.clearTint();
        if (tooltip) tooltip.hidden = true;
      });
      image.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
        if (cluster.members.length === 1) {
          const entry = this.dataModel.byNumber[String(cluster.members[0])];
          if (entry) window.location.href = `/households/${entry.id}/`;
        } else if (popup) {
          popupCluster(popup, cluster, this.dataModel, pointer.event.clientX, pointer.event.clientY);
        }
      });
    }

    document.addEventListener('mousedown', (event) => {
      if (!popup || popup.hidden) return;
      if (event.target instanceof Node && !popup.contains(event.target)) popup.hidden = true;
    }, true);
  }

  private frameClusters(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const visualBounds = this.getSpriteVisualBounds();
    const frame = visualBounds ?? bounds;
    const width = Math.max(1650, frame.maxX - frame.minX);
    const height = Math.max(1150, frame.maxY - frame.minY);
    const zoom = Math.min(this.scale.width / width, this.scale.height / height);
    const camera = this.cameras.main;
    camera.setZoom(Phaser.Math.Clamp(zoom, 0.35, 1.45));
    const centerX = (frame.minX + frame.maxX) / 2 + 250;
    const centerY = (frame.minY + frame.maxY) / 2 + 560;
    camera.scrollX = centerX - this.scale.width / (2 * camera.zoom);
    camera.scrollY = centerY - this.scale.height / (2 * camera.zoom);
  }

  private resolveClusterSprite(cluster: Cluster, iso: { x: number; y: number }): ClusterSpriteChoice | undefined {
    const clusterOverride = this.dataModel.overrides?.clusters?.[String(cluster.id)];
    const key = clusterOverride?.sprite
      ?? this.dataModel.overrides?.clusterDefaults?.[cluster.spriteKey]
      ?? FALLBACK_SPRITE_FOR_CLUSTER[cluster.spriteKey]
      ?? '16-worn-yellow-cottage-imagegen';
    const meta = this.manifest.get(key);
    if (!meta) return undefined;
    const scale = clusterOverride?.scale ?? (cluster.members.length >= 7 ? 0.34 : cluster.members.length >= 4 ? 0.3 : 0.26);
    return {
      key,
      meta,
      scale,
      x: iso.x + (clusterOverride?.offsetX ?? 0),
      y: iso.y + (clusterOverride?.offsetY ?? 0),
    };
  }

  private getSpriteVisualBounds(): { minX: number; maxX: number; minY: number; maxY: number } | undefined {
    const boxes = this.dataModel.clusters
      .map((cluster) => this.resolveClusterSprite(cluster, latLngToIso(cluster.centroid[0], cluster.centroid[1])))
      .filter((choice): choice is ClusterSpriteChoice => Boolean(choice))
      .map((choice) => ({
        minX: choice.x - choice.meta.width * choice.scale * choice.meta.anchorX,
        maxX: choice.x + choice.meta.width * choice.scale * (1 - choice.meta.anchorX),
        minY: choice.y - choice.meta.height * choice.scale * choice.meta.anchorY,
        maxY: choice.y + choice.meta.height * choice.scale * (1 - choice.meta.anchorY) + 60,
      }));
    if (boxes.length === 0) return undefined;
    return boxes.reduce((bounds, box) => ({
      minX: Math.min(bounds.minX, box.minX),
      maxX: Math.max(bounds.maxX, box.maxX),
      minY: Math.min(bounds.minY, box.minY),
      maxY: Math.max(bounds.maxY, box.maxY),
    }), boxes[0]);
  }

  private setupCameraControls(): void {
    this.game.canvas.style.touchAction = 'none';
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      const camera = this.cameras.main;
      const pointer = this.input.activePointer;
      const worldX = camera.scrollX + pointer.x / camera.zoom;
      const worldY = camera.scrollY + pointer.y / camera.zoom;
      const nextZoom = Phaser.Math.Clamp(camera.zoom - dy * 0.001, 0.3, 2.2);
      camera.setZoom(nextZoom);
      camera.scrollX = worldX - pointer.x / nextZoom;
      camera.scrollY = worldY - pointer.y / nextZoom;
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) return;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.cameraStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || !this.cameraStart) return;
      const camera = this.cameras.main;
      camera.scrollX = this.cameraStart.x - (pointer.x - this.dragStart.x) / camera.zoom;
      camera.scrollY = this.cameraStart.y - (pointer.y - this.dragStart.y) / camera.zoom;
    });
    this.input.on('pointerup', () => {
      this.dragStart = undefined;
      this.cameraStart = undefined;
    });
  }
}

const stage = document.getElementById('sprite-map-stage');
if (stage) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'sprite-map-stage',
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    antialias: true,
    scene: [SpriteMapScene],
  });
  game.scene.start('SpriteMapScene', { sceneData: readSceneData() });
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
}
