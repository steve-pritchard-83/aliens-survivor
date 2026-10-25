import { UpgradeCard, BALANCE } from '../data/balance';

export type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT' | 'LEVEL_UP';
export type KillKind = 'drone' | 'small' | 'boss';
export type WavePhase = 1 | 2 | 3 | 4;

export interface ActiveThreat {
  id: number;
  x: number;
  z: number;
  state: 'SPAWNING' | 'PURSUING' | 'ATTACKING' | 'DEAD';
  isBoss?: boolean;
}

export interface GameSettings {
  snapAngle: number;
  reducedFlash: boolean;
  leftHanded: boolean;
}

export interface GameState {
  status: GameStatus;
  runId: number;
  timeRemaining: number;
  phase: WavePhase;
  hp: number;
  maxHp: number;
  lastDamageTime: number;
  ammo: number;
  maxAmmo: number;
  fireInterval: number;
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
  xp: number;
  level: number;
  nextLevelXp: number;
  offeredUpgrades: UpgradeCard[];
  activeUpgrades: string[];
  settings: GameSettings;
  recordKills: number;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  tick: (dt: number, now: number) => void;
  fireRound: () => boolean;
  startReload: () => void;
  takeDamage: (amount: number, now: number, isAcid?: boolean) => void;
  addScreenShake: (intensity: number) => void;
  registerKill: (kind?: KillKind) => void;
  registerHit: () => void;
  chooseUpgrade: (upgradeId: string) => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
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

/** True while gameplay simulation (AI, FX, timers) must not advance. */
export function isSimulationFrozen(status: GameStatus): boolean {
  return status === 'PAUSED' || status === 'LEVEL_UP';
}

export function computePhase(timeRemaining: number): WavePhase {
  if (timeRemaining > BALANCE.PHASES.PHASE_1_END) return 1;
  if (timeRemaining > BALANCE.PHASES.PHASE_2_END) return 2;
  if (timeRemaining > BALANCE.PHASES.PHASE_3_END) return 3;
  return 4;
}
