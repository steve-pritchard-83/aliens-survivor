import type { WavePhase } from '../core/GameTypes';

/** First phase in which a Praetorian boss may appear. */
export const BOSS_FIRST_PHASE = 3;

/** A boss spawns at most once per phase (phases 3 and 4), and never while another boss is alive. */
export function shouldSpawnBoss(phase: WavePhase, spawnedPhases: ReadonlySet<number>, bossAlive: boolean): boolean {
  return phase >= BOSS_FIRST_PHASE && !spawnedPhases.has(phase) && !bossAlive;
}
