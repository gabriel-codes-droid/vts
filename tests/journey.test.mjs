import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { sampleJourney, phaseForProgress } from '../src/components/journey.js';
import { HOP_WAYPOINTS, MOON_SEAT_POSITION, PLANET_ROW_Z } from '../src/components/sceneConstants.js';

test('the shuttle exits onto three cubes in right-left-right descending order', () => {
  assert.equal(HOP_WAYPOINTS.length, 4);
  const [, first, second, third] = HOP_WAYPOINTS;
  assert.ok(first[0] > second[0] && third[0] > second[0]);
  assert.ok(first[1] > second[1] && second[1] > third[1]);
  for (let i = 0; i <= 3; i++) {
    const position = new Vector3();
    sampleJourney(0.30 + 0.16 * i / 3, position);
    assert.ok(position.distanceTo(new Vector3(...HOP_WAYPOINTS[i])) < 1e-6);
  }
});

test('hop, launch, flight and landing boundaries have no position jumps', () => {
  for (const boundary of [0.30, 0.30 + 0.16 / 3, 0.30 + 0.32 / 3, 0.46, 0.54, 0.78, 0.88]) {
    const before = new Vector3(), after = new Vector3();
    sampleJourney(boundary - 1e-7, before);
    sampleJourney(boundary + 1e-7, after);
    assert.ok(before.distanceTo(after) < 0.001, `discontinuity at ${boundary}`);
  }
});

test('reverse scrolling is deterministic and the final pose faces the planets', () => {
  const forward = Array.from({ length: 101 }, (_, i) => {
    const p = new Vector3(); sampleJourney(i / 100, p); return p;
  });
  for (let i = 100; i >= 0; i--) {
    const p = new Vector3(); sampleJourney(i / 100, p);
    assert.deepEqual(p.toArray(), forward[i].toArray());
  }
  const position = new Vector3();
  const yaw = sampleJourney(1, position);
  assert.deepEqual(position.toArray(), MOON_SEAT_POSITION);
  const direction = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const planets = new Vector3(-position.x, 0, PLANET_ROW_Z - position.z).normalize();
  assert.ok(direction.dot(planets) > 0.9999);
  assert.equal(phaseForProgress(1), 'seated');
});
