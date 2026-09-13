import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PLANET_ROW_SPACING, PLANET_ROW_Y, PLANET_ROW_Z } from './sceneConstants';

// Real moon model, auto-scaled to a known radius so MOON_SEAT_POSITION
// always lands exactly on its actual surface.
export function MoonModel({ position, targetRadius }) {
  const ref = useRef();
  
  // Temporary placeholder moon since GLB files are corrupted
  const moonMesh = useMemo(() => {
    const geometry = new THREE.SphereGeometry(targetRadius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: '#888888',
      roughness: 0.9,
      metalness: 0.1,
    });
    return new THREE.Mesh(geometry, material);
  }, [targetRadius]);

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0006;
  });

  return (
    <group ref={ref} position={position}>
      <primitive object={moonMesh} />
    </group>
  );
}

// Real GLB planet — loads the actual model from /models and auto-scales it
// to the requested size so all planets in the row read consistently.
function PlanetGLB({ position, size, color, name, modelPath }) {
  const groupRef = useRef();

  // Temporary placeholder planet since GLB files are corrupted
  const planetMesh = useMemo(() => {
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.2,
    });
    return new THREE.Mesh(geometry, material);
  }, [size, color]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive object={planetMesh} />
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
