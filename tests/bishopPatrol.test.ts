import { describe, it, expect } from 'vitest';
import { createPatrol, stepPatrol, steerAround } from '../src/entities/bishop/bishopPatrol';
import { BALANCE } from '../src/data/balance';

const PX = -0.32,
  PZ = 20;

describe('Bishop patrol', () => {
  it('rejoins the formation when the player is beyond the leash', () => {
    const p = createPatrol();
    expect(stepPatrol(p, PX, PZ + BALANCE.BISHOP.PATROL_LEASH + 1, 0, PX, PZ, 0.016)).toBe('FOLLOW');
    expect(p.active).toBe(false);
  });

  it('picks a waypoint away from the player and walks to it', () => {
    const p = createPatrol();
    const mode = stepPatrol(p, PX, PZ - 4, 0, PX, PZ, 0.016);
    expect(['MOVE', 'PAUSE']).toContain(mode);
    expect(p.active).toBe(true);
    expect(Math.hypot(p.x - PX, p.z - PZ)).toBeGreaterThanOrEqual(BALANCE.BISHOP.PATROL_PLAYER_GAP);
  });

  it('stands and scans on arrival, then moves on', () => {
    const p = createPatrol();
    Object.assign(p, { x: PX, z: PZ - 6, active: true });
    // Bishop is standing on the waypoint
    expect(stepPatrol(p, p.x, p.z, 1, PX, PZ, 0.016)).toBe('PAUSE');
    expect(p.heading).toBe(1);
    expect(stepPatrol(p, p.x, p.z, 1, PX, PZ, 10)).not.toBe('PAUSE');
  });

  it('bends the walking direction away from the player inside the avoid radius', () => {
    const out = { x: 0, z: 0 };
    // Bishop 1 m in front of the player, heading straight at them
    steerAround(0, 1, PX, PZ - 1, PX, PZ, out);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(1, 6);
    expect(out.z).toBeLessThan(1);
    steerAround(0, 1, PX, PZ - 10, PX, PZ, out);
    expect(out).toEqual({ x: 0, z: 1 });
  });
});
