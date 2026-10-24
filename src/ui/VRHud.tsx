import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { trackerCanvasState } from '../core/TrackerState';

export function VRHud() {
  const { session } = useXR();
  const { gl, camera } = useThree();
  const wristGroupRef = useRef<THREE.Group>(null);
  const lastWeaponY = useRef(1.5);

  const wristTexture = useMemo(() => {
    if (!trackerCanvasState.canvas) return null;
    const tex = new THREE.CanvasTexture(trackerCanvasState.canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  useFrame(() => {
    const isPresenting = Boolean(session);
    if (!isPresenting) {
      if (InputManager.mode === 'XR') {
        InputManager.setXRState(false);
      }
      return;
    }

    let moveX = 0;
    let moveZ = 0;
    let firing = false;

    const xrSession = gl.xr.getSession();
    if (xrSession) {
      for (const source of xrSession.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes;
        const buttons = source.gamepad.buttons;

        if (source.handedness === 'left') {
          // Left Touch Controller Thumbstick: Smooth Locomotion
          if (axes.length >= 4) {
            moveX = axes[2] || 0;
            moveZ = -(axes[3] || 0);
          } else if (axes.length >= 2) {
            moveX = axes[0] || 0;
            moveZ = -(axes[1] || 0);
          }
        } else if (source.handedness === 'right') {
          // Right Controller Index Trigger (button 0) -> Fire Weapon
          firing = Boolean(buttons[0]?.pressed);
          // 'A' Button (button 4) -> Reload
          if (buttons[4]?.pressed) {
            useGameStore.getState().startReload();
          }
        }
      }
    }

    // Gesture reload: lowering head/weapon to hip
    if (camera.position.y - lastWeaponY.current < -0.35) {
      useGameStore.getState().startReload();
    }
    lastWeaponY.current = camera.position.y;

    InputManager.setXRState(true, moveX, moveZ, firing);

    // Attach diegetic 3D wrist radar plane relative to left wrist pose
    if (wristGroupRef.current) {
      wristGroupRef.current.visible = true;
      wristGroupRef.current.position.copy(camera.position);
      wristGroupRef.current.quaternion.copy(camera.quaternion);
      wristGroupRef.current.translateX(-0.26);
      wristGroupRef.current.translateY(-0.18);
      wristGroupRef.current.translateZ(-0.36);
      wristGroupRef.current.rotateY(0.45);
      wristGroupRef.current.rotateX(-0.35);
    }

    if (wristTexture) {
      wristTexture.needsUpdate = true;
    }
  });

  if (!session) return null;

  return (
    <group ref={wristGroupRef}>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[0.14, 0.14, 0.015]} />
        <meshStandardMaterial color="#15221a" />
      </mesh>
      {wristTexture && (
        <mesh>
          <planeGeometry args={[0.125, 0.125]} />
          <meshBasicMaterial map={wristTexture} />
        </mesh>
      )}
    </group>
  );
}
