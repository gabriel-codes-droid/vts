import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spaceCanvas = readFileSync(new URL('../src/components/SpaceCanvas.jsx', import.meta.url), 'utf8');
const sonarGrid = readFileSync(new URL('../src/components/SonarGrid.jsx', import.meta.url), 'utf8');

test('the text-free sonar page begins after the 3D journey scroll track', () => {
  assert.ok(spaceCanvas.includes("import SonarGrid from './SonarGrid';"));
  assert.match(spaceCanvas, /height: '520vh'[^]*<SonarGrid\s*\/>/);
  assert.match(sonarGrid, /minHeight: '100svh'/);
  assert.match(sonarGrid, /aria-hidden="true"/);
});

test('sonar grid is an off-screen-paused canvas animation with no text content', () => {
  assert.match(sonarGrid, /new IntersectionObserver/);
  assert.match(sonarGrid, /prefers-reduced-motion/);
  assert.match(sonarGrid, /requestAnimationFrame/);
  assert.doesNotMatch(sonarGrid, /<p|<h[1-6]|textContent/);
  assert.match(sonarGrid, /color = '#e4e4e4'/);
});
