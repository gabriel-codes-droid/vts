import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;
const MAX_DPR = 2;

// Decorative canvas background for the post-journey page. It uses short
// bursts instead of an always-running loop and pauses when off-screen.
export default function SonarGrid({
  // Neutral silver-white matches the supplied sonar-grid reference. The
  // alpha-driven resting/wave states create the grey-to-white contrast.
  color = '#e4e4e4',
  spacing = 28,
  dotRadius = 1.15,
  baseOpacity = 0.24,
  pingEvery = 2.35,
  speed = 260,
  ringWidth = 88,
  amplitude = 2.15,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const ringsRef = useRef([]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!host || !canvas || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1;
    let height = 1;
    let visible = true;
    let seeded = false;
    let frameId = 0;
    let timerId = 0;
    let nextPing = performance.now() + pingEvery * 1000;

    const addRing = (x, y, born = performance.now()) => {
      ringsRef.current.push({ x, y, born });
      if (ringsRef.current.length > 5) ringsRef.current.shift();
    };

    const draw = (now) => {
      const lifetime = (Math.hypot(width, height) + ringWidth) / speed;
      ringsRef.current = ringsRef.current.filter(ring => (now - ring.born) / 1000 < lifetime);
      const liveRings = ringsRef.current.map(ring => {
        const age = (now - ring.born) / 1000;
        const radius = age * speed;
        return { ...ring, radius, reach: radius + ringWidth, fade: 1 - age / lifetime };
      });

      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      const columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const offsetX = (width - (columns - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;
      const energized = [];

      context.globalAlpha = baseOpacity;
      context.beginPath();
      for (let column = 0; column < columns; column++) {
        const x = offsetX + column * spacing;
        for (let row = 0; row < rows; row++) {
          const y = offsetY + row * spacing;
          let energy = 0;
          for (const ring of liveRings) {
            if (Math.abs(x - ring.x) > ring.reach || Math.abs(y - ring.y) > ring.reach) continue;
            const distance = Math.abs(Math.hypot(x - ring.x, y - ring.y) - ring.radius);
            if (distance >= ringWidth) continue;
            const t = 1 - distance / ringWidth;
            energy = Math.max(energy, t * t * (3 - 2 * t) * ring.fade);
          }
          if (energy < 0.01) {
            context.moveTo(x + dotRadius, y);
            context.arc(x, y, dotRadius, 0, TAU);
          } else energized.push(x, y, energy);
        }
      }
      context.fill();

      for (let index = 0; index < energized.length; index += 3) {
        const energy = energized[index + 2];
        context.globalAlpha = baseOpacity + (1 - baseOpacity) * energy;
        context.beginPath();
        context.arc(energized[index], energized[index + 1], dotRadius * (1 + amplitude * energy), 0, TAU);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const schedule = (delay) => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => tick(performance.now()), Math.max(16, delay));
    };

    const tick = (now) => {
      frameId = 0;
      if (!visible || document.hidden) return;
      if (reducedMotion.matches) {
        ringsRef.current = [];
        draw(now);
        return;
      }
      if (pingEvery > 0 && now >= nextPing) {
        addRing(width * (.16 + Math.random() * .68), height * (.18 + Math.random() * .64), now);
        nextPing = now + pingEvery * 1000;
      }
      draw(now);
      if (ringsRef.current.length) frameId = requestAnimationFrame(tick);
      else if (pingEvery > 0) schedule(nextPing - now);
    };

    const wake = () => {
      if (visible && !document.hidden && !frameId) {
        window.clearTimeout(timerId);
        frameId = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!seeded && !reducedMotion.matches) {
        seeded = true;
        addRing(width * .67, height * .38, performance.now() - 450);
      }
      draw(performance.now());
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) wake();
    });
    const resizeObserver = new ResizeObserver(resize);
    const onVisibility = () => { if (!document.hidden) wake(); };

    resizeObserver.observe(host);
    observer.observe(host);
    document.addEventListener('visibilitychange', onVisibility);
    reducedMotion.addEventListener('change', wake);
    resize();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', wake);
      cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [amplitude, baseOpacity, color, dotRadius, pingEvery, ringWidth, spacing, speed]);

  return (
    <section
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: 'relative', zIndex: 1, minHeight: '100svh', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, #101010 0%, #050505 46%, #000 100%)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </section>
  );
}
