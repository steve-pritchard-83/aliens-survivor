import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from '../src/core/GameStore';
import { AudioManager } from '../src/core/AudioManager';
import { InputManager } from '../src/core/InputManager';
import { bindSettings, applySettings } from '../src/core/SettingsBinding';
import { DEFAULT_SETTINGS } from '../src/core/Persistence';

describe('settings binding', () => {
  beforeEach(() => {
    useGameStore.getState().updateSettings({ ...DEFAULT_SETTINGS });
    InputManager.mouseSensitivity = 1;
    InputManager.invertY = false;
  });

  it('applySettings pushes volumes and look options into services', () => {
    const spy = vi.spyOn(AudioManager, 'setVolumes');
    applySettings({
      ...DEFAULT_SETTINGS,
      masterVolume: 0.5,
      musicVolume: 0.2,
      sfxVolume: 0.9,
      mouseSensitivity: 2,
      invertY: true
    });
    expect(spy).toHaveBeenCalledWith({ master: 0.5, music: 0.2, sfx: 0.9 });
    expect(InputManager.mouseSensitivity).toBe(2);
    expect(InputManager.invertY).toBe(true);
    spy.mockRestore();
  });

  it('bindSettings applies immediately and follows later changes until unsubscribed', () => {
    const spy = vi.spyOn(AudioManager, 'setVolumes');
    const unbind = bindSettings();
    expect(spy).toHaveBeenCalledTimes(1);
    useGameStore.getState().updateSettings({ sfxVolume: 0.3 });
    expect(spy).toHaveBeenLastCalledWith({ master: 1, music: 0.8, sfx: 0.3 });
    unbind();
    useGameStore.getState().updateSettings({ sfxVolume: 0.6 });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('invertY flips vertical look for touch and mouse', () => {
    InputManager.invertY = true;
    InputManager.addTouchLook(0, 0.1);
    expect(InputManager.consumeSnapshot().lookDeltaY).toBeCloseTo(-0.1);
  });
});
