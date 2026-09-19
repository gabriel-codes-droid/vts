import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { sampleJourney, smooth, clamp } from './journey';
import { clone as cloneSkinnedScene } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  MOON_SEAT_POSITION,
  MECH_SLEEP_POSITION,
} from './sceneConstants';

const ASTRONAUT_MODEL = '/models/bot_mecha_warrior.glb';
const CHARACTER_SCALE = 0.68;

useGLTF.preload(ASTRONAUT_MODEL);
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

const BONE_ENTRIES = Object.entries(BONE_MAP);

// Sci-fi thruster flame for each boot, replacing the jetpack. Two stacked
// additive cones (a bright core + a softer outer glow) pointed away from the
// foot's sole like exhaust. Built once per foot and parented directly to the
// foot bone so it automatically follows the retargeted animation every
// frame without any manual position updates.
function createBootFlame() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.3, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#dff4ff', transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, toneMapped: false, depthWrite: false,
    }),
  );
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.46, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#4fb3ff', transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, toneMapped: false, depthWrite: false,
    }),
  );
  // Cone apex points up by default; flip so the apex points down/away from
  // the sole, like exhaust trailing behind the foot.
  core.rotation.x = Math.PI;
  outer.rotation.x = Math.PI;
  core.position.y = -0.16;
  outer.position.y = -0.24;
  group.add(outer, core);
  group.name = 'bootFlame';
  group.visible = false;
  return group;
}

