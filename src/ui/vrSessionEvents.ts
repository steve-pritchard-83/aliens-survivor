import { useGameStore } from '../core/GameStore';
import { pauseMission, resumeMission } from '../core/MissionLauncher';

/**
 * Pauses the mission when the headset is taken off, the system menu opens or the session ends, and resumes
 * only a pause that this handler caused (a player who paused deliberately stays paused).
 */
export function attachSessionHandlers(session: XRSession): () => void {
  let pausedByVisibility = false;

  const onVisibility = () => {
    const st = useGameStore.getState();
    if (session.visibilityState !== 'visible') {
      if (st.status === 'PLAYING') {
        pauseMission();
        pausedByVisibility = true;
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      if (st.status === 'PAUSED') {
        resumeMission();
      }
    }
  };

  const onEnd = () => {
    if (useGameStore.getState().status === 'PLAYING') pauseMission();
    pausedByVisibility = false;
  };

  session.addEventListener('visibilitychange', onVisibility);
  session.addEventListener('end', onEnd);
  return () => {
    session.removeEventListener('visibilitychange', onVisibility);
    session.removeEventListener('end', onEnd);
  };
}
