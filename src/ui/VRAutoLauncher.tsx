import { useEffect, useRef } from 'react';
import { xrStore } from '../core/XRStore';
import { useGameStore } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';

export function VRAutoLauncher() {
  const launchedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isVrApp =
      new URLSearchParams(window.location.search).get('vr') === '1' ||
      /OculusBrowser|Quest/i.test(navigator.userAgent);
    if (!isVrApp || launchedRef.current) return;

    const startMission = () => {
      if (launchedRef.current) return;
      launchedRef.current = true;
      AudioManager.resetAudio();
      AudioManager.unlock()
        .then(() => {
          AudioManager.play2D('ui_beep', 0.8);
          AudioManager.startBGM();
          AudioManager.setKlaxonActive(true);
        })
        .catch(() => {});
      useGameStore.getState().startGame();
    };

    const attemptEnterVR = () => {
      xrStore
        .enterVR()
        .then((session) => {
          startMission();
          if (session) {
            session.addEventListener('visibilitychange', () => {
              const st = useGameStore.getState();
              if (session.visibilityState !== 'visible' && st.status === 'PLAYING') {
                st.pauseGame();
              } else if (session.visibilityState === 'visible' && st.status === 'PAUSED') {
                st.resumeGame();
              }
            });
          }
        })
        .catch((err) => {
          console.warn('[VRAutoLauncher] Direct enterVR pending user activation:', err);
          const onUserGesture = () => {
            window.removeEventListener('pointerdown', onUserGesture);
            window.removeEventListener('keydown', onUserGesture);
            attemptEnterVR();
          };
          window.addEventListener('pointerdown', onUserGesture, { once: true });
          window.addEventListener('keydown', onUserGesture, { once: true });
        });
    };

    const timer = setTimeout(attemptEnterVR, 60);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
