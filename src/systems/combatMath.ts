import { BALANCE, UPGRADE_EFFECTS } from '../data/balance';

/** Per-shot damage of a weapon before target modifiers (the armor-piercing upgrade applies to every weapon). */
export function weaponDamage(weapon: { damage: number }, hasArmorPiercing: boolean): number {
  return weapon.damage * (hasArmorPiercing ? BALANCE.WEAPON.AP_MULTIPLIER : 1);
}

/** Damage a drone or boss actually takes from a shot of `amount`. */
export function damageAgainstXeno(amount: number, isSpawning: boolean, isBoss: boolean): number {
  return (
    amount *
    (isSpawning ? BALANCE.WEAPON.SPAWNING_TARGET_DAMAGE_SCALE : 1) *
    (isBoss ? BALANCE.QUEEN.DAMAGE_TAKEN_MULT : 1)
  );
}

/** Damage the player takes, after upgrade resistances. */
export function incomingDamage(amount: number, isAcid: boolean, upgrades: readonly string[]): number {
  return isAcid && upgrades.includes('acid_proofing') ? amount * UPGRADE_EFFECTS.acid_proofing.acidDamageMult : amount;
}
