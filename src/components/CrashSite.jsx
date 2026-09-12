import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { CRASH_SITE_POSITION } from './sceneConstants';

const CRASH_SITE_MODEL = '/models/halo_4multiplayercrimsonwreckage.glb';
const CRASH_SITE_WIDTH = 24;

export default function CrashSite({ visible = true }) {
  const { scene } = useGLTF(CRASH_SITE_MODEL);
  const model = useMemo(() => {
    const clone = scene.clone(true);

    // The Halo wreckage is authored Z-up. Convert it to the portfolio's
    // Y-up world before measuring and centering it.
    clone.rotation.x = -Math.PI / 2;
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      // The source scene includes an ocean backdrop that reads as a giant
      // blue card in this portfolio. Keep the actual wreckage, hide only that
      // backdrop so the starfield remains the scene background.
      if (materials.some((material) => material?.name === 'wreckage_ocean')) {
        object.visible = false;
      }
    });
    clone.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const widthScale = size.x > 0 ? CRASH_SITE_WIDTH / size.x : 1;

    clone.position.copy(center).multiplyScalar(-widthScale);
    clone.scale.setScalar(widthScale);
    return clone;
  }, [scene]);

  return (
    <group position={CRASH_SITE_POSITION} visible={visible}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(CRASH_SITE_MODEL);
