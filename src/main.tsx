import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useGameStore } from './core/GameStore';
import { xrStore } from './core/XRStore';
import { bindSettings } from './core/SettingsBinding';
import { isE2E } from './core/e2e';
import { registerServiceWorker, watchForSafeUpdates } from './core/swRegistration';
import { pauseMission } from './core/MissionLauncher';

// A phone left to another app must not keep playing (desktop pauses on pointer unlock, VR on session events)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  if (useGameStore.getState().status === 'PLAYING' && xrStore.getState().session == null) pauseMission();
});
// The worker is registered by ServiceWorkerStarter once the first scene has loaded; this is the fallback if it never does
watchForSafeUpdates();
window.setTimeout(registerServiceWorker, 30_000);

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
