import { create } from 'zustand';
import { Haptics } from './Haptics';
import { loadSettings, saveSettings, loadRecordKills, commitRecord } from './Persistence';
import { BALANCE, UPGRADE_CATALOG } from '../data/balance';
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

export const useGameStore = create<GameState>((set, get) => ({
  status: 'MENU',
  runId: 0,
  timeRemaining: BALANCE.MISSION_DURATION_SECONDS,
  phase: 1,
  hp: BALANCE.PLAYER.MAX_HP,
  maxHp: BALANCE.PLAYER.MAX_HP,
  lastDamageTime: 0,
  ammo: BALANCE.WEAPON.MAGAZINE_DEFAULT,
  maxAmmo: BALANCE.WEAPON.MAGAZINE_DEFAULT,
  fireInterval: BALANCE.WEAPON.FIRE_INTERVAL_DEFAULT,
  isReloading: false,
  reloadProgress: 0,
  continuousFireTime: 0,
  isJammed: false,
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  trackerRaised: false,
  flashlightOn: true,
  damageFlash: 0,
  screenShake: 0,
  playerPos: [-0.32, 1.15, 13.0],
  playerYaw: Math.PI,
  activeThreats: [],
  smallThreat: null,
  xp: 0,
  level: 1,
  nextLevelXp: BALANCE.XP.LEVEL_THRESHOLDS[0],
  offeredUpgrades: [],
  activeUpgrades: [],
  settings: loadSettings(),
  recordKills: loadRecordKills(),

  startGame: () =>
    set((s) => ({
      status: 'PLAYING',
      runId: s.runId + 1,
      timeRemaining: BALANCE.MISSION_DURATION_SECONDS,
      phase: 1,
      hp: BALANCE.PLAYER.MAX_HP,
      maxHp: BALANCE.PLAYER.MAX_HP,
      lastDamageTime: 0,
      ammo: BALANCE.WEAPON.MAGAZINE_DEFAULT,
      maxAmmo: BALANCE.WEAPON.MAGAZINE_DEFAULT,
      fireInterval: BALANCE.WEAPON.FIRE_INTERVAL_DEFAULT,
      isReloading: false,
      reloadProgress: 0,
      continuousFireTime: 0,
      isJammed: false,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
      damageFlash: 0,
      screenShake: 0,
      playerPos: [-0.32, 1.15, 13.0],
      playerYaw: Math.PI,
      activeThreats: [],
      smallThreat: null,
      xp: 0,
      level: 1,
      nextLevelXp: BALANCE.XP.LEVEL_THRESHOLDS[0],
      offeredUpgrades: [],
      activeUpgrades: []
    })),

  pauseGame: () => set((s) => (s.status === 'PLAYING' ? { status: 'PAUSED' } : s)),
  resumeGame: () => set((s) => (s.status === 'PAUSED' || s.status === 'LEVEL_UP' ? { status: 'PLAYING' } : s)),

  tick: (dt, now) => {
    const s = get();
    if (s.status !== 'PLAYING') return;

    const nextTime = Math.max(0, s.timeRemaining - dt);
    const nextPhase = computePhase(nextTime);
    const nextStatus: GameStatus = nextTime <= 0 ? 'VICTORY' : s.status;

    let nextHp = s.hp;
    if (now - s.lastDamageTime > BALANCE.PLAYER.REGEN_DELAY && nextHp < s.maxHp && nextHp > 0) {
      nextHp = Math.min(s.maxHp, nextHp + BALANCE.PLAYER.REGEN_RATE * dt);
    }

    let isReloading = s.isReloading,
      reloadProgress = s.reloadProgress,
      ammo = s.ammo,
      isJammed = s.isJammed,
      continuousFireTime = s.continuousFireTime;
    if (isReloading && (reloadProgress += dt / BALANCE.WEAPON.RELOAD_TIME) >= 1.0) {
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
      recordKills: nextStatus === 'VICTORY' ? commitRecord(s.kills, s.recordKills) : s.recordKills,
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

  takeDamage: (amount, now, isAcid = false) => {
    const s = get();
    if (s.status !== 'PLAYING') return;
    Haptics.damage();
    const effectiveAmount = isAcid && s.activeUpgrades.includes('acid_proofing') ? amount * 0.5 : amount;
    const nextHp = Math.max(0, s.hp - effectiveAmount);
    const recordKills = nextHp <= 0 ? commitRecord(s.kills, s.recordKills) : s.recordKills;
    set({
      recordKills,
      hp: nextHp,
      lastDamageTime: now,
      damageFlash: s.settings.reducedFlash ? 0.25 : 1.0,
      screenShake: s.settings.reducedFlash ? 0.35 : 1.0,
      status: nextHp <= 0 ? 'DEFEAT' : 'PLAYING'
    });
  },

  addScreenShake: (intensity) => set((s) => ({ screenShake: Math.min(1.0, Math.max(s.screenShake, intensity)) })),

  registerKill: (isBoss = false) => {
    Haptics.kill();
    const s = get();
    const earnedXp = isBoss ? BALANCE.XP.PRAETORIAN_KILL : BALANCE.XP.DRONE_KILL;
    const nextXp = s.xp + earnedXp;
    const nextKills = s.kills + 1;
    let nextLevel = s.level,
      nextTargetXp = s.nextLevelXp,
      triggerLevelUp = false;

    if (nextXp >= s.nextLevelXp && s.level <= BALANCE.XP.LEVEL_THRESHOLDS.length) {
      nextLevel = s.level + 1;
      nextTargetXp = BALANCE.XP.LEVEL_THRESHOLDS[nextLevel - 1] || s.nextLevelXp * 1.5;
      triggerLevelUp = true;
    }

    if (triggerLevelUp) {
      const pool = UPGRADE_CATALOG.filter((u) => !s.activeUpgrades.includes(u.id));
      const choices = pool.sort(() => Math.random() - 0.5).slice(0, 3);
      set({
        kills: nextKills,
        xp: nextXp,
        level: nextLevel,
        nextLevelXp: nextTargetXp,
        offeredUpgrades: choices,
        status: choices.length > 0 ? 'LEVEL_UP' : 'PLAYING'
      });
    } else {
      set({ kills: nextKills, xp: nextXp });
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
      maxAmmo = BALANCE.WEAPON.MAGAZINE_EXTENDED;
      ammo = maxAmmo;
    }
    if (id === 'armor_boost') {
      maxHp += 50;
      hp = maxHp;
    }
    if (id === 'fire_rate') {
      fireInterval = BALANCE.WEAPON.FIRE_INTERVAL_OVERCLOCKED;
    }

    set({ activeUpgrades: active, maxAmmo, ammo, maxHp, hp, fireInterval, status: 'PLAYING', offeredUpgrades: [] });
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
  toggleFlashlight: () => set((s) => ({ flashlightOn: !s.flashlightOn })),
  updatePlayerTransform: (x, y, z, yaw) => set({ playerPos: [x, y, z], playerYaw: yaw }),
  setActiveThreats: (threats) => set({ activeThreats: threats }),
  setSmallThreat: (threat) => set({ smallThreat: threat })
}));
