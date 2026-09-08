import { useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

extend({ RoundedBoxGeometry });

// A deliberately cheaper cube for the background/far field. The hero cubes
// in ControlCube.jsx use MeshTransmissionMaterial for real refraction —
// gorgeous up close, but it does an extra render pass per instance, so
// scaling that same cost to 30-40 far-away instances (where the refraction
// detail wouldn't even read at that distance) would cost real frame rate
// for no visible benefit. This uses plain standard/basic materials instead:
// same dark-glass-with-glowing-core silhouette, a fraction of the GPU cost.
const GLASS_COLOR = '#12293f';
const CORE_COLOR = '#00cfff';

const FarCube = ({
  position = [0, 0, 0],
  scale = 1,
  rotationSpeedX = 0.3,
  rotationSpeedY = 0.4,
  floatSpeed = 0.5,
  floatAmplitude = 0.25,
  phase = 0,
}) => {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x += rotationSpeedX * 0.003;
    ref.current.rotation.y += rotationSpeedY * 0.003;
    ref.current.position.y = position[1] + Math.sin(t * floatSpeed + phase) * floatAmplitude;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh>
        <roundedBoxGeometry args={[1.3, 1.3, 1.3, 3, 0.1]} />
        <meshStandardMaterial
          color={GLASS_COLOR}
          roughness={0.35}
          metalness={0.15}
          transparent
          opacity={0.55}
          emissive={GLASS_COLOR}
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh scale={0.42}>
        <roundedBoxGeometry args={[1, 1, 1, 2, 0.08]} />
        <meshBasicMaterial color={CORE_COLOR} transparent opacity={0.5} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

export default FarCube;
