import Phaser from 'phaser';
import { isoBounds, isoToMetres, latLngToIso, latLngToMetres, metresToIso } from './scene/projection';

type LatLng = [number, number];

interface Cluster {
  id: number;
  centroid: LatLng;
  members: number[];
  primaryFamily: string;
  spriteKey: string;
  hasForge: boolean;
}

interface SpriteMeta {
  key: string;
  url: string;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  category?: string;
  status?: 'accepted' | 'warning' | 'rejected';
}

interface SpriteManifest {
  sprites: SpriteMeta[];
}

interface ClusterOverride {
  sprite?: string;
  scale?: number;
  cell?: TileCoord;
  offsetX?: number;
  offsetY?: number;
  flipX?: boolean;
}

interface SpriteMapOverrides {
  description?: string;
  gridVersion?: string;
  clusterDefaults?: Record<string, string>;
  clusters?: Record<string, ClusterOverride>;
  water?: { mode?: 'drawn' | 'sprites' | 'combo' | 'authored'; sprites?: string[] };
}

interface TileCoord {
  q: number;
  r: number;
}

interface SpriteFootprintDefinition {
  cells: [number, number][];
  anchor?: [number, number];
  baseline?: 'anchor-cell' | 'front-edge' | 'centroid';
  defaultScale?: number;
  depthBias?: number;
  fillColor?: string;
  lineColor?: string;
}

interface SpriteFootprintConfig {
  clusterDefaults?: Record<string, string>;
  sprites?: Record<string, string>;
  footprints?: Record<string, SpriteFootprintDefinition>;
}

interface ClusterTilePlacements {
  description?: string;
  generatedFrom?: string;
  radiusM?: number;
  clusters?: Record<string, TileCoord>;
}

interface CameraPreset {
  minWidth: number;
  minHeight: number;
  offsetX: number;
  offsetY: number;
  minZoom: number;
  maxZoom: number;
}

interface SceneSpritePlacement {
  id: string;
  key: string;
  latLng: LatLng;
  scale: number;
  angle?: number;
  alpha?: number;
  depthOffset?: number;
  flipX?: boolean;
  motion?: 'water' | 'idle';
  tileSnap?: boolean;
  tileOffsetX?: number;
  tileOffsetY?: number;
}

interface SceneHamletInfill {
  enabled?: boolean;
  maxPerCluster?: number;
  radiusX?: number;
  radiusY?: number;
  scale?: number;
  alpha?: number;
  depthOffset?: number;
  sprites?: string[];
  forgeSprites?: string[];
}

interface SceneTileConfig {
  enabled?: boolean;
  shape?: 'diamond' | 'hex';
  width?: number;
  height?: number;
  radiusM?: number;
  alpha?: number;
  lineAlpha?: number;
  lineWidth?: number;
  colorA?: string;
  colorB?: string;
  lineColor?: string;
  snapClusters?: boolean;
  snapInfill?: boolean;
}

interface SceneLabel {
  id: string;
  text: string;
  latLng: LatLng;
  angle?: number;
}

interface SpriteSceneConfig {
  camera?: {
    desktop?: CameraPreset;
    editor?: CameraPreset;
    mobile?: CameraPreset;
  };
  water?: {
    step?: number;
    scale?: number;
    curveEvery?: number;
    depthOffset?: number;
    alpha?: number;
    accents?: Array<{ index: number; keyIndex: number; scale: number; angle?: number; alpha?: number }>;
  };
  roads?: {
    sprite?: string;
    curveSprite?: string;
    forkSprite?: string;
    step?: number;
    scale?: number;
    alpha?: number;
    drawnAlpha?: number;
    depthOffset?: number;
  };
  hamletInfill?: SceneHamletInfill;
  tiles?: SceneTileConfig;
  vegetation?: SceneSpritePlacement[];
  props?: SceneSpritePlacement[];
  labels?: SceneLabel[];
}

interface HouseholdSummary {
  id: string;
  name: string;
  family?: string;
  occupation?: string;
}

interface SceneData {
  clusters: Cluster[];
  boundary: LatLng[];
  brook: LatLng[];
  roads: { polyline: LatLng[] }[];
  byNumber: Record<string, HouseholdSummary>;
  manifest: SpriteManifest;
  clusterTilePlacements?: ClusterTilePlacements;
  footprints?: SpriteFootprintConfig;
  overrides?: SpriteMapOverrides;
  scene?: SpriteSceneConfig;
  editor?: boolean;
}

