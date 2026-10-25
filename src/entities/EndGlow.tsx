import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';

// The focal point of the view down the east spine: a pale cream-green opening glowing through the haze, like the
// doorway in the film art. It is an unlit additive card (visible through the fog) plus a soft beam and one light.
const DOOR = { x: -0.32, z: 36.3 };
const BEAM_LENGTH = 13;

function archTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.beginPath();
    ctx.moveTo(14, 256);
    ctx.lineTo(14, 90);
    ctx.quadraticCurveTo(64, -20, 114, 90);
    ctx.lineTo(114, 256);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255, 255, 240, 1)');
    g.addColorStop(1, 'rgba(210, 235, 190, 0.75)');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(230, 245, 210, 1)';
    ctx.shadowBlur = 18;
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

function haloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(225, 245, 215, 0.85)');
    g.addColorStop(0.45, 'rgba(120, 190, 190, 0.3)');
    g.addColorStop(1, 'rgba(60, 130, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

/** A tube of faint light that is brightest at the door and fades toward the player (alpha in vertex colours). */
function beamGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, BEAM_LENGTH, 20, 1, true);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + BEAM_LENGTH / 2) / BEAM_LENGTH; // 0 at the player end, 1 at the door
    col.set([0.85, 0.95, 0.85, t * t * 0.2], i * 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  return geo;
}

const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false } as const;

export function EndGlow() {
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const { arch, halo, beam } = useMemo(() => ({ arch: archTexture(), halo: haloTexture(), beam: beamGeometry() }), []);

  useFrame(({ clock }) => {
    if (isSimulationFrozen(useGameStore.getState().status) || !haloRef.current) return;
    const t = clock.getElapsedTime();
    haloRef.current.opacity = 0.34 + Math.sin(t * 1.3) * 0.04 + Math.sin(t * 7.1) * 0.015;
  });

  return (
    <group name="EndGlow">
      <mesh position={[DOOR.x, 1.5, DOOR.z - 0.04]} rotation={[0, Math.PI, 0]} renderOrder={1}>
        <planeGeometry args={[3.6, 3.8]} />
        <meshBasicMaterial ref={haloRef} map={halo} {...additive} opacity={0.34} toneMapped={false} />
      </mesh>
      <mesh position={[DOOR.x, 1.2, DOOR.z - 0.08]} rotation={[0, Math.PI, 0]} renderOrder={2}>
        <planeGeometry args={[1.0, 2.3]} />
        <meshBasicMaterial map={arch} {...additive} toneMapped={false} />
      </mesh>
      <mesh
        geometry={beam}
        position={[DOOR.x, 1.3, DOOR.z - BEAM_LENGTH / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} {...additive} />
      </mesh>
      <pointLight position={[DOOR.x, 1.8, DOOR.z - 1.5]} color="#d6ecc4" intensity={7} distance={16} decay={1.4} />
    </group>
  );
}
