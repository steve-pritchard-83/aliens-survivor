import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { quality } from '../core/QualityState';

const COUNT = 54;
/** Mist exists in a disc around the player; puffs that drift out of it are recycled on the far side. */
const RADIUS = 13;
const FADE_NEAR_START = 1.4;
const FADE_NEAR_END = 4.2;
const BASE_ALPHA = 0.085;
const PUFFS_BY_TIER = [18, 36, COUNT] as const;

function makePuffTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    // A soft core plus a few fainter offset blobs, so each puff reads as a ragged wisp and not a round dot
    for (let i = 0; i < 6; i++) {
      const x = 64 + (i === 0 ? 0 : (Math.random() - 0.5) * 50),
        y = 64 + (i === 0 ? 0 : (Math.random() - 0.5) * 50);
      const g = ctx.createRadialGradient(x, y, 0, x, y, i === 0 ? 62 : 34);
      g.addColorStop(0, `rgba(255, 255, 255, ${i === 0 ? 0.9 : 0.35})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
  }
  return new THREE.CanvasTexture(c);
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Drifting teal mist around the player: one Points draw call with per-puff alpha. Puffs fade out close to the
 * camera (no big fill-rate cost or popping) and recycle at the edge of the disc, so the haze is always around you.
 */
export function MistFX() {
  const { geometry, drift, seed, texture } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3),
      col = new Float32Array(COUNT * 4),
      dr = new Float32Array(COUNT * 2),
      sd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random()) * RADIUS;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = i % 3 === 0 ? 0.2 + Math.random() * 0.5 : 0.5 + Math.random() * 1.8;
      pos[i * 3 + 2] = Math.sin(a) * r;
      dr[i * 2] = (Math.random() - 0.5) * 0.5;
      dr[i * 2 + 1] = (Math.random() - 0.5) * 0.5;
      sd[i] = Math.random() * 100;
      col.set([0.62, 0.8, 0.84, 0], i * 4);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    return { geometry: geo, drift: dr, seed: sd, texture: makePuffTexture() };
  }, []);

  useFrame(({ clock }, dt) => {
    const state = useGameStore.getState();
    if (isSimulationFrozen(state.status)) return;
    const [px, , pz] = state.playerPos;
    const t = clock.getElapsedTime();
    const pos = geometry.attributes.position as THREE.BufferAttribute,
      col = geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      let x = pos.getX(i) + (drift[i * 2] + Math.sin(t * 0.21 + seed[i]) * 0.12) * dt,
        z = pos.getZ(i) + (drift[i * 2 + 1] + Math.cos(t * 0.17 + seed[i]) * 0.12) * dt;
      let dx = x - px,
        dz = z - pz,
        d = Math.hypot(dx, dz);
      if (d > RADIUS) {
        // Recycle on the opposite side of the disc, slightly inside it
        x = px - (dx / d) * RADIUS * 0.92;
        z = pz - (dz / d) * RADIUS * 0.92;
        dx = x - px;
        dz = z - pz;
        d = Math.hypot(dx, dz);
      }
      pos.setXYZ(i, x, pos.getY(i), z);
      const alpha = BASE_ALPHA * smooth(FADE_NEAR_START, FADE_NEAR_END, d) * (1 - smooth(RADIUS * 0.7, RADIUS, d));
      col.setW(i, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.setDrawRange(0, PUFFS_BY_TIER[quality.tier] ?? COUNT);
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={2}>
      <pointsMaterial
        map={texture}
        vertexColors
        transparent
        size={4.2}
        sizeAttenuation
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}
