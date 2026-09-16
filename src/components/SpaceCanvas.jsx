import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import ControlCubeField from './ControlCubeField';
import TacticalAstronaut from './TacticalAstronaut';
import MoonScene from './MoonScene';
import SleepModule from './SleepModule';
import DistantDebris from './DistantDebris';
import {
  HOP_WAYPOINTS,
  MOON_CENTER,
  MOON_RADIUS,
  MOON_SEAT_POSITION,
  MECH_SLEEP_POSITION,
} from './sceneConstants';

gsap.registerPlugin(ScrollTrigger);

// Scroll-progress bands mapped to each phase of the journey.
const PHASE_BANDS = [
  // Sleeping first — the shuttle dominates the frame and the mech is inside it.
  { end: 0.08, phase: 'sleeping' },
  // Waking: the sit-up animation plays. Wide enough band so it is actually
  // viewed instead of skipped over by the scroll.
  { end: 0.18, phase: 'waking' },
  // Idle/delay band: the mech holds the awake pose inside the shuttle so the
  // sit-up reads before he hops out. This is the "delay so it is viewed" band.
  { end: 0.30, phase: 'idle' },
  // Three hops: sleep position -> cube 1 -> cube 2 -> cube 3 (launch point).
  { end: 0.46, phase: 'hopping' },
  { end: 0.54, phase: 'launching' },
  // Fly down toward the moon. Camera tracks the mech so his whole body stays
  // in frame during the descent.
  { end: 0.78, phase: 'flying' },
  { end: 0.88, phase: 'landing' },
  // Seated on the moon, watching the planets. Zoomed-in, fills the screen.
  { end: 1.0, phase: 'seated' },
];

function phaseForProgress(progress) {
  for (const band of PHASE_BANDS) {
    if (progress < band.end) return band.phase;
  }
  return 'seated';
}

const MOON_POSITION = MOON_CENTER;

const FLIGHT_START = 0.46; // matches the launching band start
const FLIGHT_END = 1.0;

function smoothstep(t) {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
}

