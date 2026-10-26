import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/core/GameStore';
import { BALANCE } from '../src/data/balance';
import {
  DIFFICULTY,
  DIFFICULTY_ORDER,
  DEFAULT_DIFFICULTY,
  cycleDifficulty,
  resolveRules
} from '../src/data/difficulty';
import { scaledHp, scaledSpawnInterval, spawnInterval } from '../src/systems/waveDirector';
import { createSmallSim, spawnSmall } from '../src/entities/small/smallSim';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../src/core/Persistence';

const s = () => useGameStore.getState();

describe('difficulty profiles', () => {
  it('marine reproduces the original balance exactly and is the default', () => {
    const m = DIFFICULTY.marine;
    expect(DEFAULT_DIFFICULTY).toBe('marine');
    expect(DEFAULT_SETTINGS.difficulty).toBe('marine');
    expect(m.spawnIntervalMult).toBe(1);
    expect(m.enemyHpMult).toBe(1);
    expect(m.enemyDamageMult).toBe(1);
    expect(m.maxConcurrentDrones).toBe(BALANCE.XENO_POOL.MAX_CONCURRENT);
    expect(m.regenRate).toBe(BALANCE.PLAYER.REGEN_RATE);
  });

  it('gets harder from recruit to ultimate badass on every axis', () => {
    const [r, m, u] = DIFFICULTY_ORDER.map((id) => DIFFICULTY[id]);
    expect(r.spawnIntervalMult).toBeGreaterThan(m.spawnIntervalMult);
    expect(m.spawnIntervalMult).toBeGreaterThan(u.spawnIntervalMult);
    expect(r.enemyHpMult).toBeLessThan(m.enemyHpMult);
    expect(m.enemyHpMult).toBeLessThan(u.enemyHpMult);
    expect(r.enemyDamageMult).toBeLessThan(m.enemyDamageMult);
    expect(m.enemyDamageMult).toBeLessThan(u.enemyDamageMult);
    expect(u.maxConcurrentDrones).toBeGreaterThan(m.maxConcurrentDrones);
    expect(r.regenRate).toBeGreaterThan(m.regenRate);
    expect(m.regenRate).toBeGreaterThan(u.regenRate);
    expect(u.maxConcurrentDrones).toBeLessThanOrEqual(BALANCE.XENO_POOL.MAX_DRONES);
  });

  it('resolves to a frozen rules object carrying the id', () => {
    const rules = resolveRules('recruit');
    expect(rules.difficulty).toBe('recruit');
    expect(rules.label).toBe('RECRUIT');
    expect(Object.isFrozen(rules)).toBe(true);
  });

  it('cycles with wrap-around in both directions', () => {
    expect(cycleDifficulty('recruit', 1)).toBe('marine');
    expect(cycleDifficulty('ultimate_badass', 1)).toBe('recruit');
    expect(cycleDifficulty('recruit', -1)).toBe('ultimate_badass');
  });

  it('persisted values are validated', () => {
    expect(sanitizeSettings({ difficulty: 'ultimate_badass' }).difficulty).toBe('ultimate_badass');
    expect(sanitizeSettings({ difficulty: 'nightmare' }).difficulty).toBe('marine');
    expect(sanitizeSettings({}).difficulty).toBe('marine');
  });
});

describe('difficulty in play', () => {
  beforeEach(() => {
    s().updateSettings({ difficulty: 'marine' });
    s().startGame();
  });

  it('is resolved when a run starts and cannot change mid-run', () => {
    s().updateSettings({ difficulty: 'ultimate_badass' });
    expect(s().rules.difficulty).toBe('marine');
    s().startGame();
    expect(s().rules.difficulty).toBe('ultimate_badass');
    s().updateSettings({ difficulty: 'marine' });
  });

  it('scales damage taken by the enemy damage multiplier', () => {
    s().updateSettings({ difficulty: 'ultimate_badass' });
    s().startGame();
    s().takeDamage(10, 1);
    expect(s().hp).toBeCloseTo(BALANCE.PLAYER.MAX_HP - 10 * DIFFICULTY.ultimate_badass.enemyDamageMult);
    s().updateSettings({ difficulty: 'recruit' });
    s().startGame();
    s().takeDamage(10, 1);
    expect(s().hp).toBeCloseTo(BALANCE.PLAYER.MAX_HP - 10 * DIFFICULTY.recruit.enemyDamageMult);
  });

  it('regenerates at the difficulty rate', () => {
    s().updateSettings({ difficulty: 'recruit' });
    s().startGame();
    s().takeDamage(40, 10);
    const hp = s().hp;
    s().tick(1, 10 + BALANCE.PLAYER.REGEN_DELAY + 1);
    expect(s().hp - hp).toBeCloseTo(DIFFICULTY.recruit.regenRate, 5);
  });

  it('scales spawn intervals and hit points, identically to the base on marine', () => {
    for (const phase of [1, 2, 3, 4] as const) {
      expect(scaledSpawnInterval(phase, DIFFICULTY.marine)).toBe(spawnInterval(phase));
      expect(scaledSpawnInterval(phase, DIFFICULTY.recruit)).toBeGreaterThan(spawnInterval(phase));
      expect(scaledSpawnInterval(phase, DIFFICULTY.ultimate_badass)).toBeLessThan(spawnInterval(phase));
    }
    expect(scaledHp(300, DIFFICULTY.marine)).toBe(300);
    expect(scaledHp(300, DIFFICULTY.ultimate_badass)).toBe(375);
    expect(scaledHp(BALANCE.QUEEN.HP, DIFFICULTY.recruit)).toBe(880);
  });

  it('small aliens spawn with scaled hit points', () => {
    const e = createSmallSim();
    spawnSmall(e, 0, 0, 0, 0, 0, true, 1.25);
    expect(e.hp).toBe(Math.round(BALANCE.SMALL_ALIEN.FACEHUGGER_HP * 1.25));
    spawnSmall(e, 0, 0, 0, 0, 0, false);
    expect(e.hp).toBe(BALANCE.SMALL_ALIEN.CHESTBURSTER_HP);
  });
});
