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
  MECH_SLEEP_POSITION,
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
    // Lock every sub-material to real opaque front-face PBR so the mech reads
    // as a physical solid the camera and other objects can't phase through,
    // regardless of whatever the source GLB authored for transparency.
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const mat of materials) {
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        mat.depthTest = true;
        mat.side = THREE.FrontSide;
        if (mat.clearcoat !== undefined) { mat.clearcoat = 0; mat.clearcoatRoughness = 1; }
        if (mat.clearcoatMap) { mat.clearcoatMap = undefined; }
        if (mat.transmission !== undefined) { mat.transmission = 0; }
        if (mat.transmissionMap) { mat.transmissionMap = undefined; }
        if (mat.ior !== undefined) { mat.ior = 1; }
        if (mat.thickness !== undefined) { mat.thickness = 0; }
      }
    });
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const tunedMaterials = materials.map((material) => {
        const tuned = material.clone();
        const isVisor = tuned.name === 'HEAD_1032';
        tuned.roughness = isVisor ? 0.38 : 0.95;
        tuned.metalness = isVisor ? 0.1 : 0.2;
        tuned.envMapIntensity = isVisor ? 0.35 : 0.1;
        if (tuned.emissive) {
          tuned.emissiveIntensity = 0;
        }
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
    hipTwist: new THREE.Quaternion(),
    hipTwistInverse: new THREE.Quaternion(),
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
  // The forced leg bend above exists because the retargeted sitting clip
  // doesn't read correctly on this mecha's proportions/twist-bone setup —
  // the same mismatch almost certainly affects the arms too, and nothing
  // was correcting them. Pulls the upper arms forward/down and bends the
  // elbows toward a relaxed "resting near the knees" seated pose instead of
  // trusting the raw retargeted arm rotation. Values are a reasoned first
  // pass, not measured against this model's actual bind pose — needs visual
  // confirmation like the leg bend did.
  const seatedShoulderBend = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.55)),
    [],
  );
  const seatedElbowBend = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.95)),
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

    // Convert each FBX world-pose delta into the bot's own bind pose.
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
      // The Hips bone is retargeted like every other bone above, which means
      // whatever yaw/turning is authored into the SOURCE FBX clip's hip
      // animation (jump/flying/landing/sitting each likely have some
      // natural hip sway baked in) gets applied on top of — compounds with
      // — the group-level rotation.y set procedurally further down for
      // facing the moon/planets. That fights against the explicit facing
      // direction regardless of how correct that value is. Strip just the
      // twist (yaw, rotation around the vertical axis) from the hip bone's
      // retargeted rotation via swing-twist decomposition, keeping whatever
      // legitimate lean/tilt (pitch/roll) the source animation contributes.
      // The group's own rotation.y remains the only source of facing
      // direction.
      // Skip hip twist correction during hopping to preserve jump.fbx's natural movement
      if (targetName === 'root_x_03' && phase !== 'hopping' && phase !== 'launching') {
        const q = targetBone.quaternion;
        const dot = q.y; // projection onto the (0,1,0) twist axis
        poseScratch.hipTwist.set(0, dot, 0, q.w).normalize();
        poseScratch.hipTwistInverse.copy(poseScratch.hipTwist).invert();
        q.multiply(poseScratch.hipTwistInverse).normalize();
        // BUG FIXED: the cached world-space value used by children (the legs
        // are children of the hips) must reflect this twist-stripped local
        // rotation, not the original pre-strip desiredTargetWorld. Without
        // this, the hip bone visually has no twist but the legs still
        // compute their own rotation as if it did — a mismatch between the
        // hip's actual orientation and what the legs think their parent
        // looks like, which shows up as visibly wrong/twisted leg angles in
        // every phase this correction runs (seated, idle, flying, landing).
        nextTargetPoseWorld[targetName] = poseScratch.parentWorld.clone().multiply(q);
      } else {
        nextTargetPoseWorld[targetName] = poseScratch.desiredTargetWorld.clone();
      }
    });

    // Some mecha clips retain the source rig's bind pose when retargeted.
    if (phase === 'seated') {
      ['thigh_stretch_l_057', 'thigh_stretch_r_065'].forEach((name) => {
        if (targetBones[name]) targetBones[name].quaternion.multiply(seatedHipBend);
      });
      ['leg_stretch_l_058', 'leg_stretch_r_066'].forEach((name) => {
        if (targetBones[name]) targetBones[name].quaternion.multiply(seatedKneeBend);
      });
      // Same correction extended to the arms — see comment at
      // seatedShoulderBend's declaration above.
      if (targetBones['arm_stretch_l_013']) targetBones['arm_stretch_l_013'].quaternion.multiply(seatedShoulderBend);
      if (targetBones['arm_stretch_r_036']) targetBones['arm_stretch_r_036'].quaternion.multiply(seatedShoulderBend.clone().invert());
      if (targetBones['forearm_stretch_l_016']) targetBones['forearm_stretch_l_016'].quaternion.multiply(seatedElbowBend);
      if (targetBones['forearm_stretch_r_038']) targetBones['forearm_stretch_r_038'].quaternion.multiply(seatedElbowBend);
    }

    if (phase === 'sleeping' || phase === 'waking') {
      hopStart.current = null;
      // Now sleeps inside the ISS module (see SleepModule.jsx/sceneConstants)
      // instead of on the first hop platform — they're close to each other
      // by design, but this is a distinct, deliberately-placed spot inside
      // the module's actual measured center, not the cube-platform position.
      const sleepSpot = MECH_SLEEP_POSITION;
      group.current.position.set(sleepSpot[0], sleepSpot[1] - FOOT_OFFSET, sleepSpot[2]);
      group.current.rotation.set(0, 0, 0);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'idle') {
      hopStart.current = null; hopIndex.current = 0;
      const p = hopPoints[0] || [0, 0, 0];
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0, 6, delta);
      group.current.rotation.y = hopDirRef.current.z;
      group.current.rotation.z = 0;
      group.current.position.set(p[0], p[1] - FOOT_OFFSET, p[2]);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'hopping') {
      if (hopStart.current === null) hopStart.current = t;
      const elapsed = t - hopStart.current;
      const progress = (elapsed / 1.8) % 1;
      const hopPath = hopPoints;
      if (elapsed > 0.05 && progress < 0.02) {
        hopIndex.current = Math.min(hopIndex.current + 1, hopPath.length - 2);
      }
      const from = hopPath[hopIndex.current] || hopPath[0];
      const to = hopPath[hopIndex.current + 1] || from;

      const dir = new THREE.Vector3(to[0] - from[0], 0, to[2] - from[2]);
      if (dir.lengthSq() > 0.001) {
        const targetYaw = Math.atan2(dir.x, dir.z);
        hopDirRef.current.lerp(new THREE.Vector3(0, 0, targetYaw), 0.2);
        group.current.rotation.y = hopDirRef.current.z;
      }
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0, 8, delta);

      group.current.position.set(
        THREE.MathUtils.lerp(from[0], to[0], progress),
        THREE.MathUtils.lerp(from[1], to[1], progress) - FOOT_OFFSET + Math.sin(progress * Math.PI) * 0.9,
        THREE.MathUtils.lerp(from[2], to[2], progress),
      );
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    if (phase === 'seated') {
      group.current.position.set(
        MOON_SEAT_POSITION[0],
        MOON_SEAT_POSITION[1] - FOOT_OFFSET,
        MOON_SEAT_POSITION[2],
      );
      // Same angleToPlanets formula the flight block above lerps toward, so
      // by the time 'seated' takes over, rotation.y is already sitting at
      // this exact value — no snap at the hand-off.
      const planetDx = 0 - MOON_SEAT_POSITION[0];
      const planetDz = PLANET_ROW_Z - MOON_SEAT_POSITION[2];
      const angleToPlanets = Math.atan2(planetDx, planetDz);
      group.current.rotation.set(0, angleToPlanets, 0);
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

    const launchVec = new THREE.Vector3(...LAUNCH_POINT);
    const apexVec = new THREE.Vector3(...FLIGHT_APEX);
    const seatVec = new THREE.Vector3(
      MOON_SEAT_POSITION[0],
      MOON_SEAT_POSITION[1] - FOOT_OFFSET,
      MOON_SEAT_POSITION[2],
    );

    if (eased < 0.5) {
      group.current.position.lerpVectors(launchVec, apexVec, eased / 0.5);
    } else {
      group.current.position.lerpVectors(apexVec, seatVec, (eased - 0.5) / 0.5);
    }

    const diveAngle = Math.sin(flightT * Math.PI) * (Math.PI / 3.2);
    group.current.rotation.x = diveAngle;
    // Previously hard-set to 0 here, which snapped from whatever direction
    // he was last facing mid-hop (hopDirRef.current.z), and 'seated' below
    // separately hard-sets yaw to angleToPlanets (~180° with current scene
    // constants) — two snaps bracketing the whole flight. hopDirRef doesn't
    // change once hopping ends, so it still holds his exact last hop-facing
    // angle; interpolating from that to the same angleToPlanets 'seated'
    // uses removes both snaps at once, continuous from the last hop through
    // to sitting down.
    const seatedPlanetDx = 0 - MOON_SEAT_POSITION[0];
    const seatedPlanetDz = PLANET_ROW_Z - MOON_SEAT_POSITION[2];
    const angleToPlanets = Math.atan2(seatedPlanetDx, seatedPlanetDz);
    group.current.rotation.y = THREE.MathUtils.lerp(hopDirRef.current.z, angleToPlanets, eased);
  });

  useEffect(() => {
    const spine = astronaut.getObjectByName('spine_05_x_08');
    if (spine && jetpackClone.parent !== spine) {
      spine.add(jetpackClone);
      jetpackClone.scale.setScalar(0.95);

      // Figure out which way the mech faces in bind pose so the jetpack
      // goes on the BACK (opposite the facing direction) instead of hardcoded
      // to one side and ending up on the front if the model faces the other way.
      const hips = targetBones['root_x_03'];
      const leftToe = targetBones['toes_01_l_060'];
      const rightToe = targetBones['toes_01_r_068'];
      if (hips && leftToe && rightToe) {
        astronaut.updateMatrixWorld(true);
        const hipsPos = new THREE.Vector3();
        const leftToePos = new THREE.Vector3();
        const rightToePos = new THREE.Vector3();
        hips.getWorldPosition(hipsPos);
        leftToe.getWorldPosition(leftToePos);
        rightToe.getWorldPosition(rightToePos);
        const toeZ = (leftToePos.z + rightToePos.z) / 2;
        const facingPositiveZ = toeZ > hipsPos.z;
        // Back is the opposite of the facing direction.
        const jetpackZ = facingPositiveZ ? -0.45 : 0.45;
        jetpackClone.position.set(0, 0.08, jetpackZ);
      } else {
        jetpackClone.position.set(0, 0.08, -0.45);
      }
      jetpackClone.rotation.set(0, Math.PI, 0);
    }
  }, [astronaut, jetpackClone, targetBones]);

  useEffect(() => {
    const isLastHop = hopPoints.length >= 2 && hopIndex.current >= hopPoints.length - 2;
    jetpackClone.visible = isLastHop || phase === 'launching' || phase === 'flying';
  }, [jetpackClone, phase, hopPoints]);

  return (
    <group ref={group} position={position} scale={scale * CHARACTER_SCALE}>
      <primitive object={astronaut} />
      <pointLight position={[0, 1.25, 0.2]} color="#b9d7ff" intensity={0.6} distance={3} decay={2} />
    </group>
  );
}
