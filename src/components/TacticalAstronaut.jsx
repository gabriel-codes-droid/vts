import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MOON_SEAT_POSITION, LAUNCH_POINT, FLIGHT_APEX } from './sceneConstants';

const ASTRONAUT_MODEL = '/models/bot_mecha_warrior.glb';
const JETPACK_MODEL = '/models/jetpack/Jetpack.glb';
const CHARACTER_SCALE = 0.68;
const SEATED_ROOT_HEIGHT = 1.53;

useGLTF.preload(ASTRONAUT_MODEL);
useGLTF.preload(JETPACK_MODEL);
useFBX.preload('/models/idle.fbx');
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

export default function TacticalAstronaut({ phase, position = [0, 0, 0], scale = 1, hopPoints = [[0, 0, 0]], hopPositionRef, journeyProgress = 0 }) {
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
        // painted metal instead of a polished chrome toy.
        tuned.roughness = isVisor ? 0.3 : 0.72;
        tuned.metalness = isVisor ? 0.12 : 0.62;
        tuned.envMapIntensity = isVisor ? 0.48 : 0.32;
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
    return result;
  }, [astronaut]);
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
    idle: sourceMixer.clipAction(idleAsset.animations[0], mutantJumpAsset),
    hopping: sourceMixer.clipAction(mutantJumpAsset.animations[0], mutantJumpAsset),
    launching: sourceMixer.clipAction(mutantJumpAsset.animations[0], mutantJumpAsset),
    flying: sourceMixer.clipAction(flyAsset.animations[0], mutantJumpAsset),
    landing: sourceMixer.clipAction(landAsset.animations[0], mutantJumpAsset),
    seated: sourceMixer.clipAction(sitAsset.animations[0], mutantJumpAsset),
  }), [sourceMixer, idleAsset, mutantJumpAsset, flyAsset, landAsset, sitAsset]);

  useEffect(() => {
    const action = actions?.[phase];
    if (!action) return;
    Object.values(actions).forEach((item) => item.stop());
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.28).play();
    action.setEffectiveTimeScale(phase === 'flying' ? 0.48 : phase === 'hopping' ? 0.72 : 1);
    activeAction.current = action;
    return () => action.fadeOut(0.12);
  }, [actions, phase]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // Reset source bones before advancing the animation. The source clip is
    // used only as a joint-pose driver; its skinned body, root translation,
    // and proportions are never rendered or copied onto the astronaut.
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

    if (phase === 'idle') {
      hopStart.current = null; hopIndex.current = 0;
      group.current.rotation.set(0, 0, 0);
      const p = hopPoints[0] || [0, 0, 0];
      group.current.position.set(p[0], p[1] - FOOT_OFFSET + Math.sin(t * 2) * 0.01, p[2]);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'hopping') {
      if (hopStart.current === null) hopStart.current = t;
      group.current.rotation.set(0, 0, 0);
      const elapsed = t - hopStart.current;
      const progress = (elapsed / 1.8) % 1;
      // Keep the first hop anchored on cube 0; advance only when a complete
      // hop cycle wraps, rather than incrementing on the first rendered frame.
      if (elapsed > 0.05 && progress < 0.02) hopIndex.current = (hopIndex.current + 1) % hopPoints.length;
      const from = hopPoints[hopIndex.current] || [0, 0, 0];
      const to = hopPoints[(hopIndex.current + 1) % hopPoints.length] || from;
      group.current.position.set(
        THREE.MathUtils.lerp(from[0], to[0], progress),
        THREE.MathUtils.lerp(from[1], to[1], progress) - FOOT_OFFSET + Math.sin(progress * Math.PI) * 0.75,
        THREE.MathUtils.lerp(from[2], to[2], progress),
      );
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    if (phase === 'seated') {
      // The final pose is a true moon-surface placement, not the last frame
      // of the flight interpolation. The mecha faces -Z, toward the project
      // planets positioned in front of the moon.
      group.current.position.set(
        MOON_SEAT_POSITION[0],
        MOON_SEAT_POSITION[1] - (SEATED_ROOT_HEIGHT * CHARACTER_SCALE * scale),
        MOON_SEAT_POSITION[2],
      );
      group.current.rotation.set(0, Math.PI, 0);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    const flightT = THREE.MathUtils.clamp((journeyProgress - 0.42) / 0.46, 0, 1);
    const eased = flightT * flightT * (3 - 2 * flightT);
    // Two-leg path: straight up off the last hop cube first (a real
    // vertical launch, clearing the cube field), then arcs over to land
    // exactly on the moon's surface (MOON_SEAT_POSITION, derived from the
    // same MOON_CENTER/MOON_RADIUS PlanetShowcase.jsx renders the moon at).
    const launchVec = new THREE.Vector3(...LAUNCH_POINT);
    const apexVec = new THREE.Vector3(...FLIGHT_APEX);
    const seatVec = new THREE.Vector3(MOON_SEAT_POSITION[0], MOON_SEAT_POSITION[1] - FOOT_OFFSET, MOON_SEAT_POSITION[2]);
    if (eased < 0.5) {
      group.current.position.lerpVectors(launchVec, apexVec, eased / 0.5);
    } else {
      group.current.position.lerpVectors(apexVec, seatVec, (eased - 0.5) / 0.5);
    }
    if (journeyProgress < 0.88) group.current.position.y += Math.sin(flightT * Math.PI) * 0.4;
    group.current.rotation.z = THREE.MathUtils.lerp(0, -0.12, Math.sin(flightT * Math.PI));
    group.current.rotation.x = THREE.MathUtils.lerp(0, 0.08, Math.sin(flightT * Math.PI));
  });

  const spine = astronaut.getObjectByName('spine_05_x_08');
  if (spine && jetpackClone.parent !== spine) {
    spine.add(jetpackClone);
    jetpackClone.position.set(0, 0.08, -0.42);
    jetpackClone.rotation.set(0, Math.PI, 0);
    jetpackClone.scale.setScalar(0.95);
  }
  // Only visible for the powered-flight portion of the journey: appears
  // right as he launches, stays attached through the flight and the
  // landing touchdown, then disappears once seated — matches a jetpack
  // that's worn for the flight and set aside on arrival, not a permanent
  // backpack.
  jetpackClone.visible = phase === 'launching' || phase === 'flying' || phase === 'landing';

  return (
    <group ref={group} position={position} scale={scale * CHARACTER_SCALE}>
      <primitive object={astronaut} />
      <pointLight position={[0, 1.25, 0.2]} color="#b9d7ff" intensity={1.4} distance={3.4} decay={2} />
    </group>
  );
}
