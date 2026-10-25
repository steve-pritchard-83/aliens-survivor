import { describe, it, expect, beforeEach, vi } from 'vitest';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k)
  };
}

describe('store: scoring a finished run', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', memoryStorage());
  });

  async function load() {
    const { useGameStore } = await import('../src/core/GameStore');
    const { loadLeaderboard } = await import('../src/core/Persistence');
    return { s: () => useGameStore.getState(), set: useGameStore.setState, loadLeaderboard };
  }

  it('counts kills by kind', async () => {
    const { s } = await load();
    s().startGame();
    s().registerKill('drone');
    s().registerKill('small');
    s().registerKill('small');
    expect(s().killsByKind).toEqual({ drone: 1, small: 2, boss: 0 });
    s().startGame();
    expect(s().killsByKind).toEqual({ drone: 0, small: 0, boss: 0 });
  });

  it('defeat records a scored, ranked run and saves the board', async () => {
    const { s, loadLeaderboard } = await load();
    s().startGame();
    s().registerKill('drone');
    s().takeDamage(1000, 1);
    expect(s().status).toBe('DEFEAT');
    const run = s().lastRun!;
    expect(run.rank).toBe(1);
    expect(run.entry.victory).toBe(false);
    expect(run.entry.score).toBeGreaterThan(0);
    expect(s().leaderboard.marine).toHaveLength(1);
    expect(loadLeaderboard().marine[0].score).toBe(run.entry.score);
  });

  it('victory records a winning run that outscores an immediate defeat', async () => {
    const { s, set } = await load();
    s().startGame();
    s().takeDamage(1000, 1);
    const defeatScore = s().lastRun!.entry.score;
    s().startGame();
    expect(s().lastRun).toBeNull();
    set({ timeRemaining: 0.05 });
    s().tick(0.1, 5);
    expect(s().status).toBe('VICTORY');
    expect(s().lastRun!.entry.victory).toBe(true);
    expect(s().lastRun!.entry.score).toBeGreaterThan(defeatScore);
    expect(s().lastRun!.rank).toBe(1);
    expect(s().leaderboard.marine).toHaveLength(2);
  });

  it('keeps a separate board per difficulty and keeps the board across new runs', async () => {
    const { s } = await load();
    s().updateSettings({ difficulty: 'recruit' });
    s().startGame();
    s().takeDamage(1000, 1);
    s().updateSettings({ difficulty: 'ultimate_badass' });
    s().startGame();
    s().takeDamage(1000, 1);
    expect(s().leaderboard.recruit).toHaveLength(1);
    expect(s().leaderboard.ultimate_badass).toHaveLength(1);
    expect(s().leaderboard.marine).toHaveLength(0);
    s().startGame();
    expect(s().leaderboard.recruit).toHaveLength(1);
  });

  it('a run that dies a second time in the same state is not scored twice', async () => {
    const { s } = await load();
    s().startGame();
    s().takeDamage(1000, 1);
    s().takeDamage(1000, 2);
    expect(s().leaderboard.marine).toHaveLength(1);
  });
});
