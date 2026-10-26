import { BALANCE } from './balance';

export type DifficultyId = 'recruit' | 'marine' | 'ultimate_badass';

export const DIFFICULTY_ORDER: readonly DifficultyId[] = ['recruit', 'marine', 'ultimate_badass'];

export interface DifficultyProfile {
  label: string;
  /** Multiplies spawn intervals (higher = fewer enemies). */
  spawnIntervalMult: number;
  /** Multiplies drone, Alien Queen and small-alien hit points. */
  enemyHpMult: number;
  /** Multiplies every hit the player takes from enemies. */
  enemyDamageMult: number;
  /** Maximum drones alive at once (the pool itself stays at 6). */
  maxConcurrentDrones: number;
  /** Player health regeneration per second after the regen delay. */
  regenRate: number;
}

/** `marine` reproduces the original balance exactly; the others scale it. */
export const DIFFICULTY: Record<DifficultyId, DifficultyProfile> = {
  recruit: {
    label: 'RECRUIT',
    spawnIntervalMult: 1.4,
    enemyHpMult: 0.8,
    enemyDamageMult: 0.7,
    maxConcurrentDrones: 2,
    regenRate: 3.0
  },
  marine: {
    label: 'MARINE',
    spawnIntervalMult: 1,
    enemyHpMult: 1,
    enemyDamageMult: 1,
    maxConcurrentDrones: BALANCE.XENO_POOL.MAX_CONCURRENT,
    regenRate: BALANCE.PLAYER.REGEN_RATE
  },
  ultimate_badass: {
    label: 'ULTIMATE BADASS',
    spawnIntervalMult: 0.75,
    enemyHpMult: 1.25,
    enemyDamageMult: 1.3,
    maxConcurrentDrones: 3,
    regenRate: 1.0
  }
};

/** The numbers a run actually uses, resolved once when the run starts. */
export interface GameRules extends DifficultyProfile {
  difficulty: DifficultyId;
}

export function resolveRules(id: DifficultyId): Readonly<GameRules> {
  return Object.freeze({ difficulty: id, ...DIFFICULTY[id] });
}

export const DEFAULT_DIFFICULTY: DifficultyId = 'marine';

/** Next/previous difficulty with wrap-around (used by the stick-driven VR menus). */
export function cycleDifficulty(current: DifficultyId, dir: -1 | 1): DifficultyId {
  const n = DIFFICULTY_ORDER.length;
  return DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(current) + dir + n) % n];
}
