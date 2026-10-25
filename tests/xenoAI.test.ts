import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { PooledXenomorph } from '../src/entities/XenoTypes';
import { stepXeno, XenoPose, XenoEvents } from '../src/entities/xeno/xenoAI';
import { stepXenoDeath, XENO_DEATH_SECONDS } from '../src/entities/xeno/xenoDeath';
import { applyXenoHit, DeathCounter } from '../src/entities/xeno/xenoDamage';
import { useGameStore } from '../src/core/GameStore';
import { BALANCE } from '../src/data/balance';

const pose = (): XenoPose => ({ pitch: 0, roll: 0 });
const events = (): XenoEvents => ({ playerDamage: 0, leapHit: false, slash: false, leapStarted: false });

function makeXeno(overrides: Partial<PooledXenomorph> = {}): PooledXenomorph {
  const cloned = new THREE.Group();
  return {
    id: 0,
    active: true,
    isBoss: false,
    state: 'PURSUING',
    hp: 300,
    maxHp: 300,
    x: -0.32,
    y: 0,
    z: 20,
    yaw: 0,
    speed: 3,
    laneOffset: 0,
    preferCW: true,
    animPhase: 0,
    deathVariant: 0,
    targetCorner: -1,
    leapCooldown: 0,
    leapVx: 0,
    leapVz: 0,
    leapDuration: 0.78,
    leapArc: 0.96,
    stateTimer: 0,
    attackCooldown: 0,
    gaitTimer: 99,
    root: new THREE.Group(),
    clonedMeshGroup: cloned,
    mixer: new THREE.AnimationMixer(cloned),
    actions: {},
    currentClip: '',
    materials: [],
    limbBones: [null, null, null, null, null],
    severedLimbs: [false, false, false, false, false],
    ...overrides
  };
}

// Player mid east spine; a drone 6m away in the same hall is inside the leap window
const PX = -0.32;
const PZ = 14;

describe('xeno AI', () => {
  afterEach(() => vi.restoreAllMocks());

  it('leaps when in the same hall, inside the window, with legs intact', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // the leap trigger is a random roll per frame
    const x = makeXeno({ z: PZ + 6 });
    const ev = events();
    stepXeno(x, PX, PZ, 0.016, pose(), ev);
    expect(x.state).toBe('LEAPING');
    expect(ev.leapStarted).toBe(true);
  });

  it('does not leap with a severed leg', () => {
    const x = makeXeno({ z: PZ + 6, severedLimbs: [false, false, true, false, false] });
    stepXeno(x, PX, PZ, 0.016, pose(), events());
    expect(x.state).toBe('PURSUING');
  });

  it('does not leap while the cooldown is running', () => {
    const x = makeXeno({ z: PZ + 6, leapCooldown: 2 });
    stepXeno(x, PX, PZ, 0.016, pose(), events());
    expect(x.state).toBe('PURSUING');
  });

  it('a leap that connects deals leap damage once and switches to attacking', () => {
    const x = makeXeno({ state: 'LEAPING', stateTimer: 0.4, z: PZ + 1.2 });
    const ev = events();
    stepXeno(x, PX, PZ, 0.016, pose(), ev);
    expect(ev.playerDamage).toBe(BALANCE.XENO_POOL.LEAP_DAMAGE);
    expect(ev.leapHit).toBe(true);
    expect(x.state).toBe('ATTACKING');
  });

  it('slashes on the configured interval while in melee range', () => {
    const x = makeXeno({ state: 'ATTACKING', attackCooldown: 0.05, z: PZ + 1.2 });
    const ev = events();
    stepXeno(x, PX, PZ, 0.1, pose(), ev);
    expect(ev.playerDamage).toBe(BALANCE.XENO_POOL.SLASH_DAMAGE);
    expect(ev.slash).toBe(true);
    expect(x.attackCooldown).toBe(BALANCE.XENO_POOL.SLASH_INTERVAL);
    stepXeno(x, PX, PZ, 0.5, pose(), ev);
    expect(ev.playerDamage).toBe(0);
  });

  it('returns to pursuing when the player steps out of melee range', () => {
    const x = makeXeno({ state: 'ATTACKING', z: PZ + 4 });
    stepXeno(x, PX, PZ, 0.016, pose(), events());
    expect(x.state).toBe('PURSUING');
  });

  it('emerging drones become pursuers after their spawn timer', () => {
    const x = makeXeno({ state: 'SPAWNING', stateTimer: 0.05, y: 1.8, z: 30 });
    stepXeno(x, PX, PZ, 0.1, pose(), events());
    expect(x.state).toBe('PURSUING');
    expect(x.y).toBe(0);
  });

  it('death animation finishes after its duration and deactivates the drone', () => {
    const x = makeXeno({ state: 'DEAD', stateTimer: XENO_DEATH_SECONDS });
    expect(stepXenoDeath(x, XENO_DEATH_SECONDS / 2, pose())).toBe(false);
    expect(x.active).toBe(true);
    expect(stepXenoDeath(x, XENO_DEATH_SECONDS, pose())).toBe(true);
    expect(x.active).toBe(false);
  });
});

describe('xeno damage', () => {
  let counter: DeathCounter;
  const origin = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(0, 0, -1);
  const point = new THREE.Vector3(-0.32, 0.9, 10);

  beforeEach(() => {
    counter = { n: 0 };
    useGameStore.getState().startGame();
  });

  it('applies weapon damage, boss resistance and emerging scaling', () => {
    const drone = makeXeno();
    applyXenoHit(drone, point, origin, dir, { amount: 24, source: 'player' }, null, counter);
    expect(drone.hp).toBeCloseTo(300 - 24);
    const boss = makeXeno({ isBoss: true, hp: 1100, maxHp: 1100 });
    applyXenoHit(boss, point, origin, dir, { amount: 24, source: 'player' }, null, counter);
    expect(boss.hp).toBeCloseTo(1100 - 24 * BALANCE.PRAETORIAN.DAMAGE_TAKEN_MULT);
    const emerging = makeXeno({ state: 'SPAWNING' });
    applyXenoHit(emerging, point, origin, dir, { amount: 24, source: 'player' }, null, counter);
    expect(emerging.hp).toBeCloseTo(300 - 18);
  });

  it('a killing shot kills once, awards a kill and cycles death variants', () => {
    const before = useGameStore.getState().kills;
    const a = makeXeno({ hp: 10 });
    applyXenoHit(a, point, origin, dir, { amount: 24, source: 'player' }, null, counter);
    expect(a.state).toBe('DEAD');
    expect(useGameStore.getState().kills).toBe(before + 1);
    const b = makeXeno({ hp: 10 });
    applyXenoHit(b, point, origin, dir, { amount: 24, source: 'player' }, null, counter);
    expect(b.deathVariant).toBe((a.deathVariant + 1) % 4);
  });

  it('a boss kill awards boss XP', () => {
    const xpBefore = useGameStore.getState().xp;
    const boss = makeXeno({ isBoss: true, hp: 5, maxHp: 1100 });
    applyXenoHit(boss, point, origin, dir, { amount: 24, source: 'player' }, null, counter);
    expect(useGameStore.getState().xp).toBeGreaterThanOrEqual(xpBefore + BALANCE.XP.PRAETORIAN_KILL);
  });
});
