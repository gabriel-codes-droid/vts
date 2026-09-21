import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { isSceneVisible } from './sceneActivity';
import { PLANET_ROW_SPACING, PLANET_ROW_Y, PLANET_ROW_Z } from './sceneConstants';

// Solid planet cores occlude the CSS star backdrop. Preserve the authored
// cloud alpha above them, and use independent materials so fade/compile state
// from a cached GLTF cannot leak into these surfaces.
function forceSolid(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = Array.isArray(child.material)
      ? child.material.map(material => material.clone()) : child.material.clone();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      const cloud = /cloud/i.test(m.name);
      m.transparent = cloud;
      if (!cloud) m.opacity = 1;
      m.depthWrite = !cloud;
      m.depthTest = true;
      m.alphaTest = 0;
      m.blending = THREE.NormalBlending;
      m.side = THREE.FrontSide;
      if (m.clearcoat !== undefined) { m.clearcoat = 0; m.clearcoatRoughness = 1; }
      if (m.clearcoatMap) { m.clearcoatMap = undefined; }
      if (m.transmission !== undefined) { m.transmission = 0; }
      if (m.transmissionMap) { m.transmissionMap = undefined; }
      if (m.ior !== undefined) { m.ior = 1; }
      if (m.thickness !== undefined) { m.thickness = 0; }
      if (m.attenuationColor !== undefined) { m.attenuationColor = new THREE.Color(1, 1, 1); }
      if (m.emissiveMap && !m.map) { m.emissiveMap = undefined; }
      m.needsUpdate = true;
    }
  });
}

// Real moon model, auto-scaled to a known radius so MOON_SEAT_POSITION
// always lands exactly on its actual surface.
export function MoonModel({ position, targetRadius }) {
  const { scene } = useGLTF('/models/moon.glb');
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    forceSolid(c);
    return c;
  }, [scene]);

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
    centered.position.copy(center).multiplyScalar(-1);
    return centered;
  }, [cloned, scale]);

  // The moon is the landing platform. Keep its measured contact point fixed;
  // the four project planets retain their own independent rotation below.

  return (
    <group position={position} scale={scale}>
      <primitive object={centeredMoon} />
    </group>
  );
}

// Real GLB planet — loads the actual model from /models and auto-scales it
// to the requested size so all planets in the row read consistently.
function ProjectLabel({ project, size }) {
  return (
    <Html
      position={[0, size + 0.55, 0]}
      center
      distanceFactor={8}
      zIndexRange={[6, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          width: 172,
          padding: '9px 11px 8px',
          color: '#f4fbff',
          background: 'linear-gradient(110deg, rgba(2, 9, 16, 0.9), rgba(4, 17, 29, 0.56))',
          border: `1px solid ${project.color}88`,
          borderLeft: `3px solid ${project.color}`,
          borderRadius: 3,
          boxShadow: `0 0 18px ${project.color}2f`,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          letterSpacing: '0.045em',
          lineHeight: 1.25,
          textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ color: project.color, fontSize: 8, fontWeight: 700, marginBottom: 3 }}>
          {project.number} / PROJECT
        </div>
        <div style={{ fontSize: 12, fontWeight: 800 }}>{project.title}</div>
        <div style={{ color: '#afbdc9', fontSize: 9, marginTop: 3, letterSpacing: '0.015em' }}>
          {project.subtitle}
        </div>
      </div>
    </Html>
  );
}

function PlanetGLB({ position, size, color, modelPath, project }) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef();

  const scaled = useMemo(() => {
    const clone = scene.clone(true);
    forceSolid(clone);
    const box = new THREE.Box3().setFromObject(clone);
    const n = new THREE.Vector3();
    box.getSize(n);
    const naturalMax = Math.max(n.x, n.y, n.z) / 2;
    const s = naturalMax > 0 ? size / naturalMax : 1;
    clone.scale.setScalar(s);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.copy(center).multiplyScalar(-s);
    return clone;
  }, [scene, size]);

  useFrame((state, delta) => {
    if (isSceneVisible(groupRef.current)) groupRef.current.rotation.y += delta * 0.18;
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        <primitive object={scaled} />
        <pointLight color={color} intensity={0.7} distance={size * 10} />
      </group>
      <ProjectLabel project={project} size={size} />
    </group>
  );
}

// 4 project planets — each slot uses a clean spherical asset and the shared
// auto-normalize/recenter logic keeps every model on the same gallery line.
const PROJECTS = [
  {
    name: 'Healthcare',
    number: '01',
    title: 'HEALTHCARE REFERRAL',
    subtitle: 'React · Node · PostgreSQL',
    color: '#00d4ff',
    modelPath: '/models/alien_planet.glb',
    size: 1.08,
  },
  {
    name: 'DineConnect',
    number: '02',
    title: 'DINECONNECT',
    subtitle: 'React · Firebase · Tailwind',
    color: '#ff6b35',
    modelPath: '/models/lava_planet.glb',
    size: 1.18,
  },
  {
    name: 'Kartz',
    number: '03',
    title: 'KARTZ',
    subtitle: 'React · Firebase · Stripe',
    color: '#a855f7',
    modelPath: '/models/little_planet_earth.glb',
    size: 1.08,
  },
  {
    name: 'Dashboard',
    number: '04',
    title: 'DASHBOARD',
    subtitle: 'React · Node · MongoDB',
    color: '#06b6d4',
    modelPath: '/models/planet_earth.glb',
    size: 1.12,
  },
];

export default function MoonScene({ moonPosition, moonRadius, planetsVisible = true }) {
  const spacing = PLANET_ROW_SPACING;
  const planetY = PLANET_ROW_Y;


  return (
    <group>
      <MoonModel position={moonPosition} targetRadius={moonRadius} />
      <group visible={planetsVisible}>
      {PROJECTS.map((project, i) => (
        <PlanetGLB
          key={project.name}
          position={[
            moonPosition[0] + (i - (PROJECTS.length - 1) / 2) * spacing,
            planetY,
            PLANET_ROW_Z,
          ]}
          size={project.size}
          color={project.color}
          modelPath={project.modelPath}
          project={project}
        />
      ))}
      </group>
    </group>
  );
}

// Start downloads once, without repeating preload calls on phase changes.
useGLTF.preload('/models/moon.glb');
for (const project of PROJECTS) useGLTF.preload(project.modelPath);
