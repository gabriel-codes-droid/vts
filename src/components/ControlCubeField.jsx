import ControlCube from './ControlCube';

const ControlCubeField = ({ cubeConfigurations = [] }) => {
  const defaultConfigurations = [
    {
      position: [-3.5, 1.5, -2.5],
      scale: 1.0,
      rotationSpeedX: 0.4,
      rotationSpeedY: 0.6,
      floatSpeed: 0.8,
      floatAmplitude: 0.25
    },
    {
      position: [2.5, 1.2, -3.5],
      scale: 0.9,
      rotationSpeedX: 0.5,
      rotationSpeedY: 0.4,
      floatSpeed: 0.7,
      floatAmplitude: 0.2
    },
    {
      position: [-1.8, -0.8, -1.8],
      scale: 0.7,
      rotationSpeedX: 0.3,
      rotationSpeedY: 0.8,
      floatSpeed: 0.9,
      floatAmplitude: 0.3
    },
    {
      position: [3.2, 0.3, -4.2],
      scale: 0.95,
      rotationSpeedX: 0.6,
      rotationSpeedY: 0.4,
      floatSpeed: 0.75,
      floatAmplitude: 0.22
    },
    {
      position: [-2.8, 2.2, -3.2],
      scale: 0.85,
      rotationSpeedX: 0.4,
      rotationSpeedY: 0.5,
      floatSpeed: 0.85,
      floatAmplitude: 0.28
    },
    {
      position: [1.8, -1.5, -2.8],
      scale: 1.1,
      rotationSpeedX: 0.7,
      rotationSpeedY: 0.3,
      floatSpeed: 0.65,
      floatAmplitude: 0.25
    }
  ];

  const configurations = cubeConfigurations.length > 0 ? cubeConfigurations : defaultConfigurations;

  return (
    <group>
      {configurations.map((config, index) => (
        <ControlCube
          key={index}
          position={config.position}
          scale={config.scale}
          rotationSpeedX={config.rotationSpeedX}
          rotationSpeedY={config.rotationSpeedY}
          floatSpeed={config.floatSpeed}
          floatAmplitude={config.floatAmplitude}
        />
      ))}
    </group>
  );
};

export default ControlCubeField;
