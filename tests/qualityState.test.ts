import { describe, it, expect } from 'vitest';
import { stepTier, MAX_TIER } from '../src/core/QualityState';

describe('stepTier', () => {
  it('drops one tier after two consecutive slow windows', () => {
    let r = stepTier(MAX_TIER, 0, 0, 60);
    expect(r.tier).toBe(MAX_TIER);
    r = stepTier(r.tier, r.lowStreak, r.highStreak, 60);
    expect(r.tier).toBe(MAX_TIER - 1);
    expect(r.lowStreak).toBe(0);
  });

  it('a single slow window followed by a healthy one resets the streak', () => {
    let r = stepTier(2, 0, 0, 60);
    r = stepTier(r.tier, r.lowStreak, r.highStreak, 70);
    r = stepTier(r.tier, r.lowStreak, r.highStreak, 60);
    expect(r.tier).toBe(2);
  });

  it('raises one tier only after five consecutive fast windows', () => {
    let r = { tier: 0, lowStreak: 0, highStreak: 0 };
    for (let i = 0; i < 4; i++) {
      r = stepTier(r.tier, r.lowStreak, r.highStreak, 72);
      expect(r.tier).toBe(0);
    }
    r = stepTier(r.tier, r.lowStreak, r.highStreak, 72);
    expect(r.tier).toBe(1);
  });

  it('never leaves the 0..MAX range', () => {
    let r = { tier: 0, lowStreak: 0, highStreak: 0 };
    for (let i = 0; i < 10; i++) r = stepTier(r.tier, r.lowStreak, r.highStreak, 30);
    expect(r.tier).toBe(0);
    r = { tier: MAX_TIER, lowStreak: 0, highStreak: 0 };
    for (let i = 0; i < 20; i++) r = stepTier(r.tier, r.lowStreak, r.highStreak, 72);
    expect(r.tier).toBe(MAX_TIER);
  });
});
