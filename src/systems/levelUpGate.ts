// A level-up must not freeze the game in the middle of a fight. When the XP line is crossed under pressure the
// level-up is held back, and the card screen opens at the next lull. Pure logic, no React or three.js.

/** A hostile closer than this (metres) counts as combat. */
export const CALM_RADIUS = 14;
/** The area must stay clear this long (seconds) before the cards open. */
export const CALM_SECONDS = 1.5;
/** Safety valve: a held-back level-up opens after this long even if the fight never lets up (seconds). */
export const MAX_WAIT_SECONDS = 60;

interface Hostile {
  x: number;
  z: number;
  state: string;
}

/** True when no live hostile is within CALM_RADIUS of the player. */
export function isCalm(threats: readonly Hostile[], small: Hostile | null, px: number, pz: number): boolean {
  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    if (t.state !== 'DEAD' && Math.hypot(t.x - px, t.z - pz) < CALM_RADIUS) return false;
  }
  return !(small && small.state !== 'DEAD' && Math.hypot(small.x - px, small.z - pz) < CALM_RADIUS);
}

export interface LevelUpGate {
  calm: number;
  waiting: number;
}

/** One frame: returns true when a held-back level-up should open now. */
export function stepLevelUpGate(gate: LevelUpGate, pending: boolean, calmNow: boolean, dt: number): boolean {
  if (!pending) {
    gate.calm = 0;
    gate.waiting = 0;
    return false;
  }
  gate.waiting += dt;
  gate.calm = calmNow ? gate.calm + dt : 0;
  if (gate.calm < CALM_SECONDS && gate.waiting < MAX_WAIT_SECONDS) return false;
  gate.calm = 0;
  gate.waiting = 0;
  return true;
}
