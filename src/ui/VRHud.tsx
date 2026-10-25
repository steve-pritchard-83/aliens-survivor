import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { trackerCanvasState } from '../core/TrackerState';
import { comfort } from '../core/ComfortState';
import { xrControllerState } from '../core/XRControllerState';

import { VRStatusPanel } from './VRStatusPanel';
import { VRMenuNav } from './VRMenuNav';
import { openPauseMenu, stepPauseMenu } from './vrPauseMenu';
import { attachSessionHandlers } from './vrSessionEvents';
import { launchMission } from '../core/MissionLauncher';
import {
  pollControllers,
  createVRControllerInput,
  createVRControllerLatches,
  VRControllerInput
} from './vrControllers';

const END_SCREEN_ARM_SECONDS = 1.5;
const MENU_ARM_SECONDS = 0.6;

function resetInput(i: VRControllerInput): void {
  i.moveX = i.moveZ = i.rightStickX = i.rightStickY = 0;
  i.firing = i.anyButton = false;
}
const _wristPos = new THREE.Vector3();

export function VRHud() {
  const { session } = useXR();
  const { gl, camera } = useThree();
  const wristGroupRef = useRef<THREE.Group>(null);
  const statusMeshRef = useRef<THREE.Mesh>(null);
  const trackerVersionRef = useRef(-1);
  const navRef = useRef(new VRMenuNav()),
    selectedRef = useRef(0),
    prevStatusRef = useRef(useGameStore.getState().status);
  const latchesRef = useRef(createVRControllerLatches());
  const inputRef = useRef(createVRControllerInput());

  const wristTexture = useMemo(() => {
    if (!trackerCanvasState.canvas) return null;
    const tex = new THREE.CanvasTexture(trackerCanvasState.canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  const panel = useMemo(() => new VRStatusPanel(), []);

  // Pause on headset removal / system menu / session end, whichever way VR was entered
  useEffect(() => {
    if (!session) return;
    navRef.current.arm(MENU_ARM_SECONDS);
    return attachSessionHandlers(session);
  }, [session]);

  useFrame(({ clock }, dt, frame) => {
    const latches = latchesRef.current;
    if (latches.pauseCooldown > 0) latches.pauseCooldown -= dt;
    if (latches.lightCooldown > 0) latches.lightCooldown -= dt;
    const isPresenting = Boolean(session);
    if (!isPresenting) {
      comfort.turnRate = comfort.move = comfort.snapPulse = 0;
      if (InputManager.mode === 'XR') InputManager.setXRState(false);
      xrControllerState.rightHand.active = false;
      xrControllerState.leftHand.active = false;
      return;
    }

    const input = inputRef.current;
    const xrSession = gl.xr.getSession();
    if (xrSession) pollControllers(xrSession, gl.xr.getReferenceSpace(), frame, dt, latches, input);
    else resetInput(input);
    const { moveX, moveZ, firing, rightStickX, rightStickY } = input;

    InputManager.setXRState(true, moveX, moveZ, firing);

    const st = useGameStore.getState();
    if (st.status !== prevStatusRef.current) {
      prevStatusRef.current = st.status;
      if (st.status === 'LEVEL_UP') {
        navRef.current.arm(0.6);
        selectedRef.current = 0;
      } else if (st.status === 'PAUSED') openPauseMenu(navRef.current, selectedRef);
      else if (st.status === 'DEFEAT' || st.status === 'VICTORY') navRef.current.arm(END_SCREEN_ARM_SECONDS);
    }
    if (st.status === 'PAUSED') {
      if (statusMeshRef.current) {
        VRStatusPanel.place(statusMeshRef.current, camera);
        panel.render('PAUSED', clock.getElapsedTime(), dt, selectedRef.current, st);
      }
      stepPauseMenu(navRef.current, selectedRef, st, dt, input);
      return;
    }
    if (st.status === 'LEVEL_UP') {
      if (statusMeshRef.current) {
        VRStatusPanel.place(statusMeshRef.current, camera);
        panel.render('LEVEL_UP', clock.getElapsedTime(), dt, selectedRef.current, st);
      }
      const nav = navRef.current,
        count = Math.min(3, st.offeredUpgrades.length);
      nav.update(dt, rightStickX, rightStickY, firing);
      if (count > 0) {
        if (nav.consumeLeft()) selectedRef.current = Math.max(0, selectedRef.current - 1);
        if (nav.consumeRight()) selectedRef.current = Math.min(count - 1, selectedRef.current + 1);
        if (nav.consumeConfirm()) {
          AudioManager.play2D('ui_beep', 0.8);
          st.chooseUpgrade(st.offeredUpgrades[selectedRef.current].id);
        }
      }
      return;
    }
    if (st.status === 'MENU' || st.status === 'DEFEAT' || st.status === 'VICTORY') {
      if (statusMeshRef.current) {
        VRStatusPanel.place(statusMeshRef.current, camera);
        panel.render(st.status, clock.getElapsedTime(), dt, selectedRef.current, st);
      }
      // A fresh trigger press (armed after a short delay) starts or restarts the mission; nothing auto-restarts
      navRef.current.update(dt, 0, 0, firing);
      if (navRef.current.consumeConfirm()) launchMission();
    } else if (statusMeshRef.current) statusMeshRef.current.visible = false;

    if (wristGroupRef.current) {
      wristGroupRef.current.visible = st.status === 'PLAYING';
      const trackerHand = st.settings.leftHanded ? xrControllerState.rightHand : xrControllerState.leftHand;
      if (trackerHand.active && camera.parent) {
        _wristPos.copy(trackerHand.position).applyQuaternion(camera.parent.quaternion);
        wristGroupRef.current.position.copy(camera.parent.position).add(_wristPos);
        wristGroupRef.current.quaternion.copy(camera.parent.quaternion).multiply(trackerHand.quaternion);
        wristGroupRef.current.translateY(0.06);
        wristGroupRef.current.translateZ(-0.04);
        wristGroupRef.current.rotateX(-Math.PI / 2);
      } else {
        wristGroupRef.current.position.copy(camera.position);
        wristGroupRef.current.quaternion.copy(camera.quaternion);
        wristGroupRef.current.translateX(-0.26);
        wristGroupRef.current.translateY(-0.18);
        wristGroupRef.current.translateZ(-0.36);
        wristGroupRef.current.rotateY(0.45);
        wristGroupRef.current.rotateX(-0.35);
      }
    }
    if (wristTexture && trackerVersionRef.current !== trackerCanvasState.version) {
      trackerVersionRef.current = trackerCanvasState.version;
      wristTexture.needsUpdate = true;
    }
  });

  if (!session) return null;

  return (
    <>
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
      <mesh ref={statusMeshRef} visible={false}>
        <planeGeometry args={[1.5, 0.75]} />
        <meshBasicMaterial
          map={panel.texture}
          transparent
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
