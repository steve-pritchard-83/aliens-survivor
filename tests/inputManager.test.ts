import { describe, it, expect, beforeEach } from 'vitest';
import { InputManagerController } from '../src/core/InputManager';

interface KeyHandlers {
  onKeyDown: (e: { code: string; preventDefault: () => void }) => void;
  onKeyUp: (e: { code: string }) => void;
}

function press(c: InputManagerController, code: string): void {
  (c as unknown as KeyHandlers).onKeyDown({ code, preventDefault: () => undefined });
}
function release(c: InputManagerController, code: string): void {
  (c as unknown as KeyHandlers).onKeyUp({ code });
}

describe('InputManager', () => {
  let input: InputManagerController;
  beforeEach(() => {
    input = new InputManagerController();
  });

  it('maps WASD to movement and normalises diagonals', () => {
    press(input, 'KeyW');
    let snap = input.consumeSnapshot();
    expect(snap.moveZ).toBe(1);
    expect(snap.moveX).toBe(0);
    press(input, 'KeyD');
    snap = input.consumeSnapshot();
    expect(Math.hypot(snap.moveX, snap.moveZ)).toBeCloseTo(1, 6);
    release(input, 'KeyW');
    release(input, 'KeyD');
    snap = input.consumeSnapshot();
    expect(snap.moveX).toBe(0);
    expect(snap.moveZ).toBe(0);
  });

  it('opposite keys cancel', () => {
    press(input, 'KeyA');
    press(input, 'KeyD');
    expect(input.consumeSnapshot().moveX).toBe(0);
  });

  it('keyboard movement overrides touch movement', () => {
    input.setTouchMove(0.5, 0.5);
    expect(input.consumeSnapshot().moveZ).toBe(0.5);
    press(input, 'KeyS');
    expect(input.consumeSnapshot().moveZ).toBe(-1);
  });

  it('clamps touch movement into -1..1', () => {
    input.setTouchMove(5, -5);
    const snap = input.consumeSnapshot();
    expect(snap.moveX).toBe(1);
    expect(snap.moveZ).toBe(-1);
  });

  it('look deltas are clamped per frame and cleared by consumption', () => {
    input.addTouchLook(5, -5);
    let snap = input.consumeSnapshot();
    expect(snap.lookDeltaX).toBeCloseTo(0.22);
    expect(snap.lookDeltaY).toBeCloseTo(-0.22);
    snap = input.consumeSnapshot();
    expect(snap.lookDeltaX).toBe(0);
    expect(snap.lookDeltaY).toBe(0);
  });

  it('reload and snap turns are one-shot', () => {
    press(input, 'KeyR');
    input.addSnapTurn(0.5);
    input.addSnapTurn(0.25);
    let snap = input.consumeSnapshot();
    expect(snap.reloadRequested).toBe(true);
    expect(snap.snapTurn).toBeCloseTo(0.75);
    snap = input.consumeSnapshot();
    expect(snap.reloadRequested).toBe(false);
    expect(snap.snapTurn).toBe(0);
  });

  it('latches tracker, flashlight and pause toggles', () => {
    press(input, 'Tab');
    press(input, 'KeyF');
    press(input, 'Escape');
    expect(input.trackerToggleFlag).toBe(true);
    expect(input.flashlightToggleFlag).toBe(true);
    expect(input.pauseToggleFlag).toBe(true);
  });

  it('XR state takes over movement and firing, and hands back to desktop on exit', () => {
    input.setXRState(true, 0.3, -0.6, true);
    let snap = input.consumeSnapshot();
    expect(snap.mode).toBe('XR');
    expect(snap.moveX).toBe(0.3);
    expect(snap.moveZ).toBe(-0.6);
    expect(snap.isFiring).toBe(true);
    input.setXRState(false);
    snap = input.consumeSnapshot();
    expect(snap.mode).toBe('DESKTOP');
    expect(snap.isFiring).toBe(false);
  });

  it('touch fire is reported while held', () => {
    input.setTouchFire(true);
    expect(input.isFiringActive()).toBe(true);
    input.setTouchFire(false);
    expect(input.isFiringActive()).toBe(false);
  });
});
