import { describe, it, expect, afterEach } from 'vitest';
import {
  LEVELS,
  validateLevel,
  getActiveLevel,
  setActiveLevel,
  DEFAULT_LEVEL_ID,
  LevelDefinition
} from '../src/levels';
import { SULACO } from '../src/levels/sulaco';
import { constrainToCorridor, getHallId, isSpawnVisibleToPlayer, sharesLane } from '../src/core/CorridorNav';
import { advanceCorner } from '../src/systems/corridorPathing';
import { pickSpawnNode } from '../src/systems/waveDirector';
import { freshRunState } from '../src/core/runState';
import { DEFAULT_SETTINGS } from '../src/core/Persistence';

/** A deliberately different map (one straight hall) used to prove the systems are level-agnostic. */
const STRAIGHT: LevelDefinition = {
  id: 'test_straight',
  name: 'Test: straight hall',
  halls: [{ id: 'main', rect: [-1, 1, 0, 40], lane: { axis: 'x', value: 0 }, corners: [0, 1] }],
  corners: [
    [0, 2],
    [0, 38]
  ],
  adjacency: [[1], [0]],
  spawnNodes: [
    { id: 'far', label: 'FAR', position: [0, 0, 38], waypoints: [[0, 0, 34]] },
    { id: 'mid', label: 'MID', position: [0, 0, 20], waypoints: [[0, 0, 22]] }
  ],
  spawnFallback: { xeno: [0], small: [1] },
  playerStart: { x: 0, z: 5, yaw: 0 },
  scene: { sparkEmitters: [], eggSpots: [], keyLight: [0, 2, 20], beacon: [0, 2, 5] },
  radarOutline: [
    [
      [1, 0],
      [1, 40],
      [-1, 40],
      [-1, 0]
    ]
  ]
};

const clone = (l: LevelDefinition): LevelDefinition => JSON.parse(JSON.stringify(l));

afterEach(() => setActiveLevel(DEFAULT_LEVEL_ID));

describe('level definitions', () => {
  it('every registered level is internally consistent', () => {
    for (const level of Object.values(LEVELS)) expect(validateLevel(level)).toEqual([]);
    expect(validateLevel(STRAIGHT)).toEqual([]);
  });

  it('the Sulaco matches its documented shape', () => {
    expect(SULACO.halls).toHaveLength(5);
    expect(SULACO.corners).toHaveLength(6);
    expect(SULACO.spawnNodes).toHaveLength(12);
    expect(getActiveLevel()).toBe(SULACO);
  });

  it('the validator catches each kind of mistake', () => {
    const cases: [string, (l: LevelDefinition) => void, RegExp][] = [
      ['lane outside the hall', (l) => (l.halls[0].lane = { axis: 'x', value: 50 }), /lane lies outside/],
      ['missing corner', (l) => (l.halls[0].corners = [0, 99]), /missing corner 99/],
      ['corner off its lane', (l) => ((l.corners as [number, number][])[0] = [0.5, 2]), /not on the lane/],
      ['asymmetric adjacency', (l) => (l.adjacency = [[1], []]), /not symmetric/],
      ['spawn outside', (l) => (l.spawnNodes[0].position = [50, 0, 50]), /outside every hall/],
      ['duplicate spawn ids', (l) => (l.spawnNodes[1].id = l.spawnNodes[0].id), /not unique/],
      ['bad fallback', (l) => (l.spawnFallback = { xeno: [9], small: [0] }), /missing node 9/],
      ['start outside', (l) => (l.playerStart = { x: 99, z: 99, yaw: 0 }), /player start/],
      ['no halls', (l) => (l.halls = []), /no halls/],
      ['tiny outline', (l) => (l.radarOutline = [[[0, 0]]]), /radar outline/]
    ];
    for (const [name, mutate, expected] of cases) {
      const level = clone(STRAIGHT);
      mutate(level);
      expect(validateLevel(level).join('\n'), name).toMatch(expected);
    }
  });
});

describe('systems follow the active level', () => {
  it('rejects unknown levels', () => {
    expect(() => setActiveLevel('nope')).toThrow('Unknown level');
  });

  it('clamping, hall lookup and pathing use the active level', () => {
    LEVELS[STRAIGHT.id] = STRAIGHT;
    try {
      setActiveLevel(STRAIGHT.id);
      expect(constrainToCorridor(5, 20)[0]).toBeCloseTo(1);
      expect(constrainToCorridor(0, -10)[1]).toBeCloseTo(0);
      expect(getHallId(0.2, 12)).toBe(0);
      // same hall: head straight for the goal; no corner route needed
      expect(advanceCorner(-1, 0, 0, 0, 10, 0, 30)).toBe(-1);
      expect(sharesLane(0.1, 10, 0.5, 10.5)).toBe(true);
      expect(sharesLane(2, 10, 2.2, 10.5)).toBe(false);
    } finally {
      delete LEVELS[STRAIGHT.id];
    }
  });

  it('spawn selection and visibility use the active level', () => {
    LEVELS[STRAIGHT.id] = STRAIGHT;
    try {
      setActiveLevel(STRAIGHT.id);
      // Player at the south end facing north: the far node is in the same hall and ahead, so it is visible;
      // the mid node is 15 m away but also ahead. Facing south (yaw 0) both are behind and hidden.
      expect(isSpawnVisibleToPlayer(0, 38, 0, 5, Math.PI)).toBe(true);
      expect(isSpawnVisibleToPlayer(0, 38, 0, 5, 0)).toBe(false);
      const picked = pickSpawnNode(0, 5, 0, -1, STRAIGHT.spawnFallback.xeno, () => 0);
      expect(STRAIGHT.spawnNodes[picked]).toBeDefined();
      // Everything visible: the level's own fallback list is used
      const all = pickSpawnNode(0, 30, Math.PI, -1, STRAIGHT.spawnFallback.small, () => 0);
      expect([0, 1]).toContain(all);
    } finally {
      delete LEVELS[STRAIGHT.id];
    }
  });

  it('a new run starts at the active level start position', () => {
    LEVELS[STRAIGHT.id] = STRAIGHT;
    try {
      setActiveLevel(STRAIGHT.id);
      const run = freshRunState(DEFAULT_SETTINGS);
      expect(run.playerPos).toEqual([0, 1.15, 5]);
      expect(run.playerYaw).toBe(0);
    } finally {
      delete LEVELS[STRAIGHT.id];
    }
    setActiveLevel(DEFAULT_LEVEL_ID);
    expect(freshRunState(DEFAULT_SETTINGS).playerPos).toEqual([-0.32, 1.15, 13]);
  });
});
