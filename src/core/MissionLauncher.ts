import { useGameStore } from './GameStore';
import { AudioManager } from './AudioManager';

/** Starts a new mission: resets game state and brings up audio (music and ambience) once buffers are ready. */
export function launchMission(): void {
  useGameStore.getState().startGame();
  AudioManager.resetAudio();
  AudioManager.unlock()
    .then(() => {
      AudioManager.play2D('ui_beep', 0.8);
      AudioManager.startBGM();
      AudioManager.setKlaxonActive(true);
    })
    .catch((e) => console.warn('[MissionLauncher] audio unlock failed', e));
}
