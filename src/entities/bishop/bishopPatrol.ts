// Bishop's idle behaviour: when nothing hostile is in sight he walks a loose patrol around the player, pausing to
// scan. Waypoints are always in his own hall on a straight, clear path that does not pass the player, so he never
// has to squeeze past them in a narrow corridor (and never hugs a wall trying to). Pure logic, no React or three.js.
import { BALANCE } from '../../data/balance';
import { getHallId } from '../../core/CorridorNav';
import { getActiveLevel } from '../../levels';

export interface PatrolState {
  x: number;
  z: number;
  active: boolean;
  arrived: boolean;
  /** Seconds left standing at the current waypoint, how long it has been pursued, and how long progress has stalled. */
  pause: number;
  age: number;
  stuck: number;
  /** Scan sweep while paused: the heading Bishop arrived with, the sweep phase and the resulting look direction. */
  heading: number;
  scan: number;
  look: number;
}

export type PatrolMode = 'MOVE' | 'PAUSE' | 'FOLLOW';

const ARRIVE_DIST = 0.6;
const GIVE_UP_SECONDS = 9;
const STUCK_SECONDS = 0.7;

export function createPatrol(): PatrolState {
  return { x: 0, z: 0, active: false, arrived: false, pause: 0, age: 0, stuck: 0, heading: 0, scan: 0, look: 0 };
}

/** Distance from point (px, pz) to the segment (ax, az) to (bx, bz). */
export function segmentDistance(ax: number, az: number, bx: number, bz: number, px: number, pz: number): number {
  const sx = bx - ax,
    sz = bz - az,
    len2 = sx * sx + sz * sz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * sx + (pz - az) * sz) / len2)) : 0;
  return Math.hypot(px - (ax + sx * t), pz - (az + sz * t));
}

/** Picks a point in Bishop's own hall, near the player but not too near, with a clear straight path to it. */
function pickPoint(p: PatrolState, bx: number, bz: number, px: number, pz: number): void {
  const { PATROL_PLAYER_GAP, PATROL_LEASH, PATROL_PATH_CLEARANCE } = BALANCE.BISHOP;
  const rect = getActiveLevel().halls[getHallId(bx, bz)].rect;
  for (let tries = 0; tries < 16; tries++) {
    const x = rect[0] + 0.4 + Math.random() * (rect[1] - rect[0] - 0.8),
      z = rect[2] + 0.4 + Math.random() * (rect[3] - rect[2] - 0.8);
    const toPlayer = Math.hypot(x - px, z - pz);
    if (Math.hypot(x - bx, z - bz) < 2.5 || toPlayer < PATROL_PLAYER_GAP || toPlayer > PATROL_LEASH - 1) continue;
    if (segmentDistance(bx, bz, x, z, px, pz) < PATROL_PATH_CLEARANCE) continue;
    p.x = x;
    p.z = z;
    p.active = true;
    p.arrived = false;
    p.age = 0;
    p.stuck = 0;
    return;
  }
  // Nowhere sensible (for example the player is standing in his way): wait where he is
  p.x = bx;
  p.z = bz;
  p.active = true;
}

/**
 * One frame of patrol. FOLLOW means the player is beyond the leash, so Bishop should rejoin the formation;
 * MOVE walks to (p.x, p.z); PAUSE stands and scans toward p.look.
 */
export function stepPatrol(
  p: PatrolState,
  bx: number,
  bz: number,
  yaw: number,
  px: number,
  pz: number,
  dt: number
): PatrolMode {
  const { PATROL_PLAYER_GAP, PATROL_LEASH, PATROL_PATH_CLEARANCE } = BALANCE.BISHOP;
  if (Math.hypot(bx - px, bz - pz) > PATROL_LEASH) {
    p.active = false;
    return 'FOLLOW';
  }
  p.age += dt;
  const walking = Math.hypot(p.x - bx, p.z - bz) >= ARRIVE_DIST;
  const blocked = walking && segmentDistance(bx, bz, p.x, p.z, px, pz) < PATROL_PATH_CLEARANCE * 0.75;
  if (!p.active || p.age > GIVE_UP_SECONDS || blocked || Math.hypot(p.x - px, p.z - pz) < PATROL_PLAYER_GAP) {
    pickPoint(p, bx, bz, px, pz);
  }
  if (Math.hypot(p.x - bx, p.z - bz) >= ARRIVE_DIST) {
    p.arrived = false;
    return 'MOVE';
  }
  if (!p.arrived) {
    p.arrived = true;
    p.pause = 1.5 + Math.random() * 2.5;
    p.heading = yaw;
    p.scan = 0;
  }
  p.pause -= dt;
  p.scan += dt * 1.1;
  p.look = p.heading + Math.sin(p.scan) * 0.9;
  if (p.pause > 0) return 'PAUSE';
  pickPoint(p, bx, bz, px, pz);
  return 'MOVE';
}

/** Call after a patrol step with how far he actually moved: if he keeps failing to advance, choose a new waypoint. */
export function reportPatrolProgress(p: PatrolState, moved: number, expected: number, dt: number): void {
  if (expected <= 0 || moved >= expected * 0.3) {
    p.stuck = 0;
    return;
  }
  p.stuck += dt;
  if (p.stuck > STUCK_SECONDS) p.active = false;
}
