import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { xrControllerState } from '../core/XRControllerState';
import { getMuzzleStarTexture } from '../core/MuzzleTexture';
import { checkAutoTarget } from './rifle/autoTarget';
import { createRifleState, MUZZLE_FLASH_SECONDS } from './rifle/RifleState';
import { updateReloadStages, updateFiring, FireContext } from './rifle/rifleFiring';
import { stepRecoil, computeReloadPose, poseWeaponXR, poseWeaponFPS, ReloadPose } from './rifle/rifleViewmodel';

const _origin = new THREE.Vector3(),
  _dir = new THREE.Vector3();
const _reloadPose: ReloadPose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };

export function PulseRifle() {
  const { scene } = useGLTF('/models/pulse_rifle.glb');
  const { camera, scene: worldScene } = useThree();
  const weaponGroupRef = useRef<THREE.Group>(null),
    muzzleGroupRef = useRef<THREE.Group>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null),
    spotLightRef = useRef<THREE.SpotLight>(null);
  const tracerMeshRef = useRef<THREE.Mesh>(null);
  const rifleState = useRef(createRifleState());
  const fireCtx = useMemo<FireContext>(() => ({ camera, weapon: null, muzzle: null }), [camera]);

  const { clonedRifle, sliderNode, triggerNode } = useMemo(() => {
    const r = scene.clone(true);
    return {
      clonedRifle: r,
      sliderNode: r.getObjectByName('slider_low'),
      triggerNode: r.getObjectByName('trigger_a_low')
    };
  }, [scene]);
  const flashLightTarget = useMemo(() => new THREE.Object3D(), []);
  const muzzleTexture = useMemo(() => getMuzzleStarTexture(), []);

  useEffect(() => {
    worldScene.add(flashLightTarget);
    return () => {
      worldScene.remove(flashLightTarget);
    };
  }, [worldScene, flashLightTarget]);

  const flashlightOn = useGameStore((s) => s.flashlightOn);

  useFrame(({ clock }, dt) => {
    const state = useGameStore.getState();
    if (state.status !== 'PLAYING') return;
    const rs = rifleState.current;

    updateReloadStages(rs, state);

    let isFiring = InputManager.isFiringActive();
    if (!isFiring && InputManager.mode === 'TOUCH' && !state.isReloading && !state.isJammed && state.ammo > 0) {
      camera.getWorldPosition(_origin);
      camera.getWorldDirection(_dir);
      if (checkAutoTarget(_origin, _dir, state.activeThreats, state.smallThreat)) isFiring = true;
    }
    fireCtx.weapon = weaponGroupRef.current;
    fireCtx.muzzle = muzzleGroupRef.current;
    updateFiring(rs, state, isFiring, dt, fireCtx);
    stepRecoil(rs, dt);

    if (sliderNode) {
      const rackPull = state.isReloading && state.reloadProgress > 0.68 && state.reloadProgress < 0.87 ? 5.5 : 0;
      sliderNode.position.z = -(rs.boltKick * 4.8 + rackPull);
    }
    if (triggerNode) triggerNode.position.z = isFiring && !state.isReloading ? -0.9 : 0;

    const flashActive = rs.muzzleTimer > 0;
    if (muzzleLightRef.current)
      muzzleLightRef.current.intensity = flashActive ? 24 * (rs.muzzleTimer / MUZZLE_FLASH_SECONDS) : 0;
    if (muzzleGroupRef.current) muzzleGroupRef.current.visible = flashActive;
    if (tracerMeshRef.current) tracerMeshRef.current.visible = rs.muzzleTimer > 0.02;

    const weapon = weaponGroupRef.current;
    if (weapon) {
      const hand = state.settings.leftHanded ? xrControllerState.leftHand : xrControllerState.rightHand;
      if (hand.active && camera.parent) {
        poseWeaponXR(weapon, camera.parent, hand, rs, flashLightTarget);
      } else {
        if (state.isReloading) computeReloadPose(state.reloadProgress, _reloadPose);
        else _reloadPose.x = _reloadPose.y = _reloadPose.z = _reloadPose.pitch = _reloadPose.yaw = _reloadPose.roll = 0;
        poseWeaponFPS(weapon, camera, rs, clock.getElapsedTime(), _reloadPose, flashLightTarget);
      }
      flashLightTarget.updateMatrixWorld();
    }
  });

  return (
    <group ref={weaponGroupRef}>
      <group scale={0.0086} position={[-0.066, 0.024, 0.022]} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedRifle} />
      </group>
      <pointLight
        ref={muzzleLightRef}
        position={[0, 0.06, -0.47]}
        color="#ffaa33"
        intensity={0}
        distance={18}
        decay={1.2}
      />
      <spotLight
        ref={spotLightRef}
        position={[0, 0.02, -0.4]}
        target={flashLightTarget}
        angle={0.68}
        penumbra={0.35}
        intensity={flashlightOn ? 85 : 0}
        distance={38}
        decay={1.0}
        color="#eef8ff"
        visible={flashlightOn}
      />
      <group ref={muzzleGroupRef} position={[0, 0.06, -0.47]} visible={false}>
        <mesh>
          <planeGeometry args={[0.38, 0.38]} />
          <meshBasicMaterial
            map={muzzleTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -0.12]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.42, 0.24]} />
          <meshBasicMaterial
            map={muzzleTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[0.42, 0.24]} />
          <meshBasicMaterial
            map={muzzleTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <mesh ref={tracerMeshRef} position={[0, 0.06, -4.8]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <cylinderGeometry args={[0.004, 0.001, 8.5, 12]} />
        <meshBasicMaterial
          color="#ffdd77"
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
useGLTF.preload('/models/pulse_rifle.glb');
