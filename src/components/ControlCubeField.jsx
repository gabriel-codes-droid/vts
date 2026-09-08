import ControlCube from './ControlCube';
import FarCube from './FarCube';

// Deterministic PRNG (not Math.random) so the generated far field is
// identical on every load/reload — a shuffling background on every refresh
// would read as a bug, not as intentional design.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fills the rest of the sphere around the origin with cubes, not just the
// forward cone the hand-placed hero cubes occupy. Two things make this
// necessary: (1) OrbitControls here allows a full 360° horizontal drag with
// no azimuth limit, so "drag to explore" can spin all the way around to
// where — previously — there was nothing but stars; (2) the astronaut
// travels away from the origin during the flying phase, so scroll alone
// was carrying the camera's effective view past the original cube cluster
// into empty space too.
function generateFarField(count, seed) {
  const rand = mulberry32(seed);
  const cubes = [];
  const MIN_RADIUS = 5.5; // clears the hand-placed cluster and the astronaut's travel range
  const MAX_RADIUS = 20;

  for (let i = 0; i < count; i++) {
    const azimuth = rand() * Math.PI * 2;
    // Bias radius toward the middle of the range (sqrt of a linear random
    // value) so cubes don't visually clump right at MIN_RADIUS — spreads
    // density more evenly across the full depth instead.
    const radius = MIN_RADIUS + Math.sqrt(rand()) * (MAX_RADIUS - MIN_RADIUS);
    const y = (rand() - 0.5) * 11;

    cubes.push({
      position: [Math.cos(azimuth) * radius, y, Math.sin(azimuth) * radius],
      scale: 0.5 + rand() * 0.85,
      rotationSpeedX: 0.15 + rand() * 0.4,
      rotationSpeedY: 0.15 + rand() * 0.4,
      floatSpeed: 0.3 + rand() * 0.4,
      floatAmplitude: 0.15 + rand() * 0.2,
      phase: rand() * Math.PI * 2,
    });
  }
  return cubes;
}

// Centered, hand-placed composition: enough depth and breathing room for the
// astronaut to remain the focal point without leaving the scene empty.
const ControlCubeField = ({ cubeConfigurations = [] }) => {
  const defaultConfigurations = [
    // Near layer frames the character without crowding the center.
    { position: [-2.4, 1.45, -3.4], scale: 1.1, rotationSpeedX: 0.25, rotationSpeedY: 0.35, floatSpeed: 0.4, floatAmplitude: 0.18, phase: 0.4, driftAmplitude: 0.2 },
    { position: [2.35, 1.2, -3.6], scale: 1.0, rotationSpeedX: 0.3, rotationSpeedY: 0.22, floatSpeed: 0.35, floatAmplitude: 0.16, phase: 2.8, driftAmplitude: 0.18 },
    { position: [-2.2, -1.45, -4.2], scale: 0.9, rotationSpeedX: 0.4, rotationSpeedY: 0.5, floatSpeed: 0.55, floatAmplitude: 0.15, phase: 1.1, driftAmplitude: 0.18 },
    { position: [2.2, -1.35, -4.4], scale: 0.95, rotationSpeedX: 0.45, rotationSpeedY: 0.4, floatSpeed: 0.5, floatAmplitude: 0.15, phase: 4.2, driftAmplitude: 0.16 },

    // Additional mid/far cubes add depth while keeping the cluster centered.
    { position: [-1.35, 2.45, -5.0], scale: 0.78, rotationSpeedX: 0.35, rotationSpeedY: 0.55, floatSpeed: 0.6, floatAmplitude: 0.13, phase: 3.0, driftAmplitude: 0.16 },
    { position: [1.25, 2.55, -5.35], scale: 0.72, rotationSpeedX: 0.4, rotationSpeedY: 0.48, floatSpeed: 0.58, floatAmplitude: 0.14, phase: 4.8, driftAmplitude: 0.15 },
    { position: [-1.45, -2.45, -5.45], scale: 0.82, rotationSpeedX: 0.5, rotationSpeedY: 0.3, floatSpeed: 0.7, floatAmplitude: 0.12, phase: 5.5, driftAmplitude: 0.15 },
    { position: [1.55, -2.35, -5.9], scale: 0.7, rotationSpeedX: 0.55, rotationSpeedY: 0.45, floatSpeed: 0.65, floatAmplitude: 0.12, phase: 0.9, driftAmplitude: 0.14 },
    { position: [-0.85, 0.72, -5.15], scale: 0.62, rotationSpeedX: 0.42, rotationSpeedY: 0.52, floatSpeed: 0.62, floatAmplitude: 0.11, phase: 8.2, driftAmplitude: 0.1 },
    { position: [0.9, -0.68, -5.45], scale: 0.58, rotationSpeedX: 0.46, rotationSpeedY: 0.44, floatSpeed: 0.68, floatAmplitude: 0.1, phase: 9.1, driftAmplitude: 0.1 },
    { position: [-2.7, 0.1, -6.7], scale: 0.64, rotationSpeedX: 0.45, rotationSpeedY: 0.35, floatSpeed: 0.65, floatAmplitude: 0.11, phase: 1.8, driftAmplitude: 0.13 },
    { position: [2.7, 0.45, -7.0], scale: 0.68, rotationSpeedX: 0.5, rotationSpeedY: 0.4, floatSpeed: 0.7, floatAmplitude: 0.1, phase: 2.4, driftAmplitude: 0.12 },
    { position: [-2.0, 1.0, -8.15], scale: 0.58, rotationSpeedX: 0.4, rotationSpeedY: 0.6, floatSpeed: 0.75, floatAmplitude: 0.1, phase: 6.1, driftAmplitude: 0.12 },
    { position: [2.05, -1.05, -8.55], scale: 0.62, rotationSpeedX: 0.38, rotationSpeedY: 0.52, floatSpeed: 0.72, floatAmplitude: 0.1, phase: 7.0, driftAmplitude: 0.12 },
  ];

  const configurations = cubeConfigurations.length > 0 ? cubeConfigurations : defaultConfigurations;
  const farConfigurations = generateFarField(36, 1337);

  return (
    <group>
      {configurations.map((config, index) => (
        <ControlCube
          key={`hero-${index}`}
          position={config.position}
          scale={config.scale}
          rotationSpeedX={config.rotationSpeedX}
          rotationSpeedY={config.rotationSpeedY}
          floatSpeed={config.floatSpeed}
          floatAmplitude={config.floatAmplitude}
          phase={config.phase}
          driftAmplitude={config.driftAmplitude}
        />
      ))}
      {farConfigurations.map((config, index) => (
        <FarCube key={`far-${index}`} {...config} />
      ))}
    </group>
  );
};

export default ControlCubeField;
