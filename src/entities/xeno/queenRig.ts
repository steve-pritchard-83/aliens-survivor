import * as THREE from 'three';
import { BALANCE } from '../../data/balance';
import { restoreMelt } from '../fx/meltTint';
import type { PooledXenomorph } from '../XenoTypes';
import { XENO_DEATH_SECONDS } from './xenoDeath';

// alien_queen.glb is a single static mesh (no skeleton, no clips), posed on the floor facing +Z with its origin
// between the feet and about 14 model units of sideways offset. It is shown as authored (no recolouring); all
// "animation" is whole-body motion computed from the AI state by queenPose().
const MODEL_CENTER_X = 14;
/** Stride phase (radians) gained per metre per second of walking speed. */
const STRIDE_PER_SPEED = 2.1;
const SPAWN_SECONDS = 0.7;

export interface QueenRig {
  /** Moved onto whichever pooled slot is the boss; the slot's drone clone is hidden meanwhile. */
  pivot: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  owner: PooledXenomorph | null;
  time: number;
  stride: number;
}

export interface QueenPose {
  y: number;
  z: number;
  pitch: number;
  roll: number;
  yaw: number;
  scaleY: number;
}

const _pose: QueenPose = { y: 0, z: 0, pitch: 0, roll: 0, yaw: 0, scaleY: 1 };
const smooth = (u: number): number => u * u * (3 - 2 * u);
const clamp01 = (u: number): number => Math.min(1, Math.max(0, u));

/** Builds the shared Queen: own materials (so the melt tint never touches the cached model), hidden until a boss spawns. */
export function buildQueenRig(scene: THREE.Group): QueenRig {
  const model = scene.clone(true);
  const materials: THREE.MeshStandardMaterial[] = [];
  model.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const mesh = o as THREE.Mesh;
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    // Exported as alpha-blended although the skin is opaque; blending would sort the body against itself
    mat.transparent = false;
    mat.depthWrite = true;
    // The authored skin is near black and vanishes in the dim, fogged corridor; same lift the drones get
    mat.color.setRGB(1.45, 1.52, 1.6);
    mesh.material = mat;
    materials.push(mat);
  });
  model.scale.setScalar(BALANCE.QUEEN.SCALE);
  model.position.x = -MODEL_CENTER_X * BALANCE.QUEEN.SCALE;
  const pivot = new THREE.Group();
  pivot.visible = false;
  pivot.add(model);
  return { pivot, materials, owner: null, time: 0, stride: 0 };
}

/** Whole-body pose for an AI state. `k` is state progress: 0..1 for spawn and attack, seconds since death for DEAD. */
export function queenPose(state: PooledXenomorph['state'], t: number, stride: number, k: number, out: QueenPose): void {
  const breath = Math.sin(t * 1.7);
  out.y = 0;
  out.z = 0;
  out.roll = 0;
  out.yaw = 0;
  out.pitch = 0.015 * breath;
  out.scaleY = 1 + 0.012 * breath;
  if (state === 'SPAWNING') {
    out.pitch -= 0.35 * (1 - smooth(clamp01(k)));
  } else if (state === 'PURSUING') {
    // Heavy stomp: bob twice per stride, sway side to side, lean in, and let the long tail swing
    const s = Math.sin(stride);
    out.y = Math.abs(s) * 0.07;
    out.roll = s * 0.07;
    out.pitch += 0.06 + Math.sin(stride * 2) * 0.02;
    out.yaw = Math.sin(stride * 0.5) * 0.06;
  } else if (state === 'ATTACKING') {
    // Rear back while the slash winds up (k runs 0..1 to the strike), then snap forward
    const strike = Math.max(0, 1 - k * 6);
    out.pitch += -0.22 * smooth(clamp01(k)) + 0.5 * strike;
    out.z = 0.35 * strike;
  } else if (state === 'LEAPING') {
    out.scaleY = 1.04;
  } else {
    // DEAD: thrash in agony, rear up, then slump forward (the pool's topple and melt are applied on top)
    const thrash = Math.max(0, 1 - k / 0.9);
    out.roll = Math.sin(k * 38) * 0.09 * thrash;
    out.yaw = Math.sin(k * 23) * 0.07 * thrash;
    out.pitch = k < 0.35 ? -0.3 * smooth(k / 0.35) : -0.3 + 0.85 * smooth(clamp01((k - 0.35) / 1.3));
    out.scaleY = 1;
  }
}

function progressOf(x: PooledXenomorph): number {
  if (x.state === 'SPAWNING') return 1 - x.stateTimer / SPAWN_SECONDS;
  if (x.state === 'ATTACKING') return 1 - x.attackCooldown / BALANCE.XENO_POOL.SLASH_INTERVAL;
  if (x.state === 'DEAD') return XENO_DEATH_SECONDS - x.stateTimer;
  return 0;
}

/** Advances and applies the Queen's pose for the boss slot `x`. Allocation-free. */
export function animateQueen(rig: QueenRig, x: PooledXenomorph, dt: number): void {
  rig.time += dt;
  if (x.state === 'PURSUING') rig.stride += dt * x.speed * STRIDE_PER_SPEED;
  queenPose(x.state, rig.time, rig.stride, progressOf(x), _pose);
  rig.pivot.position.set(0, _pose.y, _pose.z);
  rig.pivot.rotation.set(_pose.pitch, _pose.yaw, _pose.roll, 'YXZ');
  rig.pivot.scale.set(1, _pose.scaleY, 1);
}

/** Shows the Queen on slot `x` instead of its drone clone. */
export function showQueen(rig: QueenRig, x: PooledXenomorph): void {
  x.root.add(rig.pivot);
  rig.pivot.visible = true;
  rig.pivot.position.set(0, 0, 0);
  rig.pivot.rotation.set(0, 0, 0);
  rig.pivot.scale.set(1, 1, 1);
  rig.owner = x;
  rig.time = 0;
  rig.stride = 0;
  x.clonedMeshGroup.visible = false;
  x.skin = rig.materials;
  restoreMelt(rig.materials);
}

/** Puts the drone clone back on slot `x` (and hides the Queen if she was on it). */
export function showDrone(rig: QueenRig | null | undefined, x: PooledXenomorph): void {
  if (rig && rig.owner === x) {
    rig.pivot.visible = false;
    rig.owner = null;
  }
  x.clonedMeshGroup.visible = true;
  x.skin = x.materials;
}
