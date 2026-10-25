import type { GameSettings, VignetteLevel } from './GameTypes';
import { DEFAULT_DIFFICULTY, DIFFICULTY_ORDER, DifficultyId } from '../data/difficulty';
import { LEADERBOARD_SIZE, ScoreEntry } from '../systems/scoring';

export const SETTINGS_KEY = 'uscm_settings_v1';
export const RECORD_KEY = 'uscm_record_kills';
export const LEADERBOARD_KEY = 'uscm_leaderboard_v1';

export const SNAP_ANGLE_OPTIONS = [Math.PI / 6, Math.PI / 4, Math.PI / 2, 0] as const;
export const VIGNETTE_OPTIONS: readonly VignetteLevel[] = ['off', 'low', 'high'];
export const MOUSE_SENSITIVITY_RANGE = { min: 0.3, max: 3 } as const;

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: DEFAULT_DIFFICULTY,
  snapAngle: Math.PI / 2,
  reducedFlash: false,
  leftHanded: false,
  masterVolume: 1,
  musicVolume: 0.8,
  sfxVolume: 1,
  vignette: 'low',
  mouseSensitivity: 1,
  invertY: false,
  showHud2D: true,
  seatedMode: false
};

function isSnapAngle(v: unknown): v is number {
  return typeof v === 'number' && SNAP_ANGLE_OPTIONS.some((a) => Math.abs(a - v) < 0.01);
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function ranged(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
}

/** Pure: coerces unknown stored data into valid settings, falling back per field. */
export function sanitizeSettings(raw: unknown): GameSettings {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS;
  return {
    difficulty: DIFFICULTY_ORDER.includes(o.difficulty as DifficultyId) ? (o.difficulty as DifficultyId) : d.difficulty,
    snapAngle: isSnapAngle(o.snapAngle) ? o.snapAngle : d.snapAngle,
    reducedFlash: bool(o.reducedFlash, d.reducedFlash),
    leftHanded: bool(o.leftHanded, d.leftHanded),
    masterVolume: ranged(o.masterVolume, 0, 1, d.masterVolume),
    musicVolume: ranged(o.musicVolume, 0, 1, d.musicVolume),
    sfxVolume: ranged(o.sfxVolume, 0, 1, d.sfxVolume),
    vignette: VIGNETTE_OPTIONS.includes(o.vignette as VignetteLevel) ? (o.vignette as VignetteLevel) : d.vignette,
    mouseSensitivity: ranged(
      o.mouseSensitivity,
      MOUSE_SENSITIVITY_RANGE.min,
      MOUSE_SENSITIVITY_RANGE.max,
      d.mouseSensitivity
    ),
    invertY: bool(o.invertY, d.invertY),
    showHud2D: bool(o.showHud2D, d.showHud2D),
    seatedMode: bool(o.seatedMode, d.seatedMode)
  };
}

export function loadSettings(): GameSettings {
  try {
    const text = localStorage.getItem(SETTINGS_KEY);
    return sanitizeSettings(text ? JSON.parse(text) : null);
  } catch (e) {
    console.warn('[Persistence] settings unreadable, using defaults', e);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[Persistence] settings not saved', e);
  }
}

export function loadRecordKills(): number {
  try {
    const n = parseInt(localStorage.getItem(RECORD_KEY) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (e) {
    console.warn('[Persistence] record unreadable', e);
    return 0;
  }
}

export function saveRecordKills(kills: number): void {
  try {
    localStorage.setItem(RECORD_KEY, String(kills));
  } catch (e) {
    console.warn('[Persistence] record not saved', e);
  }
}

/** Saves a new best if `kills` beats `record`; returns the (possibly updated) record. */
export function commitRecord(kills: number, record: number): number {
  if (kills > record) {
    saveRecordKills(kills);
    return kills;
  }
  return record;
}

export type Leaderboard = Record<DifficultyId, ScoreEntry[]>;

export function emptyLeaderboard(): Leaderboard {
  return { recruit: [], marine: [], ultimate_badass: [] };
}

function sanitizeEntry(raw: unknown, difficulty: DifficultyId): ScoreEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const score = num(o.score),
    kills = num(o.kills),
    accuracy = num(o.accuracy),
    survivedSeconds = num(o.survivedSeconds);
  if (score === null || kills === null || accuracy === null || survivedSeconds === null) return null;
  return {
    score,
    kills,
    accuracy,
    survivedSeconds,
    difficulty,
    date: typeof o.date === 'string' ? o.date : '',
    victory: o.victory === true
  };
}

/** Pure: coerces stored data into a valid leaderboard (sorted, capped, bad entries dropped). */
export function sanitizeLeaderboard(raw: unknown): Leaderboard {
  const out = emptyLeaderboard();
  if (typeof raw !== 'object' || raw === null) return out;
  const o = raw as Record<string, unknown>;
  for (const id of DIFFICULTY_ORDER) {
    const list = Array.isArray(o[id]) ? (o[id] as unknown[]) : [];
    out[id] = list
      .map((e) => sanitizeEntry(e, id))
      .filter((e): e is ScoreEntry => e !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  }
  return out;
}

export function loadLeaderboard(): Leaderboard {
  try {
    const text = localStorage.getItem(LEADERBOARD_KEY);
    return sanitizeLeaderboard(text ? JSON.parse(text) : null);
  } catch (e) {
    console.warn('[Persistence] leaderboard unreadable, starting empty', e);
    return emptyLeaderboard();
  }
}

export function saveLeaderboard(board: Leaderboard): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  } catch (e) {
    console.warn('[Persistence] leaderboard not saved', e);
  }
}
