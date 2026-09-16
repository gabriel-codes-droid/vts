import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { MODULE_WORLD_POSITION, MODULE_LOCAL_CENTER } from './sceneConstants';

const MODULE_MODEL = '/models/international_space_station_-_3d_scan_-_module.glb';

// Force every material under a loaded GLB to real opaque PBR so nothing
// reads as ghostly or phasable. Source files can ship transparent, double-
// sided, or transmission materials that turn meshes into ghosts at runtime;
// this locks them to physical front-face solid surfaces.
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

// The opening scene: the mech sleeps in the middle of this ISS module.
// Measured directly (not guessed) at 4.59 x 4.99 x 15.88 units, centered
// near its own origin with no oversized backdrop planes or weird offset —
// unlike the previous crash-site ground attempt (alien_planet_lv-426.glb),
// which fought two separate real bugs (an unfiltered giant backdrop plane,
// then a Box3-visibility bug) before ultimately being abandoned. This one
// doesn't need that same size-threshold filtering since it's already a
// single clean asset.
export default function SleepModule({ visible = true }) {
  const { scene } = useGLTF(MODULE_MODEL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    forceSolid(clone);
    // Recentered using the measured bounding-box center (see
    // sceneConstants.js) so MODULE_WORLD_POSITION lands on the model's true
    // middle, not its arbitrary local origin — same principle as every
    // other recentered model this session, just using a known-good
    // measured value instead of computing it at runtime.
    clone.position.set(
      -MODULE_LOCAL_CENTER[0],
      -MODULE_LOCAL_CENTER[1],
      -MODULE_LOCAL_CENTER[2],
    );
    return clone;
  }, [scene]);

  return (
    <group visible={visible} position={MODULE_WORLD_POSITION}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(MODULE_MODEL);
