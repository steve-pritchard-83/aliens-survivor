import { BALANCE, UPGRADE_EFFECTS } from '../data/balance';

/** Per-shot weapon damage before any target modifiers. */
export function weaponDamage(hasArmorPiercing: boolean): number {
  return BALANCE.WEAPON.BASE_DAMAGE * (hasArmorPiercing ? BALANCE.WEAPON.AP_MULTIPLIER : 1);
}

/** Damage a drone or boss actually takes from a shot of `amount`. */
export function damageAgainstXeno(amount: number, isSpawning: boolean, isBoss: boolean): number {
  return (
    amount *
    (isSpawning ? BALANCE.WEAPON.SPAWNING_TARGET_DAMAGE_SCALE : 1) *
    (isBoss ? BALANCE.PRAETORIAN.DAMAGE_TAKEN_MULT : 1)
  );
}

/** Damage the player takes, after upgrade resistances. */
export function incomingDamage(amount: number, isAcid: boolean, upgrades: readonly string[]): number {
  return isAcid && upgrades.includes('acid_proofing') ? amount * UPGRADE_EFFECTS.acid_proofing.acidDamageMult : amount;
}
