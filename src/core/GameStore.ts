import { create } from 'zustand';
import { Haptics } from './Haptics';

export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';
export type WavePhase = 1 | 2 | 3 | 4;

export interface ActiveThreat {
  id: number;
  x: number;
  z: number;
  state: 'SPAWNING' | 'PURSUING' | 'ATTACKING' | 'DEAD';
}

export interface GameState {
  status: GameStatus;
  timeRemaining: number; // 600s countdown
  phase: WavePhase;
  hp: number;
  maxHp: number;
  lastDamageTime: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  continuousFireTime: number;
  isJammed: boolean;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  trackerRaised: boolean;
  flashlightOn: boolean;
  damageFlash: number;
  screenShake: number;
  playerPos: [number, number, number];
  playerYaw: number;
  activeThreats: ActiveThreat[];
  smallThreat: ActiveThreat | null;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  tick: (dt: number, now: number) => void;
  fireRound: () => boolean;
  startReload: () => void;
  takeDamage: (amount: number, now: number) => void;
  addScreenShake: (intensity: number) => void;
  registerKill: () => void;
  registerHit: () => void;
  toggleTracker: () => void;
  toggleFlashlight: () => void;
  updatePlayerTransform: (x: number, y: number, z: number, yaw: number) => void;
  setActiveThreats: (threats: ActiveThreat[]) => void;
  setSmallThreat: (threat: ActiveThreat | null) => void;
}

export const PHASE_NAMES: Record<WavePhase, string> = {
  1: 'PHASE 1: AWAKENING',
  2: 'PHASE 2: THE SWARM',
  3: 'PHASE 3: HULL BREACH',
  4: 'PHASE 4: EXTRACTION'
};

export function computePhase(timeRemaining: number): WavePhase {
  if (timeRemaining > 225) return 1; // 05:00 - 03:45
  if (timeRemaining > 120) return 2; // 03:45 - 02:00
  if (timeRemaining > 45) return 3;  // 02:00 - 00:45
  return 4;                          // 00:45 - 00:00
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'MENU',
  timeRemaining: 300,
  phase: 1,
  hp: 100,
  maxHp: 100,
  lastDamageTime: 0,
  ammo: 99,
  maxAmmo: 99,
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

  startGame: () =>
    set({
      status: 'PLAYING',
      timeRemaining: 300,
      phase: 1,
      hp: 100,
      lastDamageTime: 0,
      ammo: 99,
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
      smallThreat: null
    }),

  pauseGame: () =>
    set((s) => (s.status === 'PLAYING' ? { status: 'PAUSED' } : s)),

  resumeGame: () =>
    set((s) => (s.status === 'PAUSED' ? { status: 'PLAYING' } : s)),

  tick: (dt, now) => {
    const state = get();
    if (state.status !== 'PLAYING') return;

    const nextTime = Math.max(0, state.timeRemaining - dt);
    const nextPhase = computePhase(nextTime);
    let nextStatus: GameStatus = state.status;
    if (nextTime <= 0) {
      nextStatus = 'VICTORY';
    }

    // Passive HP regeneration: 2 HP/sec after 8 seconds of taking no damage
    let nextHp = state.hp;
    if (now - state.lastDamageTime > 8.0 && nextHp < state.maxHp && nextHp > 0) {
      nextHp = Math.min(state.maxHp, nextHp + 2.0 * dt);
    }

    // Reload cycle: mandatory 2.5 seconds
    let isReloading = state.isReloading;
    let reloadProgress = state.reloadProgress;
    let ammo = state.ammo;
    let isJammed = state.isJammed;
    let continuousFireTime = state.continuousFireTime;

    if (isReloading) {
      reloadProgress += dt / 2.5;
      if (reloadProgress >= 1.0) {
        isReloading = false;
        reloadProgress = 0;
        ammo = state.maxAmmo;
        isJammed = false;
        continuousFireTime = 0;
      }
    }

    const damageFlash = Math.max(0, state.damageFlash - dt * 2.5);
    const screenShake = Math.max(0, state.screenShake - dt * 4.2);

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
      damageFlash,
      screenShake
    });
  },

  fireRound: () => {
    const state = get();
    if (state.status !== 'PLAYING' || state.isReloading || state.isJammed) return false;
    if (state.ammo <= 0) return false;

    const nextAmmo = state.ammo - 1;
    set({
      ammo: nextAmmo,
      shotsFired: state.shotsFired + 1,
      screenShake: Math.max(state.screenShake, 0.24)
    });
    if (nextAmmo === 0) get().startReload();
    return true;
  },

  startReload: () => {
    const state = get();
    if (state.status !== 'PLAYING' || state.isReloading) return;
    if (state.ammo === state.maxAmmo && !state.isJammed) return;
    set({ isReloading: true, reloadProgress: 0 });
  },

  takeDamage: (amount, now) => {
    const state = get();
    if (state.status !== 'PLAYING') return;
    Haptics.damage();
    const nextHp = Math.max(0, state.hp - amount);
    set({
      hp: nextHp,
      lastDamageTime: now,
      damageFlash: 1.0,
      screenShake: 1.0,
      status: nextHp <= 0 ? 'DEFEAT' : 'PLAYING'
    });
  },

  addScreenShake: (intensity) => set((s) => ({ screenShake: Math.min(1.0, Math.max(s.screenShake, intensity)) })),
  registerKill: () => { Haptics.kill(); set((s) => ({ kills: s.kills + 1 })); },
  registerHit: () => { Haptics.hit(); set((s) => ({ shotsHit: s.shotsHit + 1 })); },
  toggleTracker: () => set((s) => ({ trackerRaised: !s.trackerRaised })),
  toggleFlashlight: () => set((s) => ({ flashlightOn: !s.flashlightOn })),
  updatePlayerTransform: (x, y, z, yaw) => set({ playerPos: [x, y, z], playerYaw: yaw }),
  setActiveThreats: (threats) => set({ activeThreats: threats }),
  setSmallThreat: (threat) => set({ smallThreat: threat })
}));
