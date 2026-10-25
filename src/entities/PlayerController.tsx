import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { BALANCE } from '../data/balance';
import { isE2E } from '../core/e2e';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { constrainToCorridorInto, XZ } from '../core/CorridorNav';
import { velocityDelta } from './player/playerMotion';
import { readHeadLocal, turnAboutHead, moveHeadClamped, placeHeadAt } from './player/xrRig';

const START_X = -0.32;
const START_Z = 13.0;
const EYE_HEIGHT = 1.15;
const TRANSFORM_SYNC_SECONDS = 0.05;

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _worldQuat = new THREE.Quaternion();
const _delta: XZ = { x: 0, z: 0 };
const _headLocal = new THREE.Vector3();

export function PlayerController() {
  const { camera } = useThree();
  const ripleyGltf = useGLTF('/models/ripley.glb');
  const ripleyRef = useRef<THREE.Group>(null);
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(0);
  const xrYawRef = useRef(0);
  const headBobTimer = useRef(0);
  const prevStatusRef = useRef(useGameStore.getState().status);
  const lastTransformSync = useRef(0);
  // Player position (the head in VR), integrated locally every frame; the store copy is throttled for other systems
  const posRef = useRef<XZ>({ x: START_X, z: START_Z });
  const wasXrRef = useRef(false);

  const status = useGameStore((s) => s.status);

  // Clone Ellen Ripley character mesh, hiding upper head/haircap so first-person camera never clips inside her skull
  const clonedRipley = useMemo(() => {
    const clone = ripleyGltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.name.includes('RipleyHead') || m.name.includes('RipleyHair') || m.name.includes('RipleyEyes')) {
          m.visible = false;
        }
      }
    });
    return clone;
  }, [ripleyGltf.scene]);

  useEffect(() => {
    if (isE2E()) {
      const probe = new THREE.Vector3();
      window.__headPosition = () => {
        camera.getWorldPosition(probe);
        return { x: probe.x, y: probe.y, z: probe.z };
      };
    }
    InputManager.init();
    camera.position.set(START_X, EYE_HEIGHT, START_Z);
    yawRef.current = Math.PI;
    pitchRef.current = 0;

    InputManager.onPointerUnlockCallback = () => {
      const st = useGameStore.getState();
      if (st.status === 'PLAYING') {
        st.pauseGame();
        AudioManager.pauseBGM();
        AudioManager.setKlaxonActive(false);
        AudioManager.play2D('ui_beep', 0.5);
      }
    };
    return () => {
      InputManager.onPointerUnlockCallback = null;
    };
  }, [camera]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'PLAYING' && (prev === 'MENU' || prev === 'DEFEAT' || prev === 'VICTORY')) {
      posRef.current.x = START_X;
      posRef.current.z = START_Z;
      camera.position.set(START_X, EYE_HEIGHT, START_Z);
      camera.rotation.z = 0;
      yawRef.current = Math.PI;
      pitchRef.current = 0;
      xrYawRef.current = 0;
      wasXrRef.current = false;
      if (camera.parent) {
        camera.parent.rotation.y = 0;
        camera.parent.position.set(START_X, 0, START_Z);
      }
      _euler.set(0, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(_euler);
    } else if (status === 'DEFEAT' || status === 'VICTORY' || status === 'PAUSED') {
      InputManager.releasePointerLock();
    }
  }, [status, camera]);

  useFrame(({ clock, gl }, dt, frame) => {
    const state = useGameStore.getState();
    const now = clock.getElapsedTime();

    // Handle keyboard 'P' pause/resume toggle
    if (InputManager.pauseToggleFlag) {
      InputManager.pauseToggleFlag = false;
      if (state.status === 'PLAYING') {
        state.pauseGame();
        InputManager.releasePointerLock();
        AudioManager.pauseBGM();
        AudioManager.setKlaxonActive(false);
        AudioManager.play2D('ui_beep', 0.5);
        return;
      } else if (state.status === 'PAUSED') {
        state.resumeGame();
        InputManager.requestPointerLock();
        AudioManager.resumeBGM();
        AudioManager.setKlaxonActive(true);
        AudioManager.play2D('ui_beep', 0.5);
        return;
      }
    }

    if (state.status === 'DEFEAT') {
      if (InputManager.mode !== 'XR') {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.25, dt * 4);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0.45, dt * 3);
      }
      return;
    }

    if (state.status !== 'PLAYING') return;

    state.tick(dt, now);

    const snap = InputManager.consumeSnapshot();
    if (snap.reloadRequested) state.startReload();
    if (InputManager.trackerToggleFlag) {
      InputManager.trackerToggleFlag = false;
      state.toggleTracker();
      AudioManager.play2D('ui_beep', 0.45);
    }
    if (InputManager.flashlightToggleFlag) {
      InputManager.flashlightToggleFlag = false;
      const nextState = !state.flashlightOn;
      state.toggleFlashlight();
      AudioManager.play2D(nextState ? 'torch_on' : 'torch_off', 0.65);
    }

    const shake = state.screenShake;
    const shakePitch = shake > 0 ? Math.sin(now * 58) * shake * 0.032 : 0;
    const shakeYaw = shake > 0 ? Math.cos(now * 67) * shake * 0.024 : 0;
    const shakeRoll = shake > 0 ? Math.sin(now * 49 + 1.1) * shake * 0.042 : 0;
    const xrOrigin = snap.mode === 'XR' ? camera.parent : null;

    if (!xrOrigin) {
      yawRef.current -= snap.lookDeltaX;
      while (yawRef.current > Math.PI * 2) yawRef.current -= Math.PI * 2;
      while (yawRef.current < 0) yawRef.current += Math.PI * 2;
      pitchRef.current = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, pitchRef.current - snap.lookDeltaY));
      _euler.set(pitchRef.current + shakePitch, yawRef.current + shakeYaw, shakeRoll, 'YXZ');
      camera.quaternion.setFromEuler(_euler);
    } else {
      readHeadLocal(frame, gl.xr.getReferenceSpace(), camera, _headLocal);
      if (!wasXrRef.current) {
        // First VR frame of this run or session: put the head on the player's position
        placeHeadAt(xrOrigin, _headLocal, posRef.current.x, posRef.current.z);
      }
      if (snap.snapTurn !== 0) {
        xrYawRef.current += snap.snapTurn;
        turnAboutHead(xrOrigin, _headLocal, xrYawRef.current);
      }
      xrOrigin.position.y = state.settings.seatedMode ? BALANCE.PLAYER.SEATED_HEIGHT_OFFSET : 0;
      xrOrigin.updateMatrixWorld(true);
      camera.getWorldQuaternion(_worldQuat);
      _euler.setFromQuaternion(_worldQuat, 'YXZ');
      yawRef.current = _euler.y;
    }

    wasXrRef.current = xrOrigin !== null;
    const yaw = yawRef.current;
    const moveMag = Math.hypot(snap.moveX, snap.moveZ);
    velocityDelta(snap.moveX, snap.moveZ, yaw, dt, _delta);
    const pos = posRef.current;
    if (xrOrigin) {
      // VR: the head is the player; walking into a wall (by stick or by room-scale) is clamped and pushed back
      moveHeadClamped(xrOrigin, _headLocal, _delta.x, _delta.z, BALANCE.PLAYER.XR_WALL_MARGIN, pos);
    } else {
      constrainToCorridorInto(pos.x + _delta.x, pos.z + _delta.z, 0, pos);
    }

    let bobOffset = 0;
    if (moveMag > 0.05 && !xrOrigin) {
      headBobTimer.current += dt * 10.5;
      bobOffset = Math.sin(headBobTimer.current) * 0.035;
    } else {
      headBobTimer.current = 0;
    }

    const shakeY = shake > 0 ? Math.cos(now * 74) * shake * 0.032 : 0;
    const shakeX = shake > 0 ? Math.sin(now * 63) * shake * 0.025 : 0;
    const eyeY = EYE_HEIGHT + bobOffset + shakeY;
    if (!xrOrigin) {
      const rightX = Math.cos(yaw),
        rightZ = -Math.sin(yaw);
      camera.position.set(pos.x + rightX * shakeX, eyeY, pos.z + rightZ * shakeX);
    }

    if (ripleyRef.current) {
      ripleyRef.current.position.set(pos.x + Math.sin(yaw) * 0.14, 0.0, pos.z + Math.cos(yaw) * 0.14);
      ripleyRef.current.rotation.set(0, yaw + Math.PI, 0);
    }

    if (now - lastTransformSync.current > TRANSFORM_SYNC_SECONDS) {
      lastTransformSync.current = now;
      state.updatePlayerTransform(pos.x, EYE_HEIGHT + bobOffset, pos.z, yaw);
    }
    AudioManager.updateListener(pos.x, eyeY, pos.z, yaw);
  });

  return (
    <group ref={ripleyRef} name="RipleyPlayerAvatar" scale={0.32}>
      <primitive object={clonedRipley} />
    </group>
  );
}
useGLTF.preload('/models/ripley.glb');
