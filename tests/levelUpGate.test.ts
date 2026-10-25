import { describe, it, expect } from 'vitest';
import { isCalm, stepLevelUpGate, CALM_RADIUS, CALM_SECONDS, MAX_WAIT_SECONDS } from '../src/systems/levelUpGate';

const alive = (x: number, z: number) => ({ x, z, state: 'PURSUING' });

describe('level-up gate', () => {
  it('is calm only when no live hostile is within the radius', () => {
    expect(isCalm([], null, 0, 0)).toBe(true);
    expect(isCalm([alive(CALM_RADIUS - 1, 0)], null, 0, 0)).toBe(false);
    expect(isCalm([alive(CALM_RADIUS + 1, 0)], null, 0, 0)).toBe(true);
    expect(isCalm([{ x: 1, z: 0, state: 'DEAD' }], null, 0, 0)).toBe(true);
    expect(isCalm([], alive(2, 0), 0, 0)).toBe(false);
  });

  it('opens only after a sustained lull, and a fight resets the wait', () => {
    const gate = { calm: 0, waiting: 0 };
    expect(stepLevelUpGate(gate, true, true, CALM_SECONDS - 0.5)).toBe(false);
    expect(stepLevelUpGate(gate, true, false, 1)).toBe(false);
    expect(gate.calm).toBe(0);
    expect(stepLevelUpGate(gate, true, true, CALM_SECONDS + 0.1)).toBe(true);
  });

  it('opens after the maximum wait even in constant combat, and does nothing when nothing is pending', () => {
    const gate = { calm: 0, waiting: 0 };
    expect(stepLevelUpGate(gate, true, false, MAX_WAIT_SECONDS + 1)).toBe(true);
    expect(stepLevelUpGate(gate, false, true, 100)).toBe(false);
  });
});
