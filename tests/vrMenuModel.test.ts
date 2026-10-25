import { describe, it, expect } from 'vitest';
import { VR_MENU_ROWS, adjustRow, valueText, MenuRow } from '../src/ui/vrMenuModel';
import { DEFAULT_SETTINGS, SNAP_ANGLE_OPTIONS } from '../src/core/Persistence';

const row = (id: string): MenuRow => VR_MENU_ROWS.find((r) => r.id === id)!;
const S = DEFAULT_SETTINGS;

describe('VR menu model', () => {
  it('starts with Resume and lists every setting once', () => {
    expect(VR_MENU_ROWS[0].id).toBe('resume');
    expect(new Set(VR_MENU_ROWS.map((r) => r.id)).size).toBe(VR_MENU_ROWS.length);
  });

  it('Resume only reacts to confirm', () => {
    expect(adjustRow(row('resume'), 0, S)).toBe('RESUME');
    expect(adjustRow(row('resume'), 1, S)).toBeNull();
    expect(adjustRow(row('resume'), -1, S)).toBeNull();
  });

  it('toggles flip on stick or confirm', () => {
    for (const dir of [-1, 0, 1] as const) {
      expect(adjustRow(row('leftHanded'), dir, S)).toEqual({ leftHanded: true });
      expect(adjustRow(row('seatedMode'), dir, { ...S, seatedMode: true })).toEqual({ seatedMode: false });
    }
  });

  it('snap turn cycles through every option in both directions and confirm advances', () => {
    let s = { ...S, snapAngle: SNAP_ANGLE_OPTIONS[0] as number };
    const seen: number[] = [s.snapAngle];
    for (let i = 0; i < SNAP_ANGLE_OPTIONS.length; i++) {
      s = { ...s, ...(adjustRow(row('snapAngle'), 1, s) as object) };
      seen.push(s.snapAngle);
    }
    expect(seen[seen.length - 1]).toBe(seen[0]);
    expect(new Set(seen).size).toBe(SNAP_ANGLE_OPTIONS.length);
    const back = adjustRow(row('snapAngle'), -1, { ...S, snapAngle: SNAP_ANGLE_OPTIONS[0] }) as { snapAngle: number };
    expect(back.snapAngle).toBe(SNAP_ANGLE_OPTIONS[SNAP_ANGLE_OPTIONS.length - 1]);
    const confirm = adjustRow(row('snapAngle'), 0, { ...S, snapAngle: SNAP_ANGLE_OPTIONS[0] }) as { snapAngle: number };
    expect(confirm.snapAngle).toBe(SNAP_ANGLE_OPTIONS[1]);
  });

  it('vignette cycles off -> low -> high -> off', () => {
    expect(adjustRow(row('vignette'), 1, { ...S, vignette: 'off' })).toEqual({ vignette: 'low' });
    expect(adjustRow(row('vignette'), 1, { ...S, vignette: 'low' })).toEqual({ vignette: 'high' });
    expect(adjustRow(row('vignette'), 1, { ...S, vignette: 'high' })).toEqual({ vignette: 'off' });
    expect(adjustRow(row('vignette'), -1, { ...S, vignette: 'off' })).toEqual({ vignette: 'high' });
  });

  it('volume sliders step by 10%, clamp, and ignore confirm', () => {
    expect(adjustRow(row('musicVolume'), 1, { ...S, musicVolume: 0.8 })).toEqual({ musicVolume: 0.9 });
    expect(adjustRow(row('musicVolume'), -1, { ...S, musicVolume: 0.8 })).toEqual({ musicVolume: 0.7 });
    expect(adjustRow(row('masterVolume'), 1, { ...S, masterVolume: 1 })).toBeNull();
    expect(adjustRow(row('sfxVolume'), -1, { ...S, sfxVolume: 0 })).toBeNull();
    expect(adjustRow(row('sfxVolume'), 0, S)).toBeNull();
    // Float drift never accumulates: ten steps from 0 lands exactly on 1
    let s = { ...S, masterVolume: 0 };
    for (let i = 0; i < 10; i++) s = { ...s, ...(adjustRow(row('masterVolume'), 1, s) as object) };
    expect(s.masterVolume).toBe(1);
  });

  it('formats values for display', () => {
    expect(valueText(row('snapAngle'), { ...S, snapAngle: 0 })).toBe('SMOOTH');
    expect(valueText(row('snapAngle'), { ...S, snapAngle: Math.PI / 4 })).toBe('45°');
    expect(valueText(row('vignette'), S)).toBe('LOW');
    expect(valueText(row('reducedFlash'), S)).toBe('OFF');
    expect(valueText(row('masterVolume'), { ...S, masterVolume: 0.55 })).toBe('55%');
    expect(valueText(row('resume'), S)).toBe('');
  });
});
