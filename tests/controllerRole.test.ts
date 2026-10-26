import { describe, it, expect } from 'vitest';
import { controllerRole } from '../src/ui/vrControllers';

describe('controllerRole', () => {
  it('puts the weapon on the right hand by default and the left hand when left-handed', () => {
    expect(controllerRole('right', false)).toBe('weapon');
    expect(controllerRole('left', false)).toBe('off');
    expect(controllerRole('left', true)).toBe('weapon');
    expect(controllerRole('right', true)).toBe('off');
  });
});
