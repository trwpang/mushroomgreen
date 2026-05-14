#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const DEFAULTS = {
  input: 'assets/sprite-map/raw',
  output: 'public/sprite-map/generated',
  manifest: 'src/data/generated-sprite-manifest.json',
  keyColor: '#00ff00',
  fuzz: '18%',
  maxEdge: 512,
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = value;
      i += 1;
    }
  }
  args.maxEdge = Number(args.maxEdge);
  return args;
}

function runMagick(args) {
  const result = spawnSync('magick', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error([
      `magick ${args.join(' ')}`,
      result.stdout.trim(),
      result.stderr.trim(),
    ].filter(Boolean).join('\n'));
  }
  return result.stdout.trim();
}

function imageSize(path) {
  const out = runMagick(['identify', '-format', '%w %h', path]);
  const [width, height] = out.split(/\s+/).map(Number);
  return { width, height };
}

function pixelAtRaw(path, x, y) {
  return runMagick(['identify', '-format', `%[pixel:p{${x},${y}}]`, path]);
}

function parsePixel(raw) {
  const match = raw.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const [r, g, b] = match[1].split(',').slice(0, 3).map((part) => Number.parseFloat(part.trim()));
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

function toHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function sampleChromaKey(path) {
  const { width, height } = imageSize(path);
  const inset = Math.min(12, Math.max(1, Math.floor(Math.min(width, height) * 0.04)));
  const points = [
    [0, 0], [inset, inset], [width - inset - 1, inset], [inset, height - inset - 1],
    [width - inset - 1, height - inset - 1], [Math.floor(width / 2), inset],
    [Math.floor(width / 2), height - inset - 1], [inset, Math.floor(height / 2)],
    [width - inset - 1, Math.floor(height / 2)],
  ];
  const samples = points
    .map(([x, y]) => parsePixel(pixelAtRaw(path, x, y)))
    .filter((sample) => sample !== null)
    .map((sample) => {
      const max = Math.max(sample.r, sample.g, sample.b);
      const min = Math.min(sample.r, sample.g, sample.b);
      return { sample, chroma: max - min, brightness: max };
    })
    .sort((a, b) => (b.chroma + b.brightness * 0.01) - (a.chroma + a.brightness * 0.01));
  return samples[0] ? toHex(samples[0].sample) : '#00ff00';
}

function hasTransparentCorner(path) {
  return /,\s*0\)$/.test(pixelAtRaw(path, 0, 0));
}

