import { getActiveLevel } from '../levels';
import type { LevelDefinition } from '../levels/LevelDefinition';

/** Distance at which a corner counts as reached. */
export const CORNER_REACHED_DIST = 0.48;

/** Corner of `hall` giving the shortest route from (fromX, fromZ) to the goal. */
export function chooseEntryCorner(
  hall: number,
  fromX: number,
  fromZ: number,
  goalX: number,
  goalZ: number,
  level: LevelDefinition = getActiveLevel()
): number {
  const options = level.halls[hall].corners;
  const corners = level.corners;
  let best = options[0];
  let bestCost = Infinity;
  for (let i = 0; i < options.length; i++) {
    const c = options[i];
    const cost =
      Math.hypot(corners[c][0] - fromX, corners[c][1] - fromZ) +
      Math.hypot(goalX - corners[c][0], goalZ - corners[c][1]);
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}

/** Adjacent corner of `corner` that is nearest the goal. */
export function nearestAdjacentCorner(
  corner: number,
  goalX: number,
  goalZ: number,
  level: LevelDefinition = getActiveLevel()
): number {
  const options = level.adjacency[corner];
  const corners = level.corners;
  let best = options[0];
  let bestDist = Infinity;
  for (let i = 0; i < options.length; i++) {
    const c = options[i];
    const d = Math.hypot(goalX - corners[c][0], goalZ - corners[c][1]);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * One step of corner-to-corner navigation for an agent in `fromHall` heading to a goal in `goalHall`.
 * Returns the corner to steer at, or -1 once the agent can head straight for the goal.
 */
export function advanceCorner(
  current: number,
  fromHall: number,
  goalHall: number,
  posX: number,
  posZ: number,
  goalX: number,
  goalZ: number,
  level: LevelDefinition = getActiveLevel()
): number {
  if (fromHall === goalHall) return -1;
  const corners = level.corners;
  let corner = current < 0 ? chooseEntryCorner(fromHall, posX, posZ, goalX, goalZ, level) : current;
  if (Math.hypot(corners[corner][0] - posX, corners[corner][1] - posZ) < CORNER_REACHED_DIST) {
    corner = level.halls[goalHall].corners.includes(corner) ? -1 : nearestAdjacentCorner(corner, goalX, goalZ, level);
  }
  return corner;
}
