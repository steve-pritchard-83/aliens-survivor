import { BALANCE } from '../data/balance';
import { computeScore, insertScore, ScoreEntry } from '../systems/scoring';
import { commitRecord, saveLeaderboard, Leaderboard } from './Persistence';
import type { GameState, RunSummary } from './GameTypes';

type RunInputs = Pick<
  GameState,
  'killsByKind' | 'kills' | 'shotsFired' | 'shotsHit' | 'timeRemaining' | 'rules' | 'leaderboard' | 'recordKills'
>;

/** Pure: builds the score entry for a finished run and places it on the leaderboard for its difficulty. */
export function summariseRun(
  s: RunInputs,
  victory: boolean,
  now: Date = new Date()
): { lastRun: RunSummary; leaderboard: Leaderboard } {
  const accuracy = s.shotsFired > 0 ? Math.round((s.shotsHit / s.shotsFired) * 100) : 0;
  const survivedSeconds = victory
    ? BALANCE.MISSION_DURATION_SECONDS
    : BALANCE.MISSION_DURATION_SECONDS - s.timeRemaining;
  const entry: ScoreEntry = {
    score: computeScore({
      droneKills: s.killsByKind.drone,
      smallKills: s.killsByKind.small,
      bossKills: s.killsByKind.boss,
      accuracyPercent: accuracy,
      survivedSeconds
    }),
    kills: s.kills,
    accuracy,
    survivedSeconds: Math.round(survivedSeconds),
    difficulty: s.rules.difficulty,
    date: now.toISOString(),
    victory
  };
  const placed = insertScore(s.leaderboard[s.rules.difficulty], entry);
  return {
    lastRun: { entry, rank: placed.rank },
    leaderboard: { ...s.leaderboard, [s.rules.difficulty]: placed.board }
  };
}

/** State patch for the end of a run: saves the kills record and leaderboard, and records the run summary. */
export function endRunPatch(
  s: RunInputs,
  victory: boolean
): Pick<GameState, 'recordKills' | 'lastRun' | 'leaderboard'> {
  const { lastRun, leaderboard } = summariseRun(s, victory);
  saveLeaderboard(leaderboard);
  return { recordKills: commitRecord(s.kills, s.recordKills), lastRun, leaderboard };
}
