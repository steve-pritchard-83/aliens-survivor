import type { WavePhase } from '../core/GameTypes';
import { BALANCE } from '../data/balance';
import { isSpawnVisibleToPlayer } from '../core/CorridorNav';
import { getActiveLevel } from '../levels';

/** First phase in which a Alien Queen boss may appear. */
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

// Reused index buffer; grown only if a level defines more spawn nodes than any before it
let _hidden = new Int16Array(32);

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
  const nodes = getActiveLevel().spawnNodes;
  if (_hidden.length < nodes.length) _hidden = new Int16Array(nodes.length);
  let count = 0;
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i].position;
    if (!isSpawnVisibleToPlayer(p[0], p[2], px, pz, pyaw)) _hidden[count++] = i;
  }
  const useHidden = count > 0;
  const n = useHidden ? count : fallback.length;
  const pickedAt = Math.floor(random() * n);
  let idx = useHidden ? _hidden[pickedAt] : fallback[pickedAt];
  if (idx === lastIndex && n > 1) {
    const next = (pickedAt + 1) % n;
    idx = useHidden ? _hidden[next] : fallback[next];
  }
  return idx;
}
