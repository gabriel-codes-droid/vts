import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import ControlCubeField from './ControlCubeField';
import CustomStarField from './CustomStarField';
import TacticalAstronaut from './TacticalAstronaut';
import MoonScene from './MoonScene';
import {
  HOP_WAYPOINTS,
  MOON_CENTER,
  MOON_RADIUS,
  MOON_SEAT_POSITION,
} from './sceneConstants';

gsap.registerPlugin(ScrollTrigger);

// Scroll-progress bands mapped to each phase of the journey.
const PHASE_BANDS = [
  { end: 0.12, phase: 'idle' },
  { end: 0.32, phase: 'hopping' },
  { end: 0.42, phase: 'launching' },
  { end: 0.75, phase: 'flying' },
  { end: 0.88, phase: 'landing' },
  { end: 1.0, phase: 'seated' },
];

function phaseForProgress(progress) {
  for (const band of PHASE_BANDS) {
    if (progress < band.end) return band.phase;
  }
  return 'seated';
}

const MOON_POSITION = MOON_CENTER;

const FLIGHT_START = 0.42; // matches 'launching' band start
const FLIGHT_END = 1.0;

function smoothstep(t) {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
}

/**
 * Lives inside <Canvas>. Reads scroll progress every frame (via a ref, not
 * React state, so this never triggers a re-render on scroll) and moves both
 * the astronaut wrapper and the camera toward the moon accordingly. This is
 * what actually makes "fly down and land on the moon, watch the planets"
 * happen — previously nothing moved the astronaut or camera through world
 * space at all during the flying phase, only the phase name changed.
 */
function JourneyController({ progressRef, phase }) {
  const hopPositionRef = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const heroCamPos = useRef(new THREE.Vector3(0, 0, 6));
  const heroCamLook = useRef(new THREE.Vector3(0, 0, 0));
  // Final framing: pulled back and angled so the moon (lower-foreground)
  // and the row of project planets (upper) are both in frame together,
  // matching the reference "watch the planets" composition.
  const moonCamPos = useRef(
    new THREE.Vector3(
      MOON_SEAT_POSITION[0] + 2.0,
      MOON_SEAT_POSITION[1] + 5.5,
      MOON_SEAT_POSITION[2] + 10
    )
  );
  const moonCamLook = useRef(
    // Aim between the moon's top and the planet row so the four planets stay
    // inside the frame instead of being cropped against the top edge.
    new THREE.Vector3(MOON_POSITION[0], MOON_POSITION[1] + MOON_RADIUS + 0.25, MOON_POSITION[2])
  );

  useFrame(() => {
    const progress = progressRef.current;
    if (progress < FLIGHT_START) {
      // Idle/hopping: wrapper stays at origin, TacticalAstronaut's own
      // internal useFrame logic drives local hop movement.
      camera.position.copy(heroCamPos.current);
      camera.lookAt(heroCamLook.current);
      return;
    }

    // Flight progress within the launching -> seated range
    const t = smoothstep((progress - FLIGHT_START) / (FLIGHT_END - FLIGHT_START));

    // TacticalAstronaut owns the character's world-space launch/flight/
    // landing path. Do not translate a parent wrapper here as well: doing so
    // would apply the moon offset twice and leave the mech floating away from
    // the moon's top surface. The camera follows the same progress separately.

    camera.position.lerpVectors(heroCamPos.current, moonCamPos.current, t);
    const lookTarget = new THREE.Vector3().lerpVectors(heroCamLook.current, moonCamLook.current, t);
    camera.lookAt(lookTarget);
  });

  return (
    <group>
      <TacticalAstronaut
        phase={phase}
        position={[0, 0, 0]}
        scale={1}
        hopPoints={HOP_WAYPOINTS}
        hopPositionRef={hopPositionRef}
        journeyProgressRef={progressRef}
      />
    </group>
  );
}

const SpaceCanvas = () => {
  const canvasRef = useRef();
  const scrollTrackRef = useRef(null);
  const [astronautPhase, setAstronautPhase] = useState('idle');
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    if (!scrollTrackRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: scrollTrackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress;
        setAstronautPhase(phaseForProgress(self.progress));
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          style={{
            backgroundColor: '#010103',
            backgroundImage: "url('/images/stars-clean.png')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <ambientLight intensity={0.4} color="#4a5568" />
          <directionalLight position={[10, 10, 5]} intensity={1.0} color="#e2e8f0" />
          <pointLight position={[-10, -5, -10]} intensity={0.6} color="#3b82f6" distance={30} />
          <pointLight position={[10, 5, 10]} intensity={0.5} color="#8b5cf6" distance={25} />
          <pointLight position={MOON_POSITION} intensity={0.5} color="#c7d2fe" distance={20} />

          <Suspense fallback={null}>
            {/* Restoring the real night-sky environment map — this had been
                dropped somewhere along the way, leaving just flat black +
                the procedural starfield with nothing for reflective
                surfaces (the cube glass, the mech's visor/metal) to catch
                light from. background=false keeps the visible backdrop as
                the actual starfield/black canvas; this only feeds lighting
                and reflections. */}
            <Environment files="/models/night-sky.exr" background={false} />
          </Suspense>

          <Suspense fallback={null}>
            <CustomStarField count={3000} radius={100} />

            <ControlCubeField />

            <MoonScene moonPosition={MOON_POSITION} moonRadius={MOON_RADIUS} />

            <JourneyController progressRef={scrollProgressRef} phase={astronautPhase} />

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 4}
              enableDamping={true}
              dampingFactor={0.04}
            />
          </Suspense>
        </Canvas>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <span className="px-4 py-2 text-cyan-400/70 text-[11px] font-syne font-bold uppercase tracking-[0.2em] border border-cyan-500/20 rounded-full">
            {astronautPhase}
          </span>
        </div>
      </div>

      {/* Scroll track — drives the whole jump/fly/land/sit sequence. Tune
          this height to make the sequence feel faster or slower to scroll
          through. */}
      <div ref={scrollTrackRef} style={{ height: '500vh' }} />
    </>
  );
};

export default SpaceCanvas;
