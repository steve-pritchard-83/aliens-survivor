import { describe, it, expect, beforeEach, vi } from 'vitest';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear()
  };
}

describe('Persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('sanitizeSettings falls back per field', async () => {
    const { sanitizeSettings, DEFAULT_SETTINGS } = await import('../src/core/Persistence');
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ snapAngle: 12, reducedFlash: 'yes', leftHanded: true })).toEqual({
      ...DEFAULT_SETTINGS,
      leftHanded: true
    });
    expect(sanitizeSettings({ snapAngle: Math.PI / 4 }).snapAngle).toBeCloseTo(Math.PI / 4);
  });

  it('round-trips settings and survives corrupted JSON', async () => {
    const { saveSettings, loadSettings, SETTINGS_KEY, DEFAULT_SETTINGS } = await import('../src/core/Persistence');
    saveSettings({ snapAngle: 0, reducedFlash: true, leftHanded: true });
    expect(loadSettings()).toEqual({ snapAngle: 0, reducedFlash: true, leftHanded: true });
    localStorage.setItem(SETTINGS_KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('commitRecord only raises the record', async () => {
    const { commitRecord, loadRecordKills } = await import('../src/core/Persistence');
    expect(commitRecord(5, 0)).toBe(5);
    expect(commitRecord(3, 5)).toBe(5);
    expect(loadRecordKills()).toBe(5);
  });

  it('the store saves a record on victory and on defeat, and persists settings', async () => {
    const { useGameStore } = await import('../src/core/GameStore');
    const { loadRecordKills, loadSettings } = await import('../src/core/Persistence');
    const s = () => useGameStore.getState();
    s().startGame();
    useGameStore.setState({ kills: 7, timeRemaining: 0.1 });
    s().tick(0.2, 10);
    expect(s().status).toBe('VICTORY');
    expect(loadRecordKills()).toBe(7);
    expect(s().recordKills).toBe(7);

    s().startGame();
    useGameStore.setState({ kills: 9 });
    s().takeDamage(500, 1);
    expect(s().status).toBe('DEFEAT');
    expect(loadRecordKills()).toBe(9);

    s().updateSettings({ leftHanded: true });
    expect(loadSettings().leftHanded).toBe(true);
  });
});
