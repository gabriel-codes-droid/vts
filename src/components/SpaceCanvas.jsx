import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useRef, useState, useEffect, useCallback, Component } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { phaseForProgress, smooth } from './journey';
import ControlCubeField from './ControlCubeField';
import TacticalAstronaut from './TacticalAstronaut';
import MoonScene from './MoonScene';
import SleepModule from './SleepModule';
import DistantDebris from './DistantDebris';
import SonarGrid from './SonarGrid';
import SceneReady, { AssetProgress, reportBoot } from './SceneReady';
import {
  HOP_WAYPOINTS,
  MOON_CENTER,
  MOON_RADIUS,
  MOON_SEAT_POSITION,
  MECH_SLEEP_POSITION,
} from './sceneConstants';

gsap.registerPlugin(ScrollTrigger);

const MOON_POSITION = MOON_CENTER;

/**
 * Lives inside <Canvas>. Reads scroll progress every frame (via a ref, not
 * React state, so this never triggers a re-render on scroll) and moves both
 * the astronaut wrapper and the camera toward the moon accordingly. This is
 * what actually makes "fly down and land on the moon, watch the planets"
 * happen — previously nothing moved the astronaut or camera through world
 * space at all during the flying phase, only the phase name changed.
 */
function JourneyController({ progressRef, phase }) {
  const targetPosition = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const cameraForward = useRef(new THREE.Vector3());
  const cameraRight = useRef(new THREE.Vector3());
  const { camera } = useThree();
  // Follow scroll only while progress is changing. Once the scroll settles,
  // OrbitControls owns the camera so a cursor drag is not overwritten every
  // animation frame by the cinematic follow camera.
  const lastProgressRef = useRef(-1);

  // Shared refs so the camera can track the mech during hop/launch/flight.
  const mechPosRef = useRef(new THREE.Vector3());
  const mechYawRef = useRef(0);

  // Fresh framing for the horizontal module: the mech sleeps just inside the
  // open +Z hatch. Camera sits just outside that end and looks down the
  // corridor so the interior fills the opening like the supplied reference.
  const heroCamPos = useRef(new THREE.Vector3(0, 0.5, 23.0));
  const heroCamLook = useRef(new THREE.Vector3(0, -4, 10));
  // Sleep camera: just inside the open end, looking down the module's length
  // toward the mech. This keeps the interior wall normals facing the camera,
  // while the slight left/above offset preserves the reference composition.
  const sleepSpot = MECH_SLEEP_POSITION;
  const sleepCamPos = useRef(
    new THREE.Vector3(0, 1.2, sleepSpot[2] + 4.3)
  );
  const sleepCamLook = useRef(
    new THREE.Vector3(0, -0.8, 4.2)
  );
  // Zoomed-in moon-watching framing: the moon is enlarged and pulled forward,
  // so the seated mech + planet row fit the screen together. Camera sits above
  // and in front, looking down at the seat/planet row.
  const moonCamPos = useRef(
    new THREE.Vector3(0, MOON_SEAT_POSITION[1] + 3.0, 1.0)
  );
  const moonCamLook = useRef(
    new THREE.Vector3(0, MOON_SEAT_POSITION[1] + 1.35, -9.5)
  );

  useFrame((state) => {
    const progress = progressRef.current;
    const p = mechPosRef.current;
    const controls = state.controls;
    // Let dragging own the view after the scroll settles.
    if (Math.abs(progress - lastProgressRef.current) < 0.00001) return;
    lastProgressRef.current = progress;
    if (progress < 0.30) {
      const reveal = smooth((progress - 0.18) / 0.12);
      targetPosition.current.lerpVectors(sleepCamPos.current, heroCamPos.current, reveal);
      targetLook.current.lerpVectors(sleepCamLook.current, heroCamLook.current, reveal);
    } else if (progress < 0.78) {
      // Show the hop route from a front/three-quarter cinematic angle. The
      // mech faces the viewer as it lands on each cube, then its yaw turns
      // toward the planets during flight. Keeping the camera in front avoids
      // the rear-view "obby" read while preserving the authored route.
      const yaw = mechYawRef.current;
      cameraForward.current.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      cameraRight.current.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
      targetPosition.current.copy(p)
        .addScaledVector(cameraForward.current, 4.8)
        .addScaledVector(cameraRight.current, 2.2);
      targetPosition.current.y += 2.4;
      targetLook.current.copy(p);
      targetLook.current.y += 0.5;
      const chaseStart = progress < 0.46 ? 0.30 : 0.46;
      const chaseAnchor = progress < 0.46 ? sleepCamPos.current : heroCamPos.current;
      const chaseBlend = smooth((progress - chaseStart) / 0.06);
      targetPosition.current.lerpVectors(chaseAnchor, targetPosition.current, chaseBlend);
      const moonBlend = smooth((progress - 0.70) / 0.18);
      targetPosition.current.lerp(moonCamPos.current, moonBlend);
      targetLook.current.lerp(moonCamLook.current, moonBlend);
    } else {
      targetPosition.current.copy(moonCamPos.current);
      targetLook.current.copy(moonCamLook.current);
    }
    camera.position.copy(targetPosition.current);
    if (controls) {
      controls.target.copy(targetLook.current);
      controls.update();
    } else camera.lookAt(targetLook.current);
  }, -1);

  return (
    <group>
      <TacticalAstronaut
        phase={phase}
        position={[0, 0, 0]}
        scale={1}
        hopPoints={HOP_WAYPOINTS}
        journeyProgressRef={progressRef}
        mechPosRef={mechPosRef}
        mechYawRef={mechYawRef}
      />
    </group>
  );
}

