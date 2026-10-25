import { describe, it, expect } from 'vitest';
import { vignetteTarget, smoothStrength, MAX_SMOOTH_TURN_RATE } from '../src/systems/comfort';

describe('vignetteTarget', () => {
  it('is zero when standing still and not turning', () => {
    expect(vignetteTarget(0, 0, 0, 'high')).toBe(0);
  });

  it('grows with smooth turning, saturating at the maximum turn rate', () => {
    expect(vignetteTarget(MAX_SMOOTH_TURN_RATE / 2, 0, 0, 'high')).toBeCloseTo(0.5);
    expect(vignetteTarget(MAX_SMOOTH_TURN_RATE, 0, 0, 'high')).toBe(1);
    expect(vignetteTarget(MAX_SMOOTH_TURN_RATE * 3, 0, 0, 'high')).toBe(1);
    expect(vignetteTarget(-MAX_SMOOTH_TURN_RATE, 0, 0, 'high')).toBe(1);
  });

  it('grows with locomotion, weighted below turning', () => {
    expect(vignetteTarget(0, 1, 0, 'high')).toBeCloseTo(0.6);
    expect(vignetteTarget(0, 0.5, 0, 'high')).toBeCloseTo(0.3);
  });

  it('a snap turn pulses full strength regardless of other motion', () => {
    expect(vignetteTarget(0, 0, 0.1, 'high')).toBe(1);
    expect(vignetteTarget(0, 0, 0, 'high')).toBe(0);
  });

  it('is scaled by the comfort level, with off disabling it entirely', () => {
    expect(vignetteTarget(MAX_SMOOTH_TURN_RATE, 0, 0, 'low')).toBeCloseTo(0.6);
    expect(vignetteTarget(MAX_SMOOTH_TURN_RATE, 1, 1, 'off')).toBe(0);
  });
});

describe('smoothStrength', () => {
  it('fades in faster than it fades out', () => {
    const up = smoothStrength(0, 1, 0.1);
    const down = 1 - smoothStrength(1, 0, 0.1);
    expect(up).toBeGreaterThan(down);
  });

  it('never overshoots the target, even with a huge frame step', () => {
    expect(smoothStrength(0, 1, 10)).toBe(1);
    expect(smoothStrength(1, 0, 10)).toBe(0);
  });

  it('converges to the target', () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = smoothStrength(v, 0.7, 0.016);
    expect(v).toBeCloseTo(0.7, 3);
  });
});