// Lightweight visual fallback while the large cube GLB is being parsed. The
// real alien cube replaces this at the same waypoint once it is ready.
function OpeningPlatform({ visible = true }) {
  const [x, y, z] = HOP_WAYPOINTS[0];
  return (
    <mesh position={[x, y - 0.18, z]} visible={visible}>
      <boxGeometry args={[0.98, 0.36, 0.98]} />
      <meshStandardMaterial
        color="#0A2235"
        emissive="#00BFFF"
        emissiveIntensity={0.45}
        metalness={0.75}
        roughness={0.38}
      />
    </mesh>
  );
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
  // Follow scroll only while progress is changing. Once the scroll settles,
  // OrbitControls owns the camera so a cursor drag is not overwritten every
  // animation frame by the cinematic follow camera.
  const lastProgressRef = useRef(-1);

  // Fresh framing for the centered shuttle: the mech sleeps inside at the
  // -Z end. Camera sits off to one side and slightly above, angled down at
  // him so the shuttle dominates the frame the way the reference image shows
  // (heavy structure on the left/center, mech small inside it).
  const heroCamPos = useRef(new THREE.Vector3(-1.5, 2.5, 5.5));
  const heroCamLook = useRef(new THREE.Vector3(0, 0.0, -3.5));
  // Sleep camera: close oblique on the mech inside the shuttle at the -Z end.
  const sleepSpot = MECH_SLEEP_POSITION;
  const sleepCamPos = useRef(
    new THREE.Vector3(sleepSpot[0] - 2.5, sleepSpot[1] + 2.5, sleepSpot[2] + 4.0)
  );
  const sleepCamLook = useRef(
    new THREE.Vector3(sleepSpot[0], sleepSpot[1] + 0.6, sleepSpot[2])
  );
  // Zoomed-in moon-watching framing: the moon is enlarged and pulled forward,
  // so the seated mech + planet row fit the screen together. Camera sits above
  // and in front, looking down at the seat/planet row.
  const moonCamPos = useRef(
    new THREE.Vector3(0, 4.5, 7.5)
  );
  const moonCamLook = useRef(
    new THREE.Vector3(0, -1.0, -5.0)
  );

  useFrame(() => {
    const progress = progressRef.current;
    const progressChanged = Math.abs(progress - lastProgressRef.current) > 0.0001;

    if (progress < FLIGHT_START) {
      // Sleeping gets its own oblique framing, blending smoothly into the
      // straight hero view as waking plays out — not an instant cut, tied
      // to actual scroll progress across the sleeping→waking band (0 to
      // 0.22) the same way the flight camera below already blends.
      const wakeBlend = smoothstep(progress / 0.22);
      camera.position.lerpVectors(sleepCamPos.current, heroCamPos.current, wakeBlend);
      const preFlightLook = new THREE.Vector3().lerpVectors(sleepCamLook.current, heroCamLook.current, wakeBlend);
      camera.lookAt(preFlightLook);
      lastProgressRef.current = progress;
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

    // Ensure camera stays at final position in seated phase even when scrolling stops
    if (progress >= 0.95) {
      camera.position.copy(moonCamPos.current);
      camera.lookAt(moonCamLook.current);
    }

    lastProgressRef.current = progress;
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
  const [astronautPhase, setAstronautPhase] = useState('sleeping');
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
            {/* Cubes were hidden during 'sleeping' to work around a white-glow
                bloom issue — but that directly broke the continuity this
                scene is supposed to have (nothing should pop in/out, the
                place should feel continuous throughout). Bloom's intensity
                was already dialed back separately (threshold 0.2→0.9,
                intensity 1.5→0.8) to address the same glow issue at its
                actual source, so hiding the cubes on top of that was very
                likely an unnecessary second fix for the same problem.
                Visible from sleeping onward now, continuously. */}
            <ControlCubeField
              visible={true}
              platformsVisible={
                astronautPhase === 'hopping'
                || astronautPhase === 'launching'
              }
              firstPlatformOnly={false}
            />
          </Suspense>

          <Suspense fallback={null}>
            {/* The mech sleeps inside the middle of this ISS module scan,
                replacing the earlier crash-site-ground approach. Visible
                through the whole pre-flight stretch (continuous, not a
                pop-in/out) since it's a fixed structure he's resting in
                and then leaving, same reasoning as the cube field staying
                visible throughout. */}
            <SleepModule
              visible={
                astronautPhase === 'sleeping'
                || astronautPhase === 'waking'
                || astronautPhase === 'idle'
                || astronautPhase === 'hopping'
                || astronautPhase === 'launching'
              }
            />
          </Suspense>

          {/* CrashSite removed completely - alien_planet_lv-426.glb no longer used */}

          <Suspense fallback={null}>
            {/* Was part of the old CrashSite.jsx, which got deleted entirely
                along with the ground approach it was paired with — the
                debris rendering itself was never actually broken, it just
                had no home to render from anymore. Re-wired standalone,
                visible through the same continuous opening stretch as the
                cube field and sleep module. */}
            <DistantDebris
              visible={
                astronautPhase === 'sleeping'
                || astronautPhase === 'waking'
                || astronautPhase === 'idle'
                || astronautPhase === 'hopping'
                || astronautPhase === 'launching'
              }
            />
          </Suspense>

          <Suspense fallback={null}>
            {/* Moon only appears during landing/seated phases when mech watches planets */}
            <group
              visible={
                astronautPhase === 'landing'
                || astronautPhase === 'seated'
              }
            >
              <MoonScene
                moonPosition={MOON_POSITION}
                moonRadius={MOON_RADIUS}
                planetsVisible={astronautPhase === 'landing' || astronautPhase === 'seated'}
              />
            </group>
          </Suspense>

          <Suspense fallback={null}>
            <JourneyController progressRef={scrollProgressRef} phase={astronautPhase} />
          </Suspense>

          <OrbitControls
            enableRotate={true}
            enableZoom={true}
            enablePan={false}
            zoomSpeed={0.6}
            rotateSpeed={0.45}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 5}
            minDistance={2}
            maxDistance={45}
            enableDamping={true}
            dampingFactor={0.04}
          />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.9}
              luminanceSmoothing={0.9}
              intensity={0.8}
              radius={0.3}
            />
          </EffectComposer>
        </Canvas>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <span className="px-4 py-2 text-cyan-400/70 text-[11px] font-syne font-bold uppercase tracking-[0.2em] border border-cyan-500/20 rounded-full">
            {astronautPhase}
          </span>
        </div>
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-[10px] uppercase tracking-[0.24em] text-slate-300/60 whitespace-nowrap">
          Drag to orbit · Scroll to journey
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
