import { CORNERS, HALL_CORNERS, ADJ_CORNERS } from '../core/CorridorNav';

/** Distance at which a corner counts as reached. */
export const CORNER_REACHED_DIST = 0.48;

/** Centreline of each hall (0 east, 1 west spines run along Z; 2 north, 3 mid, 4 south run along X). */
export const HALL_LANE: readonly { axis: 'x' | 'z'; value: number }[] = [
  { axis: 'x', value: -0.32 },
  { axis: 'x', value: -13.48 },
  { axis: 'z', value: 35.9 },
  { axis: 'z', value: 22.1 },
  { axis: 'z', value: 8.3 }
];

/** Corner of `hall` giving the shortest route from (fromX, fromZ) to the goal. */
export function chooseEntryCorner(hall: number, fromX: number, fromZ: number, goalX: number, goalZ: number): number {
  const options = HALL_CORNERS[hall];
  let best = options[0];
  let bestCost = Infinity;
  for (let i = 0; i < options.length; i++) {
    const c = options[i];
    const cost =
      Math.hypot(CORNERS[c][0] - fromX, CORNERS[c][1] - fromZ) +
      Math.hypot(goalX - CORNERS[c][0], goalZ - CORNERS[c][1]);
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}

/** Adjacent corner of `corner` that is nearest the goal. */
export function nearestAdjacentCorner(corner: number, goalX: number, goalZ: number): number {
  const options = ADJ_CORNERS[corner];
  let best = options[0];
  let bestDist = Infinity;
  for (let i = 0; i < options.length; i++) {
    const c = options[i];
    const d = Math.hypot(goalX - CORNERS[c][0], goalZ - CORNERS[c][1]);
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
  goalZ: number
): number {
  if (fromHall === goalHall) return -1;
  let corner = current < 0 ? chooseEntryCorner(fromHall, posX, posZ, goalX, goalZ) : current;
  if (Math.hypot(CORNERS[corner][0] - posX, CORNERS[corner][1] - posZ) < CORNER_REACHED_DIST) {
    corner = HALL_CORNERS[goalHall].includes(corner) ? -1 : nearestAdjacentCorner(corner, goalX, goalZ);
  }
  return corner;
}
