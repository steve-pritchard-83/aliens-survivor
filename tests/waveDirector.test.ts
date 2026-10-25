import { describe, it, expect } from 'vitest';
import { shouldSpawnBoss } from '../src/systems/waveDirector';

describe('shouldSpawnBoss', () => {
  it('never spawns in phases 1 and 2', () => {
    expect(shouldSpawnBoss(1, new Set(), false)).toBe(false);
    expect(shouldSpawnBoss(2, new Set(), false)).toBe(false);
  });
  it('spawns once in phase 3 and once in phase 4', () => {
    const spawned = new Set<number>();
    expect(shouldSpawnBoss(3, spawned, false)).toBe(true);
    spawned.add(3);
    expect(shouldSpawnBoss(3, spawned, false)).toBe(false);
    expect(shouldSpawnBoss(4, spawned, false)).toBe(true);
    spawned.add(4);
    expect(shouldSpawnBoss(4, spawned, false)).toBe(false);
  });
  it('does not spawn while a boss is alive', () => {
    expect(shouldSpawnBoss(3, new Set(), true)).toBe(false);
  });
});
