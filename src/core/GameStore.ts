import { create } from 'zustand';
import { Haptics } from './Haptics';
import { freshRunState } from './runState';
import { WEAPONS, WEAPON_ORDER, nextWeapon } from '../data/weapons';
import { incomingDamage } from '../systems/combatMath';
import { loadSettings, saveSettings, loadRecordKills, loadLeaderboard } from './Persistence';
import { endRunPatch } from './runSummary';
import { isCalm } from '../systems/levelUpGate';
import { BALANCE, UPGRADE_CATALOG, UPGRADE_EFFECTS } from '../data/balance';
import {
  GameStatus,
  WavePhase,
  ActiveThreat,
  GameSettings,
  GameState,
  PHASE_NAMES,
  computePhase,
  isSimulationFrozen
} from './GameTypes';

export type { GameStatus, WavePhase, ActiveThreat, GameSettings, GameState };
export { PHASE_NAMES, computePhase, isSimulationFrozen };

const initialSettings = loadSettings();

export const useGameStore = create<GameState>((set, get) => ({
  ...freshRunState(initialSettings),
  status: 'MENU',
  runId: 0,
  trackerRaised: false,
  settings: initialSettings,
  recordKills: loadRecordKills(),
  leaderboard: loadLeaderboard(),

  // A new run resets every per-run field together (freshRunState) and resolves the difficulty rules once
  startGame: () =>
    set((s) => ({
      ...freshRunState(s.settings),
      status: 'PLAYING',
      runId: s.runId + 1
    })),

  pauseGame: () => set((s) => (s.status === 'PLAYING' ? { status: 'PAUSED' } : s)),
  openLevelUp: () =>
    set((s) => (s.levelUpPending && s.status === 'PLAYING' ? { status: 'LEVEL_UP', levelUpPending: false } : s)),
  resumeGame: () => set((s) => (s.status === 'PAUSED' || s.status === 'LEVEL_UP' ? { status: 'PLAYING' } : s)),

  tick: (dt, now) => {
    const s = get();
    if (s.status !== 'PLAYING') return;

    const nextTime = Math.max(0, s.timeRemaining - dt);
    const nextPhase = computePhase(nextTime);
    const nextStatus: GameStatus = nextTime <= 0 ? 'VICTORY' : s.status;

    let nextHp = s.hp;
    if (now - s.lastDamageTime > BALANCE.PLAYER.REGEN_DELAY && nextHp < s.maxHp && nextHp > 0) {
      nextHp = Math.min(s.maxHp, nextHp + s.rules.regenRate * dt);
    }

    let isReloading = s.isReloading,
      reloadProgress = s.reloadProgress,
      ammo = s.ammo,
      isJammed = s.isJammed,
      continuousFireTime = s.continuousFireTime;
    if (isReloading && (reloadProgress += dt / WEAPONS[s.activeWeapon].reloadTime) >= 1.0) {
      isReloading = false;
      reloadProgress = 0;
      ammo = s.maxAmmo;
      isJammed = false;
      continuousFireTime = 0;
    }

    set({
      timeRemaining: nextTime,
      phase: nextPhase,
      status: nextStatus,
      hp: nextHp,
      isReloading,
      reloadProgress,
      ammo,
      isJammed,
      continuousFireTime,
      ...(nextStatus === 'VICTORY' ? endRunPatch(s, true) : {}),
      damageFlash: Math.max(0, s.damageFlash - dt * 2.5),
      screenShake: Math.max(0, s.screenShake - dt * 4.2)
    });
  },

  fireRound: () => {
    const s = get();
    if (s.status !== 'PLAYING' || s.isReloading || s.isJammed || s.ammo <= 0) return false;
    const nextAmmo = s.ammo - 1;
    set({ ammo: nextAmmo, shotsFired: s.shotsFired + 1, screenShake: Math.max(s.screenShake, 0.22) });
    if (nextAmmo === 0) get().startReload();
    return true;
  },

  startReload: () => {
    const s = get();
    if (s.status !== 'PLAYING' || s.isReloading || (s.ammo === s.maxAmmo && !s.isJammed)) return;
    set({ isReloading: true, reloadProgress: 0 });
  },

  // Switching weapons costs a reload cycle, so it cannot be used to refill a magazine instantly
  cycleWeapon: (order = WEAPON_ORDER) => {
    const s = get();
    if (s.status !== 'PLAYING') return;
    const next = nextWeapon(s.activeWeapon, order);
    // Widened to string: with a single registered weapon TypeScript would otherwise narrow `next` to never
    if ((next as string) === s.activeWeapon) return;
    const w = WEAPONS[next];
    const owned = (id: string) => s.activeUpgrades.includes(id);
    set({
      activeWeapon: next,
      maxAmmo: owned('extended_mag') ? w.extendedMagazine : w.magazine,
      fireInterval: owned('fire_rate') ? w.overclockedFireInterval : w.fireInterval,
      isReloading: true,
      reloadProgress: 0,
      isJammed: false,
      continuousFireTime: 0
    });
  },

  takeDamage: (amount, now, isAcid = false) => {
    const s = get();
    if (s.status !== 'PLAYING') return;
    Haptics.damage();
    const effectiveAmount = incomingDamage(amount * s.rules.enemyDamageMult, isAcid, s.activeUpgrades);
    const nextHp = Math.max(0, s.hp - effectiveAmount);
    set({
      ...(nextHp <= 0 ? endRunPatch(s, false) : {}),
      hp: nextHp,
      lastDamageTime: now,
      damageFlash: s.settings.reducedFlash ? 0.25 : 1.0,
      screenShake: s.settings.reducedFlash ? 0.35 : 1.0,
      status: nextHp <= 0 ? 'DEFEAT' : 'PLAYING'
    });
  },

  addScreenShake: (intensity) => set((s) => ({ screenShake: Math.min(1.0, Math.max(s.screenShake, intensity)) })),

  registerKill: (kind = 'drone') => {
    Haptics.kill();
    const s = get();
    const earnedXp =
      kind === 'boss' ? BALANCE.XP.PRAETORIAN_KILL : kind === 'small' ? BALANCE.XP.SMALL_KILL : BALANCE.XP.DRONE_KILL;
    const nextXp = s.xp + earnedXp;
    const nextKills = s.kills + 1;
    const killsByKind = { ...s.killsByKind, [kind]: s.killsByKind[kind] + 1 };
    let nextLevel = s.level,
      nextTargetXp = s.nextLevelXp,
      triggerLevelUp = false;

    if (nextXp >= s.nextLevelXp && s.level <= BALANCE.XP.LEVEL_THRESHOLDS.length && !s.levelUpPending) {
      nextLevel = s.level + 1;
      nextTargetXp = BALANCE.XP.LEVEL_THRESHOLDS[nextLevel - 1] || s.nextLevelXp * 1.5;
      triggerLevelUp = true;
    }

    if (triggerLevelUp) {
      const pool = UPGRADE_CATALOG.filter((u) => !s.activeUpgrades.includes(u.id));
      const choices = pool.sort(() => Math.random() - 0.5).slice(0, 3);
      const calm = isCalm(s.activeThreats, s.smallThreat, s.playerPos[0], s.playerPos[2]);
      set({
        kills: nextKills,
        killsByKind,
        xp: nextXp,
        level: nextLevel,
        nextLevelXp: nextTargetXp,
        offeredUpgrades: choices,
        // Under fire the cards wait for a lull instead of freezing the game mid-fight
        levelUpPending: choices.length > 0 && !calm,
        status: choices.length > 0 && calm ? 'LEVEL_UP' : 'PLAYING'
      });
    } else {
      set({ kills: nextKills, killsByKind, xp: nextXp });
    }
  },

  chooseUpgrade: (id) => {
    const s = get();
    const active = [...s.activeUpgrades, id];
    let maxAmmo = s.maxAmmo,
      ammo = s.ammo,
      maxHp = s.maxHp,
      hp = s.hp,
      fireInterval = s.fireInterval;

    if (id === 'extended_mag') {
      maxAmmo = WEAPONS[s.activeWeapon].extendedMagazine;
      ammo = maxAmmo;
    }
    if (id === 'armor_boost') {
      maxHp += UPGRADE_EFFECTS.armor_boost.maxHpBonus;
      hp = maxHp;
    }
    if (id === 'fire_rate') {
      fireInterval = WEAPONS[s.activeWeapon].overclockedFireInterval;
    }

    set({
      activeUpgrades: active,
      maxAmmo,
      ammo,
      maxHp,
      hp,
      fireInterval,
      status: 'PLAYING',
      offeredUpgrades: [],
      levelUpPending: false
    });
  },

  updateSettings: (partial) =>
    set((s) => {
      const settings = { ...s.settings, ...partial };
      saveSettings(settings);
      return { settings };
    }),
  registerHit: () => {
    Haptics.hit();
    set((s) => ({ shotsHit: s.shotsHit + 1 }));
  },
  toggleTracker: () => set((s) => ({ trackerRaised: !s.trackerRaised })),
  updatePlayerTransform: (x, y, z, yaw) => set({ playerPos: [x, y, z], playerYaw: yaw }),
  setActiveThreats: (threats) => set({ activeThreats: threats }),
  setSmallThreat: (threat) => set({ smallThreat: threat })
}));
