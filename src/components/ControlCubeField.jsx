import ContainmentStructure from './ContainmentStructure';
import { HOP_CUBES, HOP_CUBE_SIZE } from './sceneConstants';

// A composed field with real scale and distance variety. Front cubes trimmed
// down further so they don't dominate; hop cubes kept at a clear, walkable
// size; far/back layer pushed deep and made numerous so dragging around the
// scene reveals cubes at every depth layer.
const ControlCubeField = ({
  cubeConfigurations = [],
  visible = true,
  platformsVisible = true,
  firstPlatformOnly = false,
}) => {
  const defaultConfigurations = [
    // Front cluster — noticeably smaller now
    { position: [-6.2, 1.8, -2.8], scale: 0.44, rotationSpeedX: 0.25, rotationSpeedY: 0.35, floatSpeed: 0.4, floatAmplitude: 0.3, phase: 0.4, driftAmplitude: 0.5 },
    { position: [6.4, -0.6, -2.6], scale: 0.4, rotationSpeedX: 0.3, rotationSpeedY: 0.22, floatSpeed: 0.35, floatAmplitude: 0.28, phase: 2.8, driftAmplitude: 0.45 },

    // Mid-distance — spread wider
    { position: [-3.5, -1.8, -5.5], scale: 0.38, rotationSpeedX: 0.4, rotationSpeedY: 0.5, floatSpeed: 0.55, floatAmplitude: 0.24, phase: 1.1, driftAmplitude: 0.35 },
    { position: [4.2, 2.8, -6.8], scale: 0.35, rotationSpeedX: 0.45, rotationSpeedY: 0.4, floatSpeed: 0.5, floatAmplitude: 0.22, phase: 4.2, driftAmplitude: 0.3 },
    { position: [0.8, 4.2, -7.5], scale: 0.3, rotationSpeedX: 0.35, rotationSpeedY: 0.55, floatSpeed: 0.6, floatAmplitude: 0.2, phase: 3.0, driftAmplitude: 0.32 },
    { position: [-6.8, 1.5, -7.2], scale: 0.3, rotationSpeedX: 0.42, rotationSpeedY: 0.48, floatSpeed: 0.58, floatAmplitude: 0.2, phase: 2.2, driftAmplitude: 0.3 },

    // Far, small, dispersed — more numerous for drag visibility
    { position: [-9.5, -4.2, -15.0], scale: 0.22, rotationSpeedX: 0.5, rotationSpeedY: 0.3, floatSpeed: 0.7, floatAmplitude: 0.16, phase: 5.5, driftAmplitude: 0.24 },
    { position: [10.2, 2.0, -16.5], scale: 0.2, rotationSpeedX: 0.55, rotationSpeedY: 0.45, floatSpeed: 0.65, floatAmplitude: 0.15, phase: 0.9, driftAmplitude: 0.22 },
    { position: [0.5, -5.8, -18.0], scale: 0.18, rotationSpeedX: 0.4, rotationSpeedY: 0.6, floatSpeed: 0.75, floatAmplitude: 0.14, phase: 6.1, driftAmplitude: 0.2 },
    { position: [-5.2, 6.2, -17.0], scale: 0.17, rotationSpeedX: 0.6, rotationSpeedY: 0.35, floatSpeed: 0.8, floatAmplitude: 0.12, phase: 1.6, driftAmplitude: 0.18 },
    { position: [6.8, -5.8, -20.0], scale: 0.15, rotationSpeedX: 0.38, rotationSpeedY: 0.52, floatSpeed: 0.72, floatAmplitude: 0.12, phase: 4.8, driftAmplitude: 0.18 },
    { position: [11.5, -2.5, -18.5], scale: 0.17, rotationSpeedX: 0.48, rotationSpeedY: 0.4, floatSpeed: 0.68, floatAmplitude: 0.13, phase: 3.6, driftAmplitude: 0.2 },
    { position: [-12.0, -1.5, -16.5], scale: 0.18, rotationSpeedX: 0.44, rotationSpeedY: 0.56, floatSpeed: 0.7, floatAmplitude: 0.13, phase: 5.9, driftAmplitude: 0.19 },
    { position: [3.2, 6.8, -20.5], scale: 0.14, rotationSpeedX: 0.52, rotationSpeedY: 0.38, floatSpeed: 0.78, floatAmplitude: 0.11, phase: 0.2, driftAmplitude: 0.16 },

    // Back layer — extra cubes so dragging pans across a deep field
    { position: [-8.2, 5.8, -22.0], scale: 0.15, rotationSpeedX: 0.46, rotationSpeedY: 0.32, floatSpeed: 0.66, floatAmplitude: 0.13, phase: 7.3, driftAmplitude: 0.17 },
    { position: [8.5, 5.2, -24.0], scale: 0.16, rotationSpeedX: 0.4, rotationSpeedY: 0.5, floatSpeed: 0.6, floatAmplitude: 0.14, phase: 8.4, driftAmplitude: 0.18 },
    { position: [-4.2, -7.2, -22.5], scale: 0.13, rotationSpeedX: 0.5, rotationSpeedY: 0.28, floatSpeed: 0.7, floatAmplitude: 0.12, phase: 9.1, driftAmplitude: 0.15 },
    { position: [4.8, -7.8, -25.0], scale: 0.14, rotationSpeedX: 0.42, rotationSpeedY: 0.44, floatSpeed: 0.64, floatAmplitude: 0.13, phase: 9.9, driftAmplitude: 0.16 },
    { position: [-11.2, 3.2, -25.5], scale: 0.13, rotationSpeedX: 0.38, rotationSpeedY: 0.5, floatSpeed: 0.62, floatAmplitude: 0.12, phase: 10.5, driftAmplitude: 0.15 },
    { position: [12.5, -3.5, -27.0], scale: 0.15, rotationSpeedX: 0.46, rotationSpeedY: 0.36, floatSpeed: 0.68, floatAmplitude: 0.13, phase: 11.2, driftAmplitude: 0.17 },
    { position: [-14.5, 6.2, -30.0], scale: 0.11, rotationSpeedX: 0.42, rotationSpeedY: 0.34, floatSpeed: 0.7, floatAmplitude: 0.1, phase: 12.1, driftAmplitude: 0.14 },
    { position: [15.2, 3.8, -32.5], scale: 0.12, rotationSpeedX: 0.36, rotationSpeedY: 0.46, floatSpeed: 0.65, floatAmplitude: 0.11, phase: 12.8, driftAmplitude: 0.15 },
    { position: [-9.5, -8.5, -31.0], scale: 0.1, rotationSpeedX: 0.5, rotationSpeedY: 0.3, floatSpeed: 0.74, floatAmplitude: 0.1, phase: 13.6, driftAmplitude: 0.13 },
    { position: [10.8, -7.8, -34.0], scale: 0.09, rotationSpeedX: 0.44, rotationSpeedY: 0.4, floatSpeed: 0.7, floatAmplitude: 0.1, phase: 14.3, driftAmplitude: 0.12 },

    // Additional visible depth ring — farther than the hero cubes, but still
    // large enough to read when the camera is dragged around the scene.
    { position: [-7.0, 4.8, -28.0], scale: 0.12, rotationSpeedX: 0.34, rotationSpeedY: 0.42, floatSpeed: 0.62, floatAmplitude: 0.11, phase: 26.1, driftAmplitude: 0.16 },
    { position: [7.2, 4.0, -30.5], scale: 0.11, rotationSpeedX: 0.38, rotationSpeedY: 0.36, floatSpeed: 0.58, floatAmplitude: 0.1, phase: 26.8, driftAmplitude: 0.15 },
    { position: [-6.5, -5.0, -33.0], scale: 0.1, rotationSpeedX: 0.42, rotationSpeedY: 0.3, floatSpeed: 0.66, floatAmplitude: 0.1, phase: 27.5, driftAmplitude: 0.14 },
    { position: [8.0, -4.5, -35.0], scale: 0.095, rotationSpeedX: 0.32, rotationSpeedY: 0.48, floatSpeed: 0.64, floatAmplitude: 0.09, phase: 28.2, driftAmplitude: 0.14 },
    { position: [-2.5, 7.0, -38.0], scale: 0.08, rotationSpeedX: 0.36, rotationSpeedY: 0.34, floatSpeed: 0.6, floatAmplitude: 0.08, phase: 28.9, driftAmplitude: 0.12 },
    { position: [3.8, -7.0, -40.5], scale: 0.075, rotationSpeedX: 0.3, rotationSpeedY: 0.4, floatSpeed: 0.68, floatAmplitude: 0.08, phase: 29.6, driftAmplitude: 0.11 },
    { position: [-10.5, 0.5, -43.0], scale: 0.07, rotationSpeedX: 0.34, rotationSpeedY: 0.44, floatSpeed: 0.62, floatAmplitude: 0.07, phase: 30.3, driftAmplitude: 0.1 },
    { position: [11.0, 1.5, -46.0], scale: 0.065, rotationSpeedX: 0.28, rotationSpeedY: 0.38, floatSpeed: 0.66, floatAmplitude: 0.07, phase: 31.0, driftAmplitude: 0.1 },

    // Deep back layer — visible when dragging around the scene
    { position: [-16.0, 8.5, -35.0], scale: 0.08, rotationSpeedX: 0.4, rotationSpeedY: 0.3, floatSpeed: 0.72, floatAmplitude: 0.08, phase: 15.5, driftAmplitude: 0.11 },
    { position: [17.5, 5.2, -38.0], scale: 0.09, rotationSpeedX: 0.35, rotationSpeedY: 0.4, floatSpeed: 0.68, floatAmplitude: 0.09, phase: 16.2, driftAmplitude: 0.12 },
    { position: [-12.5, -9.8, -36.5], scale: 0.08, rotationSpeedX: 0.45, rotationSpeedY: 0.25, floatSpeed: 0.75, floatAmplitude: 0.08, phase: 17.8, driftAmplitude: 0.1 },
    { position: [14.2, -10.2, -40.0], scale: 0.08, rotationSpeedX: 0.38, rotationSpeedY: 0.42, floatSpeed: 0.7, floatAmplitude: 0.09, phase: 18.5, driftAmplitude: 0.11 },
    { position: [-18.8, 4.5, -42.5], scale: 0.07, rotationSpeedX: 0.32, rotationSpeedY: 0.48, floatSpeed: 0.65, floatAmplitude: 0.07, phase: 19.1, driftAmplitude: 0.09 },
    { position: [20.0, -4.8, -45.0], scale: 0.07, rotationSpeedX: 0.4, rotationSpeedY: 0.32, floatSpeed: 0.72, floatAmplitude: 0.08, phase: 20.3, driftAmplitude: 0.1 },
    { position: [22.5, 7.5, -48.0], scale: 0.06, rotationSpeedX: 0.34, rotationSpeedY: 0.38, floatSpeed: 0.7, floatAmplitude: 0.07, phase: 21.5, driftAmplitude: 0.09 },
    { position: [-21.0, -6.5, -50.0], scale: 0.06, rotationSpeedX: 0.36, rotationSpeedY: 0.3, floatSpeed: 0.66, floatAmplitude: 0.07, phase: 22.8, driftAmplitude: 0.08 },
    { position: [25.0, -8.2, -52.0], scale: 0.05, rotationSpeedX: 0.3, rotationSpeedY: 0.42, floatSpeed: 0.68, floatAmplitude: 0.06, phase: 24.1, driftAmplitude: 0.07 },
    { position: [-24.5, 9.5, -55.0], scale: 0.05, rotationSpeedX: 0.28, rotationSpeedY: 0.34, floatSpeed: 0.64, floatAmplitude: 0.06, phase: 25.3, driftAmplitude: 0.07 },
  ];

  const configurations = cubeConfigurations.length > 0 ? cubeConfigurations : defaultConfigurations;

  // Deterministic (hash-based, not Math.random) so the cube mix is stable
  // across re-renders the way a real dispersed crash pile would be — not
  // flickering between variants every frame.
  const hash = (x, y, z) => {
    let h = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
    return h - Math.floor(h);
  };

  // Distance-bias the sci-fi cube fill: cubes nearer the impact center are
  // more likely to be the sci-fi variant so the crash debris cluster reads
  // as a real dispersed pile rather than a flat random sprinkle. Far cubes
  // stay as the alien cube so the deep field still reads as background.
  const originDist = (pos) => Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
  const maxDist = Math.max(...defaultConfigurations.map(c => originDist(c.position)));

  return (
    <group>
      {/* Hop-platform cubes: the character actually stands/hops on these,
          landing exactly on each one's top face (see sceneConstants.js).
          `stationary` keeps them from drifting out from under his feet.
          These remain available during the crash asset's first load so the
          opening never feels like the character has no landing surface. */}
      <group visible={platformsVisible}>
        {HOP_CUBES.map((position, index) => (firstPlatformOnly && index > 0 ? null : (
          <ContainmentStructure
            key={`hop-${index}`}
            position={position}
            size={HOP_CUBE_SIZE}
            stationary
            flattenY={1}
            // The three traversal platforms are intentionally all AlphaUnit
            // cubes so the mech has a consistent, greenish landing surface.
            // The separate background field below remains mixed.
            useSciFiCube={false}
            rotationSpeedX={0.08}
            rotationSpeedY={0.1}
          />
        )))}
      </group>
      <group visible={visible}>
        {configurations.map((config, index) => (
          <ContainmentStructure
            key={index}
            position={config.position}
            scale={config.scale}
            rotationSpeedX={config.rotationSpeedX}
            rotationSpeedY={config.rotationSpeedY}
            floatSpeed={config.floatSpeed}
            floatAmplitude={config.floatAmplitude}
            phase={config.phase}
            driftAmplitude={config.driftAmplitude}
            useSciFiCube={
              config.useSciFiCube ??
              (() => {
                const d = originDist(config.position) / maxDist; // 0 near center, 1 at the farthest configured cube
                // Near-center cubes use the sci-fi variant ~70% of the time;
                // the chance drops as you go deeper into the background so the
                // far field stays as the alien cube and the scene doesn't turn
                // into one giant sci-fi pile.
                const distBias = Math.max(0.25, 0.7 - d * 0.55);
                return hash(config.position[0], config.position[1], config.position[2]) < distBias;
              })()
            }
          />
        ))}
      </group>
    </group>
  );
};

export default ControlCubeField;
