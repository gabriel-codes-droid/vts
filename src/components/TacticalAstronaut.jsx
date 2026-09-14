import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  MOON_SEAT_POSITION,
  PLANET_ROW_Z,
  LAUNCH_POINT,
  FLIGHT_APEX,
  CRASH_SLEEP_POSITION,
} from './sceneConstants';

const ASTRONAUT_MODEL = '/models/bot_mecha_warrior.glb';
const JETPACK_MODEL = '/models/jetpack/Jetpack.glb';
const CHARACTER_SCALE = 0.68;

useGLTF.preload(ASTRONAUT_MODEL);
useGLTF.preload(JETPACK_MODEL);
useFBX.preload('/models/idle.fbx');
useFBX.preload('/models/stroke_shaking_head.fbx');
useFBX.preload('/models/waking.fbx');
useFBX.preload('/models/jump.fbx');
useFBX.preload('/models/flying.fbx');
useFBX.preload('/models/landing.fbx');
useFBX.preload('/models/sitting.fbx');

// Source FBX bones -> the mecha's separated limb chains. The mecha has extra
// twist bones and five spine segments; we deliberately target the main
// deforming bones only so the FBX never collapses the legs into one chain.
const BONE_MAP = {
  mixamorigHips: 'root_x_03',
  mixamorigLeftUpLeg: 'thigh_stretch_l_057', mixamorigLeftLeg: 'leg_stretch_l_058',
  mixamorigLeftFoot: 'foot_l_059', mixamorigLeftToeBase: 'toes_01_l_060',
  mixamorigRightUpLeg: 'thigh_stretch_r_065', mixamorigRightLeg: 'leg_stretch_r_066',
  mixamorigRightFoot: 'foot_r_067', mixamorigRightToeBase: 'toes_01_r_068',
  mixamorigSpine: 'spine_01_x_04', mixamorigSpine1: 'spine_03_x_06', mixamorigSpine2: 'spine_05_x_08',
  mixamorigLeftShoulder: 'shoulder_l_012', mixamorigLeftArm: 'arm_stretch_l_013',
  mixamorigLeftForeArm: 'forearm_stretch_l_016', mixamorigLeftHand: 'hand_l_019',
  mixamorigRightShoulder: 'shoulder_r_035', mixamorigRightArm: 'arm_stretch_r_036',
  mixamorigRightForeArm: 'forearm_stretch_r_038', mixamorigRightHand: 'hand_r_041',
  mixamorigNeck: 'neck_x_010', mixamorigHead: 'head_x_011',
};

// The bot mecha's bind-pose geometry reaches the local y=0 plane, so its
// group origin can be placed directly on the shared cube-top waypoint.
const FOOT_OFFSET = 0;

