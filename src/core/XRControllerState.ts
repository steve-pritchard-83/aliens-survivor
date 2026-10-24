import * as THREE from 'three';

export interface XRHandPose {
  active: boolean;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  hapticActuator: GamepadHapticActuator | null;
}

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
  triggerHaptic(hand: 'right' | 'left' | 'both', intensity = 0.85, durationMs = 50): void {
    try {
      if (hand === 'right' || hand === 'both') {
        xrControllerState.rightHand.hapticActuator?.pulse(intensity, durationMs);
      }
      if (hand === 'left' || hand === 'both') {
        xrControllerState.leftHand.hapticActuator?.pulse(intensity, durationMs);
      }
    } catch {
      /* ignore browser without haptics */
    }
  }
};