interface ClusterSpriteChoice {
  key: string;
  meta: SpriteMeta;
  scale: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  flipX: boolean;
  cell: TileCoord;
  footprint: SpriteFootprintDefinition;
  footprintId: string;
  footprintCells: TileCoord[];
  depthY: number;
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type PlaneBounds = { minXM: number; maxXM: number; minYM: number; maxYM: number };

const EMPTY_DATA: SceneData = {
  clusters: [],
  boundary: [],
  brook: [],
  roads: [],
  byNumber: {},
  manifest: { sprites: [] },
  footprints: { footprints: {} },
};

const FALLBACK_SPRITE_FOR_CLUSTER: Record<string, string> = {
  forge: '02-forge-v2-gi2',
  'cottage-small': '16-worn-yellow-cottage-imagegen',
  'cottage-master': '16-worn-family-cluster-imagegen',
  'cottage-terrace': '16-worn-redbrick-terrace-imagegen',
  'cottage-lshape': '16-worn-lshape-workshop-imagegen',
  'cottage-large': '16-worn-family-cluster-imagegen',
};
const OVERRIDE_GRID_VERSION = 'footprint-v2';

function readSceneData(): SceneData {
  const el = document.getElementById('sprite-village-data');
  if (!el?.textContent) return EMPTY_DATA;
  return JSON.parse(el.textContent) as SceneData;
}

function cloneOverrides(overrides?: SpriteMapOverrides): SpriteMapOverrides {
  const clone = JSON.parse(JSON.stringify(overrides ?? { clusters: {} })) as SpriteMapOverrides;
  clone.gridVersion = OVERRIDE_GRID_VERSION;
  return clone;
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

function planeBounds(points: LatLng[]): PlaneBounds {
  let minXM = Infinity;
  let maxXM = -Infinity;
  let minYM = Infinity;
  let maxYM = -Infinity;
  for (const [lat, lng] of points) {
    const { xM, yM } = latLngToMetres(lat, lng);
    minXM = Math.min(minXM, xM);
    maxXM = Math.max(maxXM, xM);
    minYM = Math.min(minYM, yM);
    maxYM = Math.max(maxYM, yM);
  }
  return { minXM, maxXM, minYM, maxYM };
}

function popupCluster(popup: HTMLElement, cluster: Cluster, data: SceneData, x: number, y: number): void {
  popup.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = `${cluster.members.length} household${cluster.members.length === 1 ? '' : 's'}`;
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
  popup.style.left = `${Math.min(x, window.innerWidth - 350)}px`;
  popup.style.top = `${Math.min(y, window.innerHeight - 320)}px`;
}

class SpriteVillageScene extends Phaser.Scene {
  private dataModel: SceneData = EMPTY_DATA;
  private manifest = new Map<string, SpriteMeta>();
  private overrides: SpriteMapOverrides = {};
  private dragStart?: { x: number; y: number; worldX: number; worldY: number; button: 'left' | 'aux'; moved: boolean };
  private cameraStart?: { x: number; y: number };
  private selectedClusterId?: number;
  private selectedImage?: Phaser.GameObjects.Image;
  private selectedTile?: TileCoord;
  private selectedTileGraphic?: Phaser.GameObjects.Graphics;
  private hoverTileGraphic?: Phaser.GameObjects.Graphics;
  private visibleTileKeys = new Set<string>();
  private clusterImages = new Map<number, Phaser.GameObjects.Image>();
  private clusterFootprints = new Map<number, Phaser.GameObjects.Graphics>();
  private clusterIndex = new Map<number, Cluster>();
  private editorDrag?: { clusterId: number; startX: number; startY: number; startOffsetX: number; startOffsetY: number };
  private shimmer?: Phaser.GameObjects.Graphics;
  private animatedSprites: Array<{
    image: Phaser.GameObjects.Image;
    baseX: number;
    baseY: number;
    baseScale: number;
    baseAlpha: number;
    phase: number;
    motion: 'water' | 'idle';
  }> = [];
  private shimmerTime = 0;

  constructor() {
    super('SpriteVillageScene');
  }

  init(data: { sceneData: SceneData }): void {
    this.dataModel = data.sceneData;
    this.manifest = new Map(this.dataModel.manifest.sprites.map((sprite) => [sprite.key, sprite]));
    this.overrides = cloneOverrides(this.dataModel.overrides);
    this.clusterIndex = new Map(this.dataModel.clusters.map((cluster) => [cluster.id, cluster]));
  }

  preload(): void {
    for (const sprite of this.dataModel.manifest.sprites) {
      this.load.image(`gen-${sprite.key}`, sprite.url);
    }
  }

  create(): void {
    const boundaryBounds = this.dataModel.boundary.length > 0
      ? isoBounds(this.dataModel.boundary)
      : { minX: -900, maxX: 900, minY: -650, maxY: 650 };
    const pad = 920;
    this.cameras.main.setBounds(
      boundaryBounds.minX - pad,
      boundaryBounds.minY - pad,
      boundaryBounds.maxX - boundaryBounds.minX + pad * 2,
      boundaryBounds.maxY - boundaryBounds.minY + pad * 2,
    );

    this.drawGround(boundaryBounds, pad);
    this.drawSpriteBrook();
    this.drawRoads();
    this.placeRoadSprites();
    this.placeSceneSprites(this.dataModel.scene?.props ?? []);
    this.placeSceneSprites(this.dataModel.scene?.vegetation ?? []);
    this.placeHamletInfill();
    this.placeClusters();
    this.addForgeSmoke();
    this.placeLabels();
    this.frameClusters(boundaryBounds);
    this.setupCameraControls();
    this.setupEditorControls();
    if (this.dataModel.editor && this.dataModel.clusters[0]) {
      this.selectCluster(this.dataModel.clusters[0].id);
    }

    (window as unknown as { __spriteVillageMap?: Phaser.Game }).__spriteVillageMap = this.game;
  }

  update(_time: number, delta: number): void {
    this.shimmerTime += delta;
    for (const item of this.animatedSprites) {
      const t = this.shimmerTime * 0.001 + item.phase;
      if (item.motion === 'water') {
        item.image.setY(item.baseY + Math.sin(t * 1.6) * 1.4);
        item.image.setScale(item.baseScale * (1 + Math.sin(t * 1.15) * 0.018));
        item.image.setAlpha(Phaser.Math.Clamp(item.baseAlpha + Math.sin(t * 1.9) * 0.045, 0.55, 1));
      } else {
        item.image.setY(item.baseY + Math.sin(t * 0.8) * 0.7);
      }
    }
    if (!this.shimmer) return;
    this.shimmer.clear();
    for (let i = 0; i < this.dataModel.brook.length - 1; i += 5) {
      const pulse = 0.12 + Math.sin(this.shimmerTime * 0.002 + i) * 0.06;
      drawPolyline(this.shimmer, [this.dataModel.brook[i], this.dataModel.brook[i + 1]], 0xffffff, pulse, 3);
    }
  }

  private drawGround(bounds: Bounds, pad: number): void {
    const bg = this.add.graphics().setDepth(-1000);
    bg.fillGradientStyle(0xc9dfd8, 0xc9dfd8, 0xf5e8c8, 0xf5e8c8, 1);
    bg.fillRect(bounds.minX - pad, bounds.minY - pad, bounds.maxX - bounds.minX + pad * 2, bounds.maxY - bounds.minY + pad * 2);

    const ground = this.add.graphics().setDepth(-260);
    ground.fillStyle(0x9dbb68, 1);
    ground.lineStyle(4, 0x6f8d49, 0.18);
    const boundary = toVectors(this.dataModel.boundary);
    if (boundary.length > 2) {
      ground.fillPoints(boundary, true);
      ground.strokePoints(boundary, true, true);
    }

    this.drawFloorTiles(bounds);
  }

  private drawFloorTiles(bounds: Bounds): void {
    const config = this.dataModel.scene?.tiles;
    if (config?.enabled === false) return;

    const tileWidth = config?.width ?? 148;
    const tileHeight = config?.height ?? 74;
    const colorA = this.parseColor(config?.colorA, 0xa7bf72);
    const colorB = this.parseColor(config?.colorB, 0x9fb66b);
    const lineColor = this.parseColor(config?.lineColor, 0x7f9954);
    const alpha = config?.alpha ?? 0.18;
    const lineAlpha = config?.lineAlpha ?? 0.055;
    const lineWidth = config?.lineWidth ?? 1;
    const boundary = toVectors(this.dataModel.boundary);
    const polygon = boundary.length > 2 ? new Phaser.Geom.Polygon(boundary) : undefined;
    const graphics = this.add.graphics().setDepth(-248);

    if (config?.shape === 'hex') {
      this.drawHexTiles(graphics, polygon, {
        width: tileWidth,
        height: tileHeight,
        radiusM: this.tileRadiusM(),
        colorA,
        colorB,
        lineColor,
        alpha,
        lineAlpha,
        lineWidth,
      });
      return;
    }

    const span = Math.ceil(((bounds.maxX - bounds.minX) / tileWidth) + ((bounds.maxY - bounds.minY) / tileHeight)) + 8;

    for (let row = -span; row <= span; row += 1) {
      for (let col = -span; col <= span; col += 1) {
        const x = (col - row) * tileWidth * 0.5;
        const y = (col + row) * tileHeight * 0.5;
        if (x < bounds.minX - tileWidth || x > bounds.maxX + tileWidth) continue;
        if (y < bounds.minY - tileHeight || y > bounds.maxY + tileHeight) continue;
        const points = [
          new Phaser.Math.Vector2(x, y - tileHeight * 0.5),
          new Phaser.Math.Vector2(x + tileWidth * 0.5, y),
          new Phaser.Math.Vector2(x, y + tileHeight * 0.5),
          new Phaser.Math.Vector2(x - tileWidth * 0.5, y),
        ];
        if (polygon && !points.every((point) => Phaser.Geom.Polygon.Contains(polygon, point.x, point.y))) continue;
        this.rememberVisibleTile({ q: col, r: row });
        graphics.fillStyle((row + col) % 2 === 0 ? colorA : colorB, alpha);
        graphics.fillPoints(points, true);
        graphics.lineStyle(lineWidth, lineColor, lineAlpha);
        graphics.strokePoints(points, true, true);
      }
    }
  }

  private drawHexTiles(
    graphics: Phaser.GameObjects.Graphics,
    polygon: Phaser.Geom.Polygon | undefined,
    tile: {
      width: number;
      height: number;
      radiusM: number;
      colorA: number;
      colorB: number;
      lineColor: number;
      alpha: number;
      lineAlpha: number;
      lineWidth: number;
    },
  ): void {
    const bounds = planeBounds(this.dataModel.boundary);
    const rowHeightM = Math.sqrt(3) * tile.radiusM;
    const colWidthM = tile.radiusM * 1.5;
    const minCol = Math.floor((bounds.minXM - tile.radiusM * 2) / colWidthM) - 2;
    const maxCol = Math.ceil((bounds.maxXM + tile.radiusM * 2) / colWidthM) + 2;
    const minRow = Math.floor((bounds.minYM - rowHeightM * 2) / rowHeightM) - 2;
    const maxRow = Math.ceil((bounds.maxYM + rowHeightM * 2) / rowHeightM) + 2;

    for (let col = minCol; col <= maxCol; col += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        const center = this.planeHexCenter(col, row);
        const points = this.projectedPlaneHex(center.xM, center.yM);
        if (polygon && !points.every((point) => Phaser.Geom.Polygon.Contains(polygon, point.x, point.y))) continue;
        this.rememberVisibleTile({ q: col, r: row });
        graphics.fillStyle((row + col) % 2 === 0 ? tile.colorA : tile.colorB, tile.alpha);
        graphics.fillPoints(points, true);
        graphics.lineStyle(tile.lineWidth, tile.lineColor, tile.lineAlpha);
        graphics.strokePoints(points, true, true);
      }
    }
  }

  private drawSpriteBrook(): void {
    const mode = this.overrides.water?.mode ?? 'sprites';
    if (mode === 'authored') return;
    if (mode === 'drawn' || mode === 'combo') {
      const water = this.add.graphics().setDepth(-210);
      drawPolyline(water, this.dataModel.brook, 0x7aa9c8, 0.22, 34);
      drawPolyline(water, this.dataModel.brook, 0x3f82ae, 0.52, 15);
      drawPolyline(water, this.dataModel.brook, 0xb9e8ef, 0.45, 4);
      this.shimmer = this.add.graphics().setDepth(-205);
    }
    if (mode === 'drawn') return;

    const streamKeys = this.overrides.water?.sprites ?? [
      '15-blue-stream-straight-imagegen',
      '15-blue-stream-curve-imagegen',
      '15-blue-water-ripple-imagegen',
      '15-blue-bridge-imagegen',
    ];
    const waterConfig = this.dataModel.scene?.water ?? {};
    const step = waterConfig.step ?? 3;
    const curveEvery = waterConfig.curveEvery ?? 9;
    const scale = waterConfig.scale ?? 0.17;
    const alpha = waterConfig.alpha ?? 0.94;
    const depthOffset = waterConfig.depthOffset ?? -18;
    for (let index = step; index < this.dataModel.brook.length - 1; index += step) {
      const point = this.dataModel.brook[index];
      const next = this.dataModel.brook[Math.min(index + 1, this.dataModel.brook.length - 1)];
      const key = index % curveEvery === 0 ? streamKeys[1] : streamKeys[0];
      const meta = this.manifest.get(key);
      if (!point || !next || !meta) continue;
      const p = latLngToIso(point[0], point[1]);
      const n = latLngToIso(next[0], next[1]);
      const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(p.x, p.y, n.x, n.y));
      const image = this.add.image(p.x, p.y, `gen-${key}`)
        .setOrigin(meta.anchorX, meta.anchorY)
        .setScale(scale)
        .setAngle(angle)
        .setDepth(p.y + depthOffset)
        .setAlpha(alpha);
      this.registerAnimatedSprite(image, scale, alpha, 'water', index);
    }

    (waterConfig.accents ?? []).forEach((item) => {
      const point = this.dataModel.brook[item.index];
      const key = streamKeys[item.keyIndex];
      const meta = this.manifest.get(key);
      if (!point || !meta) return;
      const p = latLngToIso(point[0], point[1]);
      const image = this.add.image(p.x, p.y, `gen-${key}`)
        .setOrigin(meta.anchorX, meta.anchorY)
        .setScale(item.scale)
        .setAngle(item.angle ?? 0)
        .setDepth(p.y - 8)
        .setAlpha(item.alpha ?? 1);
      this.registerAnimatedSprite(image, item.scale, item.alpha ?? 1, 'water', item.index);
    });
  }

