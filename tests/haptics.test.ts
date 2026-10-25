import { describe, it, expect, vi, beforeEach } from 'vitest';
import { xrControllerState } from '../src/core/XRControllerState';
import { Haptics } from '../src/core/Haptics';
import { applySettings } from '../src/core/SettingsBinding';
import { DEFAULT_SETTINGS } from '../src/core/Persistence';

function actuators() {
  const left = { pulse: vi.fn() };
  const right = { pulse: vi.fn() };
  xrControllerState.leftHand.hapticActuator = left as unknown as GamepadHapticActuator;
  xrControllerState.rightHand.hapticActuator = right as unknown as GamepadHapticActuator;
  return { left, right };
}

describe('haptics follow handedness', () => {
  beforeEach(() => {
    xrControllerState.leftHanded = false;
  });

  it('right-handed: weapon cues on the right, tracker cues on the left', () => {
    const { left, right } = actuators();
    xrControllerState.triggerHaptic('weapon', 0.5, 10);
    expect(right.pulse).toHaveBeenCalledWith(0.5, 10);
    expect(left.pulse).not.toHaveBeenCalled();
    xrControllerState.triggerHaptic('tracker', 0.3, 5);
    expect(left.pulse).toHaveBeenCalledWith(0.3, 5);
  });

  it('left-handed swaps the hands', () => {
    const { left, right } = actuators();
    xrControllerState.leftHanded = true;
    xrControllerState.triggerHaptic('weapon', 0.5, 10);
    expect(left.pulse).toHaveBeenCalledTimes(1);
    expect(right.pulse).not.toHaveBeenCalled();
    xrControllerState.triggerHaptic('tracker', 0.3, 5);
    expect(right.pulse).toHaveBeenCalledTimes(1);
  });

  it('both pulses both hands regardless of handedness', () => {
    const { left, right } = actuators();
    xrControllerState.triggerHaptic('both', 1, 100);
    xrControllerState.leftHanded = true;
    xrControllerState.triggerHaptic('both', 1, 100);
    expect(left.pulse).toHaveBeenCalledTimes(2);
    expect(right.pulse).toHaveBeenCalledTimes(2);
  });

  it('gameplay cues use the right semantic hand', () => {
    const { left, right } = actuators();
    Haptics.fire();
    Haptics.reload();
    expect(right.pulse).toHaveBeenCalledTimes(2);
    Haptics.trackerPing();
    expect(left.pulse).toHaveBeenCalledTimes(1);
    Haptics.damage();
    expect(left.pulse).toHaveBeenCalledTimes(2);
    expect(right.pulse).toHaveBeenCalledTimes(3);
  });

  it('survives a missing actuator and is driven by the settings binding', () => {
    xrControllerState.leftHand.hapticActuator = null;
    xrControllerState.rightHand.hapticActuator = null;
    expect(() => xrControllerState.triggerHaptic('both')).not.toThrow();
    applySettings({ ...DEFAULT_SETTINGS, leftHanded: true });
    expect(xrControllerState.leftHanded).toBe(true);
    applySettings({ ...DEFAULT_SETTINGS, leftHanded: false });
    expect(xrControllerState.leftHanded).toBe(false);
  });
});
