import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';

const ASTRONAUT_MODEL = '/models/sci-fi_cyberpunk_astronaut.glb';
const JETPACK_MODEL = '/models/jetpack/Jetpack.glb';

useGLTF.preload(ASTRONAUT_MODEL);
useGLTF.preload(JETPACK_MODEL);
useFBX.preload('/models/idle.fbx');
useFBX.preload('/models/jump.fbx');
useFBX.preload('/models/flying.fbx');
useFBX.preload('/models/landing.fbx');
useFBX.preload('/models/sitting.fbx');

// Source FBX bones -> matching bones in the supplied rigged astronaut GLB.
const BONE_MAP = {
  mixamorigHips: 'Hips_00',
  mixamorigLeftUpLeg: 'LeftUpLeg_01', mixamorigLeftLeg: 'LeftLeg_02',
  mixamorigLeftFoot: 'LeftFoot_03', mixamorigLeftToeBase: 'LeftToeBase_04',
  mixamorigRightUpLeg: 'RightUpLeg_05', mixamorigRightLeg: 'RightLeg_06',
  mixamorigRightFoot: 'RightFoot_07', mixamorigRightToeBase: 'RightToeBase_08',
  mixamorigSpine: 'Spine02_09', mixamorigSpine1: 'Spine01_010', mixamorigSpine2: 'Spine_011',
  mixamorigLeftShoulder: 'LeftShoulder_012', mixamorigLeftArm: 'LeftArm_013',
  mixamorigLeftForeArm: 'LeftForeArm_014', mixamorigLeftHand: 'LeftHand_015',
  mixamorigRightShoulder: 'RightShoulder_016', mixamorigRightArm: 'RightArm_017',
  mixamorigRightForeArm: 'RightForeArm_018', mixamorigRightHand: 'RightHand_019',
  mixamorigNeck: 'neck_020', mixamorigHead: 'Head_021',
};

export default function TacticalAstronaut({ phase, position = [0, 0, 0], scale = 1, hopPoints = [[0, 0, 0]], hopPositionRef, journeyProgress = 0 }) {
  const group = useRef(null);
  const hopIndex = useRef(0);
  const hopStart = useRef(null);
  const activeAction = useRef(null);
  const { scene } = useGLTF(ASTRONAUT_MODEL);
  const { scene: jetpack } = useGLTF(JETPACK_MODEL);
  const astronaut = useMemo(() => cloneSkinnedScene(scene), [scene]);
  const jetpackClone = useMemo(() => jetpack.clone(true), [jetpack]);

  // These are the exact project copies of Idle.fbx, Mutant Jumping.fbx,
  // Flying.fbx, Landing.fbx, and Sitting Idle.fbx from the 3d Models folder.
  const idleAsset = useFBX('/models/idle.fbx');
  const mutantJumpAsset = useFBX('/models/jump.fbx');
  const flyAsset = useFBX('/models/flying.fbx');
  const landAsset = useFBX('/models/landing.fbx');
  const sitAsset = useFBX('/models/sitting.fbx');

  // Play the FBX clips on their own animation-only skeleton, then transfer
  // only each bone's rotation delta to the GLB. This keeps the GLB rest pose
  // and bone positions intact, preventing crossed legs and twisted shoulders.
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
  const sourceRest = useMemo(() => Object.fromEntries(
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
      if (sourceBones[sourceName] && sourceRest[sourceName]) sourceBones[sourceName].quaternion.copy(sourceRest[sourceName]);
    });
    // R3F already consumes the clock delta before invoking useFrame. Use its
    // supplied frame delta so the FBX clips actually advance every frame.
    sourceMixer.update(delta);

    // Retarget world-space joint rotations while preserving the GLB's own
    // bind pose. This avoids the crossed-leg problem caused by applying a
    // Mixamo local quaternion directly to a differently oriented GLB bone.
    // No hip position track is transferred, so the character still travels
    // only through the existing group path below.
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
      group.current.position.set(p[0], p[1] + Math.sin(t * 2) * 0.01, p[2]);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'hopping') {
      if (hopStart.current === null) hopStart.current = t;
      group.current.rotation.set(0, 0, 0);
      const progress = ((t - hopStart.current) / 1.8) % 1;
      if (progress < 0.02) hopIndex.current = (hopIndex.current + 1) % hopPoints.length;
      const from = hopPoints[hopIndex.current] || [0, 0, 0];
      const to = hopPoints[(hopIndex.current + 1) % hopPoints.length] || from;
      group.current.position.set(
        THREE.MathUtils.lerp(from[0], to[0], progress),
        THREE.MathUtils.lerp(from[1], to[1], progress) + Math.sin(progress * Math.PI) * 0.75,
        THREE.MathUtils.lerp(from[2], to[2], progress),
      );
      hopPositionRef?.current.copy(group.current.position);
      return;
    }

    const flightT = THREE.MathUtils.clamp((journeyProgress - 0.42) / 0.46, 0, 1);
    const eased = flightT * flightT * (3 - 2 * flightT);
    group.current.position.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.2, 0.05, -0.8), eased);
    if (journeyProgress < 0.88) group.current.position.y += Math.sin(flightT * Math.PI) * 0.4;
    group.current.rotation.z = THREE.MathUtils.lerp(0, -0.12, Math.sin(flightT * Math.PI));
    group.current.rotation.x = THREE.MathUtils.lerp(0, 0.08, Math.sin(flightT * Math.PI));
  });

  const spine = astronaut.getObjectByName('Spine_011');
  if (spine && jetpackClone.parent !== spine) {
    spine.add(jetpackClone);
    jetpackClone.position.set(0, 0.03, -0.34);
    jetpackClone.rotation.set(0, Math.PI, 0);
    jetpackClone.scale.setScalar(0.78);
  }
  // Only visible for the powered-flight portion of the journey: appears
  // right as he launches, stays attached through the flight and the
  // landing touchdown, then disappears once seated — matches a jetpack
  // that's worn for the flight and set aside on arrival, not a permanent
  // backpack.
  jetpackClone.visible = phase === 'launching' || phase === 'flying' || phase === 'landing';

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={astronaut} />
      <pointLight position={[0, 1.25, 0.2]} color="#b9d7ff" intensity={1.4} distance={3.4} decay={2} />
    </group>
  );
}
