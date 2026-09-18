import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getCubeMaterial } from './cubeMaterial';
import { isSceneVisible } from './sceneActivity';

const CUBE_MODEL = '/models/aliencubealpha-unit.glb';
const SCIFI_CUBE_MODEL = '/models/sci-fi_cube_01.glb';
const CUBE_SIZE_MULTIPLIER = 1.35;
const SCIFI_CUBE_SIZE_MULTIPLIER = 1.85;

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
  useSciFiCube = false,
}) => {
  const groupRef = useRef();
  const { scene: alienScene } = useGLTF(CUBE_MODEL);
  const { scene: scifiScene } = useGLTF(SCIFI_CUBE_MODEL);

  const cubeModel = useMemo(() => {
    // Pick the model variant. The sci-fi cube uses its own size multiplier
    // so its on-screen footprint matches the alien cube at the same `size`.
    const sourceScene = useSciFiCube ? scifiScene : alienScene;
    const sizeMultiplier = useSciFiCube ? SCIFI_CUBE_SIZE_MULTIPLIER : CUBE_SIZE_MULTIPLIER;
    const clone = sourceScene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const dimensions = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);
    const center = bounds.getCenter(new THREE.Vector3());
    const normalizedScale = maxDimension > 0
      ? (size * sizeMultiplier) / maxDimension
      : 1;

    clone.position.copy(center).multiplyScalar(-normalizedScale);
    clone.scale.setScalar(normalizedScale);

    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(getCubeMaterial)
        : getCubeMaterial(object.material);
    });

    return clone;
  }, [alienScene, scifiScene, size, useSciFiCube]);

  const driftDir = useMemo(
    () => ({ x: Math.cos(phase * 2.1), z: Math.sin(phase * 1.7) }),
    [phase]
  );

  const restingPosition = useMemo(() => {
    const multiplier = useSciFiCube ? SCIFI_CUBE_SIZE_MULTIPLIER : CUBE_SIZE_MULTIPLIER;
    return stationary
      ? [position[0], position[1] - (size * (multiplier * flattenY - 1)) / 2, position[2]]
      : position;
  }, [position, stationary, size, flattenY, useSciFiCube]);

  useFrame((state) => {
    if (stationary || !isSceneVisible(groupRef.current)) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.x += rotationSpeedX * 0.004;
    groupRef.current.rotation.y += rotationSpeedY * 0.004;
    const floatOffset = Math.sin(t * floatSpeed + phase) * floatAmplitude;
    const driftX = Math.sin(t * floatSpeed * 0.4 + phase) * driftAmplitude * driftDir.x;
    const driftZ = Math.cos(t * floatSpeed * 0.35 + phase) * driftAmplitude * driftDir.z;
    groupRef.current.position.set(position[0] + driftX, position[1] + floatOffset, position[2] + driftZ);
  });

  return (
    <group ref={groupRef} position={restingPosition} scale={stationary ? [scale, scale * flattenY, scale] : scale}>
      <primitive object={cubeModel} />
    </group>
  );
};

useGLTF.preload(CUBE_MODEL);
useGLTF.preload(SCIFI_CUBE_MODEL);

export default ContainmentStructure;
