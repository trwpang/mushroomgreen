import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailTier, resolveDetailKey } from './zoom-detail.mjs';

test('detailTier returns "overview" below mid threshold', () => {
  assert.equal(detailTier(0.5), 'overview');
  assert.equal(detailTier(1.0), 'overview');
});

test('detailTier returns "mid" between mid and close thresholds', () => {
  assert.equal(detailTier(1.5), 'mid');
  assert.equal(detailTier(2.0), 'mid');
});

test('detailTier returns "close" at and above close threshold', () => {
  assert.equal(detailTier(2.5), 'close');
  assert.equal(detailTier(4.0), 'close');
});

test('resolveDetailKey adds "-close" suffix only at close tier', () => {
  assert.equal(resolveDetailKey('founder-cottage-NE', 'overview'), 'founder-cottage-NE');
  assert.equal(resolveDetailKey('founder-cottage-NE', 'mid'), 'founder-cottage-NE');
  assert.equal(resolveDetailKey('founder-cottage-NE', 'close'), 'founder-cottage-NE-close');
});

test('resolveDetailKey returns base key when no close variant exists', () => {
  assert.equal(resolveDetailKey('grass', 'close'), 'grass-close');
});
