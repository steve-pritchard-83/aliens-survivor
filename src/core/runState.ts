import { BALANCE } from '../data/balance';
import { resolveRules, GameRules } from '../data/difficulty';
import type { GameSettings } from './GameTypes';

/**
 * Per-run fields, shared by the store's initial state and startGame so a new run always resets the same set.
 * `rules` is resolved here once so difficulty cannot change mid-run.
 */
export function freshRunState(settings: GameSettings) {
  return {
    timeRemaining: BALANCE.MISSION_DURATION_SECONDS as number,
    phase: 1 as 1 | 2 | 3 | 4,
    hp: BALANCE.PLAYER.MAX_HP as number,
    maxHp: BALANCE.PLAYER.MAX_HP as number,
    lastDamageTime: 0,
    ammo: BALANCE.WEAPON.MAGAZINE_DEFAULT as number,
    maxAmmo: BALANCE.WEAPON.MAGAZINE_DEFAULT as number,
    fireInterval: BALANCE.WEAPON.FIRE_INTERVAL_DEFAULT as number,
    isReloading: false,
    reloadProgress: 0,
    continuousFireTime: 0,
    isJammed: false,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageFlash: 0,
    screenShake: 0,
    playerPos: [-0.32, 1.15, 13.0] as [number, number, number],
    playerYaw: Math.PI,
    activeThreats: [],
    smallThreat: null,
    xp: 0,
    level: 1,
    nextLevelXp: BALANCE.XP.LEVEL_THRESHOLDS[0] as number,
    offeredUpgrades: [],
    activeUpgrades: [] as string[],
    rules: resolveRules(settings.difficulty) as GameRules
  };
}
