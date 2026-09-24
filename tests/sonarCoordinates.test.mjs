import test from 'node:test';
import assert from 'node:assert/strict';
import { rippleOrigin } from '../src/components/sonarCoordinates.js';

test('ripples originate at the pointer on a scrolled or scaled canvas', () => {
  assert.deepEqual(rippleOrigin(250, 140, { left: 50, top: 40, width: 800, height: 600 }, 800, 600), { x: 200, y: 100 });
  assert.deepEqual(rippleOrigin(250, 140, { left: 50, top: -60, width: 400, height: 300 }, 800, 600), { x: 400, y: 400 });
});

test('clicks outside the visible canvas and zero-sized canvases do not emit ripples', () => {
  const rect = { left: 20, top: 30, width: 400, height: 300 };
  for (const [x, y] of [[19, 40], [421, 40], [30, 29], [30, 331]]) {
    assert.equal(rippleOrigin(x, y, rect, 400, 300), null);
  }
  assert.equal(rippleOrigin(20, 30, { ...rect, width: 0 }, 400, 300), null);
});
