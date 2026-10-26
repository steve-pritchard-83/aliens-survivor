import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useGameStore } from './core/GameStore';
import { xrStore } from './core/XRStore';
import { bindSettings } from './core/SettingsBinding';
import { isE2E } from './core/e2e';
import { canApplyUpdate } from './core/updatePolicy';

// Register Workbox Service Worker for offline Mobile PWA & Meta Quest 2 asset caching.
// A browser only looks for a new service worker when a page loads, and a Quest tab is usually resumed rather than
// reloaded, so check on a timer and whenever the page becomes visible again. Applying an update reloads the page,
// so a downloaded update waits (registerType 'prompt') until the player is between missions and outside VR.
let updateReady = false;
const applyUpdateIfSafe = () => {
  if (!updateReady) return;
  if (canApplyUpdate(useGameStore.getState().status, xrStore.getState().session != null)) void updateSW(true);
};
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    applyUpdateIfSafe();
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      const status = useGameStore.getState().status;
      if (status === 'PLAYING' || status === 'LEVEL_UP' || status === 'PAUSED') return;
      registration.update().catch(() => undefined);
    };
    window.setInterval(check, 120_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }
});
let lastStatus = useGameStore.getState().status;
useGameStore.subscribe((s) => {
  if (s.status === lastStatus) return;
  lastStatus = s.status;
  applyUpdateIfSafe();
});
xrStore.subscribe(applyUpdateIfSafe);

// Test hook for the browser smoke test (?e2e=1 or dev server); inert in normal play
if (isE2E()) {
  window.__game = useGameStore;
  window.__xr = xrStore;
}

// Emulated headset for the WebXR smoke test; the flag is a build-time constant, so normal builds drop this branch.
// The app mounts only once the emulator is installed, because it enters VR on load and would otherwise race it.
const emulatorReady: Promise<void> =
  import.meta.env.VITE_E2E_XR === '1' && new URLSearchParams(window.location.search).has('iwer')
    ? import('./core/iwerHarness').then((m) => {
        window.__xrDevice = m.installEmulatedHeadset();
      })
    : Promise.resolve();

bindSettings();

const rootEl = document.getElementById('root');
if (rootEl) {
  void emulatorReady.then(() => {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
