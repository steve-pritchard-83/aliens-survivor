import { describe, it, expect } from 'vitest';
import { VRMenuNav } from '../src/ui/VRMenuNav';

describe('VRMenuNav', () => {
  it('swallows all input during the arm delay', () => {
    const nav = new VRMenuNav();
    nav.arm(0.5);
    nav.update(0.1, 1, 0, false);
    expect(nav.consumeRight()).toBe(false);
    nav.update(0.1, 0, 0, true);
    expect(nav.consumeConfirm()).toBe(false);
  });

  it('a trigger held when armed never confirms until released and pressed again', () => {
    const nav = new VRMenuNav();
    nav.arm(0.2);
    for (let i = 0; i < 10; i++) {
      nav.update(0.1, 0, 0, true);
      expect(nav.consumeConfirm()).toBe(false);
    }
    nav.update(0.1, 0, 0, false);
    nav.update(0.1, 0, 0, true);
    expect(nav.consumeConfirm()).toBe(true);
    nav.update(0.1, 0, 0, true);
    expect(nav.consumeConfirm()).toBe(false);
  });

  it('emits one event per stick push with hysteresis', () => {
    const nav = new VRMenuNav();
    nav.arm(0);
    nav.update(0.1, 0, 0, false);
    nav.update(0.1, 0.9, 0, false);
    expect(nav.consumeRight()).toBe(true);
    nav.update(0.1, 0.9, 0, false);
    expect(nav.consumeRight()).toBe(false);
    nav.update(0.1, 0.4, 0, false);
    nav.update(0.1, 0.9, 0, false);
    expect(nav.consumeRight()).toBe(false);
    nav.update(0.1, 0.1, 0, false);
    nav.update(0.1, -0.9, 0, false);
    expect(nav.consumeLeft()).toBe(true);
  });

  it('maps stick up to negative Y and down to positive Y', () => {
    const nav = new VRMenuNav();
    nav.arm(0);
    nav.update(0.1, 0, 0, false);
    nav.update(0.1, 0, -0.9, false);
    expect(nav.consumeUp()).toBe(true);
    nav.update(0.1, 0, 0, false);
    nav.update(0.1, 0, 0.9, false);
    expect(nav.consumeDown()).toBe(true);
  });

  it('a stick held at arm time does not fire when the delay ends', () => {
    const nav = new VRMenuNav();
    nav.arm(0.2);
    nav.update(0.1, 0.9, 0, false);
    nav.update(0.2, 0.9, 0, false);
    expect(nav.consumeRight()).toBe(false);
  });
});
