import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CUBE_MODEL = '/models/aliencubealpha-unit.glb';
const CUBE_SIZE_MULTIPLIER = 1.22;

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
  const { scene } = useGLTF(CUBE_MODEL);

  const cubeModel = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const dimensions = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);
    const center = bounds.getCenter(new THREE.Vector3());
    const normalizedScale = maxDimension > 0
      ? (size * CUBE_SIZE_MULTIPLIER) / maxDimension
      : 1;

    clone.position.copy(center).multiplyScalar(-normalizedScale);
    clone.scale.setScalar(normalizedScale);

    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const tunedMaterials = materials.map((material) => {
        const tuned = material.clone();
        if (tuned.map) {
          tuned.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <map_fragment>',
              `#include <map_fragment>
              vec3 cubeSurfaceColor = diffuseColor.rgb;
              float cubeLuma = dot(cubeSurfaceColor, vec3(0.299, 0.587, 0.114));
              float cubeGreenDominance = max(0.0, cubeSurfaceColor.g - max(cubeSurfaceColor.r, cubeSurfaceColor.b));
              float cubeGlowMask = smoothstep(0.02, 0.15, cubeGreenDominance) * smoothstep(0.08, 0.48, cubeLuma);
              float cubeCoreBrightness = smoothstep(0.16, 0.78, cubeLuma);
              vec3 cubeCyanColor = mix(
                vec3(0.008, 0.20, 0.34),
                vec3(0.0, 0.72, 1.0),
                cubeCoreBrightness
              );
              diffuseColor.rgb = mix(cubeSurfaceColor, cubeCyanColor, cubeGlowMask);`,
            );
          };
          tuned.needsUpdate = true;
        }
        return tuned;
      });
      object.material = Array.isArray(object.material) ? tunedMaterials : tunedMaterials[0];
    });

    return clone;
  }, [scene, size]);

  const driftDir = useMemo(
    () => ({ x: Math.cos(phase * 2.1), z: Math.sin(phase * 1.7) }),
    [phase]
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
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

useGLTF.preload(CUBE_MODEL);

export default ContainmentStructure;
