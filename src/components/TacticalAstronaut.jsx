import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const ASTRONAUT_MODEL = '/models/sci-fi_cyberpunk_astronaut.glb';
const JETPACK_MODEL = '/models/jetpack/Jetpack.glb';

useGLTF.preload(ASTRONAUT_MODEL);
useGLTF.preload(JETPACK_MODEL);
useFBX.preload('/models/idle.fbx');
useFBX.preload('/models/jump.fbx');
useFBX.preload('/models/flying.fbx');
useFBX.preload('/models/landing.fbx');
useFBX.preload('/models/sitting.fbx');

// The supplied FBX clips are Mixamo-labelled while the supplied astronaut GLB
// uses the same biped skeleton with descriptive numbered names. Remapping the
// track paths lets the original joint rotations drive the actual GLB bones.
const BONE_MAP = {
  mixamorigHips: 'Hips_00',
  mixamorigLeftUpLeg: 'LeftUpLeg_01', mixamorigLeftLeg: 'LeftLeg_02',
  mixamorigLeftFoot: 'LeftFoot_03', mixamorigLeftToeBase: 'LeftToeBase_04',
  mixamorigRightUpLeg: 'RightUpLeg_05', mixamorigRightLeg: 'RightLeg_06',
  mixamorigRightFoot: 'RightFoot_07', mixamorigRightToeBase: 'RightToeBase_08',
  mixamorigSpine2: 'Spine02_09', mixamorigSpine1: 'Spine01_010',
  mixamorigSpine: 'Spine_011',
  mixamorigLeftShoulder: 'LeftShoulder_012', mixamorigLeftArm: 'LeftArm_013',
  mixamorigLeftForeArm: 'LeftForeArm_014', mixamorigLeftHand: 'LeftHand_015',
  mixamorigRightShoulder: 'RightShoulder_016', mixamorigRightArm: 'RightArm_017',
  mixamorigRightForeArm: 'RightForeArm_018', mixamorigRightHand: 'RightHand_019',
  mixamorigNeck: 'neck_020', mixamorigHead: 'Head_021',
};

function retargetClip(source, name) {
  const clip = source.clone();
  clip.name = name;
  clip.tracks = clip.tracks.filter((track) => {
    const separator = track.name.indexOf('.');
    if (separator < 0) return false;
    const sourceBone = track.name.slice(0, separator);
    const targetBone = BONE_MAP[sourceBone];
    if (!targetBone) return false;
    track.name = `${targetBone}${track.name.slice(separator)}`;
    return true;
  });
  return clip;
}

export default function TacticalAstronaut({ phase, position = [0, 0, 0], scale = 1, hopPoints = [[0, 0, 0]], hopPositionRef, journeyProgress = 0 }) {
  const group = useRef(null);
  const hopIndex = useRef(0);
  const hopStart = useRef(null);
  const activeAction = useRef(null);
  const { scene } = useGLTF(ASTRONAUT_MODEL);
  const { scene: jetpack } = useGLTF(JETPACK_MODEL);
  const astronaut = useMemo(() => scene.clone(true), [scene]);
  const jetpackClone = useMemo(() => jetpack.clone(true), [jetpack]);

  const idle = useFBX('/models/idle.fbx').animations[0];
  const jump = useFBX('/models/jump.fbx').animations[0];
  const fly = useFBX('/models/flying.fbx').animations[0];
  const land = useFBX('/models/landing.fbx').animations[0];
  const sit = useFBX('/models/sitting.fbx').animations[0];
  const clips = useMemo(() => [
    retargetClip(idle, 'idle'),
    retargetClip(jump, 'hopping'),
    retargetClip(jump, 'launching'),
    retargetClip(fly, 'flying'),
    retargetClip(land, 'landing'),
    retargetClip(sit, 'seated'),
  ], [idle, jump, fly, land, sit]);
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    const action = actions?.[phase];
    if (!action) return;
    if (activeAction.current && activeAction.current !== action) {
      activeAction.current.fadeOut(0.28);
    }
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.28).play();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(phase === 'flying' ? 0.48 : phase === 'hopping' ? 0.72 : 1);
    activeAction.current = action;
    return () => action.fadeOut(0.12);
  }, [actions, phase]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    if (phase === 'idle') {
      hopStart.current = null; hopIndex.current = 0;
      const p = hopPoints[0] || [0, 0, 0];
      group.current.position.set(p[0], p[1] + Math.sin(t * 2) * 0.01, p[2]);
      hopPositionRef?.current.copy(group.current.position);
      return;
    }
    if (phase === 'hopping') {
      if (hopStart.current === null) hopStart.current = t;
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

  // The jetpack is attached to the upper-spine bone, so it follows the same
  // retargeted shoulder/back movement as the astronaut instead of floating.
  const spine = astronaut.getObjectByName('Spine_011');
  if (spine && jetpackClone.parent !== spine) {
    spine.add(jetpackClone);
    jetpackClone.position.set(0, 0.03, -0.34);
    jetpackClone.rotation.set(0, Math.PI, 0);
    jetpackClone.scale.setScalar(0.78);
  }

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={astronaut} />
      <pointLight position={[0, 1.25, 0.2]} color="#b9d7ff" intensity={1.4} distance={3.4} decay={2} />
    </group>
  );
}
