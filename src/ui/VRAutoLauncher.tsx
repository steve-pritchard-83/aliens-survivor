import { useEffect, useRef } from 'react';
import { xrStore } from '../core/XRStore';
import { AudioManager } from '../core/AudioManager';
import { Platform } from '../core/Platform';

/**
 * On Quest (and ?vr=1) enters immersive VR as soon as the page loads. The mission itself starts from the
 * in-headset menu, so the player is never dropped into combat before they are ready.
 */
export function VRAutoLauncher() {
  const launchedRef = useRef(false);

  useEffect(() => {
    if (!Platform.isVrApp || launchedRef.current) return;

    const attemptEnterVR = () => {
      xrStore
        .enterVR()
        .then(() => {
          launchedRef.current = true;
          AudioManager.resetAudio();
          // Load and decode sounds while the player reads the menu
          AudioManager.unlock().catch((e) => console.warn('[VRAutoLauncher] audio unlock failed', e));
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
