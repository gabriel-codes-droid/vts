import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_CENTER, GROUND_RADIUS, DEBRIS_POSITION, DEBRIS_WIDTH } from './sceneConstants';

function Ground() {
  const model = useMemo(() => {
    // Temporary placeholder ground since GLB files are corrupted
    const geometry = new THREE.SphereGeometry(GROUND_RADIUS, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: '#3a3a3a',
      roughness: 0.9,
      metalness: 0.1,
    });
    return new THREE.Mesh(geometry, material);
  }, []);

  return (
    <group position={GROUND_CENTER}>
      <primitive object={model} />
    </group>
  );
}

function DistantDebris() {
  const model = useMemo(() => {
    // Temporary placeholder debris since GLB files are corrupted
    const geometry = new THREE.BoxGeometry(DEBRIS_WIDTH, DEBRIS_WIDTH * 0.6, DEBRIS_WIDTH * 0.8);
    const material = new THREE.MeshStandardMaterial({
      color: '#4a4a4a',
      roughness: 0.8,
      metalness: 0.2,
    });
    return new THREE.Mesh(geometry, material);
  }, []);

  return (
    <group position={DEBRIS_POSITION}>
      <primitive object={model} />
    </group>
  );
}

// Used as scattered background debris now, not the ground itself — a single
// distant instance. Its 106MB size is a one-time atmosphere cost, not
// something worth paying for detail nobody will see up close at this
// distance, and not something to replicate into multiple instances.
export default function CrashSite({ visible = true }) {
  return (
    <group visible={visible}>
      <Ground />
      <DistantDebris />
    </group>
  );
}