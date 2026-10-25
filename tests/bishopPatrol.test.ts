import { describe, it, expect } from 'vitest';
import { createPatrol, stepPatrol, reportPatrolProgress, segmentDistance } from '../src/entities/bishop/bishopPatrol';
import { BALANCE } from '../src/data/balance';

// East spine: x -0.95..0.32, z 7.68..36.52
const PX = -0.32,
  PZ = 20;

describe('Bishop patrol', () => {
  it('rejoins the formation when the player is beyond the leash', () => {
    const p = createPatrol();
    expect(stepPatrol(p, PX, PZ + BALANCE.BISHOP.PATROL_LEASH + 1, 0, PX, PZ, 0.016)).toBe('FOLLOW');
    expect(p.active).toBe(false);
  });

  it('measures the distance from a point to a segment', () => {
    expect(segmentDistance(0, 0, 10, 0, 5, 3)).toBeCloseTo(3, 6);
    expect(segmentDistance(0, 0, 10, 0, -4, 3)).toBeCloseTo(5, 6);
  });

  it('only picks waypoints in his own hall whose path stays clear of the player', () => {
    for (let i = 0; i < 30; i++) {
      const p = createPatrol();
      stepPatrol(p, PX, PZ - 5, 0, PX, PZ, 0.016);
      expect(p.x).toBeGreaterThanOrEqual(-0.95);
      expect(p.x).toBeLessThanOrEqual(0.32);
      const standing = p.x === PX && p.z === PZ - 5;
      if (!standing) {
        expect(segmentDistance(PX, PZ - 5, p.x, p.z, PX, PZ)).toBeGreaterThanOrEqual(
          BALANCE.BISHOP.PATROL_PATH_CLEARANCE
        );
      }
    }
  });

  it('abandons a waypoint when the player steps into the path', () => {
    const p = createPatrol();
    // Bishop at z 14, waypoint at z 26, and the player right on that line at z 20
    Object.assign(p, { x: PX, z: 26, active: true });
    stepPatrol(p, PX, 14, 0, PX, PZ, 0.016);
    expect(p.z).not.toBe(26);
  });

  it('stands and scans on arrival, then moves on', () => {
    const p = createPatrol();
    Object.assign(p, { x: PX, z: PZ - 6, active: true });
    expect(stepPatrol(p, p.x, p.z, 1, PX, PZ, 0.016)).toBe('PAUSE');
    expect(p.heading).toBe(1);
    expect(stepPatrol(p, p.x, p.z, 1, PX, PZ, 10)).not.toBe('PAUSE');
  });

  it('picks a new waypoint after he stops making progress', () => {
    const p = createPatrol();
    p.active = true;
    reportPatrolProgress(p, 0, 0.03, 0.5);
    expect(p.active).toBe(true);
    reportPatrolProgress(p, 0, 0.03, 0.5);
    expect(p.active).toBe(false);
    p.active = true;
    reportPatrolProgress(p, 0.03, 0.03, 0.5);
    expect(p.stuck).toBe(0);
  });
});
