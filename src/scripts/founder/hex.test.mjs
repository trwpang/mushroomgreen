import { test } from 'node:test';
import assert from 'node:assert/strict';
import { axialToPixel, pixelToAxial, neighbours } from './hex.mjs';

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
