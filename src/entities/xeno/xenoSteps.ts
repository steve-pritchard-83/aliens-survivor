import { POOL_SIZE } from '../XenoTypes';
import { BOSS_STEP, DRONE_STEP, StrideCounter, playEnemyStep } from '../../core/footsteps';

// Footsteps for the pooled drones and the Praetorian. Per-slot state lives here, indexed by pool slot, so the
// pooled entity type needs no extra fields.
const counters = Array.from({ length: POOL_SIZE }, () => new StrideCounter());
const lastX = new Float32Array(POOL_SIZE);
const lastZ = new Float32Array(POOL_SIZE);
const seen = new Uint8Array(POOL_SIZE);

/** Beyond this distance (metres) a step could not be heard anyway, so it is not played. */
const HEARD_RANGE = 22;
/** A single-frame jump this big is a respawn, not walking. */
const TELEPORT_DISTANCE = 1;

interface Walker {
  x: number;
  z: number;
  state: string;
  isBoss: boolean;
}

/** Call once per frame for each active pooled enemy. */
export function stepXenoFootsteps(slot: number, e: Walker, px: number, pz: number): void {
  const moved = seen[slot] ? Math.hypot(e.x - lastX[slot], e.z - lastZ[slot]) : 0;
  lastX[slot] = e.x;
  lastZ[slot] = e.z;
  seen[slot] = 1;
  // Only a walking or running drone steps: not while leaping, attacking, spawning or dying
  if (e.state !== 'PURSUING' || moved > TELEPORT_DISTANCE) {
    counters[slot].reset();
    return;
  }
  if (Math.hypot(e.x - px, e.z - pz) > HEARD_RANGE) return;
  const profile = e.isBoss ? BOSS_STEP : DRONE_STEP;
  if (counters[slot].add(moved, profile.stride)) playEnemyStep(profile, e.x, 0.1, e.z);
}
