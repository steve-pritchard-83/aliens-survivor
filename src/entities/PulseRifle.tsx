import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, ActiveThreat } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { CombatSystem, DamageSpec } from '../core/CombatEvents';
import { BALANCE } from '../data/balance';
import { Haptics } from '../core/Haptics';
import { xrControllerState } from '../core/XRControllerState';
import { getMuzzleStarTexture } from '../core/MuzzleTexture';

const _dmg: DamageSpec = { amount: 0, source: 'player' };
const _rayOrigin = new THREE.Vector3(),
  _rayDir = new THREE.Vector3(),
  _camDir = new THREE.Vector3(),
  _losDir = new THREE.Vector3(),
  _handPos = new THREE.Vector3();

function checkAutoTarget(
  camPos: THREE.Vector3,
  camDir: THREE.Vector3,
  threats: ActiveThreat[],
  small: ActiveThreat | null
): boolean {
  let hasCandidate = false;
  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    if (t.state !== 'DEAD' && (t.x - camPos.x) * camDir.x + (t.z - camPos.z) * camDir.z > 0) {
      hasCandidate = true;
      break;
    }
  }
  if (
    !hasCandidate &&
    small &&
    small.state !== 'DEAD' &&
    (small.x - camPos.x) * camDir.x + (small.z - camPos.z) * camDir.z > 0
  )
    hasCandidate = true;
  if (!hasCandidate) return false;

  // Side-effect free probe: never applies damage (see CombatSystem.queryTarget vs resolveShot)
  if (CombatSystem.queryTarget(camPos, camDir).kind === 'target') return true;
  const envProbe = CombatSystem.fireEnvironmentRay(camPos, camDir);
  const wallDist = envProbe ? camPos.distanceTo(envProbe.point) : 55.0;

  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    if (t.state === 'DEAD') continue;
    const dx = t.x - camPos.x,
      dz = t.z - camPos.z,
      d2 = dx * dx + dz * dz;
    if (d2 > 0.4 && d2 < 576) {
      const dist = Math.sqrt(d2);
      if (dist < wallDist && (dx * camDir.x + dz * camDir.z) / dist > 0.982) {
        _losDir.set(dx, 0.9 - camPos.y, dz).normalize();
        const losWall = CombatSystem.fireEnvironmentRay(camPos, _losDir);
        if (!losWall || camPos.distanceTo(losWall.point) >= dist - 0.35) return true;
      }
    }
  }
  if (small && small.state !== 'DEAD') {
    const dx = small.x - camPos.x,
      dz = small.z - camPos.z,
      d2 = dx * dx + dz * dz,
      dist = Math.sqrt(d2);
    if (d2 > 0.2 && d2 < 324 && dist < wallDist && (dx * camDir.x + dz * camDir.z) / dist > 0.98) {
      _losDir.set(dx, 0.25 - camPos.y, dz).normalize();
      const losWall = CombatSystem.fireEnvironmentRay(camPos, _losDir);
      if (!losWall || camPos.distanceTo(losWall.point) >= dist - 0.25) return true;
    }
  }
  return false;
}

