import { describe, it, expect } from 'vitest';
import { advanceCorner, chooseEntryCorner, nearestAdjacentCorner, HALL_LANE } from '../src/systems/corridorPathing';
import { CORNERS, HALL_CORNERS, getHallId } from '../src/core/CorridorNav';

describe('corridor pathing', () => {
  it('lane table matches the hall each lane point resolves to', () => {
    HALL_LANE.forEach((lane, hall) => {
      const x = lane.axis === 'x' ? lane.value : -6.9;
      const z = lane.axis === 'z' ? lane.value : 15.0;
      expect(getHallId(x, z)).toBe(hall);
    });
  });

  it('picks the corner that shortens the total route', () => {
    // Agent far south in the east spine, goal north-west: should leave via the mid junction, not stay south
    const c = chooseEntryCorner(0, -0.32, 9.0, -13.48, 30.0);
    expect(HALL_CORNERS[0]).toContain(c);
    const total = (k: number) =>
      Math.hypot(CORNERS[k][0] + 0.32, CORNERS[k][1] - 9.0) + Math.hypot(-13.48 - CORNERS[k][0], 30.0 - CORNERS[k][1]);
    for (const other of HALL_CORNERS[0]) expect(total(c)).toBeLessThanOrEqual(total(other) + 1e-9);
  });

  it('returns -1 when already in the goal hall', () => {
    expect(advanceCorner(3, 1, 1, -13.48, 15, -13.48, 20)).toBe(-1);
  });

  it('chooses an entry corner when none is set and keeps it until reached', () => {
    const first = advanceCorner(-1, 0, 1, -0.32, 15, -13.48, 15);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(advanceCorner(first, 0, 1, -0.32, 15, -13.48, 15)).toBe(first);
  });

  it('on reaching a corner shared with the goal hall, heads straight for the goal', () => {
    // corner 1 (NW) is in hall 1's corner list, so reaching it targets the goal directly
    expect(advanceCorner(1, 2, 1, CORNERS[1][0], CORNERS[1][1], -13.48, 20)).toBe(-1);
  });

  it('on reaching a corner outside the goal hall, moves to the adjacent corner nearest the goal', () => {
    const next = advanceCorner(0, 0, 1, CORNERS[0][0], CORNERS[0][1], -13.48, 10);
    expect(next).toBe(nearestAdjacentCorner(0, -13.48, 10));
  });
});
