import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CUBE_SIZE_MULTIPLIER = 1.22;

// Replace deprecated THREE.Clock with THREE.Timer
const clock = new THREE.Clock();

const ContainmentStructure = ({ 
  position = [0, 0, 0], 
  scale = 1, 
  rotationSpeedX = 0.5, 
  rotationSpeedY = 0.7, 
  floatSpeed = 1.0, 
  floatAmplitude = 0.3,
  phase = 0,
  driftAmplitude = 0.4,
  stationary = false,
  size = 1.3,
  flattenY = 1,
}) => {
  const groupRef = useRef();

  // Temporary placeholder cube since GLB files are corrupted
  const cubeModel = useMemo(() => {
    const geometry = new THREE.BoxGeometry(size * CUBE_SIZE_MULTIPLIER, size * CUBE_SIZE_MULTIPLIER, size * CUBE_SIZE_MULTIPLIER);
    const material = new THREE.MeshStandardMaterial({
      color: '#0A2235',
      emissive: '#00BFFF',
      emissiveIntensity: 0.45,
      metalness: 0.75,
      roughness: 0.38,
    });
    return new THREE.Mesh(geometry, material);
  }, [size]);

  // Stable per-instance drift direction
  const driftDir = useMemo(
    () => ({ x: Math.cos(phase * 2.1), z: Math.sin(phase * 1.7) }),
    [phase]
  );

  useFrame((state) => {
    const t = clock.getElapsedTime();

    if (groupRef.current) {
      // Gameplay platforms must stay level under the character. Only the
      // distant decorative cubes receive the slow ambient rotation.
      if (!stationary) {
        groupRef.current.rotation.x += rotationSpeedX * 0.004;
        groupRef.current.rotation.y += rotationSpeedY * 0.004;
      }

      if (stationary) {
        // Keep the enlarged/flattened hop platform's top face at the
        // original waypoint height so the character remains planted on it.
        groupRef.current.position.set(
          position[0],
          position[1] - (size * (CUBE_SIZE_MULTIPLIER * flattenY - 1)) / 2,
          position[2],
        );
      } else {
        const floatOffset = Math.sin(t * floatSpeed + phase) * floatAmplitude;
        const driftX = Math.sin(t * floatSpeed * 0.4 + phase) * driftAmplitude * driftDir.x;
        const driftZ = Math.cos(t * floatSpeed * 0.35 + phase) * driftAmplitude * driftDir.z;

        groupRef.current.position.set(
          position[0] + driftX,
          position[1] + floatOffset,
          position[2] + driftZ
        );
      }
    }
  });

  return (
    <group ref={groupRef} scale={stationary ? [scale, scale * flattenY, scale] : scale}>
      <primitive object={cubeModel} />
    </group>
  );
};

export default ContainmentStructure;
