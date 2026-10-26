import { describe, it, expect } from 'vitest';
import { canApplyUpdate } from '../src/core/updatePolicy';

describe('canApplyUpdate', () => {
  it('only applies between missions and never inside a VR session', () => {
    for (const status of ['MENU', 'DEFEAT', 'VICTORY'] as const) {
      expect(canApplyUpdate(status, false)).toBe(true);
      expect(canApplyUpdate(status, true)).toBe(false);
    }
    for (const status of ['PLAYING', 'PAUSED', 'LEVEL_UP'] as const) expect(canApplyUpdate(status, false)).toBe(false);
  });
});
