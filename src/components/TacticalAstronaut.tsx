import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type AnimationState = 'idle' | 'hopping' | 'launching' | 'flying' | 'landing' | 'seated';

interface TacticalAstronautProps {
  phase: AnimationState;
  position?: [number, number, number];
  scale?: number;
  hopPoints?: [number, number, number][];
  hopPositionRef?: React.MutableRefObject<THREE.Vector3>;
}

export default function TacticalAstronaut({ 
  phase,
  position = [0, 0, 0], 
  scale = 0.01,
  hopPoints = [[0, 0, 0]],
  hopPositionRef
}: TacticalAstronautProps) {
  const group = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState(true);
  const hopIndex = useRef(0);
  const hopStart = useRef<number | null>(null);
  const HOP_DURATION = 3.0;

  useFrame((state) => {
    if (!group.current || !loaded) return;
    const t = state.clock.getElapsedTime();

    if (phase === 'idle') {
      hopStart.current = null;
      hopIndex.current = 0;
      const p0 = hopPoints[0];
      group.current.position.set(p0[0], p0[1], p0[2]);
      group.current.position.y += Math.sin(t * 2) * 0.01;
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    if (phase === 'hopping') {
      if (hopStart.current === null) hopStart.current = t;
      const cycle = (t - hopStart.current) / HOP_DURATION;
      if (cycle >= 1) {
        hopStart.current = t;
        hopIndex.current = (hopIndex.current + 1) % hopPoints.length;
      }
      const progress = Math.min(Math.max(((t - hopStart.current) / HOP_DURATION) % 1, 0), 1);

      const from = hopPoints[hopIndex.current];
      const to = hopPoints[(hopIndex.current + 1) % hopPoints.length];
      const arc = Math.sin(progress * Math.PI) * 1.0;

      group.current.position.set(
        THREE.MathUtils.lerp(from[0], to[0], progress),
        THREE.MathUtils.lerp(from[1], to[1], progress) + arc,
        THREE.MathUtils.lerp(from[2], to[2], progress)
      );

      const dx = to[0] - from[0];
      const dz = to[2] - from[2];
      if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
        group.current.rotation.y = Math.atan2(dx, dz);
      }

      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    group.current.position.set(0, 0, 0);
  });

  if (!loaded) return null;

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[1, 2, 0.5]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}
