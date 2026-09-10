import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import ControlCubeField from './ControlCubeField';
import CustomStarField from './CustomStarField';
import TacticalAstronaut from './TacticalAstronaut.jsx';
import PlanetShowcase from './PlanetShowcase';
import { HOP_WAYPOINTS } from './sceneConstants';

gsap.registerPlugin(ScrollTrigger);

// Scroll-progress bands mapped to each phase of the journey. Kept as named
// constants (not scattered magic numbers) so the sequence is easy to re-tune
// or extend later without hunting through the ScrollTrigger callback.
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

const SpaceCanvas = () => {
  const canvasRef = useRef();
  const scrollTrackRef = useRef(null);
  const [astronautPhase, setAstronautPhase] = useState('idle');
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [hopWaypoints] = useState(HOP_WAYPOINTS);
  const hopPositionRef = useRef(new THREE.Vector3());

  // Scroll drives the whole jump -> jetpack -> fly -> land -> sit sequence.
  // The canvas itself is `fixed` (never scrolls), so the actual scrollable
  // height comes from the separate track div below — a standard
  // scrollytelling pattern: a tall invisible spacer creates the scroll
  // distance, and a pinned/fixed visual reacts to how far through it you are.
  useEffect(() => {
    if (!scrollTrackRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: scrollTrackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        setJourneyProgress(self.progress);
        setAstronautPhase(phaseForProgress(self.progress));
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <>
      {/* Fixed 3D scene — visually pinned, reacts to scroll progress rather
          than moving with the page itself */}
      <div className="fixed inset-0 z-0">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          // Keep retina screens from rendering this multi-pass scene at 2x;
          // the lower ceiling is a large frame-time win with little visual
          // loss at the portfolio camera distance.
          dpr={[1, 1.5]}
          style={{ background: '#010103' }}
        >
          <ambientLight intensity={0.4} color="#4a5568" />
          <directionalLight position={[10, 10, 5]} intensity={1.0} color="#e2e8f0" />
          <pointLight position={[-10, -5, -10]} intensity={0.6} color="#3b82f6" distance={30} />
          <pointLight position={[10, 5, 10]} intensity={0.5} color="#8b5cf6" distance={25} />

          {/* MeshTransmissionMaterial (the ControlCube glass shell) refracts
              and reflects its *surroundings* — with nothing to reflect, it
              has only the near-black canvas background to sample on any
              side that isn't catching a direct specular highlight, which is
              why the dark cubes were reading as flat black voids instead of
              glass. A low-intensity environment gives it something to bend
              light through, so the material actually looks like a material. */}
          <Suspense fallback={null}><Environment files="/models/night-sky.exr" background={false} environmentIntensity={0.5} /></Suspense>

          {/* Stars and cubes get their own Suspense boundary, separate from
              the astronaut. TacticalAstronaut loads 6 async resources (1 GLB
              + 5 FBX); React can only resolve one suspended resource per
              render pass, so it re-suspends repeatedly while working through
              them. A shared boundary would hide already-loaded stars/cubes
              every time that happens — visible as a flash of content, then
              blank, on loop. Isolating it means the background scene mounts
              once and stays, regardless of how long the astronaut takes. */}
          {/* Cube field only exists for the idle/hop/launch portion of the
              journey — hidden from 'flying' onward so it doesn't visually
              compete with the moon/planet scene the astronaut is arcing
              toward (a direct visibility toggle, not just positioning). */}
          <Suspense fallback={null}>
            <group visible={astronautPhase === 'idle' || astronautPhase === 'hopping' || astronautPhase === 'launching'}>
              <ControlCubeField />
            </group>
            <CustomStarField count={2200} radius={100} />
          </Suspense>

          <Suspense fallback={null}>
            <TacticalAstronaut
              phase={astronautPhase}
              position={[0, 0, 0]}
              scale={1}
              hopPoints={hopWaypoints}
              hopPositionRef={hopPositionRef}
              journeyProgress={journeyProgress}
            />
          </Suspense>

          <Suspense fallback={null}>
            <PlanetShowcase
              showMoon={astronautPhase === 'flying' || astronautPhase === 'landing' || astronautPhase === 'seated'}
              showPlanets={astronautPhase === 'flying' || astronautPhase === 'landing' || astronautPhase === 'seated'}
            />
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
            enableDamping={true}
            dampingFactor={0.04}
          />
        </Canvas>

        {/* Small, unobtrusive progress readout so the phase is legible even
            before more detailed staging (labels, camera moves) gets added */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <span className="px-4 py-2 text-cyan-400/70 text-[11px] font-syne font-bold uppercase tracking-[0.2em] border border-cyan-500/20 rounded-full">
            {astronautPhase}
          </span>
        </div>
      </div>

      {/* Scroll track — this is what actually gives the page scrollable
          height. Height controls how much physical scrolling the whole
          jump/fly/land/sit sequence takes to play out; tune this number to
          make the sequence feel faster or slower to scroll through. */}
      <div ref={scrollTrackRef} style={{ height: '400vh' }} />
    </>
  );
};

export default SpaceCanvas;


