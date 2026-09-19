import test from 'node:test';
import assert from 'node:assert/strict';
import { initBootLoader } from '../src/scripts/bootLoader.js';
import { createRollingCounter } from '../src/scripts/rollingCounter.js';

// Exercise the real loader against a controlled DOM/clock so GPU preparation
// can be slow, cached, or fail without downloading the large scene per case.
function harness(stage = 'loading', progress = '0') {
  let now = 0, sequence = 0;
  const frames = new Map(), timers = new Map();
  class Element extends EventTarget {
    dataset = {};
    attributes = {};
    children = [];
    hidden = false;
    style = { setProperty() {} };
    setAttribute(key, value) { this.attributes[key] = value; }
    get firstElementChild() { return this.children[0]; }
    append(child) { this.children.push(child); child.parent = this; }
    replaceChildren() { this.children = []; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  const elements = new Map(['boot-hud', 'boot-canvas', 'boot-streaks', 'boot-gauge', 'boot-bar-fill', 'boot-rocket', 'boot-exhaust', 'boot-number', 'boot-announcement', 'boot-error', 'boot-retry'].map(id => [id, new Element()]));
  const root = elements.get('boot-hud');
  root.dataset = { stage, progress };
  elements.get('boot-error').hidden = true;
  elements.get('boot-number').append(new Element());
  elements.get('boot-canvas').getContext = () => null;
  const window = new EventTarget();
  Object.assign(window, {
    innerWidth: 1000, innerHeight: 700, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }), scrollTo() {}, location: { reload() {} },
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, at: now + delay }); return id; },
  });
  let revealed = 0;
  window.addEventListener('portfolio:revealed', () => revealed++);
  const lock = new Set(['portfolio-booting']);
  const document = {
    readyState: 'complete', hidden: false,
    getElementById: id => elements.get(id), createElement: () => new Element(),
    documentElement: { classList: { remove: value => lock.delete(value) } },
  };
  const globals = { window, document, performance: { now: () => now },
    requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id), clearTimeout: id => timers.delete(id) };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true });
  initBootLoader();
  return {
    root, elements, lock, revealed: () => revealed, frames: () => frames.size,
    report(nextStage, nextProgress) {
      root.dataset.stage = nextStage; root.dataset.progress = String(nextProgress);
      window.dispatchEvent(new Event('portfolio:boot'));
    },
    advance(milliseconds) {
      for (let i = 0; i < Math.ceil(milliseconds / (1000 / 60)); i++) {
        now += 1000 / 60;
        const scheduled = [...frames.values()]; frames.clear();
        scheduled.forEach(callback => callback(now));
        for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); }
      }
    },
    restore() {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

test('preparation, not elapsed time or download progress, unlocks the scene', () => {
  const h = harness('loading', '1');
  try {
    h.advance(20000);
    assert.equal(h.revealed(), 0);
    assert.ok(Number(h.root.dataset.displayProgress) < 100);
    assert.ok(h.lock.has('portfolio-booting'));
    h.report('ready', 1);
    h.advance(5000);
    assert.equal(h.root.dataset.displayProgress, '100');
    assert.equal(h.revealed(), 1);
    assert.equal(h.root.hidden, true);
    assert.equal(h.lock.size, 0);
    assert.equal(h.frames(), 0);
  } finally { h.restore(); }
});

test('a cached scene still shows the loader, holds 100%, then reveals once', () => {
  const h = harness('ready', '1');
  try {
    h.advance(4100);
    assert.equal(h.revealed(), 0);
    assert.notEqual(h.root.dataset.presentation, 'revealing');
    for (let i = 0; i < 600 && h.root.dataset.presentation !== 'complete'; i++) h.advance(20);
    assert.equal(h.root.dataset.presentation, 'complete');
    h.advance(500);
    assert.equal(h.root.dataset.presentation, 'complete');
    h.advance(2500);
    assert.equal(h.revealed(), 1);
    assert.equal(h.root.dataset.revealed, 'true');
  } finally { h.restore(); }
});

test('counter changes only the necessary columns, including 9/10 and 99/100 carries', () => {
  const h = harness();
  try {
    const container = h.elements.get('boot-number');
    const counter = createRollingCounter(container);
    const strips = container.children.map(slot => slot.firstElementChild);
    const calls = [0, 0, 0];
    const animations = [];
    strips.forEach((strip, index) => {
      strip.animate = (frames, options) => {
        calls[index]++;
        assert.equal(frames[0].transform, 'translate3d(0, -50%, 0)');
        assert.equal(frames[1].transform, 'translate3d(0, 0, 0)');
        assert.ok(options.duration > 0);
        const animation = { cancel() {}, onfinish: null };
        animations.push(animation);
        return animation;
      };
    });
    const settle = () => animations.splice(0).forEach(animation => animation.onfinish());
    for (let value = 1; value <= 9; value++) { counter.set(value); settle(); }
    assert.deepEqual(calls, [0, 0, 9]);
    counter.set(10); settle();
    assert.deepEqual(calls, [0, 1, 10]);
    for (let value = 11; value <= 99; value++) { counter.set(value); settle(); }
    assert.deepEqual(calls, [0, 9, 99]);
    counter.set(100); settle();
    assert.deepEqual(calls, [1, 10, 100]);
    assert.equal(strips.map(strip => strip.children[1].textContent).join(''), '100');
    counter.set(100);
    assert.equal(animations.length, 0);
    assert.ok(strips.every(strip => strip.children.length === 2));
  } finally { h.restore(); }
});

test('large progress updates count in order without overlapping digit transitions', () => {
  const h = harness('ready', '1');
  try {
    let previous = 0;
    for (let i = 0; i < 1200 && !h.revealed(); i++) {
      h.advance(16);
      const value = Number(h.root.dataset.displayProgress);
      assert.ok(value === previous || value === previous + 1);
      previous = value;
    }
    assert.equal(previous, 100);
    assert.equal(h.revealed(), 1);
  } finally { h.restore(); }
});

test('an asset failure keeps the loader and shows retry instead of a false 100%', () => {
  const h = harness('preparing', '.95');
  try {
    h.advance(5000);
    h.report('error', 0);
    h.advance(10000);
    assert.equal(h.revealed(), 0);
    assert.equal(h.elements.get('boot-error').hidden, false);
    assert.ok(Number(h.root.dataset.displayProgress) < 100);
  } finally { h.restore(); }
});

test('readiness lost during the 100% pause prevents the reveal', () => {
  const h = harness('ready', '1');
  try {
    for (let i = 0; i < 1000 && h.root.dataset.presentation !== 'complete'; i++) h.advance(20);
    assert.equal(h.root.dataset.presentation, 'complete');
    h.report('preparing', .95);
    h.advance(5000);
    assert.equal(h.revealed(), 0);
    assert.ok(h.lock.has('portfolio-booting'));
    h.report('ready', 1);
    h.advance(400);
    assert.equal(h.revealed(), 0);
    h.advance(2000);
    assert.equal(h.revealed(), 1);
  } finally { h.restore(); }
});