  private drawRoads(): void {
    const drawnAlpha = this.dataModel.scene?.roads?.drawnAlpha ?? 1;
    if (drawnAlpha <= 0) return;
    const roads = this.add.graphics().setDepth(-135);
    for (const road of this.dataModel.roads) {
      drawPolyline(roads, road.polyline, 0x6c4e32, 0.38 * drawnAlpha, 18);
      drawPolyline(roads, road.polyline, 0xb98c50, 0.88 * drawnAlpha, 10);
      drawPolyline(roads, road.polyline, 0xe7c783, 0.68 * drawnAlpha, 3.5);
    }
  }

  private parseColor(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    return Number.parseInt(value.replace(/^#/, ''), 16);
  }

  private tileSize(): { width: number; height: number } {
    const config = this.dataModel.scene?.tiles;
    return {
      width: config?.width ?? 148,
      height: config?.height ?? 74,
    };
  }

  private tileRadiusM(): number {
    const config = this.dataModel.scene?.tiles;
    return config?.radiusM ?? (config?.width ?? 148) / 16;
  }

  private tileShape(): 'diamond' | 'hex' {
    return this.dataModel.scene?.tiles?.shape ?? 'diamond';
  }

  private planeHexCenter(col: number, row: number): { xM: number; yM: number } {
    const radiusM = this.tileRadiusM();
    return {
      xM: col * radiusM * 1.5,
      yM: (row + ((col & 1) !== 0 ? 0.5 : 0)) * Math.sqrt(3) * radiusM,
    };
  }

  private projectedPlaneHex(xM: number, yM: number): Phaser.Math.Vector2[] {
    const radiusM = this.tileRadiusM();
    return [0, 60, 120, 180, 240, 300].map((degrees) => {
      const angle = Phaser.Math.DegToRad(degrees);
      const point = metresToIso(xM + Math.cos(angle) * radiusM, yM + Math.sin(angle) * radiusM);
      return new Phaser.Math.Vector2(point.x, point.y);
    });
  }

  private tileGridCenter(col: number, row: number): { x: number; y: number } {
    const { width, height } = this.tileSize();
    if (this.tileShape() === 'hex') {
      const center = this.planeHexCenter(col, row);
      return metresToIso(center.xM, center.yM);
    }
    return {
      x: (col - row) * width * 0.5,
      y: (col + row) * height * 0.5,
    };
  }

  private tileCenterForCoord(coord: TileCoord): { x: number; y: number } {
    return this.tileGridCenter(coord.q, coord.r);
  }

  private tileKey(coord: TileCoord): string {
    return `${coord.q},${coord.r}`;
  }

  private rememberVisibleTile(coord: TileCoord): void {
    this.visibleTileKeys.add(this.tileKey(coord));
  }

  private isVisibleTile(coord: TileCoord): boolean {
    return this.visibleTileKeys.has(this.tileKey(coord));
  }

  private nearestTileCoord(x: number, y: number): TileCoord {
    const { width, height } = this.tileSize();
    if (this.tileShape() === 'hex') {
      const radiusM = this.tileRadiusM();
      const rowHeightM = Math.sqrt(3) * radiusM;
      const plane = isoToMetres(x, y);
      const approxQ = Math.round(plane.xM / (radiusM * 1.5));
      const approxR = Math.round((plane.yM - ((approxQ & 1) !== 0 ? rowHeightM * 0.5 : 0)) / rowHeightM);
      let bestCoord = { q: approxQ, r: approxR };
      const bestPlane = this.planeHexCenter(bestCoord.q, bestCoord.r);
      let bestDistance = Phaser.Math.Distance.Squared(plane.xM, plane.yM, bestPlane.xM, bestPlane.yM);
      for (let q = approxQ - 2; q <= approxQ + 2; q += 1) {
        for (let r = approxR - 2; r <= approxR + 2; r += 1) {
          const candidate = this.planeHexCenter(q, r);
          const distance = Phaser.Math.Distance.Squared(plane.xM, plane.yM, candidate.xM, candidate.yM);
          if (distance < bestDistance) {
            bestCoord = { q, r };
            bestDistance = distance;
          }
        }
      }
      return bestCoord;
    }
    return {
      q: Math.round((y / height) + (x / width)),
      r: Math.round((y / height) - (x / width)),
    };
  }

  private nearestTileCenter(x: number, y: number): { x: number; y: number } {
    return this.tileCenterForCoord(this.nearestTileCoord(x, y));
  }

  private defaultFootprint(): SpriteFootprintDefinition {
    return {
      cells: [[0, 0]],
      anchor: [0, 0],
      baseline: 'anchor-cell',
      defaultScale: 0.24,
      depthBias: 120,
    };
  }

  private footprintIdFor(cluster: Cluster, spriteKey: string): string {
    return this.dataModel.footprints?.sprites?.[spriteKey]
      ?? this.dataModel.footprints?.clusterDefaults?.[cluster.spriteKey]
      ?? 'cottage-1';
  }

  private footprintFor(cluster: Cluster, spriteKey: string): { id: string; definition: SpriteFootprintDefinition } {
    const id = this.footprintIdFor(cluster, spriteKey);
    return {
      id,
      definition: this.dataModel.footprints?.footprints?.[id] ?? this.defaultFootprint(),
    };
  }

  private clusterCell(cluster: Cluster, iso: { x: number; y: number }): TileCoord {
    return this.getClusterOverride(cluster.id).cell
      ?? this.dataModel.clusterTilePlacements?.clusters?.[String(cluster.id)]
      ?? this.nearestTileCoord(iso.x, iso.y);
  }

  private footprintCells(anchor: TileCoord, footprint: SpriteFootprintDefinition): TileCoord[] {
    const [anchorQ, anchorR] = footprint.anchor ?? [0, 0];
    return footprint.cells.map(([q, r]) => ({
      q: anchor.q + q - anchorQ,
      r: anchor.r + r - anchorR,
    }));
  }

  private footprintAnchorPoint(anchor: TileCoord, footprint: SpriteFootprintDefinition): { x: number; y: number } {
    const cells = this.footprintCells(anchor, footprint);
    if (footprint.baseline === 'centroid') {
      const points = cells.map((cell) => this.tileCenterForCoord(cell));
      return points.reduce((sum, point) => ({
        x: sum.x + point.x / points.length,
        y: sum.y + point.y / points.length,
      }), { x: 0, y: 0 });
    }
    if (footprint.baseline === 'front-edge') {
      const points = cells.map((cell) => this.tileCenterForCoord(cell));
      const frontY = Math.max(...points.map((point) => point.y));
      const frontPoints = points.filter((point) => Math.abs(point.y - frontY) < 0.1);
      return {
        x: frontPoints.reduce((sum, point) => sum + point.x, 0) / frontPoints.length,
        y: frontY,
      };
    }
    return this.tileCenterForCoord(anchor);
  }

  private footprintDepthY(cells: TileCoord[]): number {
    return Math.max(...cells.map((cell) => this.tileCenterForCoord(cell).y));
  }

  private footprintPolygonForCell(cell: TileCoord): Phaser.Math.Vector2[] {
    if (this.tileShape() === 'hex') {
      const center = this.planeHexCenter(cell.q, cell.r);
      return this.projectedPlaneHex(center.xM, center.yM);
    }
    const { width, height } = this.tileSize();
    const { x, y } = this.tileCenterForCoord(cell);
    return [
      new Phaser.Math.Vector2(x, y - height * 0.5),
      new Phaser.Math.Vector2(x + width * 0.5, y),
      new Phaser.Math.Vector2(x, y + height * 0.5),
      new Phaser.Math.Vector2(x - width * 0.5, y),
    ];
  }

  private sameCell(a: TileCoord, b: TileCoord): boolean {
    return a.q === b.q && a.r === b.r;
  }

  private clusterAtCell(cell: TileCoord): Cluster | undefined {
    return this.dataModel.clusters.find((cluster) => {
      const choice = this.resolveClusterSprite(cluster, latLngToIso(cluster.centroid[0], cluster.centroid[1]));
      return choice?.footprintCells.some((footprintCell) => this.sameCell(footprintCell, cell));
    });
  }

  private drawSelectedTile(cell: TileCoord): void {
    this.selectedTileGraphic?.destroy();
    const graphics = this.add.graphics().setDepth(9000);
    const points = this.footprintPolygonForCell(cell);
    graphics.fillStyle(0xffdc7c, 0.16);
    graphics.fillPoints(points, true);
    graphics.lineStyle(3, 0x3f2613, 0.76);
    graphics.strokePoints(points, true, true);
    this.selectedTileGraphic = graphics;
  }

  private drawHoverTile(cell: TileCoord): void {
    if (this.selectedTile && this.sameCell(this.selectedTile, cell)) {
      this.hoverTileGraphic?.destroy();
      this.hoverTileGraphic = undefined;
      return;
    }
    this.hoverTileGraphic?.destroy();
    const graphics = this.add.graphics().setDepth(8999);
    const points = this.footprintPolygonForCell(cell);
    graphics.fillStyle(0xffffff, 0.08);
    graphics.fillPoints(points, true);
    graphics.lineStyle(2, 0x2d4724, 0.42);
    graphics.strokePoints(points, true, true);
    this.hoverTileGraphic = graphics;
  }

  private clearHoverTile(): void {
    this.hoverTileGraphic?.destroy();
    this.hoverTileGraphic = undefined;
  }

  private selectTile(cell: TileCoord, shouldMoveSelectedCluster: boolean): void {
    if (!this.isVisibleTile(cell)) return;
    this.selectedTile = cell;
    this.drawSelectedTile(cell);
    const cluster = this.clusterAtCell(cell);
    if (cluster) {
      this.selectCluster(cluster.id);
      return;
    }
    if (this.dataModel.editor && shouldMoveSelectedCluster && this.selectedClusterId !== undefined) {
      this.updateClusterOverride(this.selectedClusterId, { cell, offsetX: 0, offsetY: 0 });
      return;
    }
    const title = document.getElementById('editor-cluster-title');
    if (title) title.textContent = `Tile ${cell.q},${cell.r}`;
  }

  private placementPoint(placement: SceneSpritePlacement): { x: number; y: number } {
    const iso = latLngToIso(placement.latLng[0], placement.latLng[1]);
    const point = placement.tileSnap ? this.nearestTileCenter(iso.x, iso.y) : iso;
    return {
      x: point.x + (placement.tileOffsetX ?? 0),
      y: point.y + (placement.tileOffsetY ?? 0),
    };
  }

  private placeRoadSprites(): void {
    const config = this.dataModel.scene?.roads;
    const straightKey = config?.sprite;
    if (!straightKey) return;
    const step = Math.max(1, config.step ?? 4);
    const scale = config.scale ?? 0.105;
    const alpha = config.alpha ?? 0.5;
    const depthOffset = config.depthOffset ?? -34;
    for (const road of this.dataModel.roads) {
      for (let index = step; index < road.polyline.length - 1; index += step) {
        const point = road.polyline[index];
        const next = road.polyline[Math.min(index + 1, road.polyline.length - 1)];
        const prev = road.polyline[Math.max(index - 1, 0)];
        const p = latLngToIso(point[0], point[1]);
        const n = latLngToIso(next[0], next[1]);
        const before = latLngToIso(prev[0], prev[1]);
        const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(p.x, p.y, n.x, n.y));
        const prevAngle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(before.x, before.y, p.x, p.y));
        const turn = Math.abs(Phaser.Math.Angle.ShortestBetween(prevAngle, angle));
        const key = turn > 16 && config.curveSprite ? config.curveSprite : straightKey;
        const meta = this.manifest.get(key);
        if (!meta || meta.status === 'rejected') continue;
        this.add.image(p.x, p.y, `gen-${key}`)
          .setOrigin(meta.anchorX, meta.anchorY)
          .setScale(scale)
          .setAngle(angle)
          .setAlpha(alpha)
          .setDepth(p.y + depthOffset);
      }
    }
  }

