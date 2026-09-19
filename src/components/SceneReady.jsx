import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import * as THREE from 'three';

export function reportBoot(stage, progress, error = '') {
  const hud = document.getElementById('boot-hud');
  if (!hud) return;
  hud.dataset.stage = stage;
  hud.dataset.progress = String(progress);
  hud.dataset.error = error;
  window.dispatchEvent(new Event('portfolio:boot'));
}

export function AssetProgress() {
  const { loaded, total, errors } = useProgress();
  useEffect(() => {
    if (errors.length) reportBoot('error', 0, 'An asset could not load. Reload to retry.');
    else if (document.getElementById('boot-hud')?.dataset.stage === 'loading') {
      reportBoot('loading', total ? Math.min(0.8, loaded / total * 0.8) : 0);
    }
  }, [loaded, total, errors]);
  return null;
}

// Mounted inside the ONE shared Suspense boundary: every model, texture,
// environment and FBX has resolved, and the retargeted clips are constructed.
export default function SceneReady({ onReady }) {
  const { gl, scene, camera } = useThree();
  const prepared = useRef(false);
  const frames = useRef(0);
  // Keep the loading HUD up for a short settled window after compilation.
  // The first few frames can still upload post-processing/bloom resources,
  // which otherwise makes the hand-off feel like a hitch even though all
  // network assets have already finished loading.
  const STABILIZATION_FRAMES = 24;
  const fence = useRef(null);
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    async function prepare() {
      reportBoot('preparing', 0.82);
      // CSS backgrounds are outside Three's loading manager.
      const background = new Image();
      background.src = '/images/stars-clean.png';
      await background.decode();
      await frame(); // allow the environment and bone attachments to commit
      if (cancelled) return;
      const textures = new Set();
      scene.traverse(object => {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!material) continue;
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      });
      let uploaded = 0;
      for (const texture of textures) {
        if (cancelled) return;
        gl.initTexture(texture);
        reportBoot('preparing', 0.82 + (++uploaded / textures.size) * 0.08);
        await frame();
      }
      // Include hidden moon/planets/cubes/jetpack in compilation. Restore
      // visibility before yielding so none can flash into another scene.
      const objects = [];
      scene.traverse(object => {
        objects.push([object, object.visible, object.frustumCulled]);
        object.visible = true;
        object.frustumCulled = false;
      });
      let compilation;
      try {
        compilation = gl.compileAsync(scene, camera);
      } finally {
        for (const [object, visible, culled] of objects) {
          object.visible = visible;
          object.frustumCulled = culled;
        }
      }
      await compilation;
      if (cancelled) return;
      // Submit all geometry once offscreen, including meshes outside the
      // opening camera. This pays first-use buffer uploads during loading.
      const target = new THREE.WebGLRenderTarget(64, 64);
      const previous = gl.getRenderTarget();
      try {
        for (const [object] of objects) { object.visible = true; object.frustumCulled = false; }
        gl.setRenderTarget(target);
        gl.render(scene, camera);
      } finally {
        gl.setRenderTarget(previous);
        for (const [object, visible, culled] of objects) {
          object.visible = visible;
          object.frustumCulled = culled;
        }
        target.dispose();
      }
      reportBoot('rendering', 0.95);
      prepared.current = true;
    }
    prepare().catch(error => {
      if (!cancelled) {
        console.error('Scene preparation failed', error);
        reportBoot('error', 0, 'Scene preparation failed. Reload to retry.');
      }
    });
    return () => {
      cancelled = true;
      if (fence.current) gl.getContext().deleteSync(fence.current);
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    if (!prepared.current || finished.current) return;
    // Suspense resolves the scene assets; also require the loading manager
    // to be idle before the settled-frame/GPU gate can release the curtain.
    const loading = useProgress.getState();
    if (loading.errors.length) {
      finished.current = true;
      reportBoot('error', 0, 'An asset could not load. Reload to retry.');
      return;
    }
    if (loading.active || loading.loaded < loading.total) {
      frames.current = 0;
      if (fence.current) {
        gl.getContext().deleteSync(fence.current);
        fence.current = null;
      }
      return;
    }
    // Normal frames also initialize the full-resolution bloom composer.
    if (++frames.current < STABILIZATION_FRAMES) return;
    const context = gl.getContext();
    if (!fence.current) {
      fence.current = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
      context.flush();
      return;
    }
    const status = context.clientWaitSync(fence.current, 0, 0);
    if (status === context.TIMEOUT_EXPIRED) return;
    if (status === context.WAIT_FAILED) {
      finished.current = true;
      reportBoot('error', 0, 'Graphics preparation failed. Reload to retry.');
      return;
    }
    context.deleteSync(fence.current);
    fence.current = null;
    finished.current = true;
    onReady();
    reportBoot('ready', 1);
  });
  return null;
}
