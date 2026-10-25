import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/core/GameStore';
import { BALANCE, UPGRADE_CATALOG, UPGRADE_EFFECTS } from '../src/data/balance';

const s = () => useGameStore.getState();

describe('store: pause, resume and simulation gating', () => {
  beforeEach(() => s().startGame());

  it('pauses only from PLAYING and resumes from PAUSED or LEVEL_UP', () => {
    s().pauseGame();
    expect(s().status).toBe('PAUSED');
    s().pauseGame();
    expect(s().status).toBe('PAUSED');
    s().resumeGame();
    expect(s().status).toBe('PLAYING');
    s().resumeGame();
    expect(s().status).toBe('PLAYING');
    useGameStore.setState({ status: 'LEVEL_UP' });
    s().resumeGame();
    expect(s().status).toBe('PLAYING');
  });

  it('tick does nothing unless PLAYING', () => {
    s().pauseGame();
    const t = s().timeRemaining;
    s().tick(1, 5);
    expect(s().timeRemaining).toBe(t);
  });

  it('takeDamage is ignored outside PLAYING and softens flashes in reduced-flash mode', () => {
    s().pauseGame();
    s().takeDamage(50, 1);
    expect(s().hp).toBe(BALANCE.PLAYER.MAX_HP);
    s().resumeGame();
    s().takeDamage(10, 1);
    const full = s().damageFlash;
    s().updateSettings({ reducedFlash: true });
    s().startGame();
    s().takeDamage(10, 1);
    expect(s().damageFlash).toBeLessThan(full);
    s().updateSettings({ reducedFlash: false });
  });

  it('regenerates health after the regen delay only', () => {
    s().takeDamage(40, 10);
    s().tick(1, 12);
    expect(s().hp).toBe(60);
    s().tick(1, 10 + BALANCE.PLAYER.REGEN_DELAY + 1);
    expect(s().hp).toBeCloseTo(60 + BALANCE.PLAYER.REGEN_RATE, 5);
  });
});

describe('store: weapon', () => {
  beforeEach(() => s().startGame());

  it('cannot fire while reloading or jammed', () => {
    useGameStore.setState({ isReloading: true });
    expect(s().fireRound()).toBe(false);
    useGameStore.setState({ isReloading: false, isJammed: true });
    expect(s().fireRound()).toBe(false);
  });

  it('emptying the magazine starts a reload that refills it', () => {
    useGameStore.setState({ ammo: 1 });
    expect(s().fireRound()).toBe(true);
    expect(s().ammo).toBe(0);
    expect(s().isReloading).toBe(true);
    s().tick(BALANCE.WEAPON.RELOAD_TIME / 2, 1);
    expect(s().isReloading).toBe(true);
    s().tick(BALANCE.WEAPON.RELOAD_TIME, 2);
    expect(s().isReloading).toBe(false);
    expect(s().ammo).toBe(s().maxAmmo);
  });

  it('manual reload is a no-op with a full magazine unless jammed, and clears a jam', () => {
    s().startReload();
    expect(s().isReloading).toBe(false);
    useGameStore.setState({ isJammed: true });
    s().startReload();
    expect(s().isReloading).toBe(true);
    s().tick(BALANCE.WEAPON.RELOAD_TIME + 0.1, 1);
    expect(s().isJammed).toBe(false);
  });

  it('counts shots fired and hits', () => {
    s().fireRound();
    s().registerHit();
    expect(s().shotsFired).toBe(1);
    expect(s().shotsHit).toBe(1);
  });
});

describe('store: progression and upgrades', () => {
  beforeEach(() => s().startGame());

  it('levels at most once per kill even when XP overshoots several thresholds', () => {
    s().registerKill('boss');
    expect(s().xp).toBe(BALANCE.XP.PRAETORIAN_KILL);
    expect(s().level).toBe(2);
    expect(s().status).toBe('LEVEL_UP');
  });

  it('awards XP by kill kind', () => {
    s().registerKill('small');
    expect(s().xp).toBe(BALANCE.XP.SMALL_KILL);
    s().registerKill('drone');
    expect(s().xp).toBe(BALANCE.XP.SMALL_KILL + BALANCE.XP.DRONE_KILL);
  });

  it('offers up to three distinct upgrades the player does not own yet', () => {
    useGameStore.setState({ activeUpgrades: ['fire_rate'] });
    s().registerKill('boss');
    const ids = s().offeredUpgrades.map((u) => u.id);
    expect(ids.length).toBe(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain('fire_rate');
  });

  it('keeps playing when every upgrade is already owned', () => {
    useGameStore.setState({ activeUpgrades: UPGRADE_CATALOG.map((u) => u.id) });
    s().registerKill('boss');
    expect(s().status).toBe('PLAYING');
    expect(s().offeredUpgrades).toHaveLength(0);
  });

  it('applies upgrade effects from the balance table', () => {
    s().chooseUpgrade('armor_boost');
    expect(s().maxHp).toBe(BALANCE.PLAYER.MAX_HP + UPGRADE_EFFECTS.armor_boost.maxHpBonus);
    expect(s().hp).toBe(s().maxHp);
    s().chooseUpgrade('fire_rate');
    expect(s().fireInterval).toBe(BALANCE.WEAPON.FIRE_INTERVAL_OVERCLOCKED);
    s().chooseUpgrade('extended_mag');
    expect(s().maxAmmo).toBe(BALANCE.WEAPON.MAGAZINE_EXTENDED);
    expect(s().ammo).toBe(BALANCE.WEAPON.MAGAZINE_EXTENDED);
  });

  it('a new run resets progression', () => {
    s().registerKill('boss');
    s().chooseUpgrade(s().offeredUpgrades[0].id);
    s().startGame();
    expect(s().xp).toBe(0);
    expect(s().level).toBe(1);
    expect(s().activeUpgrades).toHaveLength(0);
    expect(s().kills).toBe(0);
  });
});
