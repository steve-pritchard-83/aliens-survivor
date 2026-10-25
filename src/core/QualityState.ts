/**
 * Runtime quality tier, adjusted by AdaptiveQuality from measured frame rate.
 * 2 = full effects, 1 = reduced sparks, 0 = minimum (no decals/bursts, fewer droplets, eggs hidden).
 * Consumers read `quality.tier` inside their frame loops; nothing is mounted or unmounted.
 */
export const MAX_TIER = 2;

export const quality = { tier: MAX_TIER };

const listeners = new Set<(tier: number) => void>();

export function setTier(tier: number): void {
  const next = Math.max(0, Math.min(MAX_TIER, Math.round(tier)));
  if (next === quality.tier) return;
  quality.tier = next;
  listeners.forEach((fn) => fn(next));
}

export function onTierChange(fn: (tier: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Pure step used by AdaptiveQuality: returns the new tier and updated streak counters. */
export interface TierStepResult {
  tier: number;
  lowStreak: number;
  highStreak: number;
}

export const LOW_FPS = 66;
export const HIGH_FPS = 71.5;
export const DROP_AFTER = 2;
export const RAISE_AFTER = 5;

export function stepTier(tier: number, lowStreak: number, highStreak: number, fps: number): TierStepResult {
  if (fps < LOW_FPS) {
    lowStreak++;
    highStreak = 0;
  } else if (fps >= HIGH_FPS) {
    highStreak++;
    lowStreak = 0;
  } else {
    lowStreak = 0;
    highStreak = 0;
  }
  if (lowStreak >= DROP_AFTER && tier > 0) {
    return { tier: tier - 1, lowStreak: 0, highStreak: 0 };
  }
  if (highStreak >= RAISE_AFTER && tier < MAX_TIER) {
    return { tier: tier + 1, lowStreak: 0, highStreak: 0 };
  }
  return { tier, lowStreak, highStreak };
}
