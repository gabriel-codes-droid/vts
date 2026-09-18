import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { isSceneVisible } from './sceneActivity';
import { PLANET_ROW_SPACING, PLANET_ROW_Y, PLANET_ROW_Z } from './sceneConstants';
import { smooth } from './journey';

// Fade in across the first part of the flying phase. The outer scene gate in
// SpaceCanvas keeps the moon/planets completely absent during sleeping,
// waking, idle, and hopping, so the cube route stays visually uncluttered.
const FADE_START = 0.54;
const FADE_END = 0.62;
function fadeOpacityFromProgress(progress) {
  return smooth((progress - FADE_START) / (FADE_END - FADE_START));
}

// Applies a fade opacity to every material on an already-forceSolid()'d
// object. transparent is only enabled while actually mid-fade; once fully
// opaque it's locked back to the same solid/opaque state forceSolid()
// established, so nothing here weakens the no-phase-through guarantee once
// the fade completes.
function applyFadeOpacity(object, opacity) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      const fading = opacity < 0.999;
      m.transparent = fading;
      m.opacity = fading ? opacity : 1;
      m.depthWrite = !fading;
    }
  });
}

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

// Real moon model, auto-scaled to a known radius so MOON_SEAT_POSITION
// always lands exactly on its actual surface.
export function MoonModel({ position, targetRadius, progressRef }) {
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

  const ref = useRef();
  // The moon is the landing platform. Keep its measured contact point fixed;
  // the four project planets retain their own independent rotation below.

  useFrame(() => {
    if (!ref.current || !progressRef) return;
    applyFadeOpacity(ref.current, fadeOpacityFromProgress(progressRef.current));
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <primitive object={centeredMoon} />
    </group>
  );
}

// Real GLB planet — loads the actual model from /models and auto-scales it
// to the requested size so all planets in the row read consistently.
function PlanetGLB({ position, size, color, name, modelPath, progressRef }) {
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

  useFrame((state) => {
    if (isSceneVisible(groupRef.current)) groupRef.current.rotation.y += 0.003;
    if (groupRef.current && progressRef) {
      applyFadeOpacity(groupRef.current, fadeOpacityFromProgress(progressRef.current));
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scaled} />
      <pointLight color={color} intensity={0.7} distance={size * 10} />

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

export default function MoonScene({ moonPosition, moonRadius, planetsVisible = true, progressRef }) {
  const spacing = PLANET_ROW_SPACING;
  const planetY = PLANET_ROW_Y;


  return (
    <group>
      <MoonModel position={moonPosition} targetRadius={moonRadius} progressRef={progressRef} />
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
          name={project.name}
          modelPath={project.modelPath}
          progressRef={progressRef}
        />
      ))}
      </group>
    </group>
  );
}

// Start downloads once, without repeating preload calls on phase changes.
useGLTF.preload('/models/moon.glb');
for (const project of PROJECTS) useGLTF.preload(project.modelPath);