  private placeSceneSprites(placements: SceneSpritePlacement[]): void {
    for (const placement of placements) {
      const meta = this.manifest.get(placement.key);
      if (!meta) continue;
      const p = this.placementPoint(placement);
      const image = this.add.image(p.x, p.y, `gen-${placement.key}`)
        .setOrigin(meta.anchorX, meta.anchorY)
        .setScale(placement.scale)
        .setAngle(placement.angle ?? 0)
        .setFlipX(placement.flipX ?? false)
        .setAlpha(placement.alpha ?? 1)
        .setDepth(p.y + (placement.depthOffset ?? 0));
      if (placement.motion || meta.category === 'water') {
        this.registerAnimatedSprite(image, placement.scale, placement.alpha ?? 1, placement.motion ?? 'water', placement.id.length);
      }
    }
  }

  private registerAnimatedSprite(
    image: Phaser.GameObjects.Image,
    baseScale: number,
    baseAlpha: number,
    motion: 'water' | 'idle',
    seed: number | string,
  ): void {
    const numericSeed = typeof seed === 'number'
      ? seed
      : [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    this.animatedSprites.push({
      image,
      baseX: image.x,
      baseY: image.y,
      baseScale,
      baseAlpha,
      phase: numericSeed * 0.73,
      motion,
    });
  }

  private placeHamletInfill(): void {
    const config = this.dataModel.scene?.hamletInfill;
    if (!config?.enabled) return;

    const defaultSprites = [
      '16-worn-yellow-cottage-imagegen',
      '16-worn-redbrick-terrace-imagegen',
      '16-worn-lshape-workshop-imagegen',
      '16-worn-family-cluster-imagegen',
    ];
    const defaultForgeSprites = [
      '16-worn-workshop-slate-imagegen',
      '16-worn-forge-redbrick-imagegen',
      '16-worn-lshape-workshop-imagegen',
    ];
    const sprites = this.availableSpriteKeys(config.sprites ?? defaultSprites);
    const forgeSprites = this.availableSpriteKeys(config.forgeSprites ?? defaultForgeSprites);
    if (sprites.length === 0 && forgeSprites.length === 0) return;

    const maxPerCluster = config.maxPerCluster ?? 5;
    const radiusX = config.radiusX ?? 110;
    const radiusY = config.radiusY ?? 46;
    const baseScale = config.scale ?? 0.12;
    const alpha = config.alpha ?? 0.96;
    const depthOffset = config.depthOffset ?? 76;

    for (const cluster of this.dataModel.clusters) {
      const spritePool = cluster.hasForge && forgeSprites.length > 0 ? forgeSprites : sprites;
      if (spritePool.length === 0) continue;
      const iso = latLngToIso(cluster.centroid[0], cluster.centroid[1]);
      const count = Math.min(maxPerCluster, Math.max(0, cluster.members.length - 1));
      for (let index = 0; index < count; index += 1) {
        const angle = cluster.id * 0.91 + index * 2.399963229728653;
        const ring = 0.72 + (index % 3) * 0.18 + Math.floor(index / 3) * 0.12;
        const rawX = iso.x + Math.cos(angle) * radiusX * ring;
        const rawY = iso.y + Math.sin(angle) * radiusY * ring + 16 + (index % 2) * 10;
        const point = this.dataModel.scene?.tiles?.snapInfill === false
          ? { x: rawX, y: rawY }
          : this.nearestTileCenter(rawX, rawY);
        const key = spritePool[(cluster.id + index) % spritePool.length];
        const meta = this.manifest.get(key);
        if (!meta) continue;
        const scale = baseScale * (0.9 + ((cluster.id + index) % 4) * 0.08);

        this.add.image(point.x, point.y, `gen-${key}`)
          .setOrigin(meta.anchorX, meta.anchorY)
          .setScale(scale)
          .setFlipX((cluster.id + index) % 2 === 0)
          .setAlpha(alpha)
          .setDepth(point.y + depthOffset);
      }
    }
  }

  private availableSpriteKeys(keys: string[]): string[] {
    return keys.filter((key) => {
      const meta = this.manifest.get(key);
      return meta && meta.status !== 'rejected';
    });
  }

  private placeLabels(): void {
    for (const label of this.dataModel.scene?.labels ?? []) {
      const p = latLngToIso(label.latLng[0], label.latLng[1]);
      const text = this.add.text(p.x, p.y, label.text, {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
        color: '#235d7f',
        stroke: '#fff8dd',
        strokeThickness: 5,
      });
      text.setOrigin(0.5);
      text.setAngle(label.angle ?? 0);
      text.setAlpha(0.78);
      text.setDepth(p.y + 12);
    }
  }

  private cameraPreset(): CameraPreset {
    const presets = this.dataModel.scene?.camera;
    if (window.innerWidth < 760 && presets?.mobile) return presets.mobile;
    if (this.dataModel.editor && presets?.editor) return presets.editor;
    return presets?.desktop ?? {
      minWidth: 1650,
      minHeight: 1150,
      offsetX: 250,
      offsetY: 560,
      minZoom: 0.35,
      maxZoom: 1.45,
    };
  }

  private addForgeSmoke(): void {
    const texture = 'sprite-village-smoke-puff';
    if (!this.textures.exists(texture)) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 14);
      g.generateTexture(texture, 32, 32);
      g.destroy();
    }

