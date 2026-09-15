import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { MODULE_WORLD_POSITION, MODULE_LOCAL_CENTER } from './sceneConstants';

const MODULE_MODEL = '/models/international_space_station_-_3d_scan_-_module.glb';

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
