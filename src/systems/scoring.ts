import { BALANCE } from '../data/balance';
import type { DifficultyId } from '../data/difficulty';

export interface RunStats {
  droneKills: number;
  smallKills: number;
  bossKills: number;
  accuracyPercent: number;
  survivedSeconds: number;
}

export interface ScoreEntry {
  score: number;
  kills: number;
  accuracy: number;
  survivedSeconds: number;
  difficulty: DifficultyId;
  /** ISO timestamp of the run. */
  date: string;
  victory: boolean;
}

export const LEADERBOARD_SIZE = 10;

/** Kill points + accuracy bonus + survival time. All weights come from BALANCE.SCORE. */
export function computeScore(stats: RunStats): number {
  const w = BALANCE.SCORE;
  const accuracy = Math.max(0, Math.min(100, stats.accuracyPercent));
  const seconds = Math.max(0, Math.min(BALANCE.MISSION_DURATION_SECONDS, stats.survivedSeconds));
  return Math.round(
    stats.droneKills * w.DRONE_KILL +
      stats.smallKills * w.SMALL_KILL +
      stats.bossKills * w.BOSS_KILL +
      accuracy * w.ACCURACY_PER_PERCENT +
      seconds * w.SURVIVAL_PER_SECOND
  );
}

/**
 * Inserts an entry into a leaderboard sorted by score, keeping the best `limit` entries.
 * Ties rank below earlier runs. Returns the new board (the input is not modified) and the 1-based rank,
 * or -1 when the entry did not make the board.
 */
export function insertScore(
  board: readonly ScoreEntry[],
  entry: ScoreEntry,
  limit = LEADERBOARD_SIZE
): { board: ScoreEntry[]; rank: number } {
  let index = board.findIndex((e) => e.score < entry.score);
  if (index < 0) index = board.length;
  const next = [...board.slice(0, index), entry, ...board.slice(index)].slice(0, limit);
  return { board: next, rank: index < limit ? index + 1 : -1 };
}
