import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';
import { trackerCanvasState } from '../core/TrackerState';

const MAX_RANGE = 25.0; // 25 metres tactical corridor radar range

export function MotionTracker() {
  const { scene } = useGLTF('/models/motion_tracker.glb');
  const { camera } = useThree();
  const trackerGroupRef = useRef<THREE.Group>(null);
  const sweepProgressRef = useRef(0);
  const pingTriggeredOnSweepRef = useRef(false);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    trackerCanvasState.canvas = c;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return { canvas: c, texture: tex };
  }, []);

  // The model's screen is the 81-vertex quad whose UVs only cover the centre band (v 0.326..0.861) of the original JPEG.
  // Remap those UVs to 0..1 so the live radar canvas fills the model's own screen exactly (no overlay plane needed).
  const clonedTracker = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh || m.geometry.attributes.position.count !== 81) return;
      const geo = m.geometry.clone(), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) - 0.3257) / 0.5357);
      uv.needsUpdate = true; m.geometry = geo;
      m.material = new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false, side: THREE.DoubleSide });
    });
    return clone;
  }, [scene, texture]);

  useFrame((_, dt) => {
    const state = useGameStore.getState();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (state.status === 'DEFEAT') {
      ctx.fillStyle = '#03120c'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, 128); ctx.lineTo(240, 128); ctx.stroke();
      ctx.fillStyle = '#ff3333'; ctx.font = 'bold 20px "AlienLeague", monospace';
      ctx.textAlign = 'center'; ctx.fillText('SIGNAL LOST', 128, 105);
      texture.needsUpdate = true;
      return;
    }

    if (state.status === 'PAUSED') return;

    const cx = 128, cy = 176, maxRadiusPx = 142;
    ctx.fillStyle = '#03160e'; ctx.fillRect(0, 0, 256, 256);

    const [px, , pz] = state.playerPos;
    const yaw = state.playerYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const worldToRadar = (wx: number, wz: number): [number, number] => {
      const dx = wx - px, dz = wz - pz;
      return [cx + ((dx * rx + dz * rz) / MAX_RANGE) * maxRadiusPx, cy - ((dx * fx + dz * fz) / MAX_RANGE) * maxRadiusPx];
    };

    // Draw rotating Sulaco Double-Size Figure-8 Corridor Sector so player sees all 5 hallways & 6 junctions
    ctx.save();
    ctx.beginPath(); ctx.rect(4, 32, 248, 188); ctx.clip();
    ctx.strokeStyle = 'rgba(0, 255, 160, 0.34)'; ctx.fillStyle = 'rgba(0, 120, 75, 0.16)'; ctx.lineWidth = 2;
    const outerLoop: [number, number][] = [[0.42, 7.58], [0.42, 36.62], [-14.22, 36.62], [-14.22, 7.58]];
    const innerSouth: [number, number][] = [[-1.05, 9.02], [-12.75, 9.02], [-12.75, 21.38], [-1.05, 21.38]];
    const innerNorth: [number, number][] = [[-1.05, 22.82], [-12.75, 22.82], [-12.75, 35.18], [-1.05, 35.18]];
    ctx.beginPath();
    [outerLoop, innerSouth, innerNorth].forEach((poly) => {
      poly.forEach(([wx, wz], idx) => {
        const [bx, by] = worldToRadar(wx, wz);
        if (idx === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
      });
      ctx.closePath();
    });
    ctx.fill('evenodd'); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#00cc77'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, 250, 250);

    // Top CRT Header: EVAC Countdown Timer & Marine Health (pop countdown & health on tracker UI)
    ctx.fillStyle = '#02100a'; ctx.fillRect(4, 4, 248, 26);
    ctx.strokeStyle = 'rgba(0, 255, 160, 0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(4, 30); ctx.lineTo(252, 30); ctx.stroke();
    ctx.font = 'bold 14px "AlienLeague", monospace';
    ctx.fillStyle = state.timeRemaining <= 60 ? '#ff3333' : '#00ffaa';
    ctx.textAlign = 'left';
    const m = Math.floor(state.timeRemaining / 60), s = Math.floor(state.timeRemaining % 60), ms = Math.floor((state.timeRemaining % 1) * 10);
    ctx.fillText(`EVAC ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`, 12, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = state.hp <= 30 ? '#ff3333' : '#00ffaa';
    ctx.fillText(`HLTH ${Math.ceil(state.hp)}%`, 244, 22);

    // Range rings (8m, 16m, 25m)
    ctx.strokeStyle = 'rgba(0, 210, 120, 0.45)'; ctx.lineWidth = 1.5;
    [0.33, 0.66, 1.0].forEach((rFrac) => {
      ctx.beginPath(); ctx.arc(cx, cy, maxRadiusPx * rFrac, Math.PI, 2 * Math.PI); ctx.stroke();
    });

    ctx.beginPath(); ctx.moveTo(cx - maxRadiusPx, cy); ctx.lineTo(cx + maxRadiusPx, cy); ctx.stroke();
    [-60, -30, 0, 30, 60].forEach((deg) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(rad) * maxRadiusPx, cy + Math.sin(rad) * maxRadiusPx); ctx.stroke();
    });

    // Player & Bishop Squad markers
    ctx.fillStyle = '#00ff99';
    ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx + 5, cy + 5); ctx.closePath(); ctx.fill();

    if (state.status !== 'PLAYING') {
      ctx.fillStyle = '#00ffaa'; ctx.font = 'bold 15px "AlienLeague", monospace';
      ctx.textAlign = 'center'; ctx.fillText('M314 STANDBY', 128, 238);
      texture.needsUpdate = true;
      return;
    }

    const prevSweep = sweepProgressRef.current;
    sweepProgressRef.current = (sweepProgressRef.current + dt * 0.92) % 1.0;
    if (sweepProgressRef.current < prevSweep) {
      pingTriggeredOnSweepRef.current = false;
      AudioManager.play2D('tracker_sweep', 0.14, 1.0);
    }

    const sweepRadius = sweepProgressRef.current * maxRadiusPx;
    const sweepGrad = ctx.createRadialGradient(cx, cy, Math.max(1, sweepRadius - 22), cx, cy, sweepRadius + 2);
    sweepGrad.addColorStop(0, 'rgba(0, 255, 160, 0.0)');
    sweepGrad.addColorStop(0.85, 'rgba(0, 255, 170, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(160, 255, 220, 0.95)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath(); ctx.arc(cx, cy, sweepRadius, Math.PI, 2 * Math.PI); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();

    let closestDist = Infinity;
    const allThreats = state.smallThreat ? [...state.activeThreats, state.smallThreat] : state.activeThreats;
    for (let i = 0; i < allThreats.length; i++) {
      const t = allThreats[i];
      const dist = Math.hypot(t.x - px, t.z - pz);
      if (dist > MAX_RANGE) continue;
      if (dist < closestDist) closestDist = dist;

      const [rawBx, rawBy] = worldToRadar(t.x, t.z);
      const bx = Math.max(14, Math.min(242, rawBx)), by = Math.max(14, Math.min(212, rawBy));
      const isIlluminated = Math.abs(sweepProgressRef.current - Math.min(1.0, dist / MAX_RANGE)) < 0.28;

      ctx.fillStyle = isIlluminated ? 'rgba(140, 255, 250, 0.5)' : 'rgba(0, 255, 180, 0.25)';
      ctx.beginPath(); ctx.arc(bx, by, isIlluminated ? 11 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isIlluminated ? '#ffffff' : '#66ffee';
      ctx.beginPath(); ctx.arc(bx, by, isIlluminated ? 5.5 : 4.0, 0, Math.PI * 2); ctx.fill();
    }

    if (
      closestDist <= MAX_RANGE &&
      !pingTriggeredOnSweepRef.current &&
      sweepProgressRef.current >= Math.min(0.85, (closestDist / MAX_RANGE) * 0.85)
    ) {
      pingTriggeredOnSweepRef.current = true;
      const proximity = 1.0 - Math.min(1.0, closestDist / MAX_RANGE);
      AudioManager.play2D('tracker_ping', 0.24 + proximity * 0.14, 0.95 + proximity * 0.85);
    }

    ctx.fillStyle = '#02100a'; ctx.fillRect(4, 222, 248, 28);
    ctx.fillStyle = '#00ffaa'; ctx.font = 'bold 15px "AlienLeague", monospace';
    ctx.textAlign = 'left'; ctx.fillText(`CONTACTS: ${allThreats.length}`, 12, 241);
    ctx.textAlign = 'right';
    ctx.fillStyle = closestDist < 6 ? '#ff4444' : '#66ffee';
    ctx.fillText(closestDist <= MAX_RANGE ? `RNG ${closestDist.toFixed(1)}M` : 'NO SIGNAL', 244, 241);

    texture.needsUpdate = true;

    if (trackerGroupRef.current) {
      trackerGroupRef.current.visible = state.status === 'PLAYING' || state.status === 'PAUSED' || state.status === 'DEFEAT';
      trackerGroupRef.current.position.copy(camera.position);
      trackerGroupRef.current.quaternion.copy(camera.quaternion);
      if (state.trackerRaised) {
        trackerGroupRef.current.translateX(-0.1);
        trackerGroupRef.current.translateY(-0.03);
        trackerGroupRef.current.translateZ(-0.27);
        trackerGroupRef.current.rotateY(0.16);
        trackerGroupRef.current.rotateX(-0.06);
      } else {
        trackerGroupRef.current.translateX(-0.2);
        trackerGroupRef.current.translateY(-0.105);
        trackerGroupRef.current.translateZ(-0.35);
        trackerGroupRef.current.rotateY(0.3);
        trackerGroupRef.current.rotateX(-0.16);
      }
    }
  });

  // Group origin = centre of the model's screen (native centre ~ (0.61, 3.12, 0)); model rotated so the screen faces the camera
  // (+X -> +Z) and scaled so the device is ~0.36m tall. Offset = -scale * R(-90 deg about Y) * (0.61, 3.12, 0).
  return (
    <group ref={trackerGroupRef} visible={true}>
      <group scale={0.07} position={[0, -0.2184, -0.0427]} rotation={[0, -Math.PI / 2, 0]}>
        <primitive object={clonedTracker} />
      </group>
    </group>
  );
}
useGLTF.preload('/models/motion_tracker.glb');
