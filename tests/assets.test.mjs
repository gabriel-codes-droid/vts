import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const source = files(join(root, 'src')).map(path => readFileSync(path, 'utf8')).join('\n');
const assets = new Set([...source.matchAll(/['"`](\/(?:models|images)\/[^'"`]+)['"`]/g)].map(match => match[1]));

test('all scene model, animation, environment and background references exist', () => {
  assert.ok(assets.size > 10, 'The asset audit must cover the full scene');
  for (const asset of assets) assert.ok(existsSync(join(root, 'public', asset)), `Missing ${asset}`);
});

test('every shipped model has a source reference', () => {
  for (const file of readdirSync(join(root, 'public/models'))) {
    assert.ok(assets.has(`/models/${file}`), `Unreferenced model: ${file}`);
  }
});
