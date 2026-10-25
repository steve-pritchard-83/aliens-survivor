import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { BALANCE } from '../data/balance';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { constrainToCorridorInto } from '../core/CorridorNav';

const _clamped = { x: 0, z: 0 };
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _worldQuat = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

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
    InputManager.init();
    camera.position.set(-0.32, 1.15, 13.0);
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
      camera.position.set(-0.32, 1.15, 13.0);
      camera.rotation.z = 0;
      yawRef.current = Math.PI;
      pitchRef.current = 0;
      xrYawRef.current = 0;
      if (camera.parent) {
        camera.parent.rotation.y = 0;
        camera.parent.position.set(-0.8, 0, 13.0);
      }
      _euler.set(0, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(_euler);
    } else if (status === 'DEFEAT' || status === 'VICTORY' || status === 'PAUSED') {
      InputManager.releasePointerLock();
    }
  }, [status, camera]);

  useFrame(({ clock }, dt) => {
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

    if (snap.mode !== 'XR') {
      yawRef.current -= snap.lookDeltaX;
      while (yawRef.current > Math.PI * 2) yawRef.current -= Math.PI * 2;
      while (yawRef.current < 0) yawRef.current += Math.PI * 2;
      pitchRef.current = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, pitchRef.current - snap.lookDeltaY));
      _euler.set(pitchRef.current + shakePitch, yawRef.current + shakeYaw, shakeRoll, 'YXZ');
      camera.quaternion.setFromEuler(_euler);
    } else {
      if (camera.parent) {
        if (snap.snapTurn !== 0) {
          xrYawRef.current += snap.snapTurn;
          camera.parent.rotation.y = xrYawRef.current;
        }
        camera.parent.updateMatrixWorld();
      }
      camera.getWorldQuaternion(_worldQuat);
      _euler.setFromQuaternion(_worldQuat, 'YXZ');
      yawRef.current = _euler.y;
    }

    _forward.set(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current)).normalize();
    _right.set(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current)).normalize();

    const moveMag = Math.hypot(snap.moveX, snap.moveZ);
    const [basePosX, , basePosZ] = state.playerPos;
    let nextX = basePosX + (_right.x * snap.moveX + _forward.x * snap.moveZ) * BALANCE.PLAYER.MOVE_SPEED * dt;
    let nextZ = basePosZ + (_right.z * snap.moveX + _forward.z * snap.moveZ) * BALANCE.PLAYER.MOVE_SPEED * dt;

    constrainToCorridorInto(nextX, nextZ, 0, _clamped);
    nextX = _clamped.x;
    nextZ = _clamped.z;

    let bobOffset = 0;
    if (moveMag > 0.05 && snap.mode !== 'XR') {
      headBobTimer.current += dt * 10.5;
      bobOffset = Math.sin(headBobTimer.current) * 0.035;
    } else {
      headBobTimer.current = 0;
    }

    const shakeY = shake > 0 ? Math.cos(now * 74) * shake * 0.032 : 0;
    const shakeX = shake > 0 ? Math.sin(now * 63) * shake * 0.025 : 0;
    const eyeY = 1.15 + bobOffset + shakeY;
    if (snap.mode === 'XR' && camera.parent) {
      camera.parent.position.set(nextX, 0, nextZ);
      camera.parent.updateMatrixWorld();
    } else {
      camera.position.set(nextX + _right.x * shakeX, eyeY, nextZ + _right.z * shakeX);
    }

    if (ripleyRef.current) {
      ripleyRef.current.position.set(nextX + _forward.x * -0.14, 0.0, nextZ + _forward.z * -0.14);
      ripleyRef.current.rotation.set(0, yawRef.current + Math.PI, 0);
    }

    if (now - lastTransformSync.current > 0.05) {
      lastTransformSync.current = now;
      state.updatePlayerTransform(nextX, 1.15 + bobOffset, nextZ, yawRef.current);
    }
    AudioManager.updateListener(nextX, eyeY, nextZ, yawRef.current);
  });

  return (
    <group ref={ripleyRef} name="RipleyPlayerAvatar" scale={0.32}>
      <primitive object={clonedRipley} />
    </group>
  );
}
useGLTF.preload('/models/ripley.glb');
