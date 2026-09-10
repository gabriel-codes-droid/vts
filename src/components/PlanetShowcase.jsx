import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MOON_CENTER, MOON_RADIUS, PLANET_ROW_Y, PLANET_ROW_Z, PLANET_ROW_SPACING } from './sceneConstants';

// Positioned via the shared gallery-row formula from sceneConstants.js (same
// pattern as the portfolio-3d reference project's ProjectSystems.tsx: evenly
// spaced along X, shared Y/Z) — below MOON_CENTER, which itself sits below
// the cube field's vertical extent so the two scenes don't visually
// intermix. Only 2 planet models exist for now; a full 4-project gallery
// (matching the reference's healthcare/dineconnect/kartz/PMD set) needs 2
// more models or a switch to the reference's procedural-sphere approach.
const PLANET_ASSETS = [
  { path: '/models/little_planet_earth.glb', tint: '#22d3ee' },
  { path: '/models/planet_earth.glb', tint: '#8b5cf6' },
];
const PLANETS = PLANET_ASSETS.map((asset, index) => ({
  ...asset,
  scale: 1.05,
  position: [
    MOON_CENTER[0] + (index - (PLANET_ASSETS.length - 1) / 2) * PLANET_ROW_SPACING,
    PLANET_ROW_Y,
    PLANET_ROW_Z,
  ],
}));

function PlanetModel({ path, position, scale, tint, index }) {
  const ref = useRef(null); const { scene } = useGLTF(path);
  const model = useMemo(() => { const clone = scene.clone(true); const box = new THREE.Box3().setFromObject(clone); const size = box.getSize(new THREE.Vector3()); clone.scale.setScalar(scale / (Math.max(size.x, size.y, size.z) / 2 || 1)); return clone; }, [scene, scale]);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * (0.18 + index * 0.05); });
  return <group position={position} ref={ref}><primitive object={model} /><mesh scale={1.18}><sphereGeometry args={[scale, 24, 24]} /><meshBasicMaterial color={tint} transparent opacity={0.08} depthWrite={false} /></mesh><pointLight color={tint} intensity={0.7} distance={8} /></group>;
}

export default function PlanetShowcase({ showMoon, showPlanets }) {
  const moon = useGLTF('/models/moon.glb');
  // Auto-scaled to MOON_RADIUS from sceneConstants.js — the same constant
  // TacticalAstronaut.jsx uses to compute MOON_SEAT_POSITION, so the
  // astronaut's feet always land exactly on this moon's actual surface
  // instead of two independently-guessed numbers happening to roughly agree.
  const moonModel = useMemo(() => { const clone = moon.scene.clone(true); const box = new THREE.Box3().setFromObject(clone); const size = box.getSize(new THREE.Vector3()); clone.scale.setScalar(MOON_RADIUS / (Math.max(size.x, size.y, size.z) / 2 || 1)); return clone; }, [moon.scene]);
  return <group>
    <group visible={showPlanets}>
      {PLANETS.map((planet, index) => <PlanetModel key={planet.path} {...planet} index={index} />)}
    </group>
    <group visible={showMoon} position={MOON_CENTER}>
      <primitive object={moonModel} />
      <pointLight color="#cbd5e1" intensity={0.9} distance={8} />
    </group>
  </group>;
}
PLANET_ASSETS.forEach(({ path }) => useGLTF.preload(path));
useGLTF.preload('/models/moon.glb');
