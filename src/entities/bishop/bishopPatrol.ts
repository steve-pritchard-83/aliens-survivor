// Bishop's idle behaviour: when nothing hostile is in sight he walks a loose patrol around the player, pausing to
// scan, and steers around the player instead of through them. Pure logic, no React or three.js.
import { BALANCE } from '../../data/balance';
import { constrainToCorridorInto, type XZ } from '../../core/CorridorNav';

export interface PatrolState {
  x: number;
  z: number;
  active: boolean;
  arrived: boolean;
  /** Seconds left standing at the current waypoint, and how long the current waypoint has been pursued. */
  pause: number;
  age: number;
  /** Scan sweep while paused: the heading Bishop arrived with, the sweep phase and the resulting look direction. */
  heading: number;
  scan: number;
  look: number;
}

export type PatrolMode = 'MOVE' | 'PAUSE' | 'FOLLOW';

const ARRIVE_DIST = 0.6;
const GIVE_UP_SECONDS = 9;
const _p: XZ = { x: 0, z: 0 };

export function createPatrol(): PatrolState {
  return { x: 0, z: 0, active: false, arrived: false, pause: 0, age: 0, heading: 0, scan: 0, look: 0 };
}

/** Picks a corridor point 3 to 11 m from the player that is not too close to the player or to Bishop. */
function pickPoint(p: PatrolState, bx: number, bz: number, px: number, pz: number): void {
  const { PATROL_PLAYER_GAP } = BALANCE.BISHOP;
  for (let tries = 0; tries < 16; tries++) {
    const a = Math.random() * Math.PI * 2,
      d = 3 + Math.random() * 8;
    const rawX = px + Math.cos(a) * d,
      rawZ = pz + Math.sin(a) * d;
    constrainToCorridorInto(rawX, rawZ, 0.3, _p);
    // Reject points that had to be dragged into the corridor (they would pile up against walls)
    if (Math.hypot(_p.x - rawX, _p.z - rawZ) > 0.8) continue;
    if (Math.hypot(_p.x - px, _p.z - pz) < PATROL_PLAYER_GAP || Math.hypot(_p.x - bx, _p.z - bz) < 2) continue;
    p.x = _p.x;
    p.z = _p.z;
    p.active = true;
    p.arrived = false;
    p.age = 0;
    return;
  }
  // Nowhere sensible: stand still for a moment
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
  if (Math.hypot(bx - px, bz - pz) > BALANCE.BISHOP.PATROL_LEASH) {
    p.active = false;
    return 'FOLLOW';
  }
  p.age += dt;
  if (!p.active || p.age > GIVE_UP_SECONDS || Math.hypot(p.x - px, p.z - pz) < BALANCE.BISHOP.PATROL_PLAYER_GAP) {
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

/**
 * Bends a desired walking direction (unit vector) around the player: inside the avoid radius the direction gains a
 * push away from the player, so Bishop slides past instead of walking through. Writes a unit vector into out.
 */
export function steerAround(dirX: number, dirZ: number, bx: number, bz: number, px: number, pz: number, out: XZ): void {
  const away = Math.hypot(bx - px, bz - pz),
    radius = BALANCE.BISHOP.PLAYER_AVOID_RADIUS;
  out.x = dirX;
  out.z = dirZ;
  if (away >= radius || away < 0.001) return;
  const push = ((radius - away) / radius) * 2.2;
  out.x += ((bx - px) / away) * push;
  out.z += ((bz - pz) / away) * push;
  const len = Math.hypot(out.x, out.z) || 1;
  out.x /= len;
  out.z /= len;
}
