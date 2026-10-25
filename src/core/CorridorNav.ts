export interface SpawnNode {
  id: string;
  label: string;
  position: [number, number, number];
  waypoints: [number, number, number][];
}

// 12 Multi-Directional Spawn Locations across Double-Size Figure-8 Sulaco Sector
export const CORRIDOR_SPAWN_NODES: SpawnNode[] = [
  { id: 'vent_ne_far', label: 'FAR NE JUNCTION VENT', position: [-0.32, 0.0, 35.9], waypoints: [[-0.32, 0.0, 32.5]] },
  {
    id: 'vent_east_north',
    label: 'NORTH-EAST SPINE GRATE',
    position: [-0.32, 0.0, 29.0],
    waypoints: [[-0.32, 0.0, 25.5]]
  },
  {
    id: 'vent_east_mid',
    label: 'CENTRAL EAST JUNCTION',
    position: [-0.32, 0.0, 22.1],
    waypoints: [[-0.32, 0.0, 18.5]]
  },
  {
    id: 'duct_east_ceiling',
    label: 'SOUTH-EAST CEILING DUCT',
    position: [-0.32, 1.85, 10.8],
    waypoints: [[-0.32, 0.0, 12.0]]
  },
  { id: 'vent_north_mid', label: 'FAR NORTH WING GRATE', position: [-6.9, 0.0, 35.9], waypoints: [[-4.2, 0.0, 35.9]] },
  { id: 'vent_nw_far', label: 'FAR NW CRYO JUNCTION', position: [-13.48, 0.0, 35.9], waypoints: [[-11.2, 0.0, 35.9]] },
  {
    id: 'vent_west_north',
    label: 'NORTH-WEST SPINE GRATE',
    position: [-13.48, 0.0, 29.0],
    waypoints: [[-13.48, 0.0, 25.5]]
  },
  {
    id: 'vent_mid_cross',
    label: 'CENTRAL CROSSWAY GRATE',
    position: [-6.9, 0.0, 22.1],
    waypoints: [[-3.8, 0.0, 22.1]]
  },
  {
    id: 'vent_nw_mid',
    label: 'CENTRAL WEST JUNCTION',
    position: [-13.48, 0.0, 22.1],
    waypoints: [[-13.48, 0.0, 18.5]]
  },
  {
    id: 'vent_west_south',
    label: 'SOUTH-WEST SPINE GRATE',
    position: [-13.48, 0.0, 15.2],
    waypoints: [[-13.48, 0.0, 18.0]]
  },
  { id: 'duct_sw_corner', label: 'SW AIRLOCK BREACH', position: [-13.48, 0.0, 8.3], waypoints: [[-11.2, 0.0, 8.3]] },
  { id: 'vent_south_mid', label: 'SOUTH WING FLOOR GRATE', position: [-6.9, 0.0, 8.3], waypoints: [[-3.8, 0.0, 8.3]] }
];

export function constrainToCorridor(x: number, z: number, margin = 0): [number, number] {
  const halls: [number, number, number, number][] = [
    [-0.95 + margin, 0.32 - margin, 7.68 + margin, 36.52 - margin],
    [-14.12 + margin, -12.85 - margin, 7.68 + margin, 36.52 - margin],
    [-14.12 + margin, 0.32 - margin, 35.28 + margin, 36.52 - margin],
    [-14.12 + margin, 0.32 - margin, 21.48 + margin, 22.72 - margin],
    [-14.12 + margin, 0.32 - margin, 7.68 + margin, 8.92 - margin]
  ];
  for (let i = 0; i < halls.length; i++) {
    const [minX, maxX, minZ, maxZ] = halls[i];
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return [x, z];
  }
  let bestX = x,
    bestZ = z,
    bestDist = Infinity;
  for (let i = 0; i < halls.length; i++) {
    const [minX, maxX, minZ, maxZ] = halls[i];
    const cx = Math.max(minX, Math.min(maxX, x)),
      cz = Math.max(minZ, Math.min(maxZ, z));
    const d = Math.hypot(x - cx, z - cz);
    if (d < bestDist) {
      bestDist = d;
      bestX = cx;
      bestZ = cz;
    }
  }
  return [bestX, bestZ];
}

// 6 Junctions across the Double-Size Figure-8 Sector: 0=NE, 1=NW, 2=Mid-E, 3=Mid-W, 4=SE, 5=SW
export const CORNERS: [number, number][] = [
  [-0.32, 35.9],
  [-13.48, 35.9],
  [-0.32, 22.1],
  [-13.48, 22.1],
  [-0.32, 8.3],
  [-13.48, 8.3]
];
export const HALL_CORNERS: number[][] = [
  [0, 2, 4],
  [1, 3, 5],
  [0, 1],
  [2, 3],
  [4, 5]
];
export const ADJ_CORNERS: number[][] = [
  [1, 2],
  [0, 3],
  [0, 3, 4],
  [1, 2, 5],
  [2, 5],
  [3, 4]
];

export function getHallId(x: number, z: number): number {
  const dE = Math.abs(x - -0.32),
    dW = Math.abs(x - -13.48),
    dN = Math.abs(z - 35.9),
    dM = Math.abs(z - 22.1),
    dS = Math.abs(z - 8.3);
  const m = Math.min(dE, dW, dN, dM, dS);
  return m === dE ? 0 : m === dW ? 1 : m === dN ? 2 : m === dM ? 3 : 4;
}

export function isSpawnVisibleToPlayer(sx: number, sz: number, px: number, pz: number, pyaw: number): boolean {
  const d = Math.hypot(sx - px, sz - pz);
  if (d < 8.5) return true;
  const sameHall =
    (Math.abs(sx - -0.32) < 1.1 && Math.abs(px - -0.32) < 1.1) ||
    (Math.abs(sx - -13.48) < 1.1 && Math.abs(px - -13.48) < 1.1) ||
    (Math.abs(sz - 35.9) < 1.1 && Math.abs(pz - 35.9) < 1.1) ||
    (Math.abs(sz - 22.1) < 1.1 && Math.abs(pz - 22.1) < 1.1) ||
    (Math.abs(sz - 8.3) < 1.1 && Math.abs(pz - 8.3) < 1.1);
  return sameHall && ((sx - px) * -Math.sin(pyaw) + (sz - pz) * -Math.cos(pyaw)) / d > -0.15;
}
