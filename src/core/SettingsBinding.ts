import { useGameStore } from './GameStore';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { xrControllerState } from './XRControllerState';
import type { GameSettings } from './GameTypes';

/** Pushes settings into the services that cannot read the store themselves (audio levels, input look options). */
export function applySettings(s: GameSettings): void {
  AudioManager.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume });
  InputManager.mouseSensitivity = s.mouseSensitivity;
  InputManager.invertY = s.invertY;
  xrControllerState.leftHanded = s.leftHanded;
}

/** Applies the current settings and keeps services in sync as they change. Returns an unsubscribe. */
export function bindSettings(): () => void {
  applySettings(useGameStore.getState().settings);
  return useGameStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings) applySettings(state.settings);
  });
}
