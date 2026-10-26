import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { StrideCounter, pickStepSound, PLAYER_STEP, DRONE_STEP, BOSS_STEP } from '../src/core/footsteps';
import { SOUND_URLS } from '../src/core/AudioCatalog';

describe('footsteps', () => {
  it('steps once per stride walked, and not at all when standing or pushing a wall', () => {
    const c = new StrideCounter();
    expect(c.add(0, 1.5)).toBe(false);
    expect(c.add(1.0, 1.5)).toBe(false);
    expect(c.add(0.6, 1.5)).toBe(true); // 1.6 walked
    expect(c.add(1.3, 1.5)).toBe(false); // 0.1 left over + 1.3 = 1.4
    expect(c.add(0.2, 1.5)).toBe(true);
  });

  it('never banks more than one step after a long gap', () => {
    const c = new StrideCounter();
    expect(c.add(10, 1.5)).toBe(true);
    expect(c.add(0.1, 1.5)).toBe(false);
  });

  it('big enemies stride longer, pitch lower and hit harder than drones and the player', () => {
    expect(BOSS_STEP.stride).toBeGreaterThan(DRONE_STEP.stride);
    expect(BOSS_STEP.rate).toBeLessThan(DRONE_STEP.rate);
    expect(BOSS_STEP.volume).toBeGreaterThan(DRONE_STEP.volume);
    expect(DRONE_STEP.volume).toBeGreaterThan(PLAYER_STEP.volume);
  });

  it('picks the four metal step sounds, never the same one twice in a row, and their files exist', () => {
    const seen = new Set<string>();
    let previous = '';
    for (let i = 0; i < 200; i++) {
      const key = pickStepSound();
      expect(key).not.toBe(previous);
      previous = key;
      seen.add(key);
      expect(existsSync(`public${SOUND_URLS[key]}`)).toBe(true);
    }
    expect(seen.size).toBe(4);
  });
});
