import { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// RoundedBoxGeometry ships with three.js itself, so this needs no new
// install — it just isn't a JSX tag until registered once here. This is the
// actual fix for the "still looks like a cheap default cube" problem: a
// plain boxGeometry has perfectly sharp 90deg edges no matter how many
// segments you subdivide its flat faces into (subdivision only adds
// vertices across a face, it does not bevel an edge). A genuinely
// "machined, precision-engineered" look needs real beveled edges.
extend({ RoundedBoxGeometry });

const GLASS_COLOR = '#0A2235';

const ControlCube = ({ 
  position = [0, 0, 0], 
  scale = 1, 
  rotationSpeedX = 0.5, 
  rotationSpeedY = 0.7, 
  floatSpeed = 1.0, 
  floatAmplitude = 0.3,
  // Unique per-cube phase so identical/similar speed values never cause two
  // cubes to move in visible lockstep — "never synchronize with neighboring
  // cubes" from the brief.
  phase = 0,
  driftAmplitude = 0.4,
  // Skips the idle float/drift entirely — use for cubes the character
  // actually stands/hops on, so its feet stay locked to the surface
  // instead of the platform swimming independently underneath it.
  // Rotation still animates normally, just not position.
  stationary = false,
  size = 1.7,
}) => {
  const outerCubeRef = useRef();

  // Stable per-instance drift direction so each cube wanders on its own
  // subtly different diagonal rather than a uniform vertical bob.
  const driftDir = useMemo(
    () => ({ x: Math.cos(phase * 2.1), z: Math.sin(phase * 1.7) }),
    [phase]
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (outerCubeRef.current) {
      outerCubeRef.current.rotation.x += rotationSpeedX * 0.004;
      outerCubeRef.current.rotation.y += rotationSpeedY * 0.004;

      if (stationary) {
        outerCubeRef.current.position.set(position[0], position[1], position[2]);
      } else {
        const floatOffset = Math.sin(t * floatSpeed + phase) * floatAmplitude;
        const driftX = Math.sin(t * floatSpeed * 0.4 + phase) * driftAmplitude * driftDir.x;
        const driftZ = Math.cos(t * floatSpeed * 0.35 + phase) * driftAmplitude * driftDir.z;

        outerCubeRef.current.position.set(
          position[0] + driftX,
          position[1] + floatOffset,
          position[2] + driftZ
        );
      }
    }

  });

  // The mesh owns the world-space position. Keeping the wrapper at the
  // origin prevents the configured position from being applied twice, which
  // is especially important for the hop platforms shared with the character.
  return (
    <group scale={scale}>
      <mesh ref={outerCubeRef} renderOrder={1}>
        {/* args: width, height, depth, segments, bevel radius. Segments give
            the bevel itself geometry to curve across (a bevel with 1
            segment looks faceted/chamfered; higher segments read smoother,
            more "machined"), radius controls how heavy/pronounced the
            bevel is \u2014 kept fairly heavy here per the "dense, engineered"
            direction rather than a barely-there rounded corner. */}
        <roundedBoxGeometry args={[size, size, size, 6, size * 0.08]} />
        <MeshTransmissionMaterial
          // Lower transmission sampling keeps the glass look while avoiding
          // a full-resolution multi-pass render for every cube each frame.
          samples={4}
          resolution={256}
          thickness={1.7}
          chromaticAberration={0.06}
          roughness={0.18}
          transmission={0.76}
          ior={1.48}
          color={GLASS_COLOR}
          emissive={GLASS_COLOR}
          emissiveIntensity={0.42}
          attenuationColor={GLASS_COLOR}
          attenuationDistance={2.2}
          envMapIntensity={1.15}
        />
      </mesh>

    </group>
  );
};

export default ControlCube;
