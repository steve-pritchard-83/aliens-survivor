import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useGameStore } from './core/GameStore';
import { xrStore } from './core/XRStore';
import { bindSettings } from './core/SettingsBinding';
import { isE2E } from './core/e2e';

// Register Workbox Service Worker for offline Mobile PWA & Meta Quest 2 asset caching
registerSW({ immediate: true });

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
