export interface SpawnNode {
  id: string;
  label: string;
  position: [number, number, number];
  waypoints: [number, number, number][];
}

/** A straight corridor: a walkable rectangle with a centre line that agents follow. */
export interface HallDef {
  id: string;
  /** Walkable area [minX, maxX, minZ, maxZ] at zero margin; a margin shrinks it inward. */
  rect: readonly [number, number, number, number];
  /** Centre line: `axis: 'x'` means the hall runs along Z at x = value (and vice versa). */
  lane: { readonly axis: 'x' | 'z'; readonly value: number };
  /** Junction (corner) indices that lie on this hall. */
  corners: readonly number[];
}

/**
 * Everything the game systems need to know about a map's navigation and spawning. Systems read the active
 * definition (see `levels/index.ts`) instead of importing constants, so a new map is a new data file.
 * The 3D scene for a map is separate (`CorridorLevel`); this describes only layout, pathing and spawns.
 */
export interface LevelDefinition {
  id: string;
  name: string;
  /** Hall ids are indices into this array. */
  halls: readonly HallDef[];
  /** Junction positions [x, z]. */
  corners: readonly (readonly [number, number])[];
  /** For each junction, the junctions directly connected to it. */
  adjacency: readonly (readonly number[])[];
  spawnNodes: readonly SpawnNode[];
  /** Spawn node indices used when every node is visible to the player. */
  spawnFallback: { readonly xeno: readonly number[]; readonly small: readonly number[] };
  playerStart: { readonly x: number; readonly z: number; readonly yaw: number };
  /** Polygons for the motion tracker map, drawn with the even-odd rule. */
  radarOutline: readonly (readonly (readonly [number, number])[])[];
}

function inRect(x: number, z: number, r: HallDef['rect']): boolean {
  return x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
}

function inAnyHall(level: LevelDefinition, x: number, z: number): boolean {
  return level.halls.some((h) => inRect(x, z, h.rect));
}

/** Returns human-readable problems with a level definition (empty when it is consistent). */
export function validateLevel(level: LevelDefinition): string[] {
  const problems: string[] = [];
  const add = (msg: string) => problems.push(`${level.id}: ${msg}`);
  if (level.halls.length === 0) add('has no halls');
  if (new Set(level.halls.map((h) => h.id)).size !== level.halls.length) add('hall ids are not unique');

  level.halls.forEach((h, i) => {
    const [minX, maxX, minZ, maxZ] = h.rect;
    if (!(minX < maxX && minZ < maxZ)) add(`hall ${h.id} has an empty rectangle`);
    const along = h.lane.axis === 'x' ? [minX, maxX] : [minZ, maxZ];
    if (h.lane.value < along[0] || h.lane.value > along[1]) add(`hall ${h.id} lane lies outside its rectangle`);
    for (const c of h.corners) {
      const corner = level.corners[c];
      if (!corner) {
        add(`hall ${h.id} lists missing corner ${c}`);
        continue;
      }
      const coordinate = h.lane.axis === 'x' ? corner[0] : corner[1];
      if (Math.abs(coordinate - h.lane.value) > 1e-6) add(`corner ${c} is not on the lane of hall ${i} (${h.id})`);
      if (!inRect(corner[0], corner[1], h.rect)) add(`corner ${c} is outside hall ${h.id}`);
    }
  });

  level.corners.forEach((c, i) => {
    if (!inAnyHall(level, c[0], c[1])) add(`corner ${i} is not inside any hall`);
    if (!level.halls.some((h) => h.corners.includes(i))) add(`corner ${i} belongs to no hall`);
  });

  if (level.adjacency.length !== level.corners.length) add('adjacency must list every corner');
  level.adjacency.forEach((list, i) =>
    list.forEach((j) => {
      if (j < 0 || j >= level.corners.length || j === i) add(`corner ${i} has an invalid neighbour ${j}`);
      else if (!level.adjacency[j]?.includes(i)) add(`corner ${i} -> ${j} is not symmetric`);
    })
  );

  if (level.spawnNodes.length === 0) add('has no spawn nodes');
  if (new Set(level.spawnNodes.map((n) => n.id)).size !== level.spawnNodes.length) add('spawn node ids are not unique');
  for (const n of level.spawnNodes) {
    if (!inAnyHall(level, n.position[0], n.position[2])) add(`spawn node ${n.id} is outside every hall`);
    for (const w of n.waypoints)
      if (!inAnyHall(level, w[0], w[2])) add(`spawn node ${n.id} has a waypoint outside every hall`);
  }
  for (const key of ['xeno', 'small'] as const) {
    if (level.spawnFallback[key].length === 0) add(`spawnFallback.${key} is empty`);
    for (const i of level.spawnFallback[key])
      if (!level.spawnNodes[i]) add(`spawnFallback.${key} references missing node ${i}`);
  }
  if (!inAnyHall(level, level.playerStart.x, level.playerStart.z)) add('player start is outside every hall');
  if (level.radarOutline.length === 0 || level.radarOutline.some((p) => p.length < 3))
    add('radar outline needs polygons of 3+ points');
  return problems;
}
