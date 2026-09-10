import ControlCube from './ControlCube';
import FarCube from './FarCube';
import { HOP_CUBES, HOP_CUBE_SIZE } from './sceneConstants';

const ControlCubeField = ({ cubeConfigurations = [] }) => {
  const defaultConfigurations = [
    // Top row: evenly spaced framing cubes.
    {
      position: [-2.5, 1.8, -4.8],
      scale: 0.9,
      rotationSpeedX: 0.25,
      rotationSpeedY: 0.35,
      floatSpeed: 0.4,
      floatAmplitude: 0.14,
      phase: 0.4,
      driftAmplitude: 0.12,
    },
    {
      position: [-1.0, 2.2, -5.6],
      scale: 0.65,
      rotationSpeedX: 0.3,
      rotationSpeedY: 0.22,
      floatSpeed: 0.35,
      floatAmplitude: 0.12,
      phase: 2.8,
      driftAmplitude: 0.1,
    },
    {
      position: [1.0, 2.2, -5.6],
      scale: 0.65,
      rotationSpeedX: 0.3,
      rotationSpeedY: 0.22,
      floatSpeed: 0.35,
      floatAmplitude: 0.12,
      phase: 3.4,
      driftAmplitude: 0.1,
    },
    {
      position: [2.5, 1.8, -4.8],
      scale: 0.9,
      rotationSpeedX: 0.25,
      rotationSpeedY: 0.35,
      floatSpeed: 0.4,
      floatAmplitude: 0.14,
      phase: 2.8,
      driftAmplitude: 0.12,
    },

    // Middle side frames keep the astronaut's flight lane clear.
    {
      position: [-2.7, 0.1, -4.0],
      scale: 1.0,
      rotationSpeedX: 0.4,
      rotationSpeedY: 0.5,
      floatSpeed: 0.55,
      floatAmplitude: 0.13,
      phase: 1.1,
      driftAmplitude: 0.13,
    },
    {
      position: [2.7, 0.1, -4.0],
      scale: 1.0,
      rotationSpeedX: 0.45,
      rotationSpeedY: 0.4,
      floatSpeed: 0.5,
      floatAmplitude: 0.13,
      phase: 4.2,
      driftAmplitude: 0.13,
    },

    // Two added cubes sit inside the composition instead of drifting into the path.
    {
      position: [-0.75, 0.65, -6.0],
      scale: 0.58,
      rotationSpeedX: 0.42,
      rotationSpeedY: 0.52,
      floatSpeed: 0.62,
      floatAmplitude: 0.1,
      phase: 8.2,
      driftAmplitude: 0.08,
    },
    {
      position: [0.75, -0.65, -6.0],
      scale: 0.58,
      rotationSpeedX: 0.46,
      rotationSpeedY: 0.44,
      floatSpeed: 0.68,
      floatAmplitude: 0.1,
      phase: 9.1,
      driftAmplitude: 0.08,
    },
    {
      position: [-1.35, 0.25, -6.8],
      scale: 0.62,
      rotationSpeedX: 0.35,
      rotationSpeedY: 0.45,
      floatSpeed: 0.58,
      floatAmplitude: 0.1,
      phase: 5.5,
      driftAmplitude: 0.09,
    },
    {
      position: [1.35, 0.25, -6.8],
      scale: 0.62,
      rotationSpeedX: 0.38,
      rotationSpeedY: 0.48,
      floatSpeed: 0.6,
      floatAmplitude: 0.1,
      phase: 6.2,
      driftAmplitude: 0.09,
    },

    // Bottom row mirrors the top for a deliberate, balanced silhouette.
    {
      position: [-2.5, -1.8, -4.7],
      scale: 0.9,
      rotationSpeedX: 0.4,
      rotationSpeedY: 0.6,
      floatSpeed: 0.55,
      floatAmplitude: 0.13,
      phase: 6.1,
      driftAmplitude: 0.12,
    },
    {
      position: [-0.9, -2.25, -5.5],
      scale: 0.65,
      rotationSpeedX: 0.5,
      rotationSpeedY: 0.3,
      floatSpeed: 0.7,
      floatAmplitude: 0.1,
      phase: 5.5,
      driftAmplitude: 0.1,
    },
    {
      position: [0.9, -2.25, -5.5],
      scale: 0.65,
      rotationSpeedX: 0.55,
      rotationSpeedY: 0.45,
      floatSpeed: 0.65,
      floatAmplitude: 0.1,
      phase: 0.9,
      driftAmplitude: 0.1,
    },
    {
      position: [2.5, -1.8, -4.7],
      scale: 0.9,
      rotationSpeedX: 0.45,
      rotationSpeedY: 0.5,
      floatSpeed: 0.6,
      floatAmplitude: 0.12,
      phase: 7.0,
      driftAmplitude: 0.12,
    },
    // Two more added for a fuller field.
    {
      position: [-3.3, 0.5, -5.2],
      scale: 0.7,
      rotationSpeedX: 0.32,
      rotationSpeedY: 0.4,
      floatSpeed: 0.48,
      floatAmplitude: 0.13,
      phase: 3.9,
      driftAmplitude: 0.11,
    },
    {
      position: [3.3, -0.5, -5.2],
      scale: 0.7,
      rotationSpeedX: 0.36,
      rotationSpeedY: 0.38,
      floatSpeed: 0.52,
      floatAmplitude: 0.13,
      phase: 7.6,
      driftAmplitude: 0.11,
    },
  ];

  // A sparse, deliberate outer layer adds depth while staying visibly behind
  // the hero composition. Positions are hand-authored so the background reads
  // as a designed constellation instead of a random scatter.
  const farConfigurations = [
    { position: [-4.8, 2.9, -10.5], scale: 0.72, rotationSpeedX: 0.2, rotationSpeedY: 0.28, floatSpeed: 0.28, floatAmplitude: 0.18, phase: 0.6 },
    { position: [-3.4, 0.9, -12.2], scale: 0.46, rotationSpeedX: 0.28, rotationSpeedY: 0.22, floatSpeed: 0.34, floatAmplitude: 0.2, phase: 2.1 },
    { position: [-4.3, -2.6, -11.1], scale: 0.62, rotationSpeedX: 0.23, rotationSpeedY: 0.3, floatSpeed: 0.3, floatAmplitude: 0.16, phase: 4.3 },
    { position: [-2.2, 3.45, -13.8], scale: 0.42, rotationSpeedX: 0.3, rotationSpeedY: 0.2, floatSpeed: 0.38, floatAmplitude: 0.14, phase: 1.4 },
    { position: [-1.6, -3.5, -13.2], scale: 0.5, rotationSpeedX: 0.25, rotationSpeedY: 0.26, floatSpeed: 0.36, floatAmplitude: 0.17, phase: 5.1 },
    { position: [4.8, 2.9, -10.5], scale: 0.72, rotationSpeedX: 0.2, rotationSpeedY: 0.28, floatSpeed: 0.28, floatAmplitude: 0.18, phase: 3.2 },
    { position: [3.4, 0.9, -12.2], scale: 0.46, rotationSpeedX: 0.28, rotationSpeedY: 0.22, floatSpeed: 0.34, floatAmplitude: 0.2, phase: 4.7 },
    { position: [4.3, -2.6, -11.1], scale: 0.62, rotationSpeedX: 0.23, rotationSpeedY: 0.3, floatSpeed: 0.3, floatAmplitude: 0.16, phase: 1.2 },
    { position: [2.2, 3.45, -13.8], scale: 0.42, rotationSpeedX: 0.3, rotationSpeedY: 0.2, floatSpeed: 0.38, floatAmplitude: 0.14, phase: 5.6 },
    { position: [1.6, -3.5, -13.2], scale: 0.5, rotationSpeedX: 0.25, rotationSpeedY: 0.26, floatSpeed: 0.36, floatAmplitude: 0.17, phase: 2.0 },
  ];

  // A wider outer ring means a camera orbit reveals cubes from the sides and
  // rear as well as the initial forward view. These stay small and distant
  // so the foreground remains readable.
  const farOuterConfigurations = [
    { position: [-8.0, 2.8, 2.5], scale: 0.42, rotationSpeedX: 0.18, rotationSpeedY: 0.24, floatSpeed: 0.24, floatAmplitude: 0.15, phase: 0.8 },
    { position: [8.0, 2.2, 2.5], scale: 0.5, rotationSpeedX: 0.22, rotationSpeedY: 0.2, floatSpeed: 0.28, floatAmplitude: 0.16, phase: 2.4 },
    { position: [-7.2, -2.6, 4.5], scale: 0.55, rotationSpeedX: 0.2, rotationSpeedY: 0.3, floatSpeed: 0.3, floatAmplitude: 0.18, phase: 4.4 },
    { position: [7.4, -3.0, 4.2], scale: 0.4, rotationSpeedX: 0.24, rotationSpeedY: 0.26, floatSpeed: 0.32, floatAmplitude: 0.15, phase: 5.9 },
    { position: [-5.4, 3.8, 8.5], scale: 0.48, rotationSpeedX: 0.2, rotationSpeedY: 0.25, floatSpeed: 0.26, floatAmplitude: 0.18, phase: 1.7 },
    { position: [5.8, 3.4, 9.2], scale: 0.58, rotationSpeedX: 0.25, rotationSpeedY: 0.22, floatSpeed: 0.3, floatAmplitude: 0.17, phase: 3.3 },
    { position: [-5.8, -4.0, 8.4], scale: 0.38, rotationSpeedX: 0.18, rotationSpeedY: 0.28, floatSpeed: 0.34, floatAmplitude: 0.14, phase: 4.9 },
    { position: [5.0, -4.3, 9.0], scale: 0.46, rotationSpeedX: 0.22, rotationSpeedY: 0.3, floatSpeed: 0.28, floatAmplitude: 0.16, phase: 6.4 },
    { position: [-9.0, 0.2, -2.0], scale: 0.5, rotationSpeedX: 0.23, rotationSpeedY: 0.2, floatSpeed: 0.27, floatAmplitude: 0.17, phase: 7.1 },
    { position: [9.0, -0.4, -2.8], scale: 0.44, rotationSpeedX: 0.2, rotationSpeedY: 0.26, floatSpeed: 0.3, floatAmplitude: 0.15, phase: 8.0 },
    { position: [-3.8, 4.8, 5.8], scale: 0.34, rotationSpeedX: 0.24, rotationSpeedY: 0.18, floatSpeed: 0.36, floatAmplitude: 0.13, phase: 9.2 },
    { position: [3.4, -5.0, 6.4], scale: 0.52, rotationSpeedX: 0.19, rotationSpeedY: 0.24, floatSpeed: 0.31, floatAmplitude: 0.15, phase: 10.4 },
  ];

  const configurations = cubeConfigurations.length > 0 ? cubeConfigurations : defaultConfigurations;

  return (
    <group>
      {/* Hop-platform cubes: the character actually stands/hops on these,
          landing exactly on each one's top face (see sceneConstants.js).
          `stationary` keeps them from drifting out from under his feet. */}
      {HOP_CUBES.map((position, index) => (
        <ControlCube
          key={`hop-${index}`}
          position={position}
          size={HOP_CUBE_SIZE}
          stationary
          rotationSpeedX={0.08}
          rotationSpeedY={0.1}
        />
      ))}
      {configurations.map((config, index) => (
        <ControlCube key={index} {...config} scale={(config.scale ?? 1) * 0.86} />
      ))}
      {farConfigurations.map((config, index) => (
        <FarCube key={`far-${index}`} {...config} />
      ))}
      {farOuterConfigurations.map((config, index) => (
        <FarCube key={`far-outer-${index}`} {...config} />
      ))}
    </group>
  );
};

export default ControlCubeField;
