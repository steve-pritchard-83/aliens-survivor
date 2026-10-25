import type { LevelDefinition, SpawnNode } from './LevelDefinition';

// USS Sulaco, Sector 4: a double-size figure-8 of five straight halls joined at six junctions.
// Junctions: 0=NE, 1=NW, 2=Mid-E, 3=Mid-W, 4=SE, 5=SW. Halls: 0 east spine, 1 west spine, 2 north, 3 middle, 4 south.

// 12 spawn locations across the sector
const SPAWN_NODES: SpawnNode[] = [
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

export const SULACO: LevelDefinition = {
  id: 'sulaco',
  name: 'USS Sulaco: Sector 4',
  halls: [
    { id: 'east_spine', rect: [-0.95, 0.32, 7.68, 36.52], lane: { axis: 'x', value: -0.32 }, corners: [0, 2, 4] },
    { id: 'west_spine', rect: [-14.12, -12.85, 7.68, 36.52], lane: { axis: 'x', value: -13.48 }, corners: [1, 3, 5] },
    { id: 'north_hall', rect: [-14.12, 0.32, 35.28, 36.52], lane: { axis: 'z', value: 35.9 }, corners: [0, 1] },
    { id: 'middle_hall', rect: [-14.12, 0.32, 21.48, 22.72], lane: { axis: 'z', value: 22.1 }, corners: [2, 3] },
    { id: 'south_hall', rect: [-14.12, 0.32, 7.68, 8.92], lane: { axis: 'z', value: 8.3 }, corners: [4, 5] }
  ],
  corners: [
    [-0.32, 35.9],
    [-13.48, 35.9],
    [-0.32, 22.1],
    [-13.48, 22.1],
    [-0.32, 8.3],
    [-13.48, 8.3]
  ],
  adjacency: [
    [1, 2],
    [0, 3],
    [0, 3, 4],
    [1, 2, 5],
    [2, 5],
    [3, 4]
  ],
  spawnNodes: SPAWN_NODES,
  spawnFallback: { xeno: [0, 4, 5, 6], small: [0, 4, 5, 10] },
  playerStart: { x: -0.32, z: 13.0, yaw: Math.PI },
  companionStart: { x: -0.32, z: 11.4 },
  radarOutline: [
    [
      [0.42, 7.58],
      [0.42, 36.62],
      [-14.22, 36.62],
      [-14.22, 7.58]
    ],
    [
      [-1.05, 9.02],
      [-12.75, 9.02],
      [-12.75, 21.38],
      [-1.05, 21.38]
    ],
    [
      [-1.05, 22.82],
      [-12.75, 22.82],
      [-12.75, 35.18],
      [-1.05, 35.18]
    ]
  ]
};
