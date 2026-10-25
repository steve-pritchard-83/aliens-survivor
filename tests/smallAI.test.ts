import { describe, it, expect } from 'vitest';
import {
  createSmallSim,
  spawnSmall,
  stepSmall,
  SmallPose,
  SmallEvents,
  SMALL_DEATH_SECONDS
} from '../src/entities/small/smallSim';
import { BALANCE } from '../src/data/balance';

const pose = (): SmallPose => ({ pitch: 0, roll: 0, melt: 0 });
const events = (): SmallEvents => ({ playerDamage: 0, leapHit: false, died: false });

// Player stands mid east spine facing the creature; creature spawns in the same hall
const PX = -0.32;
const PZ = 15;

function spawned(isFacehugger = true) {
  const e = createSmallSim();
  spawnSmall(e, -0.32, 0, 22.1, PX, PZ, isFacehugger);
  return e;
}

describe('small alien behaviour', () => {
  it('spawns with kind-specific hp and moves from SPAWNING to PURSUING', () => {
    const fh = spawned(true);
    const cb = spawned(false);
    expect(fh.hp).toBe(BALANCE.SMALL_ALIEN.FACEHUGGER_HP);
    expect(cb.hp).toBe(BALANCE.SMALL_ALIEN.CHESTBURSTER_HP);
    expect(fh.state).toBe('SPAWNING');
    const p = pose(),
      ev = events();
    for (let i = 0; i < 6; i++) stepSmall(fh, PX, PZ, 0, 0.1, p, ev);
    expect(fh.state).not.toBe('SPAWNING');
  });

  it('leaps when in the same hall inside the leap window', () => {
    const e = spawned();
    e.state = 'PURSUING';
    e.leapCooldown = 0;
    e.x = -0.32;
    e.z = PZ + 4;
    stepSmall(e, PX, PZ, 0, 0.016, pose(), events());
    expect(e.state).toBe('LEAPING');
  });

  it('a leap that connects damages the player once and starts attacking', () => {
    const e = spawned();
    e.state = 'LEAPING';
    e.stateTimer = 0.3;
    e.x = PX;
    e.z = PZ + 1.0;
    const ev = events();
    stepSmall(e, PX, PZ, 0, 0.016, pose(), ev);
    expect(ev.playerDamage).toBe(BALANCE.SMALL_ALIEN.LEAP_DAMAGE);
    expect(ev.leapHit).toBe(true);
    expect(e.state).toBe('ATTACKING');
  });

  it('bites on a fixed cadence while in range and gives up when the player escapes', () => {
    const e = spawned();
    e.state = 'ATTACKING';
    e.attackCooldown = 0.05;
    e.x = PX;
    e.z = PZ + 1.0;
    const ev = events();
    stepSmall(e, PX, PZ, 0, 0.1, pose(), ev);
    expect(ev.playerDamage).toBe(BALANCE.SMALL_ALIEN.BITE_DAMAGE);
    stepSmall(e, PX, PZ, 0, 0.1, pose(), ev);
    expect(ev.playerDamage).toBe(0);
    e.z = PZ + 5;
    stepSmall(e, PX, PZ, 0, 0.1, pose(), ev);
    expect(e.state).toBe('PURSUING');
  });

  it('dying reports melt progress and signals completion when the timer ends', () => {
    const e = spawned();
    e.state = 'DEAD';
    e.stateTimer = SMALL_DEATH_SECONDS;
    const p = pose(),
      ev = events();
    stepSmall(e, PX, PZ, 0, SMALL_DEATH_SECONDS / 2, p, ev);
    expect(p.melt).toBeCloseTo(0.5, 2);
    expect(ev.died).toBe(false);
    stepSmall(e, PX, PZ, 0, SMALL_DEATH_SECONDS, p, ev);
    expect(ev.died).toBe(true);
  });

  it('pursues around corridor corners toward a player in another hall without leaving the corridor', () => {
    const e = spawned();
    e.state = 'PURSUING';
    e.x = -0.32;
    e.z = 30;
    const p = pose(),
      ev = events();
    const startDist = Math.hypot(e.x - -13.48, e.z - 15);
    for (let i = 0; i < 600; i++) stepSmall(e, -13.48, 15, i * 0.016, 0.016, p, ev);
    expect(Math.hypot(e.x - -13.48, e.z - 15)).toBeLessThan(startDist);
  });
});