function slugify(input) {
  return input
    .replace(/\.[^.]+$/, '')
    .replace(/(?:-raw|_raw|-sheet|_sheet|-keyed|_keyed)$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function publicUrl(outputDir, fileName) {
  if (!outputDir.startsWith('public/')) {
    return join(outputDir, fileName);
  }
  return `/${join(outputDir.replace(/^public\//, ''), fileName)}`;
}

function categoryForKey(key) {
  if (/stream|water|brook|ripple|bridge/.test(key)) return key.includes('bridge') ? 'bridge' : 'water';
  if (/road|path|lane|track/.test(key)) return 'road';
  if (/willow|tree|hedge/.test(key)) return 'vegetation';
  if (/forge|workshop|cottage|terrace|chapel|cluster/.test(key)) return 'building';
  return 'detail';
}

function warningsForSprite({ key, width, height, anchorY, category }) {
  const warnings = [];
  if (width < 96 || height < 96) warnings.push('small-output');
  if (category === 'water' && /09-stream-v1/.test(key)) warnings.push('rejected-black-water');
  if (category === 'building' && (anchorY < 0.86 || anchorY > 0.96)) warnings.push('building-anchor-outside-target');
  if (category === 'water' && anchorY > 0.86) warnings.push('water-anchor-too-low');
  return warnings;
}

function notesForSprite({ width, height }) {
  return width >= 512 || height >= 512 ? ['max-edge-normalized'] : [];
}

function statusForWarnings(warnings) {
  if (warnings.some((warning) => warning.startsWith('rejected-'))) return 'rejected';
  if (warnings.length > 0) return 'warning';
  return 'accepted';
}

function readSheetConfig(source) {
  const sidecar = source.replace(/\.[^.]+$/, '.sheet.json');
  if (!existsSync(sidecar)) return null;
  return JSON.parse(readFileSync(sidecar, 'utf8'));
}

function convertSprite({
  source,
  output,
  keyColor,
  fuzz,
  maxEdge,
  crop,
  method,
}) {
  const convertWithMagick = (input = source, transparentColor = keyColor, includeCrop = true, fuzzOverride = fuzz) => {
    const args = [input];
    if (crop && includeCrop) {
      args.push('-crop', `${crop.width}x${crop.height}+${crop.x}+${crop.y}`, '+repage');
    }
    args.push(
      '-alpha', 'set',
      '-fuzz', fuzzOverride,
      '-transparent', transparentColor,
      '-trim', '+repage',
      '-resize', `${maxEdge}x${maxEdge}>`,
      output,
    );
    runMagick(args);
    return imageSize(output);
  };

  if (method === 'helper') {
    const cropInput = `/tmp/mushroomgreen-sprite-crop-${process.pid}-${Math.random().toString(16).slice(2)}.png`;
    const keyedOutput = `/tmp/mushroomgreen-sprite-keyed-${process.pid}-${Math.random().toString(16).slice(2)}.png`;
    const cropArgs = [source];
    if (crop) {
      cropArgs.push('-crop', `${crop.width}x${crop.height}+${crop.x}+${crop.y}`, '+repage');
    }
    cropArgs.push(cropInput);
    runMagick(cropArgs);
    const helper = `${process.env.HOME}/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py`;
    const helperResult = spawnSync('python3', [
      helper,
      '--input', cropInput,
      '--out', keyedOutput,
      '--auto-key', 'border',
      '--soft-matte',
      '--transparent-threshold', '34',
      '--opaque-threshold', '178',
      '--despill',
      '--force',
    ], { encoding: 'utf8' });
    if (helperResult.status !== 0) {
      const sampledKeyColor = sampleChromaKey(cropInput);
      const size = convertWithMagick(cropInput, sampledKeyColor, false, '30%');
      rmSync(cropInput, { force: true });
      rmSync(keyedOutput, { force: true });
      return size;
    }
    runMagick([
      keyedOutput,
      '-channel', 'A', '-threshold', '45%', '+channel',
      '-trim', '+repage',
      '-resize', `${maxEdge}x${maxEdge}>`,
      output,
    ]);
    if (!hasTransparentCorner(output)) {
      const sampledKeyColor = sampleChromaKey(cropInput);
      const size = convertWithMagick(cropInput, sampledKeyColor, false, '30%');
      rmSync(cropInput, { force: true });
      rmSync(keyedOutput, { force: true });
      return size;
    }
    rmSync(cropInput, { force: true });
    rmSync(keyedOutput, { force: true });
    return imageSize(output);
  }

  return convertWithMagick();
}

function expandSprites(source, config) {
  if (!config) {
    return [{ name: slugify(basename(source)), crop: null, anchorY: 0.92 }];
  }

  if (Array.isArray(config.sprites)) {
    return config.sprites.map((sprite) => ({
      name: slugify(sprite.name),
      crop: {
        x: Number(sprite.x),
        y: Number(sprite.y),
        width: Number(sprite.width),
        height: Number(sprite.height),
      },
      anchorY: sprite.anchorY ?? config.anchorY ?? 0.92,
      category: sprite.category ?? config.category,
    }));
  }

  if (config.grid) {
    const grid = config.grid;
    const items = [];
    const prefix = slugify(config.name ?? basename(source));
    for (let row = 0; row < Number(grid.rows); row += 1) {
      for (let col = 0; col < Number(grid.columns); col += 1) {
        const index = row * Number(grid.columns) + col + 1;
        items.push({
          name: `${prefix}-${String(index).padStart(2, '0')}`,
          crop: {
            x: Number(grid.x ?? 0) + col * Number(grid.cellWidth),
            y: Number(grid.y ?? 0) + row * Number(grid.cellHeight),
            width: Number(grid.cellWidth),
            height: Number(grid.cellHeight),
          },
          anchorY: grid.anchorY ?? config.anchorY ?? 0.92,
        });
      }
    }
    return items;
  }

  throw new Error(`${source}: expected .sheet.json with "sprites" or "grid"`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.input)) {
    throw new Error(`Input directory does not exist: ${args.input}`);
  }
  mkdirSync(args.output, { recursive: true });
  mkdirSync(args.manifest.split('/').slice(0, -1).join('/'), { recursive: true });

  const files = readdirSync(args.input)
    .filter((file) => ['.png', '.webp', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()))
    .sort();

  const sprites = [];
  for (const file of files) {
    const source = join(args.input, file);
    const config = readSheetConfig(source);
    const keyColor = config?.keyColor ?? args.keyColor;
    const fuzz = config?.fuzz ?? args.fuzz;
    const maxEdge = Number(config?.maxEdge ?? args.maxEdge);
    const method = config?.method ?? args.method ?? 'magick';
    const items = expandSprites(source, config);

    for (const item of items) {
      const outName = `${item.name}-keyed.png`;
      const outPath = join(args.output, outName);
      const size = convertSprite({
        source,
        output: outPath,
        keyColor,
        fuzz,
        maxEdge,
        crop: item.crop,
        method,
      });
      const category = item.category ?? config?.category ?? categoryForKey(item.name);
      const warnings = warningsForSprite({
        key: item.name,
        width: size.width,
        height: size.height,
        anchorY: item.anchorY,
        category,
      });
      const notes = notesForSprite(size);
      const status = statusForWarnings(warnings);
      sprites.push({
        key: item.name,
        url: publicUrl(args.output, outName),
        source,
        width: size.width,
        height: size.height,
        anchorX: item.anchorX ?? 0.5,
        anchorY: item.anchorY,
        category,
        status,
        warnings,
        notes,
      });
    }
  }

  const warningCount = sprites.reduce((total, sprite) => total + sprite.warnings.length, 0);
  const rejectedCount = sprites.filter((sprite) => sprite.status === 'rejected').length;

  const manifest = {
    generatedAt: new Date().toISOString(),
    input: args.input,
    output: args.output,
    keyColor: args.keyColor,
    fuzz: args.fuzz,
    audit: {
      spriteCount: sprites.length,
      warningCount,
      rejectedCount,
      categories: sprites.reduce((counts, sprite) => {
        counts[sprite.category] = (counts[sprite.category] ?? 0) + 1;
        return counts;
      }, {}),
      statuses: sprites.reduce((counts, sprite) => {
        counts[sprite.status] = (counts[sprite.status] ?? 0) + 1;
        return counts;
      }, {}),
    },
    sprites,
  };
  writeFileSync(args.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Processed ${sprites.length} sprite(s)`);
  console.log(`Manifest: ${args.manifest}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