export default function TacticalAstronaut({ phase, position = [0, 0, 0], scale = 1, hopPoints = [[0, 0, 0]], journeyProgress = 0, journeyProgressRef, mechPosRef, mechYawRef }) {
  const group = useRef(null);
  const activeAction = useRef(null);
  const { scene } = useGLTF(ASTRONAUT_MODEL);
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

  // These are the exact project copies of Idle.fbx, Mutant Jumping.fbx,
  // Flying.fbx, Landing.fbx, and Sitting Idle.fbx from the 3d Models folder.
  const idleAsset = useFBX('/models/idle.fbx');
  const sleepingAsset = useFBX('/models/stroke_shaking_head.fbx');
  const wakingAsset = useFBX('/models/waking.fbx');
  const mutantJumpAsset = useFBX('/models/jump.fbx');
  const flyAsset = useFBX('/models/flying.fbx');
  const landAsset = useFBX('/models/landing.fbx');
  const sitAsset = useFBX('/models/sitting.fbx');

  const sourceRig = useMemo(() => cloneSkinnedScene(mutantJumpAsset), [mutantJumpAsset]);
  const sourceBones = useMemo(() => {
    const result = {};
    sourceRig.traverse((object) => { if (object.isBone) result[object.name] = object; });
    return result;
  }, [sourceRig]);
  const targetBones = useMemo(() => {
    const result = {};
    astronaut.traverse((object) => { if (object.isBone) result[object.name] = object; });
    return result;
  }, [astronaut]);

  const sourceRestLocal = useMemo(() => Object.fromEntries(
    Object.entries(sourceBones).map(([name, bone]) => [name, bone.quaternion.clone()]),
  ), [sourceBones]);
  const sourceRestWorld = useMemo(() => {
    sourceRig.updateMatrixWorld(true);
    return Object.fromEntries(Object.entries(sourceBones).map(([name, bone]) => {
      const quaternion = new THREE.Quaternion();
      bone.getWorldQuaternion(quaternion);
      return [name, quaternion];
    }));
  }, [sourceRig, sourceBones]);
  const targetRestWorld = useMemo(() => {
    astronaut.updateMatrixWorld(true);
    return Object.fromEntries(BONE_ENTRIES.map(([, targetName]) => {
      const bone = targetBones[targetName];
      if (!bone) return [targetName, null];
      const quaternion = new THREE.Quaternion();
      bone.getWorldQuaternion(quaternion);
      return [targetName, quaternion];
    }));
  }, [astronaut, targetBones]);
  // Rest LOCAL quaternion for each mapped bone, captured once at load —
  // used below so the seated pose can be built from the bot's own true
  // bind orientation instead of inheriting whatever the (wrong-shaped)
  // chair-sit FBX clip put there.
  const targetRestLocal = useMemo(() => Object.fromEntries(
    BONE_ENTRIES.map(([, targetName]) => {
      const bone = targetBones[targetName];
      return [targetName, bone ? bone.quaternion.clone() : null];
    }),
  ), [targetBones]);
  const poseScratch = useMemo(() => ({
    sourceWorld: new THREE.Quaternion(),
    sourceRestWorldInverse: new THREE.Quaternion(),
    sourceDeltaWorld: new THREE.Quaternion(),
    desiredTargetWorld: new THREE.Quaternion(),
    parentWorld: new THREE.Quaternion(),
    inverseParentWorld: new THREE.Quaternion(),
    wrapperWorld: new THREE.Quaternion(),
    floorLeg: new THREE.Quaternion(),
  }), []);
  const targetPoseWorld = useRef({});
  const sourceMixer = useMemo(() => new THREE.AnimationMixer(sourceRig), [sourceRig]);
  const actions = useMemo(() => ({
    sleeping: sourceMixer.clipAction(sleepingAsset.animations[0], sourceRig),
    waking: sourceMixer.clipAction(wakingAsset.animations[0], sourceRig),
    idle: sourceMixer.clipAction(idleAsset.animations[0], sourceRig),
    hopping: sourceMixer.clipAction(mutantJumpAsset.animations[0], sourceRig),
    launching: sourceMixer.clipAction(mutantJumpAsset.animations[0], sourceRig),
    flying: sourceMixer.clipAction(flyAsset.animations[0], sourceRig),
    landing: sourceMixer.clipAction(landAsset.animations[0], sourceRig),
    seated: sourceMixer.clipAction(sitAsset.animations[0], sourceRig),
  }), [sourceMixer, sourceRig, sleepingAsset, wakingAsset, idleAsset, mutantJumpAsset, flyAsset, landAsset, sitAsset]);

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
      .setEffectiveWeight(1)
      .setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity)
      .fadeIn(0.28)
      .play();
    action.clampWhenFinished = oneShot;
    action.setEffectiveTimeScale(phase === 'flying' ? 0.48 : phase === 'hopping' ? 0.72 : 1);
    activeAction.current = action;
    return () => action.fadeOut(0.12);
  }, [actions, phase]);

  const movementScratch = useMemo(() => ({
    leftToe: new THREE.Vector3(),
    rightToe: new THREE.Vector3(),
  }), []);
  const seatedHipBend = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-2.1, 0, 0)),
    [],
  );
  const seatedKneeBend = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.05, 0, 0)),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // Boot flames: visible only for the same window the jetpack used to
    // cover (launching/flying), with a flicker so it reads as live thrust
    // rather than a static glued-on shape.
    const thrustActive = phase === 'launching' || phase === 'flying';
    const leftFoot = targetBones['foot_l_059'];
    const rightFoot = targetBones['foot_r_067'];
    [leftFoot, rightFoot].forEach((foot) => {
      const flame = foot?.getObjectByName('bootFlame');
      if (!flame) return;
      flame.visible = thrustActive;
      if (thrustActive) {
        const flicker = 0.88 + Math.sin(t * 42 + (foot === leftFoot ? 0 : 1.7)) * 0.06 + Math.random() * 0.08;
        flame.scale.set(flicker, 1 + Math.random() * 0.15, flicker);
      }
    });

    const progress = journeyProgressRef?.current ?? journeyProgress;
    const yaw = sampleJourney(progress, group.current.position);
    const wake = smooth((progress - 0.08) / 0.10);
    const lying = phase === 'sleeping' ? 1 : phase === 'waking' ? 1 - wake : 0;
    const seatedWeight = phase === 'seated' ? 1 : phase === 'landing' ? smooth((progress - 0.84) / 0.04) : 0;
    const flightLean = phase === 'flying'
      ? Math.sin(clamp((progress - 0.54) / 0.24) * Math.PI) * 0.38 : 0;
    // The stroke/shaking-head FBX is already lying down; another 90-degree
    // wrapper rotation would put its legs in the air.
    group.current.rotation.set(flightLean, yaw, 0);
    group.current.updateMatrixWorld(true);

    group.current.getWorldQuaternion(poseScratch.wrapperWorld);

    // Reset source bones before advancing the animation.
    BONE_ENTRIES.forEach(([sourceName]) => {
      if (sourceBones[sourceName] && sourceRestLocal[sourceName]) sourceBones[sourceName].quaternion.copy(sourceRestLocal[sourceName]);
    });
    // Sample one-shot and hopping clips from the same scroll playhead as
    // their world motion. No elapsed-time loop can run ahead of the route.
    const scroll = journeyProgressRef?.current ?? journeyProgress;
    const action = activeAction.current;
    if (action && (phase === 'waking' || phase === 'hopping' || phase === 'landing')) {
      let local = phase === 'waking' ? clamp((scroll - 0.08) / 0.10)
        : phase === 'landing' ? clamp((scroll - 0.78) / 0.10)
        : (clamp((scroll - 0.30) / 0.16) * (hopPoints.length - 1)) % 1;
      action.time = local * Math.max(0, action.getClip().duration - 0.001);
      action.setEffectiveTimeScale(0);
    }
    if (phase === 'sleeping' || phase === 'waking') {
      const wakeWeight = phase === 'sleeping' ? 0 : wake;
      actions.sleeping.enabled = true;
      actions.sleeping.stopFading().setEffectiveWeight(1 - wakeWeight).play();
      actions.waking.enabled = true;
      actions.waking.stopFading().setEffectiveWeight(wakeWeight).play();
    } else {
      actions.sleeping.stopFading().setEffectiveWeight(0);
    }
    if (phase === 'landing') {
      actions.landing.stopFading().setEffectiveWeight(1 - seatedWeight);
      actions.seated.enabled = true;
      actions.seated.stopFading().setEffectiveWeight(seatedWeight).play();
    } else if (phase !== 'seated') {
      actions.seated.stopFading().setEffectiveWeight(0);
    }
    sourceMixer.update(delta);


    // Convert each FBX world-pose delta into the bot's own bind pose. This
    // keeps the bot's left/right limb axes and separated leg chains intact;
    // only rotations are copied, never the FBX mesh or hip position track.
    const nextTargetPoseWorld = targetPoseWorld.current;
    BONE_ENTRIES.forEach(([sourceName, targetName]) => {
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
        .multiply(targetBaseWorld)
        .premultiply(poseScratch.wrapperWorld);

      // The supplied sit clip assumes a chair. Fold both legs in the SAME
      // character-space plane for the moon floor; local bone axes differ
      // left/right, so applying identical local bends caused crossed legs.
      if (seatedWeight > 0 && /^(thigh_stretch|leg_stretch|foot_|toes_01)/.test(targetName)) {
        poseScratch.floorLeg.copy(targetBaseWorld);
        if (targetName.startsWith('thigh_stretch')) poseScratch.floorLeg.premultiply(seatedHipBend);
        if (targetName.startsWith('leg_stretch')) poseScratch.floorLeg.premultiply(seatedKneeBend);
        poseScratch.floorLeg.premultiply(poseScratch.wrapperWorld);
        poseScratch.desiredTargetWorld.slerp(poseScratch.floorLeg, seatedWeight);
      }

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
      // Include the character wrapper in the target pose. Otherwise solving
      // world-space bone rotations cancels the wrapper's turn toward planets.
      (nextTargetPoseWorld[targetName] ??= new THREE.Quaternion()).copy(poseScratch.desiredTargetWorld);

    });

    group.current.updateMatrixWorld(true);
    if (phase === 'idle' || phase === 'hopping' || phase === 'landing') {
      const left = targetBones['toes_01_l_060'];
      const right = targetBones['toes_01_r_068'];
      if (left && right) {
        left.getWorldPosition(movementScratch.leftToe);
        right.getWorldPosition(movementScratch.rightToe);
        const lowest = Math.min(movementScratch.leftToe.y, movementScratch.rightToe.y);
        group.current.position.y += group.current.position.y + 0.07 - lowest;
        group.current.updateMatrixWorld(true);
      }
    }
    // Keep the sleeping body above the floor and settle the seated pelvis,
    // rather than anchoring a sitting pose by its toes and lifting the hips.
    if (lying > 0 || seatedWeight > 0) {
      const contactNames = seatedWeight > 0
        ? ['root_x_03']
        : ['root_x_03', 'spine_05_x_08', 'head_x_011', 'foot_l_059', 'foot_r_067'];
      let lowest = Infinity;
      for (const name of contactNames) {
        const bone = targetBones[name];
        if (bone) {
          bone.getWorldPosition(movementScratch.leftToe);
          lowest = Math.min(lowest, movementScratch.leftToe.y);
        }
      }
      if (Number.isFinite(lowest)) {
        const surface = seatedWeight > 0 ? MOON_SEAT_POSITION[1] : MECH_SLEEP_POSITION[1];
        const clearance = 0.20;
        group.current.position.y += (surface + clearance - lowest) * (seatedWeight > 0 ? seatedWeight : lying);
        group.current.updateMatrixWorld(true);
      }
    }

    // Publish on EVERY phase, after the pose has been placed.
    if (mechPosRef) group.current.getWorldPosition(mechPosRef.current);
    if (mechYawRef) mechYawRef.current = group.current.rotation.y;

  }, -2);

  useEffect(() => {
    const leftFoot = astronaut.getObjectByName('foot_l_059');
    const rightFoot = astronaut.getObjectByName('foot_r_067');
    [leftFoot, rightFoot].forEach((foot) => {
      if (!foot || foot.getObjectByName('bootFlame')) return;
      foot.add(createBootFlame());
    });
  }, [astronaut]);

  return (
    <group ref={group} position={position} scale={scale * CHARACTER_SCALE}>
      <primitive object={astronaut} />
      <pointLight position={[0, 1.25, 0.2]} color="#b9d7ff" intensity={0.6} distance={3} decay={2} />
    </group>
  );
}
