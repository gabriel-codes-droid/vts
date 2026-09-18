import * as THREE from 'three';

const materials = new WeakMap();

// Model copies share geometry/textures and one tuned material per source
// material. The cached GLTF originals remain untouched.
export function getCubeMaterial(source) {
  if (materials.has(source)) return materials.get(source);
  const tuned = source.clone();
  tuned.transparent = false;
  tuned.opacity = 1;
  tuned.depthWrite = true;
  tuned.depthTest = true;
  tuned.side = THREE.FrontSide;
  if (tuned.clearcoat !== undefined) { tuned.clearcoat = 0; tuned.clearcoatRoughness = 1; }
  if (tuned.clearcoatMap) tuned.clearcoatMap = undefined;
  if (tuned.transmission !== undefined) tuned.transmission = 0;
  if (tuned.transmissionMap) tuned.transmissionMap = undefined;
  if (tuned.ior !== undefined) tuned.ior = 1;
  if (tuned.thickness !== undefined) tuned.thickness = 0;
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

  materials.set(source, tuned);
  return tuned;
}