class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    console.error('Scene loading failed', error);
    reportBoot('error', 0, 'An asset could not load. Reload to retry.');
  }
  render() { return this.state.failed ? null : this.props.children; }
}

const SpaceCanvas = () => {
  const scrollTrackRef = useRef(null);
  const [astronautPhase, setAstronautPhase] = useState('sleeping');
  const scrollProgressRef = useRef(0);

  const [ready, setReady] = useState(false);
  // Was two-stage: prepared → wait for BootLoader's 'portfolio:revealed'
  // event → ready. Removing the loading screen removes whatever dispatches
  // that event, which would otherwise leave `ready` permanently false and
  // freeze scrolling/dragging entirely. Now goes straight from the scene
  // actually being GPU-prepared (SceneReady's onReady) to ready — the real
  // warm-up work SceneReady does (texture upload, shader compile, GPU fence
  // sync) is untouched, only the visual loading screen and its event
  // hand-off are gone.
  const handleReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready || !scrollTrackRef.current) return;
    const playhead = { progress: 0 };
    // scrub only smooths an attached animation; it did nothing on the old
    // bare ScrollTrigger. Drive both phase and camera from the same tween.
    const animation = gsap.to(playhead, {
      progress: 1,
      ease: 'none',
      onUpdate: () => {
        scrollProgressRef.current = playhead.progress;
        setAstronautPhase(phaseForProgress(playhead.progress));
      },
      scrollTrigger: {
        trigger: scrollTrackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
    });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('portfolio:revealed', refresh);
    const raf = requestAnimationFrame(refresh);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('portfolio:revealed', refresh);
      animation.scrollTrigger?.kill();
      animation.kill();
    };
  }, [ready]);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <SceneErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 52 }}
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
          <AssetProgress />
          <Suspense fallback={null}>
          <ambientLight intensity={0.4} color="#4a5568" />
          <directionalLight position={[10, 10, 5]} intensity={1.0} color="#e2e8f0" />
          <pointLight position={[-10, -5, -10]} intensity={0.6} color="#3b82f6" distance={30} />
          <pointLight position={[10, 5, 10]} intensity={0.5} color="#8b5cf6" distance={25} />

            {/* Restoring the real night-sky environment map — this had been
                dropped somewhere along the way, leaving just flat black +
                the procedural starfield with nothing for reflective
                surfaces (the cube glass, the mech's visor/metal) to catch
                light from. background=false keeps the visible backdrop as
                the actual starfield/black canvas; this only feeds lighting
                and reflections. */}
            <Environment files="/models/night-sky.exr" background={false} />

            {/* Keep the cube field mounted from the opening frame. The route
                should already exist in the space while the mech sleeps and
                wakes; it must not pop in at the idle→hop boundary. */}
            <ControlCubeField
              visible={
                astronautPhase === 'sleeping'
                || astronautPhase === 'waking'
                || astronautPhase === 'idle'
                || astronautPhase === 'hopping'
                || astronautPhase === 'launching'
              }
              platformsVisible={
                astronautPhase === 'sleeping'
                || astronautPhase === 'waking'
                || astronautPhase === 'idle'
                || astronautPhase === 'hopping'
                || astronautPhase === 'launching'
              }
              firstPlatformOnly={false}
            />

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

            {/* The moon/planets enter after the cube route and launch beat.
                Solid surfaces occlude the star background throughout flight. */}
            <group
              visible={
                astronautPhase === 'flying'
                || astronautPhase === 'landing'
                || astronautPhase === 'seated'
              }
            >
              <MoonScene
                moonPosition={MOON_POSITION}
                moonRadius={MOON_RADIUS}
                planetsVisible={
                  astronautPhase === 'flying'
                  || astronautPhase === 'landing'
                  || astronautPhase === 'seated'
                }
              />
            </group>

            <JourneyController progressRef={scrollProgressRef} phase={astronautPhase} />

          <SceneReady onReady={handleReady} />
          <OrbitControls
            makeDefault
            enabled={ready}
            enableRotate={true}
            enableZoom={false}
            // Primary drag pans the camera through the fixed scene. The
            // world is never rotated as one object; middle-drag can still
            // orbit for a closer inspection.
            enablePan={true}
            screenSpacePanning={true}
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.ROTATE,
              RIGHT: THREE.MOUSE.PAN,
            }}
            panSpeed={0.45}
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
          </Suspense>
        </Canvas>
        </SceneErrorBoundary>

      </div>

      {/* Scroll track — drives the whole jump/fly/land/sit sequence. Tune
          this height to make the sequence feel faster or slower to scroll
          through. */}
      <div ref={scrollTrackRef} style={{ height: '520vh' }} />
      {/* A separate, text-free destination after the moon-ending scene. Its
          opaque surface deliberately covers the fixed 3D canvas beneath it. */}
      <SonarGrid />
    </>
  );
};

export default SpaceCanvas;
