import { PooledXenomorph } from '../XenoTypes';
import type { XenoPose } from './xenoAI';

export const XENO_DEATH_SECONDS = 2.8;

/** Death animation: kneel, topple by variant, then melt into the deck. Returns true when finished. */
export function stepXenoDeath(x: PooledXenomorph, dt: number, pose: XenoPose): boolean {
  x.stateTimer -= dt;
  const meltProg = 1.0 - Math.max(0, x.stateTimer / XENO_DEATH_SECONDS),
    c = Math.min(1, meltProg * 2.6),
    v = x.deathVariant;
  const dieT = XENO_DEATH_SECONDS - x.stateTimer;
  const kneelOff =
    dieT <= 0.75 ? 0.226 + (dieT / 0.75) * 0.244 : dieT <= 1.5 ? 0.47 - ((dieT - 0.75) / 0.75) * 0.27 : 0.213;
  x.clonedMeshGroup.position.set(v === 1 ? -0.09 : 0.09, -0.24 - kneelOff, 0);
  pose.pitch = v === 2 ? c * 0.42 : v === 3 ? c * -0.35 : 0;
  pose.roll = v === 3 ? c * 0.48 : v === 1 ? c * -0.32 : 0;
  if (meltProg > 0.32) {
    const k = (meltProg - 0.32) / 0.68;
    x.y = -k * 0.42;
    x.root.scale.set(1 + k * 0.18, Math.max(0.04, 1 - k * 0.92), 1 + k * 0.18);
  }
  if (x.stateTimer > 0) return false;
  x.active = false;
  x.root.visible = false;
  x.root.scale.set(1, 1, 1);
  return true;
}
