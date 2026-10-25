import type { WavePhase } from '../core/GameTypes';
import { BALANCE } from '../data/balance';
import { CORRIDOR_SPAWN_NODES, isSpawnVisibleToPlayer } from '../core/CorridorNav';

/** First phase in which a Praetorian boss may appear. */
export const BOSS_FIRST_PHASE = 3;

/** A boss spawns at most once per phase (phases 3 and 4), and never while another boss is alive. */
export function shouldSpawnBoss(phase: WavePhase, spawnedPhases: ReadonlySet<number>, bossAlive: boolean): boolean {
  return phase >= BOSS_FIRST_PHASE && !spawnedPhases.has(phase) && !bossAlive;
}

export function spawnInterval(phase: WavePhase): number {
  return BALANCE.XENO_POOL.SPAWN_INTERVALS[phase - 1];
}

/** Spawn interval after the difficulty multiplier. */
export function scaledSpawnInterval(phase: WavePhase, rules: { spawnIntervalMult: number }): number {
  return spawnInterval(phase) * rules.spawnIntervalMult;
}

/** Hit points after the difficulty multiplier (rounded so health stays a whole number). */
export function scaledHp(baseHp: number, rules: { enemyHpMult: number }): number {
  return Math.round(baseHp * rules.enemyHpMult);
}

export function droneBaseSpeed(phase: WavePhase): number {
  return BALANCE.XENO_POOL.BASE_SPEEDS[phase - 1];
}

export function droneMaxHp(phase: WavePhase): number {
  return BALANCE.XENO_POOL.MAX_HPS[phase - 1];
}

const _hidden = new Int16Array(CORRIDOR_SPAWN_NODES.length);

/**
 * Picks a spawn node out of the player's sight (never repeating `lastIndex` when avoidable).
 * Falls back to one of `fallback` when every node is visible. Allocation-free.
 * `random` is injectable for tests.
 */
export function pickSpawnNode(
  px: number,
  pz: number,
  pyaw: number,
  lastIndex: number,
  fallback: readonly number[],
  random: () => number = Math.random
): number {
  let count = 0;
  for (let i = 0; i < CORRIDOR_SPAWN_NODES.length; i++) {
    const p = CORRIDOR_SPAWN_NODES[i].position;
    if (!isSpawnVisibleToPlayer(p[0], p[2], px, pz, pyaw)) _hidden[count++] = i;
  }
  const useHidden = count > 0;
  const n = useHidden ? count : fallback.length;
  const at = (k: number) => (useHidden ? _hidden[k] : fallback[k]);
  const pickedAt = Math.floor(random() * n);
  let idx = at(pickedAt);
  if (idx === lastIndex && n > 1) idx = at((pickedAt + 1) % n);
  return idx;
}
