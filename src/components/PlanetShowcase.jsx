import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
// Positioned *below* the astronaut's seated spot ([1.2, 0.05, -0.8] — see
// SpaceCanvas's flight-lerp destination) and pulled much closer in Z (was
// -7/-8.5, off in its own far background layer, disconnected from the
// landing). The intended composition: astronaut sits at the moon's edge and
// looks down at these floating below, not up/away at something distant.
const PLANETS = [
  { path: '/models/little_planet_earth.glb', position: [-0.4, -5.1, -1.6], scale: 1.1, tint: '#22d3ee' },
  { path: '/models/planet_earth.glb', position: [2.1, -6.3, -2.1], scale: 0.95, tint: '#8b5cf6' },
];
function PlanetModel({ path, position, scale, tint, index }) {
  const ref = useRef(null); const { scene } = useGLTF(path);
  const model = useMemo(() => { const clone = scene.clone(true); const box = new THREE.Box3().setFromObject(clone); const size = box.getSize(new THREE.Vector3()); clone.scale.setScalar(scale / (Math.max(size.x, size.y, size.z) / 2 || 1)); return clone; }, [scene, scale]);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * (0.18 + index * 0.05); });
  return <group position={position} ref={ref}><primitive object={model} /><mesh scale={1.18}><sphereGeometry args={[scale, 24, 24]} /><meshBasicMaterial color={tint} transparent opacity={0.08} depthWrite={false} /></mesh><pointLight color={tint} intensity={0.7} distance={8} /></group>;
}
export default function PlanetShowcase({ showMoon, showPlanets }) {
  const moon = useGLTF('/models/moon.glb');
  const moonModel = useMemo(() => { const clone = moon.scene.clone(true); const box = new THREE.Box3().setFromObject(clone); const size = box.getSize(new THREE.Vector3()); clone.scale.setScalar(2.4 / (Math.max(size.x, size.y, size.z) / 2 || 1)); return clone; }, [moon.scene]);
  return <group>
    <group visible={showPlanets}>
      {PLANETS.map((planet, index) => <PlanetModel key={planet.path} {...planet} index={index} />)}
    </group>
    <group visible={showMoon} position={[1.2, -2.35, -0.8]}>
      <primitive object={moonModel} />
      <pointLight color="#cbd5e1" intensity={0.9} distance={8} />
    </group>
  </group>;
}
PLANETS.forEach(({ path }) => useGLTF.preload(path));
useGLTF.preload('/models/moon.glb');