    for (const cluster of this.dataModel.clusters) {
      const override = this.getClusterOverride(cluster.id);
      const isForge = cluster.hasForge || override.sprite?.includes('forge') || cluster.spriteKey === 'forge';
      if (!isForge) continue;
      const image = this.clusterImages.get(cluster.id);
      if (!image) continue;
      const emitter = this.add.particles(image.x - 10, image.y - image.displayHeight * 0.68, texture, {
        lifespan: 2900,
        speedY: { min: -42, max: -26 },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.6, end: 2.2 },
        alpha: { start: 0.55, end: 0 },
        frequency: 185,
        tint: [0x2f281f, 0x5a493b, 0x77685a],
        blendMode: 'NORMAL',
      });
      emitter.setDepth(image.depth + 6);
      this.sys.updateList.add(emitter);
    }
  }

  private placeClusters(): void {
    const sorted = [...this.dataModel.clusters]
      .map((cluster) => ({ cluster, iso: latLngToIso(cluster.centroid[0], cluster.centroid[1]) }))
      .sort((a, b) => a.iso.y - b.iso.y);

    for (const { cluster, iso } of sorted) {
      const choice = this.resolveClusterSprite(cluster, iso);
      if (!choice) continue;
      this.drawClusterFootprint(cluster.id, choice);
      const image = this.createClusterImage(cluster, choice, iso.y);
      this.clusterImages.set(cluster.id, image);
    }

    document.addEventListener('mousedown', (event) => {
      const popup = document.getElementById('sprite-village-popup');
      if (!popup || popup.hidden) return;
      if (event.target instanceof Node && !popup.contains(event.target)) popup.hidden = true;
    }, true);
  }

  private drawClusterFootprint(clusterId: number, choice: ClusterSpriteChoice): void {
    this.clusterFootprints.get(clusterId)?.destroy();
    const graphics = this.add.graphics().setDepth(choice.depthY - 18);
    const fillColor = this.parseColor(choice.footprint.fillColor, 0xd2bc69);
    const lineColor = this.parseColor(choice.footprint.lineColor, 0x5d4826);
    for (const cell of choice.footprintCells) {
      const points = this.footprintPolygonForCell(cell);
      graphics.fillStyle(fillColor, 0.24);
      graphics.fillPoints(points, true);
      graphics.lineStyle(2, lineColor, 0.52);
      graphics.strokePoints(points, true, true);
    }
    this.clusterFootprints.set(clusterId, graphics);
  }

  private createClusterImage(cluster: Cluster, choice: ClusterSpriteChoice, _depthBase: number): Phaser.GameObjects.Image {
    const image = this.add.image(choice.x, choice.y, `gen-${choice.key}`);
    image.setOrigin(choice.meta.anchorX, choice.meta.anchorY);
    image.setScale(choice.scale);
    image.setFlipX(choice.flipX);
    image.setDepth(choice.depthY + (choice.footprint.depthBias ?? 120));
    image.setInteractive({ useHandCursor: true, pixelPerfect: true });
    image.setData('clusterId', cluster.id);

    const tooltip = document.getElementById('sprite-village-tooltip');
    const popup = document.getElementById('sprite-village-popup');

    image.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      if (this.selectedClusterId !== cluster.id) image.setTint(0xfff2c2);
      if (!tooltip) return;
      tooltip.textContent = cluster.members
        .map((n) => this.dataModel.byNumber[String(n)]?.name ?? `Household ${n}`)
        .join('\n');
      tooltip.hidden = false;
      tooltip.style.left = `${pointer.event.clientX + 14}px`;
      tooltip.style.top = `${pointer.event.clientY + 14}px`;
    });
    image.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (tooltip) {
        tooltip.style.left = `${pointer.event.clientX + 14}px`;
        tooltip.style.top = `${pointer.event.clientY + 14}px`;
      }
      if (this.editorDrag) this.dragSelectedCluster(pointer);
    });
    image.on('pointerout', () => {
      if (this.selectedClusterId !== cluster.id) image.clearTint();
      if (tooltip) tooltip.hidden = true;
    });
    image.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
      if (this.dataModel.editor) {
        this.selectCluster(cluster.id);
        const override = this.getClusterOverride(cluster.id);
        this.editorDrag = {
          clusterId: cluster.id,
          startX: pointer.worldX,
          startY: pointer.worldY,
          startOffsetX: override.offsetX ?? 0,
          startOffsetY: override.offsetY ?? 0,
        };
        return;
      }
      if (cluster.members.length === 1) {
        const entry = this.dataModel.byNumber[String(cluster.members[0])];
        if (entry) window.location.href = `/households/${entry.id}/`;
      } else if (popup) {
        popupCluster(popup, cluster, this.dataModel, pointer.event.clientX, pointer.event.clientY);
      }
    });
    return image;
  }

  private frameClusters(bounds: Bounds): void {
    const visualBounds = this.getSpriteVisualBounds();
    const frame = visualBounds ?? bounds;
    const preset = this.cameraPreset();
    const width = Math.max(preset.minWidth, frame.maxX - frame.minX);
    const height = Math.max(preset.minHeight, frame.maxY - frame.minY);
    const zoom = Math.min(this.scale.width / width, this.scale.height / height);
    const camera = this.cameras.main;
    camera.setZoom(Phaser.Math.Clamp(zoom, preset.minZoom, preset.maxZoom));
    const centerX = (frame.minX + frame.maxX) / 2 + preset.offsetX;
    const centerY = (frame.minY + frame.maxY) / 2 + preset.offsetY;
    camera.scrollX = centerX - this.scale.width / (2 * camera.zoom);
    camera.scrollY = centerY - this.scale.height / (2 * camera.zoom);
  }

  private resolveClusterSprite(cluster: Cluster, iso: { x: number; y: number }): ClusterSpriteChoice | undefined {
    const clusterOverride = this.getClusterOverride(cluster.id);
    const key = clusterOverride.sprite
      ?? this.overrides.clusterDefaults?.[cluster.spriteKey]
      ?? FALLBACK_SPRITE_FOR_CLUSTER[cluster.spriteKey]
      ?? '16-worn-yellow-cottage-imagegen';
    const meta = this.manifest.get(key);
    if (meta?.status === 'rejected') return undefined;
    if (!meta) return undefined;
    const footprint = this.footprintFor(cluster, key);
    const cell = this.clusterCell(cluster, iso);
    const footprintCells = this.footprintCells(cell, footprint.definition);
    const anchorPoint = this.dataModel.scene?.tiles?.snapClusters === false
      ? iso
      : this.footprintAnchorPoint(cell, footprint.definition);
    const scale = clusterOverride.scale ?? footprint.definition.defaultScale ?? (cluster.members.length >= 7 ? 0.34 : cluster.members.length >= 4 ? 0.3 : 0.26);
    const offsetX = clusterOverride.offsetX ?? 0;
    const offsetY = clusterOverride.offsetY ?? 0;
    const flipX = clusterOverride.flipX ?? (!cluster.hasForge && !key.includes('forge') && cluster.id % 3 === 0);
    const depthY = this.footprintDepthY(footprintCells);
    return {
      key,
      meta,
      scale,
      x: anchorPoint.x + offsetX,
      y: anchorPoint.y + offsetY,
      offsetX,
      offsetY,
      flipX,
      cell,
      footprint: footprint.definition,
      footprintId: footprint.id,
      footprintCells,
      depthY,
    };
  }

  private getSpriteVisualBounds(): Bounds | undefined {
    const boxes: Bounds[] = this.dataModel.clusters
      .map((cluster) => this.resolveClusterSprite(cluster, latLngToIso(cluster.centroid[0], cluster.centroid[1])))
      .filter((choice): choice is ClusterSpriteChoice => Boolean(choice))
      .map((choice) => ({
        minX: choice.x - choice.meta.width * choice.scale * choice.meta.anchorX,
        maxX: choice.x + choice.meta.width * choice.scale * (1 - choice.meta.anchorX),
        minY: choice.y - choice.meta.height * choice.scale * choice.meta.anchorY,
        maxY: choice.y + choice.meta.height * choice.scale * (1 - choice.meta.anchorY) + 60,
      }));

    for (const placement of this.dataModel.scene?.props ?? []) {
      const meta = this.manifest.get(placement.key);
      if (!meta) continue;
      if (['water', 'bridge', 'road'].includes(meta.category ?? '')) continue;
      const p = this.placementPoint(placement);
      boxes.push({
        minX: p.x - meta.width * placement.scale * meta.anchorX,
        maxX: p.x + meta.width * placement.scale * (1 - meta.anchorX),
        minY: p.y - meta.height * placement.scale * meta.anchorY,
        maxY: p.y + meta.height * placement.scale * (1 - meta.anchorY),
      });
    }
    for (const cluster of this.dataModel.clusters) {
      const iso = latLngToIso(cluster.centroid[0], cluster.centroid[1]);
      const config = this.dataModel.scene?.hamletInfill;
      if (!config?.enabled) continue;
      boxes.push({
        minX: iso.x - (config.radiusX ?? 110) * 1.35,
        maxX: iso.x + (config.radiusX ?? 110) * 1.35,
        minY: iso.y - (config.radiusY ?? 46) * 1.35,
        maxY: iso.y + (config.radiusY ?? 46) * 1.35 + 70,
      });
    }

    if (boxes.length === 0) return undefined;
    return boxes.reduce((current, box) => ({
      minX: Math.min(current.minX, box.minX),
      maxX: Math.max(current.maxX, box.maxX),
      minY: Math.min(current.minY, box.minY),
      maxY: Math.max(current.maxY, box.maxY),
    }), boxes[0]);
  }

  private setupCameraControls(): void {
    this.game.canvas.style.touchAction = 'none';
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      const camera = this.cameras.main;
      const pointer = this.input.activePointer;
      const worldX = camera.scrollX + pointer.x / camera.zoom;
      const worldY = camera.scrollY + pointer.y / camera.zoom;
      const nextZoom = Phaser.Math.Clamp(camera.zoom - dy * 0.001, 0.3, 2.25);
      camera.setZoom(nextZoom);
      camera.scrollX = worldX - pointer.x / nextZoom;
      camera.scrollY = worldY - pointer.y / nextZoom;
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[] = []) => {
      const overObject = currentlyOver.length > 0;
      const leftMapDrag = pointer.leftButtonDown() && !overObject;
      const auxMapDrag = pointer.rightButtonDown() || pointer.middleButtonDown();
      if (!leftMapDrag && !auxMapDrag) return;
      this.dragStart = {
        x: pointer.x,
        y: pointer.y,
        worldX: pointer.worldX,
        worldY: pointer.worldY,
        button: leftMapDrag ? 'left' : 'aux',
        moved: false,
      };
      this.cameraStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || !this.cameraStart) return;
      const camera = this.cameras.main;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dragStart.x, this.dragStart.y) > 10) {
        this.dragStart.moved = true;
      }
      camera.scrollX = this.cameraStart.x - (pointer.x - this.dragStart.x) / camera.zoom;
      camera.scrollY = this.cameraStart.y - (pointer.y - this.dragStart.y) / camera.zoom;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[] = []) => {
      if (!this.dataModel.editor || this.dragStart || this.editorDrag || currentlyOver.length > 0) return;
      const tile = this.nearestTileCoord(pointer.worldX, pointer.worldY);
      if (this.isVisibleTile(tile)) this.drawHoverTile(tile);
      else this.clearHoverTile();
    });
    this.input.on('pointerout', () => this.clearHoverTile());
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const rawClickTile = this.dragStart
        && this.dragStart.button === 'left'
        && !this.dragStart.moved
        && this.dataModel.editor
        ? this.nearestTileCoord(this.dragStart.worldX, this.dragStart.worldY)
        : undefined;
      const clickTile = rawClickTile && this.isVisibleTile(rawClickTile) ? rawClickTile : undefined;
      if (this.editorDrag) {
        localStorage.setItem('mushroomgreen.spriteOverrides', this.formatOverrides());
        this.updateExport();
      }
      if (!this.editorDrag && !this.dragStart?.moved && !clickTile && this.dataModel.editor && pointer.event.button === 0) {
        const pointerTile = this.nearestTileCoord(pointer.worldX, pointer.worldY);
        if (this.isVisibleTile(pointerTile)) this.selectTile(pointerTile, true);
      }
      if (clickTile && !this.editorDrag) this.selectTile(clickTile, true);
      this.dragStart = undefined;
      this.cameraStart = undefined;
      this.editorDrag = undefined;
    });
  }

  private setupEditorControls(): void {
    if (!this.dataModel.editor) return;
    const select = document.getElementById('editor-sprite-select') as HTMLSelectElement | null;
    const scale = document.getElementById('editor-scale-input') as HTMLInputElement | null;
    const cellQ = document.getElementById('editor-cell-q-input') as HTMLInputElement | null;
    const cellR = document.getElementById('editor-cell-r-input') as HTMLInputElement | null;
    const apply = document.getElementById('editor-apply-button') as HTMLButtonElement | null;
    const copy = document.getElementById('editor-copy-button') as HTMLButtonElement | null;
    const reset = document.getElementById('editor-reset-button') as HTMLButtonElement | null;
    if (!select || !scale || !cellQ || !cellR) return;

    select.disabled = true;
    scale.disabled = true;
    cellQ.disabled = true;
    cellR.disabled = true;
    scale.value = '0.3';
    cellQ.value = '0';
    cellR.value = '0';

    for (const sprite of this.dataModel.manifest.sprites.filter((item) => item.status !== 'rejected')) {
      const option = document.createElement('option');
      option.value = sprite.key;
      option.textContent = sprite.key;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      if (this.selectedClusterId === undefined) return;
      this.updateClusterOverride(this.selectedClusterId, { sprite: select.value });
    });
    scale.addEventListener('input', () => {
      if (this.selectedClusterId === undefined) return;
      this.updateClusterOverride(this.selectedClusterId, { scale: Number(scale.value) });
    });
    const updateSelectedCell = () => {
      if (this.selectedClusterId === undefined) return;
      this.updateClusterOverride(this.selectedClusterId, {
        cell: {
          q: Number(cellQ.value),
          r: Number(cellR.value),
        },
      });
    };
    cellQ.addEventListener('change', updateSelectedCell);
    cellR.addEventListener('change', updateSelectedCell);
    apply?.addEventListener('click', () => {
      const exportBox = document.getElementById('editor-export') as HTMLTextAreaElement | null;
      if (!exportBox) return;
      try {
        this.overrides = JSON.parse(exportBox.value) as SpriteMapOverrides;
        localStorage.setItem('mushroomgreen.spriteOverrides', this.formatOverrides());
        this.rebuildClusters();
        if (this.selectedClusterId !== undefined) this.selectCluster(this.selectedClusterId);
        this.updateExport();
      } catch {
        exportBox.setCustomValidity('Invalid JSON');
        exportBox.reportValidity();
        window.setTimeout(() => exportBox.setCustomValidity(''), 1800);
      }
    });
    copy?.addEventListener('click', async () => {
      const text = this.formatOverrides();
      await navigator.clipboard?.writeText(text);
      this.updateExport();
    });
    reset?.addEventListener('click', () => {
      localStorage.removeItem('mushroomgreen.spriteOverrides');
      window.location.reload();
    });

    const stored = localStorage.getItem('mushroomgreen.spriteOverrides');
    if (stored) {
      try {
        const storedOverrides = JSON.parse(stored) as SpriteMapOverrides;
        if (storedOverrides.gridVersion === OVERRIDE_GRID_VERSION) {
          this.overrides = storedOverrides;
          this.rebuildClusters();
        } else {
          localStorage.removeItem('mushroomgreen.spriteOverrides');
        }
      } catch {
        localStorage.removeItem('mushroomgreen.spriteOverrides');
      }
    }
    this.updateExport();
  }

  private selectCluster(clusterId: number): void {
    if (this.selectedImage) this.selectedImage.clearTint();
    this.selectedClusterId = clusterId;
    this.selectedImage = this.clusterImages.get(clusterId);
    this.selectedImage?.setTint(0xffd978);

    const cluster = this.clusterIndex.get(clusterId);
    const title = document.getElementById('editor-cluster-title');
    const select = document.getElementById('editor-sprite-select') as HTMLSelectElement | null;
    const scale = document.getElementById('editor-scale-input') as HTMLInputElement | null;
    const cellQ = document.getElementById('editor-cell-q-input') as HTMLInputElement | null;
    const cellR = document.getElementById('editor-cell-r-input') as HTMLInputElement | null;
    const choice = cluster ? this.resolveClusterSprite(cluster, latLngToIso(cluster.centroid[0], cluster.centroid[1])) : undefined;

    if (choice) {
      this.selectedTile = choice.cell;
      this.drawSelectedTile(choice.cell);
    }
    if (title && cluster) {
      const tile = choice ? ` · ${choice.footprintId} @ ${choice.cell.q},${choice.cell.r}` : '';
      title.textContent = `Cluster ${cluster.id}: ${cluster.members.join(', ')}${tile}`;
    }
    if (select && choice) {
      select.disabled = false;
      select.value = choice.key;
    }
    if (scale && choice) {
      scale.disabled = false;
      scale.value = String(choice.scale);
    }
    if (cellQ && cellR && choice) {
      cellQ.disabled = false;
      cellR.disabled = false;
      cellQ.value = String(choice.cell.q);
      cellR.value = String(choice.cell.r);
    }
  }

  private dragSelectedCluster(pointer: Phaser.Input.Pointer): void {
    if (!this.editorDrag) return;
    const offsetX = this.editorDrag.startOffsetX + pointer.worldX - this.editorDrag.startX;
    const offsetY = this.editorDrag.startOffsetY + pointer.worldY - this.editorDrag.startY;
    this.updateClusterOverride(this.editorDrag.clusterId, { offsetX: Math.round(offsetX), offsetY: Math.round(offsetY) }, false);
  }

  private updateClusterOverride(clusterId: number, patch: ClusterOverride, persist = true): void {
    const current = this.getClusterOverride(clusterId);
    const next = { ...current, ...patch };
    this.overrides.clusters = { ...(this.overrides.clusters ?? {}), [String(clusterId)]: next };
    this.applyClusterOverride(clusterId);
    if (this.selectedClusterId === clusterId) this.selectCluster(clusterId);
    if (persist) localStorage.setItem('mushroomgreen.spriteOverrides', this.formatOverrides());
    this.updateExport();
  }

  private getClusterOverride(clusterId: number): ClusterOverride {
    return this.overrides.clusters?.[String(clusterId)] ?? {};
  }

  private applyClusterOverride(clusterId: number): void {
    const cluster = this.clusterIndex.get(clusterId);
    if (!cluster) return;
    const iso = latLngToIso(cluster.centroid[0], cluster.centroid[1]);
    const choice = this.resolveClusterSprite(cluster, iso);
    const image = this.clusterImages.get(clusterId);
    if (!choice || !image) return;
    this.drawClusterFootprint(clusterId, choice);
    image.setTexture(`gen-${choice.key}`);
    image.setOrigin(choice.meta.anchorX, choice.meta.anchorY);
    image.setScale(choice.scale);
    image.setFlipX(choice.flipX);
    image.setPosition(choice.x, choice.y);
    image.setDepth(choice.depthY + (choice.footprint.depthBias ?? 120));
  }

  private rebuildClusters(): void {
    for (const clusterId of this.clusterImages.keys()) this.applyClusterOverride(clusterId);
  }

  private updateExport(): void {
    const exportBox = document.getElementById('editor-export') as HTMLTextAreaElement | null;
    if (exportBox) exportBox.value = this.formatOverrides();
  }

  private formatOverrides(): string {
    return `${JSON.stringify(this.overrides, null, 2)}\n`;
  }
}

const stage = document.getElementById('sprite-village-stage');
if (stage) {
  const data = readSceneData();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'sprite-village-stage',
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    antialias: true,
    scene: [SpriteVillageScene],
  });
  game.scene.start('SpriteVillageScene', { sceneData: data });
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
}
