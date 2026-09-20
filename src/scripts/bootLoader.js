// The visual percentage follows actual preparation and never completes on a
// timer alone. A cached load still gets a short, legible opening sequence.
import { createRollingCounter, DIGIT_INTERVAL, DIGIT_DURATION } from './rollingCounter.js';

const MIN_VISIBLE_MS = 2200;
const COMPLETION_HOLD_MS = 350;
const REVEAL_MS = 1000;

export function initBootLoader() {
  const root = document.getElementById('boot-hud');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const canvas = document.getElementById('boot-canvas');
  const streakLayer = document.getElementById('boot-streaks');
  const context = canvas.getContext('2d');
  const gauge = document.getElementById('boot-gauge');
  const fill = document.getElementById('boot-bar-fill');
  const rocket = document.getElementById('boot-rocket');
  const exhaust = document.getElementById('boot-exhaust');
  const number = document.getElementById('boot-number');
  const announcement = document.getElementById('boot-announcement');
  const error = document.getElementById('boot-error');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const started = performance.now();
  let lastFrame = started;
  let visibleTime = 0;
  let displayed = 0;
  let barProgress = 0;
  let actual = 0;
  let ready = false;
  let failed = false;
  let pageLoaded = document.readyState === 'complete';
  let fontsLoaded = !document.fonts;
  let lastInteger = 0;
  let lastNumberAt = 0;
  let holdStarted = null;
  let revealing = false;
  let disposed = false;
  let raf = 0;
  let revealTimer = 0;
  const counter = createRollingCounter(number, reducedMotion);
  let width = 1, height = 1;

  const random = (min, max) => min + Math.random() * (max - min);
  const markPageLoaded = () => { pageLoaded = true; };
  window.addEventListener('load', markPageLoaded, { once: true });
  if (document.fonts) document.fonts.ready.then(() => { fontsLoaded = true; });

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const stars = Array.from({ length: Math.min(180, Math.round(width * height / 6500)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      radius: random(.45, 1.15), opacity: random(.12, .55),
    }));
    if (context) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#fff';
      for (const star of stars) {
        context.globalAlpha = star.opacity;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }
    // Transform animations run on the compositor even while large GLB/FBX
    // parsing occupies the main thread. No per-frame canvas trails or arrays.
    streakLayer.replaceChildren();
    const radius = Math.hypot(width, height) * .58;
    for (let i = 0; i < (reducedMotion ? 0 : 42); i++) {
      const star = document.createElement('i');
      const angle = random(0, Math.PI * 2);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      star.className = 'boot-streak';
      const properties = {
        '--start-x': `${x * .06}px`, '--start-y': `${y * .06}px`,
        '--end-x': `${x}px`, '--end-y': `${y}px`, '--angle': `${angle}rad`,
        '--flight-time': `${random(3.2, 5.4)}s`, '--flight-delay': `${random(-6, 0)}s`,
      };
      for (const [key, value] of Object.entries(properties)) star.style.setProperty(key, value);
      streakLayer.append(star);
    }
  }

  function rollNumber(value) {
    if (lastInteger === value) return;
    counter.set(value);
    lastInteger = value;
    gauge.setAttribute('aria-valuenow', String(value));
  }

  function readProgress() {
    if (disposed) return;
    if (root.dataset.stage === 'error') {
      failed = true;
      error.hidden = false;
      announcement.textContent = root.dataset.error || 'Something couldn’t load. Please try again.';
      root.setAttribute('aria-busy', 'false');
      return;
    }
    actual = Math.max(actual, Math.min(.99, Number(root.dataset.progress) || 0));
    ready = root.dataset.stage === 'ready';
  }

  function finishReveal() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    clearTimeout(revealTimer);
    root.hidden = true;
    root.dataset.revealed = 'true';
    root.setAttribute('aria-busy', 'false');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.classList.remove('portfolio-booting');
    window.removeEventListener('resize', resize);
    window.removeEventListener('portfolio:boot', readProgress);
    window.removeEventListener('load', markPageLoaded);
    window.removeEventListener('wheel', lockWheel);
    window.removeEventListener('touchmove', lockWheel);
    window.removeEventListener('keydown', lockKeys);
    root.removeEventListener('transitionend', onTransitionEnd);
    window.dispatchEvent(new Event('portfolio:revealed'));
    canvas.width = 1;
    canvas.height = 1;
    streakLayer.replaceChildren();
    counter.dispose();
  }

  function onTransitionEnd(event) {
    if (event.target.id === 'boot-curtain' && event.propertyName === 'transform') finishReveal();
  }

  function reveal() {
    revealing = true;
    root.dataset.presentation = 'revealing';
    announcement.textContent = 'Ready. Your journey begins.';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    root.addEventListener('transitionend', onTransitionEnd);
    // Fallback for background tabs or browsers that omit transitionend.
    revealTimer = window.setTimeout(finishReveal, (reducedMotion ? 180 : REVEAL_MS) + 150);
  }

  function frame(now) {
    if (disposed) return;
    const delta = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (!document.hidden) visibleTime += delta * 1000;
    if (!failed && !revealing) {
      const allReady = ready && pageLoaded && fontsLoaded;
      // Time caps the display rate; it never creates asset readiness.
      const timeCap = Math.min(1, visibleTime / MIN_VISIBLE_MS);
      const target = Math.min(allReady ? 1 : actual, timeCap);
      const step = Math.min(.28 * delta, Math.max(0, target - displayed) * (1 - Math.exp(-delta * 5)));
      displayed += step;
      if (allReady && timeCap === 1 && displayed > .999) displayed = 1;
      const integer = displayed === 1 ? 100 : Math.min(99, Math.floor(displayed * 100));
      if (integer > lastInteger && now - lastNumberAt >= DIGIT_INTERVAL) {
        // Never skip a carry or interrupt the previous digit's roll.
        rollNumber(lastInteger + 1);
        lastNumberAt = now;
      }
      const barTarget = Math.min(displayed, lastInteger / 100);
      barProgress += (barTarget - barProgress) * (1 - Math.exp(-delta * 25));
      if (lastInteger === 100 && barProgress > .999) barProgress = 1;
      const visualProgress = barProgress;
      const rocketX = 20 + visualProgress * 890;
      fill.setAttribute('width', String(visualProgress === 1 ? 1000 : visualProgress * 935));
      rocket.setAttribute('transform', `translate(${rocketX.toFixed(2)} 70)`);
      exhaust.setAttribute('transform', `translate(${rocketX.toFixed(2)} 0)`);
      root.dataset.displayProgress = String(lastInteger);
      if (!allReady) holdStarted = null;
      if (allReady && lastInteger === 100 && now - lastNumberAt >= DIGIT_DURATION) {
        if (holdStarted === null) {
          holdStarted = visibleTime;
          root.dataset.presentation = 'complete';
        }
        if (visibleTime - holdStarted >= COMPLETION_HOLD_MS) reveal();
      }
    }
    if (!disposed) raf = requestAnimationFrame(frame);
  }

  function lockWheel(event) { event.preventDefault(); }
  function lockKeys(event) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key) && event.target.tagName !== 'BUTTON') event.preventDefault();
  }
  document.getElementById('boot-retry').addEventListener('click', () => window.location.reload());
  window.addEventListener('wheel', lockWheel, { passive: false });
  window.addEventListener('touchmove', lockWheel, { passive: false });
  window.addEventListener('keydown', lockKeys);
  window.addEventListener('resize', resize);
  window.addEventListener('portfolio:boot', readProgress);
  resize();
  readProgress();
  raf = requestAnimationFrame(frame);
}
