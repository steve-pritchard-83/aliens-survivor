import type { VignetteLevel } from '../core/GameTypes';

export const MAX_SMOOTH_TURN_RATE = 2.2;
const MOVE_WEIGHT = 0.6;
const FADE_IN_RATE = 8;
const FADE_OUT_RATE = 3;

const LEVEL_FACTOR: Record<VignetteLevel, number> = { off: 0, low: 0.6, high: 1.0 };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Target vignette strength 0..1: grows with smooth turning and with locomotion, snaps to full for a
 * brief pulse after a snap turn, and is scaled by the player's comfort level.
 */
export function vignetteTarget(turnRate: number, move: number, snapPulse: number, level: VignetteLevel): number {
  const base = Math.max(clamp01(Math.abs(turnRate) / MAX_SMOOTH_TURN_RATE), clamp01(move * MOVE_WEIGHT));
  return Math.max(base, snapPulse > 0 ? 1 : 0) * LEVEL_FACTOR[level];
}

/** Eases toward the target: quickly in, slowly out, so the view clears gently once the motion stops. */
export function smoothStrength(current: number, target: number, dt: number): number {
  const rate = target > current ? FADE_IN_RATE : FADE_OUT_RATE;
  return current + (target - current) * Math.min(1, dt * rate);
}
