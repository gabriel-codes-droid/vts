import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PLANET_ROW_SPACING, PLANET_ROW_Y, PLANET_ROW_Z } from './sceneConstants';

// Real moon model, auto-scaled to a known radius so MOON_SEAT_POSITION
// always lands exactly on its actual surface.
export function MoonModel({ position, targetRadius }) {
  const { scene } = useGLTF('/models/moon.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const naturalRadius = Math.max(size.x, size.y, size.z) / 2;
    return naturalRadius > 0 ? targetRadius / naturalRadius : 1;
  }, [cloned, targetRadius]);

  const centeredMoon = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const centered = cloned.clone(true);
    // The parent group applies `scale`, so the local offset stays in source
    // units and is scaled exactly once with the mesh.
    centered.position.copy(center).multiplyScalar(-1);
    return centered;
  }, [cloned, scale]);

  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0006;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <primitive object={centeredMoon} />
    </group>
  );
}

// Real GLB planet — loads the actual model from /models and auto-scales it
// to the requested size so all planets in the row read consistently.
function PlanetGLB({ position, size, color, name, modelPath }) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef();

  const scaled = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const n = new THREE.Vector3();
    box.getSize(n);
    const naturalMax = Math.max(n.x, n.y, n.z) / 2;
    const s = naturalMax > 0 ? size / naturalMax : 1;
    clone.scale.setScalar(s);
    // Normalize each source file's origin so every planet's visual center
    // sits exactly on the shared horizontal gallery line.
    const center = box.getCenter(new THREE.Vector3());
    clone.position.copy(center).multiplyScalar(-s);
    return clone;
  }, [scene, size]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scaled} />
      <pointLight color={color} intensity={0.7} distance={size * 10} />
      {/* Compact label — small enough that adjacent planets don't squeeze each
          other's text. */}
      <Html position={[0, size + 0.35, 0]} center distanceFactor={14} zIndexRange={[5, 0]}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#e2e8f0',
            background: 'rgba(0,0,0,0.75)',
            padding: '3px 8px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            border: `1px solid ${color}55`,
            backdropFilter: 'blur(6px)',
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
}

// 4 project planets — each slot uses a clean spherical asset and the shared
// auto-normalize/recenter logic keeps every model on the same gallery line.
const PROJECTS = [
  {
    name: 'Healthcare',
    color: '#00d4ff',
    modelPath: '/models/alien_planet.glb',
    size: 0.9,
  },
  {
    name: 'DineConnect',
    color: '#ff6b35',
    modelPath: '/models/lava_planet.glb',
    size: 1.0,
  },
  {
    name: 'Kartz',
    color: '#a855f7',
    modelPath: '/models/little_planet_earth.glb',
    size: 0.9,
  },
  {
    name: 'Dashboard',
    color: '#06b6d4',
    modelPath: '/models/planet_earth.glb',
    size: 0.95,
  },
];

export default function MoonScene({ moonPosition, moonRadius, planetsVisible = true }) {
  const spacing = PLANET_ROW_SPACING;
  const planetY = PLANET_ROW_Y;

  // Preload all planet + moon models so they pop in instantly.
  useGLTF.preload('/models/moon.glb');
  useGLTF.preload('/models/alien_planet.glb');
  useGLTF.preload('/models/lava_planet.glb');
  useGLTF.preload('/models/little_planet_earth.glb');
  useGLTF.preload('/models/planet_earth.glb');

  return (
    <group>
      <MoonModel position={moonPosition} targetRadius={moonRadius} />
      {planetsVisible && PROJECTS.map((project, i) => (
        <PlanetGLB
          key={project.name}
          position={[
            moonPosition[0] + (i - (PROJECTS.length - 1) / 2) * spacing,
            planetY,
            PLANET_ROW_Z,
          ]}
          size={project.size}
          color={project.color}
          name={project.name}
          modelPath={project.modelPath}
        />
      ))}
    </group>
  );
}
