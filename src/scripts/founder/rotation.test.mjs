import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRotation, rotateLeft, rotateRight, resolveFacing, headings } from './rotation.mjs';

test('createRotation defaults to NE', () => {
  assert.equal(createRotation().heading, 'NE');
});

test('rotateRight cycles NE → SE → SW → NW → NE', () => {
  let r = createRotation();
  r = rotateRight(r); assert.equal(r.heading, 'SE');
  r = rotateRight(r); assert.equal(r.heading, 'SW');
  r = rotateRight(r); assert.equal(r.heading, 'NW');
  r = rotateRight(r); assert.equal(r.heading, 'NE');
});

test('rotateLeft cycles NE → NW → SW → SE → NE', () => {
  let r = createRotation();
  r = rotateLeft(r); assert.equal(r.heading, 'NW');
  r = rotateLeft(r); assert.equal(r.heading, 'SW');
  r = rotateLeft(r); assert.equal(r.heading, 'SE');
  r = rotateLeft(r); assert.equal(r.heading, 'NE');
});

test('resolveFacing returns "<key>-<heading>" for buildings', () => {
  assert.equal(resolveFacing('founder-cottage', 'NE'), 'founder-cottage-NE');
  assert.equal(resolveFacing('adjacent-forge', 'SW'), 'adjacent-forge-SW');
});

test('resolveFacing returns plain key for orientation-agnostic sprites', () => {
  assert.equal(resolveFacing('grass', 'NE', { orientationAgnostic: true }), 'grass');
  assert.equal(resolveFacing('cat', 'SW', { orientationAgnostic: true }), 'cat');
});

test('headings exposes the four cardinals in cycle order', () => {
  assert.deepEqual(headings, ['NE', 'SE', 'SW', 'NW']);
});
