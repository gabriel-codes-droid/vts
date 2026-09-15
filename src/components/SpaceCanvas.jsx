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
import {
  HOP_WAYPOINTS,
  MOON_CENTER,
  MOON_RADIUS,
  MOON_SEAT_POSITION,
} from './sceneConstants';

gsap.registerPlugin(ScrollTrigger);

// Scroll-progress bands mapped to each phase of the journey.
const PHASE_BANDS = [
  // Give the opening enough scroll distance to be seen: rubble/sleep first,
  // then the wake-up before the first platform hop begins.
  { end: 0.14, phase: 'sleeping' },
  { end: 0.22, phase: 'waking' },
  { end: 0.27, phase: 'idle' },
  { end: 0.39, phase: 'hopping' },
  { end: 0.48, phase: 'launching' },
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

const FLIGHT_START = 0.39; // matches the launching path start
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

  // Was (0, -10, -8) — that exactly matches the old GROUND_CENTER from the
  // now-deleted crash site, a leftover aim point with nothing there anymore.
  // Recomputed to actually frame the hop-waypoint cluster where the
  // character and cubes really are (x -1 to 1.2, y -0.5 to 0.85, z -0.5 to
  // -1.5), which is why he was never actually visible during waking/idle/
  // hopping despite the cubes themselves rendering fine.
  const heroCamPos = useRef(new THREE.Vector3(0, 2.0, 6));
  const heroCamLook = useRef(new THREE.Vector3(0.1, 0.3, -1.0));
  // Distinct oblique framing for the sleeping phase specifically — offset
  // to the side and closer, angled down at him, rather than the same wide
  // straight-on view used for the rest of the pre-flight stretch. Without
  // this the camera never moves at all until flight starts, which read as
  // "stuck" during sleeping, and he's genuinely hard to pick out in the
  // wide straight framing.
  const sleepSpot = HOP_WAYPOINTS[0];
  // Widened from the first attempt — that framing was too tight/low and
  // cropped him out of frame. Camera raised and pulled back further, look
  // target raised too, so he's captured with margin regardless of his exact
  // height/pose rather than assuming a precise position that turned out
  // wrong.
  const sleepCamPos = useRef(
    new THREE.Vector3(sleepSpot[0] - 4.0, sleepSpot[1] + 3.5, sleepSpot[2] + 6.5)
  );
  const sleepCamLook = useRef(
    new THREE.Vector3(sleepSpot[0], sleepSpot[1] + 1.2, sleepSpot[2])
  );
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
                astronautPhase === 'sleeping'
                || astronautPhase === 'waking'
                || astronautPhase === 'idle'
                || astronautPhase === 'hopping'
              }
              firstPlatformOnly={
                astronautPhase === 'sleeping'
                || astronautPhase === 'waking'
                || astronautPhase === 'idle'
              }
            />
          </Suspense>

          {/* CrashSite removed completely - alien_planet_lv-426.glb no longer used */}

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
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.45}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 4}
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
