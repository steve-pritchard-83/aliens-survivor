import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../src/core/AudioManager';
import {
  PLAYER_STEP,
  DRONE_STEP,
  BOSS_STEP,
  pickStepSound,
  playPlayerStep,
  playEnemyStep
} from '../src/core/footsteps';
import { stepXenoFootsteps } from '../src/entities/xeno/xenoSteps';

let play2D: ReturnType<typeof vi.spyOn>;
let play3D: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  play2D = vi.spyOn(AudioManager, 'play2D').mockImplementation(() => undefined);
  play3D = vi.spyOn(AudioManager, 'play3D').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('footstep playback', () => {
  it('never repeats the same step sound twice in a row', () => {
    let prev = pickStepSound();
    for (let i = 0; i < 500; i++) {
      const next = pickStepSound();
      expect(next).not.toBe(prev);
      expect(next).toMatch(/^step_metal[1-4]$/);
      prev = next;
    }
  });

  it('plays the player step flat, at the player volume and within the pitch spread', () => {
    playPlayerStep();
    expect(play2D).toHaveBeenCalledTimes(1);
    const [key, volume, rate] = play2D.mock.calls[0] as [string, number, number];
    expect(key).toMatch(/^step_metal/);
    expect(volume).toBe(PLAYER_STEP.volume);
    expect(Math.abs(rate - PLAYER_STEP.rate)).toBeLessThanOrEqual(PLAYER_STEP.rateJitter);
  });

  it('plays an enemy step where it stands, deeper for the boss', () => {
    playEnemyStep(BOSS_STEP, 3, 0.1, 7);
    const [, x, y, z, volume, rate] = play3D.mock.calls[0] as [string, number, number, number, number, number];
    expect([x, y, z]).toEqual([3, 0.1, 7]);
    expect(volume).toBe(BOSS_STEP.volume);
    expect(rate).toBeLessThan(DRONE_STEP.rate);
  });
});

describe('enemy footsteps follow walking, not time', () => {
  const walker = (x: number, state = 'PURSUING', isBoss = false) => ({ x, z: 0, state, isBoss });

  /** Walks an enemy along x in 0.5 m increments and returns how many steps sounded. */
  function walk(
    slot: number,
    metres: number,
    opts: { state?: string; isBoss?: number; playerX?: number } = {}
  ): number {
    play3D.mockClear();
    const boss = Boolean(opts.isBoss);
    for (let x = 0; x <= metres + 1e-9; x += 0.5)
      stepXenoFootsteps(slot, walker(x, opts.state, boss), opts.playerX ?? 0, 0);
    return play3D.mock.calls.length;
  }

  it('steps once per drone stride walked', () => {
    expect(walk(0, 3.5)).toBe(2); // 1.7 m and 3.4 m
  });

  it('gives the boss a longer stride and its own volume', () => {
    expect(walk(1, 2.5, { isBoss: 1 })).toBe(0); // under 2.6 m
    play3D.mockClear();
    expect(walk(2, 5.5, { isBoss: 1 })).toBe(2);
    expect((play3D.mock.calls[0] as unknown[])[4]).toBe(BOSS_STEP.volume);
  });

  it('is silent when out of hearing range, and when not pursuing', () => {
    expect(walk(3, 6, { playerX: 80 })).toBe(0);
    expect(walk(4, 6, { state: 'ATTACKING' })).toBe(0);
    expect(walk(5, 6, { state: 'LEAPING' })).toBe(0);
  });

  it('does not count a respawn teleport as walking', () => {
    stepXenoFootsteps(0, walker(0), 0, 0);
    stepXenoFootsteps(0, walker(20), 0, 0);
    expect(play3D).not.toHaveBeenCalled();
  });
});
