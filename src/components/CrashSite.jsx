import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_CENTER, GROUND_RADIUS, DEBRIS_POSITION, DEBRIS_WIDTH } from './sceneConstants';

// Ground = the landscape-scale alien_planet_lv-426.glb, not the small clean
// planet sphere (that one's used for the Healthcare project planet instead
// — see MoonScene.jsx). Debris = the Halo wreckage model, used sparingly
// (single distant instance) given its 106MB size.
const GROUND_MODEL = '/models/alien_planet_lv-426.glb';
const DEBRIS_MODEL = '/models/halo_4multiplayercrimsonwreckage.glb';

function Ground() {
  const { scene } = useGLTF(GROUND_MODEL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);

    // This file has 4 meshes: one real terrain piece (~21 units across) and
    // 3 giant flat backdrop/ground planes (1380 units across — measured
    // directly, not guessed) left over from the source environment kit.
    // None of them have a helpful material name to filter by, so filter by
    // measured size instead: anything over 100 units in any dimension is
    // one of the backdrop planes, not the actual terrain (100 has a wide
    // margin either way — 5x the real piece, 13x smaller than the planes).
    // Without this, normalizing the whole model together lets the giant
    // planes dominate the bounding box and the real terrain gets scaled
    // down to nothing, leaving just a huge flat/curved surface filling the
    // frame.
    const SIZE_THRESHOLD = 100;
    clone.traverse((object) => {
      if (!object.isMesh) return;
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      if (Math.max(size.x, size.y, size.z) > SIZE_THRESHOLD) {
        object.visible = false;
      }
    });

    // Box3.setFromObject() does NOT respect .visible — it includes every
    // mesh regardless, so it was still measuring the whole model including
    // the 3 backdrop planes just hidden above. That meant the scale factor
    // was still being computed against their 1380-unit size, shrinking the
    // actual visible terrain piece down to nearly nothing even though the
    // planes themselves were correctly hidden from rendering. Build the box
    // manually from only the meshes that are still visible instead.
    const box = new THREE.Box3();
    clone.traverse((object) => {
      if (object.isMesh && object.visible) box.expandByObject(object);
    });
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scaleFactor = GROUND_RADIUS / (Math.max(size.x, size.y, size.z) / 2 || 1);
    clone.scale.setScalar(scaleFactor);
    clone.position.copy(center).multiplyScalar(-scaleFactor);

    // Reduce material brightness to prevent white glow during sleeping phase
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material) {
          material.roughness = Math.max(material.roughness || 0.5, 0.8);
          material.metalness = Math.min(material.metalness || 0.5, 0.3);
          if (material.emissive) {
            material.emissiveIntensity = Math.min(material.emissiveIntensity || 1, 0.2);
          }
        }
      });
    });

    return clone;
  }, [scene]);

  return (
    <group position={GROUND_CENTER}>
      <primitive object={model} />
    </group>
  );
}

function DistantDebris() {
  const { scene } = useGLTF(DEBRIS_MODEL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    // Authored Z-up (Halo asset) — convert to this scene's Y-up.
    clone.rotation.x = -Math.PI / 2;
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      // Source scene includes an ocean backdrop that reads as a giant flat
      // card at this distance — hide it, keep only the actual wreckage.
      if (materials.some((material) => material?.name === 'wreckage_ocean')) {
        object.visible = false;
      }
    });
    clone.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const widthScale = size.x > 0 ? DEBRIS_WIDTH / size.x : 1;
    clone.position.copy(center).multiplyScalar(-widthScale);
    clone.scale.setScalar(widthScale);
    return clone;
  }, [scene]);

  return (
    <group position={DEBRIS_POSITION}>
      <primitive object={model} />
    </group>
  );
}

// Debris used as scattered background dressing, not the ground itself — a
// single distant instance. Its 106MB size is a one-time atmosphere cost,
// not something worth paying for detail nobody will see up close at this
// distance, and not something to replicate into multiple instances.
export default function CrashSite({ visible = true }) {
  return (
    <group visible={visible}>
      <Ground />
      {/* Hide debris during sleeping to prevent white glow from bloom */}
      <DistantDebris visible={false} />
    </group>
  );
}

useGLTF.preload(GROUND_MODEL);
useGLTF.preload(DEBRIS_MODEL);
