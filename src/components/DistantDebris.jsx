import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { DEBRIS_POSITION, DEBRIS_WIDTH } from './sceneConstants';

const DEBRIS_MODEL = '/models/halo_4multiplayercrimsonwreckage.glb';

// Extracted from the old CrashSite.jsx (which was removed entirely when the
// ground approach — alien_planet_lv-426.glb as ground — was abandoned for
// the ISS module instead). The debris rendering itself was never broken; it
// just got deleted along with the ground it used to live next to. Re-wired
// as its own standalone piece so it doesn't depend on any "ground" concept
// existing at all.

// Force every material under a loaded GLB to real opaque PBR so nothing
// reads as ghostly or phasable.
function forceSolid(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      m.depthTest = true;
      m.side = THREE.FrontSide;
      if (m.clearcoat !== undefined) { m.clearcoat = 0; m.clearcoatRoughness = 1; }
      if (m.clearcoatMap) { m.clearcoatMap = undefined; }
      if (m.transmission !== undefined) { m.transmission = 0; }
      if (m.transmissionMap) { m.transmissionMap = undefined; }
      if (m.ior !== undefined) { m.ior = 1; }
      if (m.thickness !== undefined) { m.thickness = 0; }
      if (m.attenuationColor !== undefined) { m.attenuationColor = new THREE.Color(1, 1, 1); }
      if (m.emissiveMap && !m.map) { m.emissiveMap = undefined; }
    }
  });
}

export default function DistantDebris({ visible = true }) {
  const { scene } = useGLTF(DEBRIS_MODEL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    forceSolid(clone);
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
    <group visible={visible} position={DEBRIS_POSITION}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(DEBRIS_MODEL);
