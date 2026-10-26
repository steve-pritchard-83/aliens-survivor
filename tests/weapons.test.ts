import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { WEAPONS, WEAPON_ORDER, DEFAULT_WEAPON, nextWeapon, WeaponId, WeaponProfile } from '../src/data/weapons';
import { useGameStore } from '../src/core/GameStore';
import { UPGRADE_CATALOG } from '../src/data/balance';
import { CombatSystem, TargetProvider } from '../src/core/CombatEvents';
import { AudioManager } from '../src/core/AudioManager';
import { createRifleState } from '../src/entities/rifle/RifleState';
import { updateFiring, FireContext } from '../src/entities/rifle/rifleFiring';
import { InputManagerController } from '../src/core/InputManager';

const s = () => useGameStore.getState();
const registry = WEAPONS as Record<string, WeaponProfile>;

/** A made-up second weapon, registered only for the duration of a test. */
const TEST_WEAPON: WeaponProfile = {
  id: 'm41a',
  label: 'TEST CANNON',
  shortLabel: 'TEST',
  viewModel: 'none',
  damage: 77,
  fireInterval: 0.3,
  overclockedFireInterval: 0.2,
  magazine: 10,
  extendedMagazine: 20,
  reloadTime: 1.5,
  spreadPerSecond: 0,
  spreadMax: 0,
  jamThresholdSeconds: 2,
  maxRange: 12,
  shotSounds: ['pulse_shot']
};
const TEST_ID = 'test_cannon' as WeaponId;

describe('weapon registry', () => {
  it('every ordered weapon has a complete, sane profile', () => {
    expect(WEAPON_ORDER).toContain(DEFAULT_WEAPON);
    for (const id of WEAPON_ORDER) {
      const w = WEAPONS[id];
      expect(w.id).toBe(id);
      expect(w.label.length).toBeGreaterThan(0);
      expect(w.damage).toBeGreaterThan(0);
      expect(w.fireInterval).toBeGreaterThan(0);
      expect(w.overclockedFireInterval).toBeLessThan(w.fireInterval);
      expect(w.extendedMagazine).toBeGreaterThanOrEqual(w.magazine);
      expect(w.reloadTime).toBeGreaterThan(0);
      expect(w.maxRange).toBeGreaterThan(0);
      expect(w.shotSounds.length).toBeGreaterThan(0);
    }
  });

  it('the M41A keeps exactly the pre-framework numbers', () => {
    expect(WEAPONS.m41a).toMatchObject({
      damage: 24,
      fireInterval: 0.085,
      overclockedFireInterval: 0.065,
      magazine: 99,
      extendedMagazine: 150,
      reloadTime: 2.5,
      spreadPerSecond: 0.007,
      spreadMax: 0.03,
      jamThresholdSeconds: 5,
      maxRange: 32
    });
  });

  it('nextWeapon wraps and is stable with a single weapon', () => {
    expect(nextWeapon('m41a')).toBe('m41a');
    const order = ['m41a', TEST_ID] as WeaponId[];
    expect(nextWeapon('m41a', order)).toBe(TEST_ID);
    expect(nextWeapon(TEST_ID, order)).toBe('m41a');
  });
});

describe('weapon switching in the store', () => {
  beforeEach(() => {
    registry[TEST_ID] = TEST_WEAPON;
    s().startGame();
  });
  afterEach(() => {
    delete registry[TEST_ID];
  });

  it('with one registered weapon, cycling does nothing', () => {
    s().cycleWeapon();
    expect(s().activeWeapon).toBe('m41a');
    expect(s().isReloading).toBe(false);
  });

  it('switching swaps the profile, costs a reload and keeps owned upgrades', () => {
    for (const id of ['extended_mag', 'fire_rate']) {
      useGameStore.setState({ status: 'LEVEL_UP', offeredUpgrades: UPGRADE_CATALOG.filter((u) => u.id === id) });
      s().chooseUpgrade(id);
    }
    s().cycleWeapon(['m41a', TEST_ID] as WeaponId[]);
    expect(s().activeWeapon).toBe(TEST_ID);
    expect(s().maxAmmo).toBe(TEST_WEAPON.extendedMagazine);
    expect(s().fireInterval).toBe(TEST_WEAPON.overclockedFireInterval);
    expect(s().isReloading).toBe(true);
    expect(s().fireRound()).toBe(false);
    s().tick(TEST_WEAPON.reloadTime + 0.1, 1);
    expect(s().isReloading).toBe(false);
    expect(s().ammo).toBe(TEST_WEAPON.extendedMagazine);
  });

  it('a new run goes back to the default weapon with its stock magazine', () => {
    s().cycleWeapon(['m41a', TEST_ID] as WeaponId[]);
    s().startGame();
    expect(s().activeWeapon).toBe(DEFAULT_WEAPON);
    expect(s().maxAmmo).toBe(WEAPONS.m41a.magazine);
  });

  it('cannot switch while paused', () => {
    s().pauseGame();
    s().cycleWeapon(['m41a', TEST_ID] as WeaponId[]);
    expect(s().activeWeapon).toBe('m41a');
  });
});