export default function TacticalAstronaut({ phase, position = [0, 0, 0], scale = 1, hopPoints = [[0, 0, 0]], hopPositionRef, journeyProgress = 0, journeyProgressRef }) {
  const group = useRef(null);
  const hopIndex = useRef(0);
  const hopStart = useRef(null);
  const activeAction = useRef(null);
  const { scene } = useGLTF(ASTRONAUT_MODEL);
  const { scene: jetpack } = useGLTF(JETPACK_MODEL);
  const astronaut = useMemo(() => {
    const clone = cloneSkinnedScene(scene);
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const tunedMaterials = materials.map((material) => {
        const tuned = material.clone();
        const isVisor = tuned.name === 'HEAD_1032';
        // Keep the visor slightly glossy, but make the body read as worn
        // painted metal instead of a polished chrome toy. Roughness bumped
        // up and metalness/envMapIntensity brought down further — the
        // previous values were reading as too bright/hot under the scene's
        // combined lighting (ambient + directional + 3 point lights all
        // hitting a fairly metallic, glossy surface).
        tuned.roughness = isVisor ? 0.38 : 0.85;
        tuned.metalness = isVisor ? 0.1 : 0.4;
        tuned.envMapIntensity = isVisor ? 0.35 : 0.2;
        return tuned;
      });
      object.material = Array.isArray(object.material) ? tunedMaterials : tunedMaterials[0];
    });
    return clone;
  }, [scene]);
  const jetpackClone = useMemo(() => jetpack.clone(true), [jetpack]);

  // These are the exact project copies of Idle.fbx, Mutant Jumping.fbx,
  // Flying.fbx, Landing.fbx, and Sitting Idle.fbx from the 3d Models folder.
  const idleAsset = useFBX('/models/idle.fbx');
  const sleepingAsset = useFBX('/models/stroke_shaking_head.fbx');
  const wakingAsset = useFBX('/models/waking.fbx');
  const mutantJumpAsset = useFBX('/models/jump.fbx');
  const flyAsset = useFBX('/models/flying.fbx');
  const landAsset = useFBX('/models/landing.fbx');
  const sitAsset = useFBX('/models/sitting.fbx');

  const sourceBones = useMemo(() => {
    const result = {};
    mutantJumpAsset.traverse((object) => { if (object.isBone) result[object.name] = object; });
    return result;
  }, [mutantJumpAsset]);
  const targetBones = useMemo(() => {
    const result = {};
    astronaut.traverse((object) => { if (object.isBone) result[object.name] = object; });
    // One-time diagnostic — open the browser console (F12) and check this
    // if facing/twist issues persist. Lists every bone name (to confirm the
    // BONE_MAP entries and find any unmapped twist bones) and the model's
    // raw bounding box (a box longer in Z than X, off-center toward -Z or
    // +Z, is a real hint at which way it was authored to face).
    if (typeof window !== 'undefined' && !window.__astronautBonesLogged) {
      window.__astronautBonesLogged = true;
      console.log('[TacticalAstronaut] bone names:', Object.keys(result));
      const box = new THREE.Box3().setFromObject(astronaut);
      console.log('[TacticalAstronaut] bind-pose bounding box:', box.min, box.max);
    }
    return result;
  }, [astronaut]);

  // One-time diagnostic: confirms whether the jetpack attachment bone was
  // actually found. If BONE_MAP's hand-typed 'spine_05_x_08' has even a
  // one-character mismatch against this specific file's real bone name, the
  // jetpack silently never attaches to anything — this prints which case
  // it is, directly, instead of requiring another round of raw data.
  useEffect(() => {
    if (typeof window === 'undefined' || window.__jetpackSpineLogged) return;
    window.__jetpackSpineLogged = true;
    const found = astronaut.getObjectByName('spine_05_x_08');
    console.log('[TacticalAstronaut] jetpack attach bone "spine_05_x_08" found:', !!found);
    if (!found) {
      console.log('[TacticalAstronaut] bone names actually present:', Object.keys(targetBones));
    }
  }, [astronaut, targetBones]);

  // One-time diagnostic: determines which way this model actually faces in
  // its bind pose, directly, instead of dumping a bounding box the user has
  // to interpret. Compares the average toe-bone Z position against the hip
  // bone's Z position — a standing character's feet point in its own
  // forward direction, so whichever side of the hips the toes sit on IS the
  // forward axis, regardless of how the mesh names things internally.
  useEffect(() => {
    if (typeof window === 'undefined' || window.__astronautFacingLogged) return;
    const hips = targetBones['root_x_03'];
    const leftToe = targetBones['toes_01_l_060'];
    const rightToe = targetBones['toes_01_r_068'];
    if (!hips || !leftToe || !rightToe) return;
    window.__astronautFacingLogged = true;
    astronaut.updateMatrixWorld(true);
    const hipsPos = new THREE.Vector3();
    const leftToePos = new THREE.Vector3();
    const rightToePos = new THREE.Vector3();
    hips.getWorldPosition(hipsPos);
    leftToe.getWorldPosition(leftToePos);
    rightToe.getWorldPosition(rightToePos);
    const toeZ = (leftToePos.z + rightToePos.z) / 2;
    const facing = toeZ > hipsPos.z ? '+Z' : '-Z';
    console.log(
      `[TacticalAstronaut] bind-pose facing direction: ${facing} (hips z=${hipsPos.z.toFixed(3)}, toes avg z=${toeZ.toFixed(3)})`
    );
  }, [astronaut, targetBones]);
  const sourceRestLocal = useMemo(() => Object.fromEntries(
    Object.entries(sourceBones).map(([name, bone]) => [name, bone.quaternion.clone()]),
  ), [sourceBones]);
  const sourceRestWorld = useMemo(() => {
    mutantJumpAsset.updateMatrixWorld(true);
    return Object.fromEntries(Object.entries(sourceBones).map(([name, bone]) => {
      const quaternion = new THREE.Quaternion();
      bone.getWorldQuaternion(quaternion);
      return [name, quaternion];
    }));
  }, [mutantJumpAsset, sourceBones]);
  const targetRestWorld = useMemo(() => {
    astronaut.updateMatrixWorld(true);
    return Object.fromEntries(Object.entries(BONE_MAP).map(([, targetName]) => {
      const bone = targetBones[targetName];
      if (!bone) return [targetName, null];
      const quaternion = new THREE.Quaternion();
      bone.getWorldQuaternion(quaternion);
      return [targetName, quaternion];
    }));
  }, [astronaut, targetBones]);
  const poseScratch = useMemo(() => ({
    sourceWorld: new THREE.Quaternion(),
    sourceRestWorldInverse: new THREE.Quaternion(),
    sourceDeltaWorld: new THREE.Quaternion(),
    desiredTargetWorld: new THREE.Quaternion(),
    parentWorld: new THREE.Quaternion(),
    inverseParentWorld: new THREE.Quaternion(),
  }), []);
  const targetPoseWorld = useRef({});
  const sourceMixer = useMemo(() => new THREE.AnimationMixer(mutantJumpAsset), [mutantJumpAsset]);
  const actions = useMemo(() => ({
    sleeping: sourceMixer.clipAction(sleepingAsset.animations[0], mutantJumpAsset),
    waking: sourceMixer.clipAction(wakingAsset.animations[0], mutantJumpAsset),
    idle: sourceMixer.clipAction(idleAsset.animations[0], mutantJumpAsset),
    hopping: sourceMixer.clipAction(mutantJumpAsset.animations[0], mutantJumpAsset),
    launching: sourceMixer.clipAction(mutantJumpAsset.animations[0], mutantJumpAsset),
    flying: sourceMixer.clipAction(flyAsset.animations[0], mutantJumpAsset),
    landing: sourceMixer.clipAction(landAsset.animations[0], mutantJumpAsset),
    seated: sourceMixer.clipAction(sitAsset.animations[0], mutantJumpAsset),
  }), [sourceMixer, sleepingAsset, wakingAsset, idleAsset, mutantJumpAsset, flyAsset, landAsset, sitAsset]);

  useEffect(() => {
    const action = actions?.[phase];
    if (!action) return;
    // Previously called .stop() on every action here, which instantly halts
    // and resets ALL of them — including whichever one the PREVIOUS effect's
    // cleanup had just started fading out via fadeOut(0.12) a moment earlier.
    // That cancelled the fade mid-flight and caused a hard pose-snap at
    // every single phase change (7 of them across the whole journey) — the
    // reported "blink." The cleanup below already handles fading the old
    // action out smoothly; AnimationMixer supports multiple concurrently-
    // weighted actions by design, so nothing needs to be force-stopped here.
    const oneShot = phase === 'waking' || phase === 'landing';
    action.reset()
      .setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity)
      .fadeIn(0.28)
      .play();
    action.clampWhenFinished = oneShot;
    action.setEffectiveTimeScale(phase === 'flying' ? 0.48 : phase === 'hopping' ? 0.72 : 1);
    activeAction.current = action;
    return () => action.fadeOut(0.12);
  }, [actions, phase]);

  const hopDirRef = useRef(new THREE.Vector3());
  const hopPitchRef = useRef(0);
  const seatedWorldScale = useMemo(() => new THREE.Vector3(), []);
  const seatedHipBend = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.62, 0, 0)),
    [],
  );
  const seatedKneeBend = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.92, 0, 0)),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // Reset source bones before advancing the animation.
    Object.entries(BONE_MAP).forEach(([sourceName]) => {
      if (sourceBones[sourceName] && sourceRestLocal[sourceName]) sourceBones[sourceName].quaternion.copy(sourceRestLocal[sourceName]);
    });
    sourceMixer.update(delta);


    // Convert each FBX world-pose delta into the bot's own bind pose. This
    // keeps the bot's left/right limb axes and separated leg chains intact;
    // only rotations are copied, never the FBX mesh or hip position track.
    const nextTargetPoseWorld = targetPoseWorld.current;
    Object.entries(BONE_MAP).forEach(([sourceName, targetName]) => {
      const sourceBone = sourceBones[sourceName];
      const targetBone = targetBones[targetName];
      const sourceBaseWorld = sourceRestWorld[sourceName];
      const targetBaseWorld = targetRestWorld[targetName];
      if (!sourceBone || !targetBone || !sourceBaseWorld || !targetBaseWorld) return;

      sourceBone.getWorldQuaternion(poseScratch.sourceWorld);
      poseScratch.sourceDeltaWorld
        .copy(poseScratch.sourceWorld)
        .multiply(poseScratch.sourceRestWorldInverse.copy(sourceBaseWorld).invert());
      poseScratch.desiredTargetWorld
        .copy(poseScratch.sourceDeltaWorld)
        .multiply(targetBaseWorld);

      const parent = targetBone.parent;
      const mappedParentWorld = parent && nextTargetPoseWorld[parent.name];
      if (mappedParentWorld) {
        poseScratch.parentWorld.copy(mappedParentWorld);
      } else if (parent) {
        parent.getWorldQuaternion(poseScratch.parentWorld);
      } else {
        poseScratch.parentWorld.identity();
      }
      poseScratch.inverseParentWorld.copy(poseScratch.parentWorld).invert();
      targetBone.quaternion
        .copy(poseScratch.inverseParentWorld)
        .multiply(poseScratch.desiredTargetWorld)
        .normalize();
      nextTargetPoseWorld[targetName] = poseScratch.desiredTargetWorld.clone();
    });

    // Some mecha clips retain the source rig's bind pose when retargeted.
    // Keep the supplied FBX as the driver, then add a restrained symmetric
    // fold so this model reads as seated without crossing its legs.
    if (phase === 'seated') {
      // Stronger seated pose adjustments to ensure proper sitting appearance
      ['thigh_stretch_l_057', 'thigh_stretch_r_065'].forEach((name) => {
        if (targetBones[name]) {
          const seatedHip = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.8, 0, 0));
          targetBones[name].quaternion.multiply(seatedHip);
        }
      });
      ['leg_stretch_l_058', 'leg_stretch_r_066'].forEach((name) => {
        if (targetBones[name]) {
          const seatedKnee = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.1, 0, 0));
          targetBones[name].quaternion.multiply(seatedKnee);
        }
      });
      // Bend spine forward slightly for seated posture
      if (targetBones['spine_05_x_08']) {
        const seatedSpine = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0));
        targetBones['spine_05_x_08'].quaternion.multiply(seatedSpine);
      }
    }


    if (phase === 'sleeping' || phase === 'waking') {
      hopStart.current = null;
      group.current.position.set(...CRASH_SLEEP_POSITION);
      group.current.rotation.set(0, 0, 0);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'idle') {
      hopStart.current = null; hopIndex.current = 0;
      // After waking, settle onto the large left platform so the transition
      // has a readable resting beat before the character starts hopping. The
      // platform is intentionally flat, so the mech lies across its surface.
      const p = hopPoints[0] || CRASH_SLEEP_POSITION;
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -Math.PI / 2, 6, delta);
      group.current.rotation.y = hopDirRef.current.z;
      group.current.rotation.z = 0;
      group.current.position.set(p[0], p[1] + 0.26, p[2]);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'hopping') {
      if (hopStart.current === null) hopStart.current = t;
      const elapsed = t - hopStart.current;
      const progress = (elapsed / 1.8) % 1;
      const hopPath = hopPoints;
      // Advance hop index only after a full cycle completes, not on the first
      // rendered frame — prevents the hop index from immediately jumping ahead.
      if (elapsed > 0.05 && progress < 0.02) {
        hopIndex.current = Math.min(hopIndex.current + 1, hopPath.length - 2);
      }
      const from = hopPath[hopIndex.current] || hopPath[0];
      const to = hopPath[hopIndex.current + 1] || from;

      // Face the direction of travel so the legs push forward during the hop
      // instead of sliding sideways. Yaw rotates around the up axis so the
      // body turns to face the next cube; legs then extend in the right
      // direction relative to the body's forward axis.
      const dir = new THREE.Vector3(to[0] - from[0], 0, to[2] - from[2]);
      if (dir.lengthSq() > 0.001) {
        const targetYaw = Math.atan2(dir.x, dir.z);
        hopDirRef.current.lerp(new THREE.Vector3(0, 0, targetYaw), 0.2);
        group.current.rotation.y = hopDirRef.current.z;
      }
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0, 8, delta);

      // Vertical hop: lerp X/Z linearly, Y follows a sine arc over the hop.
      group.current.position.set(
        THREE.MathUtils.lerp(from[0], to[0], progress),
        THREE.MathUtils.lerp(from[1], to[1], progress) - FOOT_OFFSET + Math.sin(progress * Math.PI) * 0.75,
        THREE.MathUtils.lerp(from[2], to[2], progress),
      );
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    if (phase === 'seated') {
      // Place the animated model first, then measure its actual visible
      // lowest point. This avoids guessing where this particular GLB's root
      // or sitting pose is and guarantees contact with the moon's top.
      group.current.position.set(
        MOON_SEAT_POSITION[0],
        MOON_SEAT_POSITION[1] - FOOT_OFFSET,
        MOON_SEAT_POSITION[2],
      );
      // The mecha asset's authored forward axis is +Z. The project planets
      // are on -Z from the moon seat, so use the direct target angle; the old
      // extra PI flip made the seated bot face away from the planets.
      const planetDx = 0 - MOON_SEAT_POSITION[0];
      const planetDz = PLANET_ROW_Z - MOON_SEAT_POSITION[2];
      const angleToPlanets = Math.atan2(planetDx, planetDz);
      group.current.rotation.set(0, angleToPlanets, 0);
      // Refresh the parent matrix before measuring: the group's newly-set
      // position must be included in the world-space bounds.
      group.current.updateMatrixWorld(true);
      astronaut.updateMatrixWorld(true);
      // Measure ground contact using actual BONE positions, not mesh
      // geometry. Box3.expandByObject() on a skinned mesh is a known Three.js
      // limitation: it measures the bind-pose geometry transformed by the
      // mesh's own matrix, NOT the GPU-skinned/deformed result — it never
      // sees the forced seated hip/knee bend at all. So even with correct
      // scale math, the "lowest point" being measured was always the
      // standing-pose foot height, not where the feet actually end up once
      // bent into a seated position. Bones don't have this problem: their
      // matrixWorld is always correctly updated regardless of mesh skinning.
      const leftToe = targetBones['toes_01_l_060'];
      const rightToe = targetBones['toes_01_r_068'];
      if (leftToe && rightToe) {
        const leftToePos = new THREE.Vector3();
        const rightToePos = new THREE.Vector3();
        leftToe.getWorldPosition(leftToePos);
        rightToe.getWorldPosition(rightToePos);
        const lowestY = Math.min(leftToePos.y, rightToePos.y);
        if (group.current.parent) {
          group.current.parent.getWorldScale(seatedWorldScale);
        } else {
          seatedWorldScale.set(1, 1, 1);
        }
        const worldScaleY = Math.max(Math.abs(seatedWorldScale.y), 0.0001);
        group.current.position.y += (MOON_SEAT_POSITION[1] - lowestY) / worldScaleY;
        group.current.updateMatrixWorld(true);
      }
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    const liveJourneyProgress = journeyProgressRef?.current ?? journeyProgress;
    const flightT = THREE.MathUtils.clamp((liveJourneyProgress - 0.39) / 0.61, 0, 1);
    const eased = flightT * flightT * (3 - 2 * flightT);

    // Two-leg path: straight up off the last hop cube first (a real
    // vertical launch, clearing the cube field), then arcs over to land
    // exactly on the moon's surface (MOON_SEAT_POSITION, derived from the
    // same MOON_CENTER/MOON_RADIUS MoonScene renders the moon at).
    const launchVec = new THREE.Vector3(...LAUNCH_POINT);
    const apexVec = new THREE.Vector3(...FLIGHT_APEX);
    const seatVec = new THREE.Vector3(
      MOON_SEAT_POSITION[0],
      MOON_SEAT_POSITION[1] - FOOT_OFFSET,
      MOON_SEAT_POSITION[2],
    );

    if (eased < 0.5) {
      // First leg: pure vertical ascent
      group.current.position.lerpVectors(launchVec, apexVec, eased / 0.5);
    } else {
      // Second leg: vertical dive down to moon
      group.current.position.lerpVectors(apexVec, seatVec, (eased - 0.5) / 0.5);
    }

    // Vertical dive: face downward during flight, level out for landing.
    const diveAngle = Math.sin(flightT * Math.PI) * (Math.PI / 2);
    group.current.rotation.x = diveAngle;
    group.current.rotation.y = 0;
  });

  useEffect(() => {
    const spine = astronaut.getObjectByName('spine_05_x_08');
    if (spine && jetpackClone.parent !== spine) {
      spine.add(jetpackClone);
      jetpackClone.position.set(0, 0.08, -0.42);
      jetpackClone.rotation.set(0, Math.PI, 0);
      jetpackClone.scale.setScalar(0.95);
    }
  }, [astronaut, jetpackClone]);

  useEffect(() => {
    jetpackClone.visible = phase === 'launching' || phase === 'flying';
  }, [jetpackClone, phase]);

  return (
    <group ref={group} position={position} scale={scale * CHARACTER_SCALE}>
      <primitive object={astronaut} />
      <pointLight position={[0, 1.25, 0.2]} color="#b9d7ff" intensity={0.6} distance={3} decay={2} />
    </group>
  );
}
