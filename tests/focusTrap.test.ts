import { describe, it, expect } from 'vitest';
import { nextFocusIndex } from '../src/ui/useFocusTrap';

describe('nextFocusIndex', () => {
  it('moves forward and wraps to the first control', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
  });

  it('moves backward and wraps to the last control', () => {
    expect(nextFocusIndex(1, 3, true)).toBe(0);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
  });

  it('starts at either end when nothing inside the dialog is focused, and copes with an empty dialog', () => {
    expect(nextFocusIndex(-1, 4, false)).toBe(0);
    expect(nextFocusIndex(-1, 4, true)).toBe(3);
    expect(nextFocusIndex(-1, 0, false)).toBe(-1);
  });
});
