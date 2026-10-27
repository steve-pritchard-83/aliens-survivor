import { describe, it, expect } from 'vitest';
import { controllerRole, quickTurnDue, createVRControllerLatches } from '../src/ui/vrControllers';

describe('controllerRole', () => {
  it('puts the weapon on the right hand by default and the left hand when left-handed', () => {
    expect(controllerRole('right', false)).toBe('weapon');
    expect(controllerRole('left', false)).toBe('off');
    expect(controllerRole('left', true)).toBe('weapon');
    expect(controllerRole('right', true)).toBe('off');
  });
});

describe('quickTurnDue', () => {
  it('turns once per pull straight back, and again only after the stick is released', () => {
    const latches = createVRControllerLatches();
    expect(quickTurnDue(0, 0.95, latches)).toBe(true);
    expect(quickTurnDue(0, 0.95, latches)).toBe(false); // still held
    expect(quickTurnDue(0, 0.5, latches)).toBe(false); // not released yet
    expect(quickTurnDue(0, 0.1, latches)).toBe(false); // released
    expect(quickTurnDue(0.1, 0.9, latches)).toBe(true);
  });

  it('ignores pushes forward, half pulls and diagonal pulls meant for turning', () => {
    const latches = createVRControllerLatches();
    expect(quickTurnDue(0, -1, latches)).toBe(false);
    expect(quickTurnDue(0, 0.6, latches)).toBe(false);
    expect(quickTurnDue(0.7, 0.9, latches)).toBe(false);
  });
});
