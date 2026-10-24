import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { trackerCanvasState } from '../core/TrackerState';
import { xrControllerState } from '../core/XRControllerState';

const _camFwd = new THREE.Vector3();
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function VRHud() {
  const { session } = useXR();
  const { gl, camera } = useThree();
  const wristGroupRef = useRef<THREE.Group>(null);
  const statusMeshRef = useRef<THREE.Mesh>(null);
  const snapTurnCoolRef = useRef(false);
  const defeatTimerRef = useRef(0);

  const wristTexture = useMemo(() => {
    if (!trackerCanvasState.canvas) return null;
    const tex = new THREE.CanvasTexture(trackerCanvasState.canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  const { panelCanvas, panelTex } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { panelCanvas: canvas, panelTex: tex };
  }, []);

  const drawPanel = (status: 'DEFEAT' | 'VICTORY', kills: number, shotsFired: number, shotsHit: number, timeRem: number, pulse: number) => {
    const ctx = panelCanvas.getContext('2d');
    if (!ctx) return;
    const isDefeat = status === 'DEFEAT';
    const mainColor = isDefeat ? '#ff3333' : '#00ff88';
    const bgColor = isDefeat ? 'rgba(22, 6, 6, 0.94)' : 'rgba(4, 22, 12, 0.94)';
    const acc = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    const dur = isDefeat ? fmtTime(300 - timeRem) : '05:00';

    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = bgColor;
    ctx.fillRect(20, 20, 984, 472);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 984, 472);

    ctx.fillStyle = isDefeat ? '#ff8866' : '#88ffaa';
    ctx.font = 'bold 22px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WEYLAND-YUTANI // USCM TACTICAL LINK', 512, 80);

    ctx.fillStyle = mainColor;
    ctx.font = 'bold 50px Courier New, monospace';
    ctx.fillText(isDefeat ? 'MIA // BIO-SIGNALS FLATLINED' : 'EXTRACTION SUCCESSFUL', 512, 160);

    ctx.fillStyle = '#cceecc';
    ctx.font = '24px Courier New, monospace';
    ctx.fillText(isDefeat ? 'SECTOR 4 OVERRUN — CASUALTY CONFIRMED' : 'SECTOR 4 PURGED — DROPSHIP DOCKED', 512, 215);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Courier New, monospace';
    ctx.fillText(`SURVIVAL: ${dur}   |   KILLS: ${kills}   |   ACCURACY: ${acc}%`, 512, 290);

    const btnAlpha = 0.75 + Math.sin(pulse * 6.0) * 0.25;
    ctx.fillStyle = isDefeat ? `rgba(255, 51, 51, ${btnAlpha * 0.25})` : `rgba(0, 255, 136, ${btnAlpha * 0.25})`;
    ctx.fillRect(162, 350, 700, 80);
    ctx.strokeStyle = isDefeat ? `rgba(255, 51, 51, ${btnAlpha})` : `rgba(0, 255, 136, ${btnAlpha})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(162, 350, 700, 80);

    ctx.fillStyle = isDefeat ? '#ff8888' : '#00ff88';
    ctx.font = 'bold 32px Courier New, monospace';
    ctx.fillText('▶ PULL TRIGGER TO REDEPLOY ◀', 512, 402);
    panelTex.needsUpdate = true;
  };

  useFrame(({ clock }, dt, frame) => {
    const isPresenting = Boolean(session);
    if (!isPresenting) {
      if (InputManager.mode === 'XR') InputManager.setXRState(false);
      xrControllerState.rightHand.active = false;
      xrControllerState.leftHand.active = false;
      return;
    }

    let moveX = 0, moveZ = 0, firing = false, anyButtonPressed = false;
    const xrSession = gl.xr.getSession(), refSpace = gl.xr.getReferenceSpace();

    if (xrSession) {
      for (const source of xrSession.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes, buttons = source.gamepad.buttons;
        if (buttons[0]?.pressed || buttons[1]?.pressed || buttons[4]?.pressed || buttons[5]?.pressed) anyButtonPressed = true;

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
          if (buttons[4]?.pressed || buttons[5]?.pressed) useGameStore.getState().toggleFlashlight();
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
          } else if (Math.abs(turnAxis) < 0.25) snapTurnCoolRef.current = false;
        }
      }
    }

    InputManager.setXRState(true, moveX, moveZ, firing);

    const st = useGameStore.getState();
    if (st.status === 'DEFEAT' || st.status === 'VICTORY') {
      defeatTimerRef.current += dt;
      if (statusMeshRef.current) {
        statusMeshRef.current.visible = true;
        _camFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
        statusMeshRef.current.position.copy(camera.position).addScaledVector(_camFwd, 1.7);
        statusMeshRef.current.quaternion.copy(camera.quaternion);
        drawPanel(st.status, st.kills, st.shotsFired, st.shotsHit, st.timeRemaining, clock.getElapsedTime());
      }
      if (defeatTimerRef.current > 0.6 && (firing || anyButtonPressed || defeatTimerRef.current > 9.0)) {
        defeatTimerRef.current = 0;
        AudioManager.resetAudio();
        AudioManager.unlock().then(() => {
          AudioManager.play2D('ui_beep', 0.8);
          AudioManager.startBGM();
          AudioManager.setKlaxonActive(true);
        }).catch(() => {});
        st.startGame();
      }
    } else {
      defeatTimerRef.current = 0;
      if (statusMeshRef.current) statusMeshRef.current.visible = false;
    }

    if (wristGroupRef.current) {
      wristGroupRef.current.visible = st.status === 'PLAYING';
      if (xrControllerState.leftHand.active && camera.parent) {
        wristGroupRef.current.position.set(camera.parent.position.x + xrControllerState.leftHand.position.x, xrControllerState.leftHand.position.y, camera.parent.position.z + xrControllerState.leftHand.position.z);
        wristGroupRef.current.quaternion.copy(xrControllerState.leftHand.quaternion);
        wristGroupRef.current.translateY(0.06); wristGroupRef.current.translateZ(-0.04); wristGroupRef.current.rotateX(-Math.PI / 2);
      } else {
        wristGroupRef.current.position.copy(camera.position); wristGroupRef.current.quaternion.copy(camera.quaternion);
        wristGroupRef.current.translateX(-0.26); wristGroupRef.current.translateY(-0.18); wristGroupRef.current.translateZ(-0.36);
        wristGroupRef.current.rotateY(0.45); wristGroupRef.current.rotateX(-0.35);
      }
    }
    if (wristTexture) wristTexture.needsUpdate = true;
  });

  if (!session) return null;

  return (
    <>
      <group ref={wristGroupRef}>
        <mesh position={[0, 0, -0.01]}><boxGeometry args={[0.14, 0.14, 0.015]} /><meshStandardMaterial color="#15221a" /></mesh>
        {wristTexture && <mesh><planeGeometry args={[0.125, 0.125]} /><meshBasicMaterial map={wristTexture} /></mesh>}
      </group>
      <mesh ref={statusMeshRef} visible={false}>
        <planeGeometry args={[1.5, 0.75]} />
        <meshBasicMaterial map={panelTex} transparent depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}