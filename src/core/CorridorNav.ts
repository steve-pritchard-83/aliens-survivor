import { getActiveLevel } from '../levels';
import type { LevelDefinition, SpawnNode } from '../levels/LevelDefinition';

export type { SpawnNode };

export interface XZ {
  x: number;
  z: number;
}

/**
 * Clamps (x, z) into the nearest walkable hall of the level, shrunk by margin, writing into out.
 * Allocation-free. Level data comes from the active LevelDefinition unless one is passed.
 */
export function constrainToCorridorInto(
  x: number,
  z: number,
  margin: number,
  out: XZ,
  level: LevelDefinition = getActiveLevel()
): void {
  const halls = level.halls;
  for (let i = 0; i < halls.length; i++) {
    const h = halls[i].rect;
    if (x >= h[0] + margin && x <= h[1] - margin && z >= h[2] + margin && z <= h[3] - margin) {
      out.x = x;
      out.z = z;
      return;
    }
  }
  let bestX = x,
    bestZ = z,
    bestDist = Infinity;
  for (let i = 0; i < halls.length; i++) {
    const h = halls[i].rect;
    const cx = Math.max(h[0] + margin, Math.min(h[1] - margin, x)),
      cz = Math.max(h[2] + margin, Math.min(h[3] - margin, z));
    const d = Math.hypot(x - cx, z - cz);
    if (d < bestDist) {
      bestDist = d;
      bestX = cx;
      bestZ = cz;
    }
  }
  out.x = bestX;
  out.z = bestZ;
}

const _scratch: XZ = { x: 0, z: 0 };

/** Convenience tuple form for non-hot paths and tests. */
export function constrainToCorridor(x: number, z: number, margin = 0): [number, number] {
  constrainToCorridorInto(x, z, margin, _scratch);
  return [_scratch.x, _scratch.z];
}

/** Moves an agent to (x, z) constrained to the corridor. Allocation-free. */
export function moveConstrained(agent: XZ, x: number, z: number, margin: number): void {
  constrainToCorridorInto(x, z, margin, _scratch);
  agent.x = _scratch.x;
  agent.z = _scratch.z;
}

/** The hall whose centre line is nearest (x, z); ties go to the earlier hall. */
export function getHallId(x: number, z: number, level: LevelDefinition = getActiveLevel()): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < level.halls.length; i++) {
    const lane = level.halls[i].lane;
    const d = Math.abs((lane.axis === 'x' ? x : z) - lane.value);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * True if the player would plausibly see a spawn at (sx, sz): within 8.5 m, or in the same hall and not behind them.
 * Spawns are chosen from nodes where this is false.
 */
export function isSpawnVisibleToPlayer(
  sx: number,
  sz: number,
  px: number,
  pz: number,
  pyaw: number,
  level: LevelDefinition = getActiveLevel()
): boolean {
  const d = Math.hypot(sx - px, sz - pz);
  if (d < 8.5) return true;
  let sameHall = false;
  for (let i = 0; i < level.halls.length && !sameHall; i++) {
    const lane = level.halls[i].lane;
    const s = lane.axis === 'x' ? sx : sz;
    const p = lane.axis === 'x' ? px : pz;
    sameHall = Math.abs(s - lane.value) < 1.1 && Math.abs(p - lane.value) < 1.1;
  }
  return sameHall && ((sx - px) * -Math.sin(pyaw) + (sz - pz) * -Math.cos(pyaw)) / d > -0.15;
}

/**
 * True when a and b are close together across the same hall's width and a sits on that hall's centre line:
 * a cheap stand-in for line of sight along a straight corridor.
 */
export function sharesLane(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  level: LevelDefinition = getActiveLevel()
): boolean {
  for (let i = 0; i < level.halls.length; i++) {
    const lane = level.halls[i].lane;
    const along = lane.axis === 'x' ? Math.abs(bx - ax) : Math.abs(bz - az);
    const offLane = Math.abs((lane.axis === 'x' ? ax : az) - lane.value);
    if (along < 1.05 && offLane < 1.1) return true;
  }
  return false;
}
