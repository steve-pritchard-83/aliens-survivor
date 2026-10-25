import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { trackerCanvasState } from '../core/TrackerState';
import { xrControllerState } from '../core/XRControllerState';

import { drawVRStatusPanel, VRPanelData, VRPanelStatus } from './VRStatusCanvas';
import { VRMenuNav } from './VRMenuNav';
import {
  pollControllers,
  createVRControllerInput,
  createVRControllerLatches,
  VRControllerInput
} from './vrControllers';

const _panel: VRPanelData = {
  status: 'PAUSED',
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  timeRem: 0,
  pulse: 0,
  offered: [],
  selectedIndex: 0,
  recordKills: 0
};
function resetInput(i: VRControllerInput): void {
  i.moveX = i.moveZ = i.rightStickX = i.rightStickY = 0;
  i.firing = i.anyButton = false;
}
const _camFwd = new THREE.Vector3(),
  _wristPos = new THREE.Vector3(),
  _camPos = new THREE.Vector3(),
  _camQuat = new THREE.Quaternion();

export function VRHud() {
  const { session } = useXR();
  const { gl, camera } = useThree();
  const wristGroupRef = useRef<THREE.Group>(null);
  const statusMeshRef = useRef<THREE.Mesh>(null);
  const defeatTimerRef = useRef(0);
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

  const { panelCanvas, panelTex } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { panelCanvas: canvas, panelTex: tex };
  }, []);

  const renderPanel = (status: VRPanelStatus, pulse: number) => {
    const st = useGameStore.getState();
    _panel.status = status;
    _panel.kills = st.kills;
    _panel.shotsFired = st.shotsFired;
    _panel.shotsHit = st.shotsHit;
    _panel.timeRem = st.timeRemaining;
    _panel.pulse = pulse;
    _panel.offered = st.offeredUpgrades;
    _panel.settings = st.settings;
    _panel.selectedIndex = selectedRef.current;
    _panel.recordKills = st.recordKills;
    drawVRStatusPanel(panelCanvas, _panel);
    panelTex.needsUpdate = true;
  };

  useFrame(({ clock }, dt, frame) => {
    const latches = latchesRef.current;
    if (latches.pauseCooldown > 0) latches.pauseCooldown -= dt;
    if (latches.lightCooldown > 0) latches.lightCooldown -= dt;
    const isPresenting = Boolean(session);
    if (!isPresenting) {
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
    const anyButtonPressed = input.anyButton;

    InputManager.setXRState(true, moveX, moveZ, firing);

    const st = useGameStore.getState();
    if (st.status !== prevStatusRef.current) {
      prevStatusRef.current = st.status;
      if (st.status === 'LEVEL_UP') {
        navRef.current.arm(0.6);
        selectedRef.current = 0;
      }
    }
    if (st.status === 'PAUSED') {
      if (statusMeshRef.current) {
        statusMeshRef.current.visible = true;
        camera.getWorldDirection(_camFwd);
        camera.getWorldPosition(_camPos);
        camera.getWorldQuaternion(_camQuat);
        statusMeshRef.current.position.copy(_camPos).addScaledVector(_camFwd, 1.7);
        statusMeshRef.current.quaternion.copy(_camQuat);
        renderPanel('PAUSED', clock.getElapsedTime());
      }
      if (latches.pauseCooldown <= 0 && xrSession) {
        for (const src of xrSession.inputSources) {
          const btns = src.gamepad?.buttons;
          if (!btns) continue;
          if (src.handedness === 'right' && btns[4]?.pressed) {
            latches.pauseCooldown = 0.35;
            AudioManager.play2D('ui_beep', 0.7);
            const angles = [Math.PI / 6, Math.PI / 4, Math.PI / 2, 0];
            const cur = angles.findIndex((a) => Math.abs(a - st.settings.snapAngle) < 0.05);
            st.updateSettings({ snapAngle: angles[(cur + 1) % angles.length] });
            return;
          }
          if (src.handedness === 'left' && btns[4]?.pressed) {
            latches.pauseCooldown = 0.35;
            AudioManager.play2D('ui_beep', 0.7);
            st.updateSettings({ reducedFlash: !st.settings.reducedFlash });
            return;
          }
          if (btns[1]?.pressed) {
            latches.pauseCooldown = 0.35;
            AudioManager.play2D('ui_beep', 0.7);
            st.updateSettings({ leftHanded: !st.settings.leftHanded });
            return;
          }
        }
      }
      if (latches.pauseCooldown <= 0 && firing) {
        latches.pauseCooldown = 0.45;
        AudioManager.play2D('ui_beep', 0.8);
        st.resumeGame();
      }
      return;
    }
    if (st.status === 'LEVEL_UP') {
      if (statusMeshRef.current) {
        statusMeshRef.current.visible = true;
        camera.getWorldDirection(_camFwd);
        camera.getWorldPosition(_camPos);
        camera.getWorldQuaternion(_camQuat);
        statusMeshRef.current.position.copy(_camPos).addScaledVector(_camFwd, 1.7);
        statusMeshRef.current.quaternion.copy(_camQuat);
        renderPanel('LEVEL_UP', clock.getElapsedTime());
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
    if (st.status === 'DEFEAT' || st.status === 'VICTORY') {
      defeatTimerRef.current += dt;
      if (statusMeshRef.current) {
        statusMeshRef.current.visible = true;
        camera.getWorldDirection(_camFwd);
        camera.getWorldPosition(_camPos);
        camera.getWorldQuaternion(_camQuat);
        statusMeshRef.current.position.copy(_camPos).addScaledVector(_camFwd, 1.7);
        statusMeshRef.current.quaternion.copy(_camQuat);
        renderPanel(st.status, clock.getElapsedTime());
      }
      if (defeatTimerRef.current > 0.6 && (firing || anyButtonPressed || defeatTimerRef.current > 9.0)) {
        defeatTimerRef.current = 0;
        AudioManager.resetAudio();
        AudioManager.unlock()
          .then(() => {
            AudioManager.play2D('ui_beep', 0.8);
            AudioManager.startBGM();
            AudioManager.setKlaxonActive(true);
          })
          .catch((e) => console.warn('[VRHud] audio unlock failed', e));
        st.startGame();
      }
    } else {
      defeatTimerRef.current = 0;
      if (statusMeshRef.current) statusMeshRef.current.visible = false;
    }

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
        <meshBasicMaterial map={panelTex} transparent depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
