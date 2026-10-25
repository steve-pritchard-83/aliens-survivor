import type { SoundKey } from '../core/AudioCatalog';

export type WeaponId = 'm41a';

/** Everything that differs between weapons. Target-side rules (armor-piercing multiplier etc.) stay in BALANCE. */
export interface WeaponProfile {
  id: WeaponId;
  label: string;
  /** Short name for compact readouts. */
  shortLabel: string;
  /** Key of the 3D viewmodel the renderer should show (art lives in the entity layer). */
  viewModel: string;
  /** Damage per round before upgrades and target modifiers. */
  damage: number;
  fireInterval: number;
  /** Fire interval after the Overclocked Actuator upgrade. */
  overclockedFireInterval: number;
  magazine: number;
  /** Magazine after the extended-drum upgrade. */
  extendedMagazine: number;
  reloadTime: number;
  spreadPerSecond: number;
  spreadMax: number;
  /** Continuous-fire seconds before the weapon jams. */
  jamThresholdSeconds: number;
  /** Maximum hitscan range, metres. */
  maxRange: number;
  /** Sounds randomly chosen for each shot. */
  shotSounds: readonly SoundKey[];
}

export const WEAPONS: Record<WeaponId, WeaponProfile> = {
  m41a: {
    id: 'm41a',
    label: 'M41A PULSE RIFLE',
    shortLabel: 'M41A',
    viewModel: 'pulse_rifle',
    damage: 24,
    fireInterval: 0.085,
    overclockedFireInterval: 0.065,
    magazine: 99,
    extendedMagazine: 150,
    reloadTime: 2.5,
    spreadPerSecond: 0.007,
    spreadMax: 0.03,
    jamThresholdSeconds: 5.0,
    maxRange: 32,
    shotSounds: ['pulse_shot', 'pulse_shot2', 'pulse_shot3', 'pulse_shot4']
  }
};

/** Order used by weapon cycling. */
export const WEAPON_ORDER: readonly WeaponId[] = ['m41a'];
export const DEFAULT_WEAPON: WeaponId = 'm41a';

/** The weapon after `current` in `order`, wrapping around (the same weapon when it is the only one). */
export function nextWeapon(current: WeaponId, order: readonly WeaponId[] = WEAPON_ORDER): WeaponId {
  const i = order.indexOf(current);
  return order[(i + 1) % order.length] ?? current;
}
