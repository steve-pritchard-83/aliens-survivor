import type { GameSettings } from '../core/GameTypes';
import { SNAP_ANGLE_OPTIONS, VIGNETTE_OPTIONS } from '../core/Persistence';

export type RowKind = 'action' | 'choice' | 'toggle' | 'slider';

export interface MenuRow {
  id: 'resume' | 'snapAngle' | 'vignette' | 'reducedFlash' | 'leftHanded' | 'seatedMode' | VolumeKey;
  label: string;
  kind: RowKind;
}

type VolumeKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';

export const VR_MENU_ROWS: readonly MenuRow[] = [
  { id: 'resume', label: 'RESUME MISSION', kind: 'action' },
  { id: 'snapAngle', label: 'SNAP TURN', kind: 'choice' },
  { id: 'vignette', label: 'COMFORT VIGNETTE', kind: 'choice' },
  { id: 'reducedFlash', label: 'REDUCED FLASH', kind: 'toggle' },
  { id: 'leftHanded', label: 'LEFT-HANDED', kind: 'toggle' },
  { id: 'seatedMode', label: 'SEATED MODE', kind: 'toggle' },
  { id: 'masterVolume', label: 'MASTER VOLUME', kind: 'slider' },
  { id: 'musicVolume', label: 'MUSIC VOLUME', kind: 'slider' },
  { id: 'sfxVolume', label: 'EFFECTS VOLUME', kind: 'slider' }
];

const SLIDER_STEP = 0.1;

/** What a row currently shows on the right-hand side of the menu. */
export function valueText(row: MenuRow, s: GameSettings): string {
  switch (row.id) {
    case 'resume':
      return '';
    case 'snapAngle':
      return s.snapAngle === 0 ? 'SMOOTH' : `${Math.round(s.snapAngle * (180 / Math.PI))}°`;
    case 'vignette':
      return s.vignette.toUpperCase();
    case 'reducedFlash':
    case 'leftHanded':
    case 'seatedMode':
      return s[row.id] ? 'ON' : 'OFF';
    default:
      return `${Math.round(s[row.id] * 100)}%`;
  }
}

function cycle<T>(options: readonly T[], current: T, dir: number): T {
  const i = options.indexOf(current);
  return options[(Math.max(i, 0) + dir + options.length) % options.length];
}

function snapIndex(angle: number): number {
  return SNAP_ANGLE_OPTIONS.findIndex((a) => Math.abs(a - angle) < 0.01);
}

/**
 * Applies a menu input to a row. `dir` is -1 / +1 for stick left / right and 0 for trigger confirm.
 * Returns the settings change to apply, 'RESUME', or null when the input does nothing for this row.
 */
export function adjustRow(row: MenuRow, dir: -1 | 0 | 1, s: GameSettings): Partial<GameSettings> | 'RESUME' | null {
  switch (row.kind) {
    case 'action':
      return dir === 0 ? 'RESUME' : null;
    case 'toggle':
      return { [row.id]: !s[row.id as 'reducedFlash'] };
    case 'choice': {
      const step = dir === 0 ? 1 : dir;
      if (row.id === 'snapAngle') {
        const next =
          (Math.max(snapIndex(s.snapAngle), 0) + step + SNAP_ANGLE_OPTIONS.length) % SNAP_ANGLE_OPTIONS.length;
        return { snapAngle: SNAP_ANGLE_OPTIONS[next] };
      }
      return { vignette: cycle(VIGNETTE_OPTIONS, s.vignette, step) };
    }
    case 'slider': {
      if (dir === 0) return null;
      const key = row.id as VolumeKey;
      const next = Math.max(0, Math.min(1, Math.round((s[key] + dir * SLIDER_STEP) * 100) / 100));
      return next === s[key] ? null : { [key]: next };
    }
  }
}
