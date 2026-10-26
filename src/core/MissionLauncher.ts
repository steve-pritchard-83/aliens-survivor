import { useGameStore } from './GameStore';
import { AudioManager } from './AudioManager';

/** Pauses the mission: game state, music and the klaxon together, so no path leaves sound running. */
export function pauseMission(): void {
  useGameStore.getState().pauseGame();
  AudioManager.pauseBGM();
  AudioManager.setKlaxonActive(false);
}

/** Resumes a paused mission: game state, music and the klaxon together. */
export function resumeMission(): void {
  useGameStore.getState().resumeGame();
  AudioManager.resumeBGM();
  AudioManager.setKlaxonActive(true);
}

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
