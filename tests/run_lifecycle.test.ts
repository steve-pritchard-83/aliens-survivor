import { describe, it, expect } from 'vitest';
import { useGameStore, isSimulationFrozen } from '../src/core/GameStore';
import type { GameStatus } from '../src/core/GameTypes';

describe('Run lifecycle', () => {
  it('increments runId on every startGame', () => {
    const before = useGameStore.getState().runId;
    useGameStore.getState().startGame();
    expect(useGameStore.getState().runId).toBe(before + 1);
    useGameStore.getState().startGame();
    expect(useGameStore.getState().runId).toBe(before + 2);
  });

  it('keeps runId stable across pause, resume and level-up', () => {
    useGameStore.getState().startGame();
    const id = useGameStore.getState().runId;
    useGameStore.getState().pauseGame();
    useGameStore.getState().resumeGame();
    useGameStore.getState().registerKill(false);
    useGameStore.getState().registerKill(false);
    expect(useGameStore.getState().status).toBe('LEVEL_UP');
    useGameStore.getState().chooseUpgrade(useGameStore.getState().offeredUpgrades[0].id);
    expect(useGameStore.getState().runId).toBe(id);
  });
});

describe('isSimulationFrozen', () => {
  const table: [GameStatus, boolean][] = [
    ['MENU', false],
    ['PLAYING', false],
    ['PAUSED', true],
    ['LEVEL_UP', true],
    ['VICTORY', false],
    ['DEFEAT', false]
  ];
  it.each(table)('%s -> %s', (status, expected) => {
    expect(isSimulationFrozen(status)).toBe(expected);
  });
});