describe('the rifle follows the active weapon profile', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 1, 0);
  camera.lookAt(0, 1, -10);
  camera.updateMatrixWorld(true);
  const ctx: FireContext = { camera, weapon: null, muzzle: null };

  beforeEach(() => {
    registry[TEST_ID] = TEST_WEAPON;
    CombatSystem.unregisterProvider('xeno');
    CombatSystem.unregisterEnvRaycaster();
    s().startGame();
    useGameStore.setState({ activeWeapon: TEST_ID, ammo: 10, maxAmmo: 10, fireInterval: TEST_WEAPON.fireInterval });
  });
  afterEach(() => {
    delete registry[TEST_ID];
    vi.restoreAllMocks();
  });

  it('uses the weapon damage, range, fire interval and shot sounds', () => {
    const applyHit = vi.fn();
    const ranges: number[] = [];
    const provider: TargetProvider = {
      query: (origin, _dir, maxDist, out) => {
        ranges.push(maxDist);
        out.id = 0;
        out.point.set(origin.x, origin.y, origin.z - 5);
        return 5;
      },
      applyHit
    };
    CombatSystem.registerProvider('xeno', provider);
    const sound = vi.spyOn(AudioManager, 'playPulseShot').mockImplementation(() => undefined);
    const rs = createRifleState();
    updateFiring(rs, s(), true, 0.016, ctx);
    expect(applyHit.mock.calls[0][4].amount).toBe(TEST_WEAPON.damage);
    expect(ranges[0]).toBe(TEST_WEAPON.maxRange);
    // The 0.016 s overshoot of the first frame is carried into the next interval
    expect(rs.fireCooldown).toBeCloseTo(TEST_WEAPON.fireInterval - 0.016);
    expect(sound).toHaveBeenCalledWith(TEST_WEAPON.shotSounds);
    CombatSystem.unregisterProvider('xeno');
  });

  it('jams at the weapon threshold and the armor-piercing upgrade scales the weapon damage', () => {
    const rs = createRifleState();
    rs.continuousFire = TEST_WEAPON.jamThresholdSeconds;
    updateFiring(rs, s(), true, 0.1, ctx);
    expect(s().isJammed).toBe(true);

    s().startGame();
    useGameStore.setState({ activeWeapon: TEST_ID, ammo: 10, maxAmmo: 10, activeUpgrades: ['ap_ammo'] });
    const applyHit = vi.fn();
    CombatSystem.registerProvider('xeno', {
      query: (o, _d, _m, out) => {
        out.id = 0;
        out.point.set(o.x, o.y, o.z - 4);
        return 4;
      },
      applyHit
    });
    updateFiring(createRifleState(), s(), true, 0.016, ctx);
    expect(applyHit.mock.calls[0][4].amount).toBeCloseTo(TEST_WEAPON.damage * 1.4);
    CombatSystem.unregisterProvider('xeno');
  });
});

describe('weapon input', () => {
  it('Q raises the weapon-cycle flag', () => {
    const input = new InputManagerController();
    (input as unknown as { onKeyDown: (e: object) => void }).onKeyDown({
      code: 'KeyQ',
      preventDefault: () => undefined
    });
    expect(input.weaponCycleFlag).toBe(true);
  });
});
