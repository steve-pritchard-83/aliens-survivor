import type { GameSettings } from './GameTypes';

export const SETTINGS_KEY = 'uscm_settings_v1';
export const RECORD_KEY = 'uscm_record_kills';

export const SNAP_ANGLE_OPTIONS = [Math.PI / 6, Math.PI / 4, Math.PI / 2, 0] as const;

export const DEFAULT_SETTINGS: GameSettings = {
  snapAngle: Math.PI / 2,
  reducedFlash: false,
  leftHanded: false
};

function isSnapAngle(v: unknown): v is number {
  return typeof v === 'number' && SNAP_ANGLE_OPTIONS.some((a) => Math.abs(a - v) < 0.01);
}

/** Pure: coerces unknown stored data into valid settings, falling back per field. */
export function sanitizeSettings(raw: unknown): GameSettings {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    snapAngle: isSnapAngle(o.snapAngle) ? o.snapAngle : DEFAULT_SETTINGS.snapAngle,
    reducedFlash: typeof o.reducedFlash === 'boolean' ? o.reducedFlash : DEFAULT_SETTINGS.reducedFlash,
    leftHanded: typeof o.leftHanded === 'boolean' ? o.leftHanded : DEFAULT_SETTINGS.leftHanded
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
