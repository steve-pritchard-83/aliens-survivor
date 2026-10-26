import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, isSimulationFrozen, ActiveThreat } from '../core/GameStore';
import { BALANCE, UPGRADE_EFFECTS } from '../data/balance';
import { AudioManager } from '../core/AudioManager';
import { Haptics } from '../core/Haptics';
import { trackerCanvasState } from '../core/TrackerState';
import {
  drawDefeat,
  drawRadarBase,
  drawStandby,
  drawSweep,
  drawContact,
  drawFooter,
  setRadarView
} from './tracker/trackerCanvas';
import { drawCrtNoise } from './tracker/trackerNoise';
import { useDisposeOnUnmount } from './fx/useDisposeOnUnmount';

const MAX_RANGE: number = BALANCE.TRACKER.BASE_RANGE;
const DRAW_HZ = 20;

/** Distance to a threat if it is inside radar range, otherwise Infinity. */
function rangedDist(t: ActiveThreat, px: number, pz: number, maxRange: number): number {
  const d = Math.hypot(t.x - px, t.z - pz);
  return d > maxRange ? Infinity : d;
}

function drawThreat(
  ctx: CanvasRenderingContext2D,
  t: ActiveThreat,
  px: number,
  pz: number,
  maxRange: number,
  sweep: number
): void {
  const d = rangedDist(t, px, pz, maxRange);
  if (d !== Infinity) drawContact(ctx, t.x, t.z, d, sweep);
}

export function MotionTracker() {
  const { scene } = useGLTF('/models/motion_tracker.glb');
  const { camera } = useThree();
  const trackerGroupRef = useRef<THREE.Group>(null);
  const sweepProgressRef = useRef(0);
  const pingTriggeredOnSweepRef = useRef(false);
  const drawTimerRef = useRef(0);
  const defeatDrawnRef = useRef(false);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    trackerCanvasState.canvas = c;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return { canvas: c, texture: tex };
  }, []);
  useDisposeOnUnmount(texture);

  const publish = () => {
    texture.needsUpdate = true;
    trackerCanvasState.version++;
  };

  // The model's screen is the 81-vertex quad whose UVs only cover the centre band (v 0.326..0.861) of the original JPEG.
  // Remap those UVs to 0..1 so the live radar canvas fills the model's own screen exactly (no overlay plane needed).
  const clonedTracker = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh || m.geometry.attributes.position.count !== 81) return;
      const geo = m.geometry.clone(),
        uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) - 0.3257) / 0.5357);
      uv.needsUpdate = true;
      m.geometry = geo;
      m.material = new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false, side: THREE.DoubleSide });
    });
    return clone;
  }, [scene, texture]);

  useFrame((_, dt) => {
    const state = useGameStore.getState();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (state.status === 'DEFEAT') {
      if (!defeatDrawnRef.current) {
        defeatDrawnRef.current = true;
        drawDefeat(ctx);
        publish();
      }
      return;
    }
    defeatDrawnRef.current = false;
    if (isSimulationFrozen(state.status)) return;
    // The tracker is only visible in play; do not redraw and re-upload its texture on the menu or victory screens
    if (state.status === 'MENU' || state.status === 'VICTORY') return;

    const playing = state.status === 'PLAYING';
    const maxRange = state.activeUpgrades.includes('tracker_gain')
      ? UPGRADE_EFFECTS.tracker_gain.trackerRange
      : MAX_RANGE;
    const [px, , pz] = state.playerPos;

    // Sweep, ping and haptics run every frame; the canvas is only redrawn (and re-uploaded) at DRAW_HZ
    let closest = Infinity;
    let contacts = 0;
    if (playing) {
      const prevSweep = sweepProgressRef.current;
      sweepProgressRef.current = (sweepProgressRef.current + dt * 0.92) % 1.0;
      if (sweepProgressRef.current < prevSweep) {
        pingTriggeredOnSweepRef.current = false;
        AudioManager.play2D('tracker_sweep', 0.14, 1.0);
      }
      const threats = state.activeThreats;
      contacts = threats.length + (state.smallThreat ? 1 : 0);
      for (let i = 0; i < threats.length; i++) closest = Math.min(closest, rangedDist(threats[i], px, pz, maxRange));
      if (state.smallThreat) closest = Math.min(closest, rangedDist(state.smallThreat, px, pz, maxRange));
      if (
        closest <= maxRange &&
        !pingTriggeredOnSweepRef.current &&
        sweepProgressRef.current >= Math.min(0.85, (closest / maxRange) * 0.85)
      ) {
        pingTriggeredOnSweepRef.current = true;
        const proximity = 1.0 - Math.min(1.0, closest / maxRange);
        AudioManager.play2D('tracker_ping', 0.24 + proximity * 0.14, 0.95 + proximity * 0.85);
        Haptics.trackerPing();
      }
    }

    drawTimerRef.current += dt;
    if (drawTimerRef.current >= 1 / DRAW_HZ) {
      drawTimerRef.current = 0;
      setRadarView(px, pz, state.playerYaw, maxRange);
      drawRadarBase(ctx, state.timeRemaining, state.hp);
      if (!playing) {
        drawStandby(ctx);
      } else {
        drawSweep(ctx, sweepProgressRef.current);
        for (let i = 0; i < state.activeThreats.length; i++)
          drawThreat(ctx, state.activeThreats[i], px, pz, maxRange, sweepProgressRef.current);
        if (state.smallThreat) drawThreat(ctx, state.smallThreat, px, pz, maxRange, sweepProgressRef.current);
        drawFooter(ctx, contacts, closest, maxRange);
      }
      drawCrtNoise(ctx);
      publish();
    }
    if (!playing) return;

    const group = trackerGroupRef.current;
    if (group) {
      group.visible = true;
      group.position.copy(camera.position);
      group.quaternion.copy(camera.quaternion);
      if (state.trackerRaised) {
        group.translateX(-0.1);
        group.translateY(-0.03);
        group.translateZ(-0.27);
        group.rotateY(0.16);
        group.rotateX(-0.06);
      } else {
        group.translateX(-0.2);
        group.translateY(-0.105);
        group.translateZ(-0.35);
        group.rotateY(0.3);
        group.rotateX(-0.16);
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
