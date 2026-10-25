import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeScore, insertScore, LEADERBOARD_SIZE, ScoreEntry } from '../src/systems/scoring';
import { BALANCE } from '../src/data/balance';
import { emptyLeaderboard, sanitizeLeaderboard } from '../src/core/Persistence';
import { summariseRun } from '../src/core/runSummary';
import { resolveRules } from '../src/data/difficulty';

const entry = (score: number, extra: Partial<ScoreEntry> = {}): ScoreEntry => ({
  score,
  kills: 1,
  accuracy: 50,
  survivedSeconds: 100,
  difficulty: 'marine',
  date: '2026-10-25T00:00:00.000Z',
  victory: false,
  ...extra
});

describe('computeScore', () => {
  it('weights kills, accuracy and survival time from the balance table', () => {
    const w = BALANCE.SCORE;
    const score = computeScore({
      droneKills: 4,
      smallKills: 3,
      bossKills: 1,
      accuracyPercent: 60,
      survivedSeconds: 120
    });
    expect(score).toBe(
      4 * w.DRONE_KILL + 3 * w.SMALL_KILL + 1 * w.BOSS_KILL + 60 * w.ACCURACY_PER_PERCENT + 120 * w.SURVIVAL_PER_SECOND
    );
  });

  it('clamps accuracy and survival time to their valid ranges', () => {
    const base = { droneKills: 0, smallKills: 0, bossKills: 0 };
    expect(computeScore({ ...base, accuracyPercent: 250, survivedSeconds: 0 })).toBe(
      100 * BALANCE.SCORE.ACCURACY_PER_PERCENT
    );
    expect(computeScore({ ...base, accuracyPercent: -5, survivedSeconds: 9999 })).toBe(
      BALANCE.MISSION_DURATION_SECONDS * BALANCE.SCORE.SURVIVAL_PER_SECOND
    );
  });

  it('rewards a longer, deadlier run with a higher score', () => {
    const a = computeScore({ droneKills: 5, smallKills: 2, bossKills: 0, accuracyPercent: 40, survivedSeconds: 90 });
    const b = computeScore({ droneKills: 12, smallKills: 6, bossKills: 1, accuracyPercent: 55, survivedSeconds: 300 });
    expect(b).toBeGreaterThan(a);
  });
});

describe('insertScore', () => {
  it('keeps the board sorted and reports a 1-based rank without mutating the input', () => {
    const board = [entry(300), entry(200), entry(100)];
    const r = insertScore(board, entry(250));
    expect(r.board.map((e) => e.score)).toEqual([300, 250, 200, 100]);
    expect(r.rank).toBe(2);
    expect(board).toHaveLength(3);
  });

  it('ranks ties below earlier runs', () => {
    const early = entry(200, { date: 'early' });
    const r = insertScore([early], entry(200, { date: 'late' }));
    expect(r.board[0].date).toBe('early');
    expect(r.rank).toBe(2);
  });

  it('caps the board and returns -1 when the run does not place', () => {
    let board: ScoreEntry[] = [];
    for (let i = 0; i < LEADERBOARD_SIZE; i++) board = insertScore(board, entry(1000 - i)).board;
    expect(board).toHaveLength(LEADERBOARD_SIZE);
    const miss = insertScore(board, entry(1));
    expect(miss.rank).toBe(-1);
    expect(miss.board).toHaveLength(LEADERBOARD_SIZE);
    const top = insertScore(board, entry(5000));
    expect(top.rank).toBe(1);
    expect(top.board[LEADERBOARD_SIZE - 1].score).toBe(1000 - (LEADERBOARD_SIZE - 2));
  });

  it('places the first ever run at rank 1', () => {
    expect(insertScore([], entry(10)).rank).toBe(1);
  });
});

describe('leaderboard persistence', () => {
  it('sanitises stored data: sorts, caps, drops bad entries and ignores unknown difficulties', () => {
    const raw = {
      marine: [entry(10), entry(300), { score: 'x' }, null, entry(200)],
      recruit: 'nonsense',
      nightmare: [entry(999)]
    };
    const board = sanitizeLeaderboard(raw);
    expect(board.marine.map((e) => e.score)).toEqual([300, 200, 10]);
    expect(board.recruit).toEqual([]);
    expect(board.ultimate_badass).toEqual([]);
    expect(Object.keys(board).sort()).toEqual(['marine', 'recruit', 'ultimate_badass']);
    expect(sanitizeLeaderboard(null)).toEqual(emptyLeaderboard());
    const many = { marine: Array.from({ length: 30 }, (_, i) => entry(i)) };
    expect(sanitizeLeaderboard(many).marine).toHaveLength(LEADERBOARD_SIZE);
  });
});

describe('summariseRun', () => {
  const run = (over = {}) => ({
    killsByKind: { drone: 5, small: 2, boss: 1 },
    kills: 8,
    shotsFired: 200,
    shotsHit: 100,
    timeRemaining: 120,
    rules: resolveRules('marine'),
    leaderboard: emptyLeaderboard(),
    recordKills: 0,
    ...over
  });

  beforeEach(() => vi.useFakeTimers());

  it('builds a defeat entry from the time survived and places it on the right board', () => {
    const { lastRun, leaderboard } = summariseRun(run(), false, new Date('2026-10-25T10:00:00Z'));
    expect(lastRun.rank).toBe(1);
    expect(lastRun.entry.accuracy).toBe(50);
    expect(lastRun.entry.survivedSeconds).toBe(180);
    expect(lastRun.entry.victory).toBe(false);
    expect(lastRun.entry.date).toBe('2026-10-25T10:00:00.000Z');
    expect(leaderboard.marine).toHaveLength(1);
    expect(leaderboard.recruit).toHaveLength(0);
  });

  it('a victory counts the full mission and scores higher than the same run defeated', () => {
    const defeat = summariseRun(run(), false).lastRun.entry.score;
    const win = summariseRun(run(), true).lastRun;
    expect(win.entry.survivedSeconds).toBe(BALANCE.MISSION_DURATION_SECONDS);
    expect(win.entry.victory).toBe(true);
    expect(win.entry.score).toBeGreaterThan(defeat);
  });

  it('uses 0% accuracy when no shots were fired and files the run under its own difficulty', () => {
    const { lastRun, leaderboard } = summariseRun(
      run({ shotsFired: 0, shotsHit: 0, rules: resolveRules('ultimate_badass') }),
      true
    );
    expect(lastRun.entry.accuracy).toBe(0);
    expect(lastRun.entry.difficulty).toBe('ultimate_badass');
    expect(leaderboard.ultimate_badass).toHaveLength(1);
    expect(leaderboard.marine).toHaveLength(0);
  });
});
