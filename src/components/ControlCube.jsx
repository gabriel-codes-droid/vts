import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';

const ControlCube = ({ 
  position = [0, 0, 0], 
  scale = 1, 
  rotationSpeedX = 0.5, 
  rotationSpeedY = 0.7, 
  floatSpeed = 1.0, 
  floatAmplitude = 0.3 
}) => {
  const outerCubeRef = useRef();
  const innerCubeRef = useRef();

  useFrame((state) => {
    const elapsedTime = state.clock.getElapsedTime();

    if (outerCubeRef.current) {
      outerCubeRef.current.rotation.x += rotationSpeedX * 0.008;
      outerCubeRef.current.rotation.y += rotationSpeedY * 0.008;
      
      const floatOffset = Math.sin(elapsedTime * floatSpeed) * floatAmplitude;
      outerCubeRef.current.position.y = position[1] + floatOffset;
    }

    if (innerCubeRef.current) {
      innerCubeRef.current.rotation.x -= rotationSpeedX * 0.012;
      innerCubeRef.current.rotation.y -= rotationSpeedY * 0.012;
      
      const innerFloatOffset = Math.sin(elapsedTime * floatSpeed * 1.3) * (floatAmplitude * 0.4);
      innerCubeRef.current.position.y = innerFloatOffset;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={outerCubeRef}>
        <boxGeometry args={[1.5, 1.5, 1.5, 4, 4, 4]} />
        <MeshTransmissionMaterial
          thickness={2.2}
          chromaticAberration={0.15}
          roughness={0.03}
          transmission={1.0}
          ior={1.48}
          color="#0a2235"
        />
      </mesh>

      <mesh ref={innerCubeRef}>
        <boxGeometry args={[0.8, 0.8, 0.8, 2, 2, 2]} />
        <meshStandardMaterial
          color="#0088ff"
          emissive="#00ffff"
          emissiveIntensity={3.0}
          transparent={true}
          opacity={0.85}
        />
      </mesh>
    </group>
  );
};

export default ControlCube;
