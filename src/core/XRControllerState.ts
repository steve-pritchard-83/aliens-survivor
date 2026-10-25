import * as THREE from 'three';

export interface XRHandPose {
  active: boolean;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  hapticActuator: GamepadHapticActuator | null;
}

export type HapticHand = 'weapon' | 'tracker' | 'both';

export const xrControllerState = {
  rightHand: {
    active: false,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    hapticActuator: null as GamepadHapticActuator | null
  },
  leftHand: {
    active: false,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    hapticActuator: null as GamepadHapticActuator | null
  },
  /** Left-handed mode swaps the weapon and tracker hands (set from settings). */
  leftHanded: false,
  /** Pulses the weapon hand, the tracker (wrist) hand or both; the physical hand follows handedness. */
  triggerHaptic(hand: HapticHand, intensity = 0.85, durationMs = 50): void {
    try {
      const weaponLeft = xrControllerState.leftHanded;
      const left = hand === 'both' || (hand === 'weapon' ? weaponLeft : !weaponLeft);
      const right = hand === 'both' || (hand === 'weapon' ? !weaponLeft : weaponLeft);
      if (right) xrControllerState.rightHand.hapticActuator?.pulse(intensity, durationMs);
      if (left) xrControllerState.leftHand.hapticActuator?.pulse(intensity, durationMs);
    } catch {
      /* ignore browser without haptics */
    }
  }
};