export function PulseRifle() {
  const { scene } = useGLTF('/models/pulse_rifle.glb');
  const { camera, scene: worldScene } = useThree();
  const weaponGroupRef = useRef<THREE.Group>(null),
    muzzleGroupRef = useRef<THREE.Group>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null),
    spotLightRef = useRef<THREE.SpotLight>(null);
  const tracerMeshRef = useRef<THREE.Mesh>(null);
  const fireCooldown = useRef(0),
    recoilOffset = useRef(0),
    recoilPitch = useRef(0);
  const recoilYaw = useRef(0),
    recoilRoll = useRef(0),
    boltKick = useRef(0);
  const muzzleTimer = useRef(0),
    lastReloadStage = useRef(0),
    continuousFireRef = useRef(0),
    wasFiringRef = useRef(false);

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

    if (state.isReloading) {
      if (state.reloadProgress > 0.05 && lastReloadStage.current === 0) {
        AudioManager.play2D('reload_out', 0.75);
        lastReloadStage.current = 1;
        recoilPitch.current = -0.05;
        recoilOffset.current = 0.025;
      } else if (state.reloadProgress > 0.55 && lastReloadStage.current === 1) {
        AudioManager.play2D('reload_in', 0.8);
        lastReloadStage.current = 2;
        recoilPitch.current = 0.085;
        recoilRoll.current = -0.09;
      } else if (state.reloadProgress > 0.85 && lastReloadStage.current === 2) {
        AudioManager.play2D('reload_slap', 0.85);
        lastReloadStage.current = 3;
        recoilOffset.current = -0.045;
        recoilPitch.current = -0.06;
        recoilRoll.current = 0.14;
        boltKick.current = 1.0;
        Haptics.reload();
      }
    } else lastReloadStage.current = 0;

    let isFiring = InputManager.isFiringActive();
    if (!isFiring && InputManager.mode === 'TOUCH' && !state.isReloading && !state.isJammed && state.ammo > 0) {
      camera.getWorldPosition(_rayOrigin);
      camera.getWorldDirection(_camDir);
      if (checkAutoTarget(_rayOrigin, _camDir, state.activeThreats, state.smallThreat)) isFiring = true;
    }
    fireCooldown.current = Math.max(0, fireCooldown.current - dt);
    if (isFiring && !state.isReloading && !state.isJammed) {
      continuousFireRef.current += dt;
      if (continuousFireRef.current > BALANCE.WEAPON.JAM_THRESHOLD_SECONDS) {
        if (wasFiringRef.current) {
          AudioManager.stopPulseLoop(false);
          wasFiringRef.current = false;
        }
        useGameStore.setState({ isJammed: true });
        AudioManager.play2D('empty_click', 0.85);
        state.startReload();
      } else if (fireCooldown.current <= 0) {
        if (state.ammo > 0 && state.fireRound()) {
          fireCooldown.current = state.fireInterval;
          wasFiringRef.current = true;
          recoilOffset.current = 0.058 + Math.random() * 0.015;
          recoilPitch.current = 0.038 + Math.random() * 0.018;
          recoilYaw.current = (Math.random() - 0.5) * 0.026;
          recoilRoll.current = (Math.random() - 0.5) * 0.065;
          boltKick.current = 1.0;
          muzzleTimer.current = 0.055;
          AudioManager.playPulseShot();
          Haptics.fire();
          if (muzzleGroupRef.current) {
            muzzleGroupRef.current.rotation.z = Math.random() * Math.PI * 2;
            muzzleGroupRef.current.scale.setScalar(0.85 + Math.random() * 0.35);
          }
          const handActive = state.settings.leftHanded
            ? xrControllerState.leftHand.active
            : xrControllerState.rightHand.active;
          if (handActive && muzzleGroupRef.current && weaponGroupRef.current) {
            muzzleGroupRef.current.getWorldPosition(_rayOrigin);
            weaponGroupRef.current.getWorldDirection(_rayDir).negate();
          } else {
            camera.getWorldPosition(_rayOrigin);
            camera.getWorldDirection(_rayDir);
          }
          const spread = Math.min(BALANCE.WEAPON.SPREAD_MAX, continuousFireRef.current * BALANCE.WEAPON.SPREAD_PER_SEC);
          _rayDir.x += (Math.random() - 0.5) * spread;
          _rayDir.y += (Math.random() - 0.5) * spread;
          _rayDir.normalize();
          const hasAp = state.activeUpgrades.includes('ap_ammo');
          _dmg.amount = BALANCE.WEAPON.BASE_DAMAGE * (hasAp ? BALANCE.WEAPON.AP_MULTIPLIER : 1);
          const outcome = CombatSystem.resolveShot(_rayOrigin, _rayDir, _dmg);
          if (outcome.kind === 'target') state.registerHit();
          else if (outcome.kind === 'wall') {
            AudioManager.play2D(Math.random() > 0.5 ? 'ricochet1' : 'ricochet2', 0.45, 0.9 + Math.random() * 0.2);
          }
          if (state.ammo <= 0) {
            AudioManager.stopPulseLoop(true);
            wasFiringRef.current = false;
          }
        } else if (state.ammo <= 0) {
          if (wasFiringRef.current) {
            AudioManager.stopPulseLoop(true);
            wasFiringRef.current = false;
          }
          fireCooldown.current = 0.25;
          AudioManager.play2D('empty_click', 0.7);
          state.startReload();
        }
      }
    } else {
      if (wasFiringRef.current) {
        AudioManager.stopPulseLoop(true);
        wasFiringRef.current = false;
      }
      continuousFireRef.current = Math.max(0, continuousFireRef.current - dt * 2.5);
    }

    recoilOffset.current = THREE.MathUtils.lerp(recoilOffset.current, 0, dt * 22);
    recoilPitch.current = THREE.MathUtils.lerp(recoilPitch.current, 0, dt * 19);
    recoilYaw.current = THREE.MathUtils.lerp(recoilYaw.current, 0, dt * 22);
    recoilRoll.current = THREE.MathUtils.lerp(recoilRoll.current, 0, dt * 20);
    boltKick.current = THREE.MathUtils.lerp(boltKick.current, 0, dt * 28);
    muzzleTimer.current = Math.max(0, muzzleTimer.current - dt);

    if (sliderNode) {
      const rackPull = state.isReloading && state.reloadProgress > 0.68 && state.reloadProgress < 0.87 ? 5.5 : 0;
      sliderNode.position.z = -(boltKick.current * 4.8 + rackPull);
    }
    if (triggerNode) triggerNode.position.z = isFiring && !state.isReloading ? -0.9 : 0;

    const flashActive = muzzleTimer.current > 0;
    if (muzzleLightRef.current) muzzleLightRef.current.intensity = flashActive ? 24 * (muzzleTimer.current / 0.055) : 0;
    if (muzzleGroupRef.current) muzzleGroupRef.current.visible = flashActive;
    if (tracerMeshRef.current) tracerMeshRef.current.visible = muzzleTimer.current > 0.02;

    if (weaponGroupRef.current) {
      const hand = state.settings.leftHanded ? xrControllerState.leftHand : xrControllerState.rightHand;
      if (hand.active && camera.parent) {
        _handPos.copy(hand.position).applyQuaternion(camera.parent.quaternion);
        weaponGroupRef.current.position.copy(camera.parent.position).add(_handPos);
        weaponGroupRef.current.quaternion.copy(camera.parent.quaternion).multiply(hand.quaternion);
        weaponGroupRef.current.translateY(-0.02);
        weaponGroupRef.current.translateZ(-0.05 + recoilOffset.current);
        weaponGroupRef.current.rotateX(-0.79 + recoilPitch.current);
        weaponGroupRef.current.getWorldDirection(_camDir).negate();
        flashLightTarget.position.copy(weaponGroupRef.current.position).addScaledVector(_camDir, 28.0);
      } else {
        const t = clock.getElapsedTime(),
          p = state.reloadProgress;
        const swayX = Math.sin(t * 2.2) * 0.0025,
          swayY = Math.cos(t * 4.4) * 0.0025;
        let rX = 0,
          rY = 0,
          rZ = 0,
          rPitch = 0,
          rYaw = 0,
          rRoll = 0;
        if (state.isReloading) {
          if (p < 0.36) {
            const k = Math.sin((p / 0.36) * (Math.PI / 2));
            rX = -0.03 * k;
            rY = -0.09 * k;
            rPitch = -0.24 * k;
            rRoll = 0.52 * k;
            rYaw = 0.16 * k;
          } else if (p < 0.72) {
            const u = (p - 0.36) / 0.36,
              slap = Math.exp(-Math.pow((u - 0.56) * 8, 2)) * 0.065;
            rX = -0.03;
            rY = -0.12 + slap;
            rPitch = -0.28 + slap * 1.6;
            rRoll = 0.56 - u * 0.15;
            rYaw = 0.16;
          } else {
            const u = (p - 0.72) / 0.28,
              snap = Math.sin(u * Math.PI),
              rack = Math.exp(-Math.pow((u - 0.52) * 7, 2));
            rX = -0.02 * (1 - u);
            rY = -0.04 * (1 - u);
            rZ = rack * 0.04;
            rPitch = -0.1 * (1 - u);
            rRoll = -0.44 * snap;
            rYaw = -0.14 * snap;
          }
        }
        weaponGroupRef.current.position.copy(camera.position);
        weaponGroupRef.current.quaternion.copy(camera.quaternion);
        weaponGroupRef.current.translateX(0.165 + swayX + rX + recoilYaw.current * 0.25);
        weaponGroupRef.current.translateY(-0.165 + swayY + rY - recoilOffset.current * 0.16);
        weaponGroupRef.current.translateZ(-0.33 + recoilOffset.current + rZ);
        weaponGroupRef.current.rotateY(0.065 + recoilYaw.current + rYaw);
        weaponGroupRef.current.rotateX(0.02 + recoilPitch.current + rPitch);
        weaponGroupRef.current.rotateZ(recoilRoll.current + rRoll);
        camera.getWorldDirection(_camDir);
        flashLightTarget.position.copy(camera.position).addScaledVector(_camDir, 28.0);
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
