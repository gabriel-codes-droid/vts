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
      // The camera starts just inside the hatch, so the scan's interior
      // surfaces must remain drawable from that side as well as from outside.
      m.side = THREE.DoubleSide;
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

// The opening scene: the mech sleeps inside this ISS module. The downloaded
// scan is authored Z-up; rotating the group -90 degrees around X presents it
// as the horizontal corridor shown in the reference, with the open hatch on
// the +Z side where the first hop begins.
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
    // Its imported transforms already put the 15.88-unit corridor along Z.
    // Rotating again stood the entire shuttle upright and hid the interior.
    return clone;
  }, [scene]);

  return (
    <group
      visible={visible}
      position={MODULE_WORLD_POSITION}
    >
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(MODULE_MODEL);
