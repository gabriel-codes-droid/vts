import { Html, useGLTF } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MOON_CENTER,
  MOON_RADIUS,
  PLANET_ROW_Y,
  PLANET_ROW_Z,
  PLANET_ROW_SPACING,
} from './sceneConstants';

// The planet scene is a project gallery: each planet has its own visual
// identity, orbit, and floating project label like the supplied reference.
const PROJECTS = [
  {
    path: '/models/alien_planet.glb',
    tint: '#38bdf8',
    icon: '+',
    title: 'HEALTHCARE',
    stack: 'React · Node.js · Express',
    description: 'Referral system',
  },
  {
    path: '/models/little_planet_earth.glb',
    tint: '#4ade80',
    icon: '⌁',
    title: 'DINECONNECT',
    stack: 'React · Firebase · Tailwind',
    description: 'Food and restaurant platform',
  },
  {
    path: '/models/lava_planet.glb',
    tint: '#fb923c',
    icon: '▥',
    title: 'PMD',
    stack: 'React · Node.js · MongoDB',
    description: 'Project management dashboard',
  },
  {
    path: '/models/planet_earth.glb',
    tint: '#c084fc',
    icon: '◌',
    title: 'KARTZ',
    stack: 'React · Firebase · Stripe',
    description: 'Creative marketplace',
  },
].map((project, index) => ({
  ...project,
  index,
  // Use larger scale for actual 3D planet models
  scale: 0.3,
  position: [
    MOON_CENTER[0] + (index - (4 - 1) / 2) * PLANET_ROW_SPACING,
    PLANET_ROW_Y,
    PLANET_ROW_Z,
  ],
}));

function ProjectLabel({ project }) {
  return (
    <Html position={[0, 1.18, 0]} center distanceFactor={7} zIndexRange={[2, 0]}>
      <div
        style={{
          width: 178,
          padding: '9px 11px',
          border: `1px solid ${project.tint}88`,
          borderRadius: 10,
          background: 'rgba(2, 10, 24, 0.78)',
          boxShadow: `0 0 24px ${project.tint}22`,
          color: '#e6f4ff',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'left',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 24,
              height: 24,
              border: `1px solid ${project.tint}`,
              borderRadius: 7,
              color: project.tint,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {project.icon}
          </span>
          <span style={{ color: project.tint, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }}>
            {project.title}
          </span>
        </div>
        <div style={{ marginTop: 6, color: '#9ac6e6', fontSize: 10, whiteSpace: 'nowrap' }}>{project.stack}</div>
        <div style={{ marginTop: 3, color: '#d6e8f6', fontSize: 10 }}>{project.description}</div>
      </div>
    </Html>
  );
}

function PlanetModel({ project, visible }) {
  const ref = useRef(null);
  const planet = useGLTF(project.path);

  const planetModel = useMemo(() => {
    const clone = planet.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    clone.scale.setScalar(project.scale / (Math.max(size.x, size.y, size.z) / 2 || 1));
    return clone;
  }, [planet.scene, project.scale]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * (0.12 + project.index * 0.025);
  });

  return (
    <group position={project.position} visible={visible} ref={ref}>
      <primitive object={planetModel} />
      <pointLight color={project.tint} intensity={0.6} distance={4} />
      {visible && <ProjectLabel project={project} />}
    </group>
  );
}

export default function PlanetShowcase({ showMoon, showPlanets }) {
  const moon = useGLTF('/models/moon.glb');
  const moonModel = useMemo(() => {
    const clone = moon.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    clone.scale.setScalar(MOON_RADIUS / (Math.max(size.x, size.y, size.z) / 2 || 1));
    return clone;
  }, [moon.scene]);

  return (
    <group>
      <group visible={showPlanets}>
        {PROJECTS.map((project) => (
          <PlanetModel key={`${project.title}-${project.path}`} project={project} visible={showPlanets} />
        ))}
      </group>
      <group visible={showMoon} position={MOON_CENTER}>
        <primitive object={moonModel} />
        <pointLight color="#cbd5e1" intensity={0.9} distance={8} />
      </group>
    </group>
  );
}

// Preload all planet models for better performance
useGLTF.preload('/models/alien_planet.glb');
useGLTF.preload('/models/little_planet_earth.glb');
useGLTF.preload('/models/lava_planet.glb');
useGLTF.preload('/models/planet_earth.glb');
useGLTF.preload('/models/moon.glb');
