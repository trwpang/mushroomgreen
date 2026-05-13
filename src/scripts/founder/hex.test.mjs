import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  axialToPixel,
  pixelToAxial,
  neighbours,
  oddQNeighbours,
  oddQToPlane,
  planeHexCorners,
} from './hex.mjs';

const HEX_SIZE = 32;

test('axialToPixel maps origin to (0, 0)', () => {
  const { x, y } = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
  assert.equal(x, 0);
  assert.equal(y, 0);
});

test('axialToPixel maps (1, 0) to flat-top neighbour east', () => {
  const { x } = axialToPixel({ q: 1, r: 0 }, HEX_SIZE);
  assert.ok(x > 0, `expected x > 0, got ${x}`);
});

test('pixelToAxial round-trips axialToPixel', () => {
  const before = { q: 2, r: -3 };
  const { x, y } = axialToPixel(before, HEX_SIZE);
  const after = pixelToAxial({ x, y }, HEX_SIZE);
  assert.deepEqual(after, before);
});

test('neighbours returns 6 cells', () => {
  const ns = neighbours({ q: 0, r: 0 });
  assert.equal(ns.length, 6);
});

test('oddQNeighbours uses odd-q row offsets', () => {
  assert.deepEqual(oddQNeighbours({ q: 0, r: 0 }).slice(0, 2), [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
  ]);
  assert.deepEqual(oddQNeighbours({ q: 1, r: 0 }).slice(0, 2), [
    { q: 2, r: 1 },
    { q: 2, r: 0 },
  ]);
});

test('oddQToPlane staggers odd columns by half a row', () => {
  const even = oddQToPlane({ q: 0, r: 0 }, HEX_SIZE);
  const odd = oddQToPlane({ q: 1, r: 0 }, HEX_SIZE);
  assert.equal(even.yM, 0);
  assert.equal(odd.xM, HEX_SIZE * 1.5);
  assert.equal(odd.yM, Math.sqrt(3) * HEX_SIZE * 0.5);
});

test('planeHexCorners returns 6 regular ground-plane corners', () => {
  const corners = planeHexCorners({ xM: 0, yM: 0 }, HEX_SIZE);
  assert.equal(corners.length, 6);
  assert.equal(corners[0].xM, HEX_SIZE);
  assert.equal(Math.round(corners[3].xM), -HEX_SIZE);
});
