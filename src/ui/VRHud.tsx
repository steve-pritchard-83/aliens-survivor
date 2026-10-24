import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { trackerCanvasState } from '../core/TrackerState';
import { xrControllerState } from '../core/XRControllerState';

export function VRHud() {
  const { session } = useXR();
  const { gl, camera } = useThree();
  const wristGroupRef = useRef<THREE.Group>(null);
  const snapTurnCoolRef = useRef(false);

  const wristTexture = useMemo(() => {
    if (!trackerCanvasState.canvas) return null;
    const tex = new THREE.CanvasTexture(trackerCanvasState.canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  useFrame((_, __, frame) => {
    const isPresenting = Boolean(session);
    if (!isPresenting) {
      if (InputManager.mode === 'XR') InputManager.setXRState(false);
      xrControllerState.rightHand.active = false;
      xrControllerState.leftHand.active = false;
      return;
    }

    let moveX = 0, moveZ = 0, firing = false;
    const xrSession = gl.xr.getSession();
    const refSpace = gl.xr.getReferenceSpace();

    if (xrSession) {
      for (const source of xrSession.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes, buttons = source.gamepad.buttons;

        if (source.handedness === 'left') {
          xrControllerState.leftHand.hapticActuator = (source.gamepad.hapticActuators?.[0] as GamepadHapticActuator) || null;
          if (frame && refSpace && (source.gripSpace || source.targetRaySpace)) {
            const pose = frame.getPose(source.gripSpace || source.targetRaySpace!, refSpace);
            if (pose) {
              xrControllerState.leftHand.active = true;
              xrControllerState.leftHand.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
              xrControllerState.leftHand.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
            }
          }
          if (axes.length >= 4) { moveX = axes[2] || 0; moveZ = -(axes[3] || 0); }
          else if (axes.length >= 2) { moveX = axes[0] || 0; moveZ = -(axes[1] || 0); }
          if (buttons[4]?.pressed || buttons[5]?.pressed) {
            useGameStore.getState().toggleFlashlight();
          }
        } else if (source.handedness === 'right') {
          xrControllerState.rightHand.hapticActuator = (source.gamepad.hapticActuators?.[0] as GamepadHapticActuator) || null;
          if (frame && refSpace && (source.gripSpace || source.targetRaySpace)) {
            const pose = frame.getPose(source.gripSpace || source.targetRaySpace!, refSpace);
            if (pose) {
              xrControllerState.rightHand.active = true;
              xrControllerState.rightHand.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
              xrControllerState.rightHand.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
            }
          }
          firing = Boolean(buttons[0]?.pressed);
          if (buttons[4]?.pressed) useGameStore.getState().startReload();
          const turnAxis = axes.length >= 4 ? axes[2] : (axes.length >= 2 ? axes[0] : 0);
          if (Math.abs(turnAxis) > 0.65 && !snapTurnCoolRef.current) {
            snapTurnCoolRef.current = true;
            InputManager.addSnapTurn(turnAxis > 0 ? -Math.PI / 4 : Math.PI / 4);
          } else if (Math.abs(turnAxis) < 0.25) {
            snapTurnCoolRef.current = false;
          }
        }
      }
    }

    InputManager.setXRState(true, moveX, moveZ, firing);

    if (wristGroupRef.current) {
      wristGroupRef.current.visible = true;
      if (xrControllerState.leftHand.active && camera.parent) {
        wristGroupRef.current.position.set(
          camera.parent.position.x + xrControllerState.leftHand.position.x,
          xrControllerState.leftHand.position.y,
          camera.parent.position.z + xrControllerState.leftHand.position.z
        );
        wristGroupRef.current.quaternion.copy(xrControllerState.leftHand.quaternion);
        wristGroupRef.current.translateY(0.06);
        wristGroupRef.current.translateZ(-0.04);
        wristGroupRef.current.rotateX(-Math.PI / 2);
      } else {
        wristGroupRef.current.position.copy(camera.position);
        wristGroupRef.current.quaternion.copy(camera.quaternion);
        wristGroupRef.current.translateX(-0.26); wristGroupRef.current.translateY(-0.18); wristGroupRef.current.translateZ(-0.36);
        wristGroupRef.current.rotateY(0.45); wristGroupRef.current.rotateX(-0.35);
      }
    }

    if (wristTexture) wristTexture.needsUpdate = true;
  });

  if (!session) return null;

  return (
    <group ref={wristGroupRef}>
      <mesh position={[0, 0, -0.01]}><boxGeometry args={[0.14, 0.14, 0.015]} /><meshStandardMaterial color="#15221a" /></mesh>
      {wristTexture && (
        <mesh><planeGeometry args={[0.125, 0.125]} /><meshBasicMaterial map={wristTexture} /></mesh>
      )}
    </group>
  );
}
