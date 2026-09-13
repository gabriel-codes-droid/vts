import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sparkles } from '@react-three/drei';


// Matches the reference: an almost-pure-black field, sparse tiny pinpoint
// stars (no color cast at all — the previous 10% cyan tint read as a subtle
// blue haze across the field, which the reference doesn't have), plus a
// handful of distinctly brighter "glint" stars scattered through it.
const CustomStarField = ({ count = 1800, radius = 100 }) => {
  const pointsRef = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const r = radius * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);

      // Neutral white throughout, with only the faintest brightness
      // variation — no color tint at all, matching the reference's
      // completely neutral, almost monochrome starfield.
      const brightness = 0.75 + Math.random() * 0.25;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    }

    return { positions: pos, colors: colors };
  }, [count, radius]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.008) * 0.08;
    }
  });

  return (
    <group>
      <Points ref={pointsRef} positions={positions.positions} colors={positions.colors} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          vertexColors
          size={0.012}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
      {/* Sparse, larger, near-white glints — the few standout bright stars
          with visible diffraction-spike glow seen in the reference, not a
          dense cyan-tinted sparkle layer. */}
      <Sparkles count={35} scale={[95, 65, 95]} size={3.2} speed={0.08} opacity={0.9} noise={0.4} color="#f4f8ff" />
    </group>
  );
};

export default CustomStarField;
