import { describe, it, expect } from 'vitest';
import { constrainToCorridor, constrainToCorridorInto, moveConstrained } from '../src/core/CorridorNav';

describe('constrainToCorridorInto', () => {
  it('matches the tuple form for inside and outside points and margins', () => {
    const out = { x: 0, z: 0 };
    const samples: [number, number, number][] = [
      [-0.32, 15, 0],
      [5, 15, 0.2],
      [-7, 30, 0.25],
      [-20, 2, 0.18],
      [-6.9, 22.1, 0.24]
    ];
    for (const [x, z, m] of samples) {
      constrainToCorridorInto(x, z, m, out);
      const [tx, tz] = constrainToCorridor(x, z, m);
      expect(out.x).toBeCloseTo(tx, 9);
      expect(out.z).toBeCloseTo(tz, 9);
    }
  });

  it('a margin keeps agents away from the wall', () => {
    const out = { x: 0, z: 0 };
    constrainToCorridorInto(0.32, 15, 0.25, out);
    expect(out.x).toBeCloseTo(0.07, 6);
  });

  it('moveConstrained writes the clamped position onto the agent', () => {
    const agent = { x: 0, z: 0 };
    moveConstrained(agent, 5, 15, 0.1);
    expect(agent.x).toBeLessThanOrEqual(0.22 + 1e-9);
    expect(agent.z).toBeCloseTo(15, 9);
  });
});
