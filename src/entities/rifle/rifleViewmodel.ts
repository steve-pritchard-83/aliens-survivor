import * as THREE from 'three';
import type { XRHandPose } from '../../core/XRControllerState';
import { RifleState } from './RifleState';

const _handPos = new THREE.Vector3();

/** Eases all recoil channels back to rest and counts down the muzzle flash. */
export function stepRecoil(rs: RifleState, dt: number): void {
  rs.recoilOffset = THREE.MathUtils.lerp(rs.recoilOffset, 0, dt * 22);
  rs.recoilPitch = THREE.MathUtils.lerp(rs.recoilPitch, 0, dt * 19);
  rs.recoilYaw = THREE.MathUtils.lerp(rs.recoilYaw, 0, dt * 22);
  rs.recoilRoll = THREE.MathUtils.lerp(rs.recoilRoll, 0, dt * 20);
  rs.boltKick = THREE.MathUtils.lerp(rs.boltKick, 0, dt * 28);
  rs.muzzleTimer = Math.max(0, rs.muzzleTimer - dt);
}

export interface ReloadPose {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
}

/** First-person reload animation: tilt out, slap in a magazine, rack the bolt. `p` is reload progress 0..1. */
export function computeReloadPose(p: number, out: ReloadPose): void {
  out.x = out.y = out.z = out.pitch = out.yaw = out.roll = 0;
  if (p < 0.36) {
    const k = Math.sin((p / 0.36) * (Math.PI / 2));
    out.x = -0.03 * k;
    out.y = -0.09 * k;
    out.pitch = -0.24 * k;
    out.roll = 0.52 * k;
    out.yaw = 0.16 * k;
  } else if (p < 0.72) {
    const u = (p - 0.36) / 0.36,
      slap = Math.exp(-Math.pow((u - 0.56) * 8, 2)) * 0.065;
    out.x = -0.03;
    out.y = -0.12 + slap;
    out.pitch = -0.28 + slap * 1.6;
    out.roll = 0.56 - u * 0.15;
    out.yaw = 0.16;
  } else {
    const u = (p - 0.72) / 0.28,
      snap = Math.sin(u * Math.PI),
      rack = Math.exp(-Math.pow((u - 0.52) * 7, 2));
    out.x = -0.02 * (1 - u);
    out.y = -0.04 * (1 - u);
    out.z = rack * 0.04;
    out.pitch = -0.1 * (1 - u);
    out.roll = -0.44 * snap;
    out.yaw = -0.14 * snap;
  }
}

/** Weapon follows the tracked controller (XR). */
export function poseWeaponXR(group: THREE.Group, parent: THREE.Object3D, hand: XRHandPose, rs: RifleState): void {
  _handPos.copy(hand.position).applyQuaternion(parent.quaternion);
  group.position.copy(parent.position).add(_handPos);
  group.quaternion.copy(parent.quaternion).multiply(hand.quaternion);
  group.translateY(-0.02);
  group.translateZ(-0.05 + rs.recoilOffset);
  group.rotateX(-0.79 + rs.recoilPitch);
}

/** Weapon held at the hip in first person (desktop / touch), with sway, recoil and reload animation. */
export function poseWeaponFPS(
  group: THREE.Group,
  camera: THREE.Camera,
  rs: RifleState,
  time: number,
  reload: ReloadPose
): void {
  const swayX = Math.sin(time * 2.2) * 0.0025,
    swayY = Math.cos(time * 4.4) * 0.0025;
  group.position.copy(camera.position);
  group.quaternion.copy(camera.quaternion);
  group.translateX(0.165 + swayX + reload.x + rs.recoilYaw * 0.25);
  group.translateY(-0.165 + swayY + reload.y - rs.recoilOffset * 0.16);
  group.translateZ(-0.33 + rs.recoilOffset + reload.z);
  group.rotateY(0.065 + rs.recoilYaw + reload.yaw);
  group.rotateX(0.02 + rs.recoilPitch + reload.pitch);
  group.rotateZ(rs.recoilRoll + reload.roll);
}
