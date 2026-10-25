import { describe, it, expect } from 'vitest';
import { weaponDamage, damageAgainstXeno, incomingDamage } from '../src/systems/combatMath';
import { spawnInterval, droneBaseSpeed, droneMaxHp, pickSpawnNode } from '../src/systems/waveDirector';
import { CORRIDOR_SPAWN_NODES, isSpawnVisibleToPlayer } from '../src/core/CorridorNav';
import { BALANCE } from '../src/data/balance';
import { WEAPONS } from '../src/data/weapons';

describe('combatMath', () => {
  it('applies the armor-piercing multiplier to weapon damage', () => {
    expect(weaponDamage(WEAPONS.m41a, false)).toBe(WEAPONS.m41a.damage);
    expect(weaponDamage(WEAPONS.m41a, true)).toBeCloseTo(WEAPONS.m41a.damage * BALANCE.WEAPON.AP_MULTIPLIER);
    expect(weaponDamage({ damage: 100 }, true)).toBeCloseTo(100 * BALANCE.WEAPON.AP_MULTIPLIER);
  });

  it('boss takes reduced damage and emerging aliens take less', () => {
    expect(damageAgainstXeno(24, false, false)).toBe(24);
    expect(damageAgainstXeno(24, true, false)).toBeCloseTo(18);
    expect(damageAgainstXeno(24, false, true)).toBeCloseTo(24 * BALANCE.PRAETORIAN.DAMAGE_TAKEN_MULT);
    expect(damageAgainstXeno(24, true, true)).toBeCloseTo(18 * BALANCE.PRAETORIAN.DAMAGE_TAKEN_MULT);
  });

  it('acid resistance only applies to acid damage and only with the upgrade', () => {
    expect(incomingDamage(20, true, [])).toBe(20);
    expect(incomingDamage(20, false, ['acid_proofing'])).toBe(20);
    expect(incomingDamage(20, true, ['acid_proofing'])).toBe(10);
  });
});

describe('waveDirector tables', () => {
  it('escalates by phase', () => {
    expect(spawnInterval(1)).toBeGreaterThan(spawnInterval(4));
    expect(droneBaseSpeed(1)).toBeLessThan(droneBaseSpeed(4));
    expect(droneMaxHp(1)).toBeLessThan(droneMaxHp(4));
  });
});

describe('pickSpawnNode', () => {
  it('only picks nodes that are hidden from the player', () => {
    const px = -0.32,
      pz = 13,
      yaw = Math.PI;
    for (let r = 0; r < 20; r++) {
      const idx = pickSpawnNode(px, pz, yaw, -1, [0], () => r / 20);
      const p = CORRIDOR_SPAWN_NODES[idx].position;
      expect(isSpawnVisibleToPlayer(p[0], p[2], px, pz, yaw)).toBe(false);
    }
  });

  it('avoids repeating the last node when there is a choice', () => {
    const a = pickSpawnNode(-0.32, 13, Math.PI, -1, [0], () => 0);
    const b = pickSpawnNode(-0.32, 13, Math.PI, a, [0], () => 0);
    expect(b).not.toBe(a);
  });
});
