import { registerSW } from 'virtual:pwa-register';
import { useGameStore } from './GameStore';
import { xrStore } from './XRStore';
import { canApplyUpdate } from './updatePolicy';

// Workbox service worker for offline Mobile PWA and Meta Quest asset caching.
// - It is registered once the first scene has loaded (see ServiceWorkerStarter), not at page start: a service
//   worker that is not yet controlling the page precaches the ~32 MB of models while the page fetches the same
//   files itself, which doubles the first-visit download.
// - A browser only looks for a new worker when a page loads, and a Quest tab is usually resumed rather than
//   reloaded, so check on a timer and whenever the page becomes visible again.
// - A new worker takes control as soon as it installs (workbox skipWaiting + clientsClaim in vite.config.ts) and the
//   page is not reloaded: the next launch runs the new version. The prompt path below only matters if a worker is
//   ever left waiting; it then reloads between missions and outside VR.
let started = false;
let updateReady = false;
let updateSW: (reload?: boolean) => Promise<void> = () => Promise.resolve();

function applyUpdateIfSafe(): void {
  if (!updateReady) return;
  if (canApplyUpdate(useGameStore.getState().status, xrStore.getState().session != null)) void updateSW(true);
}

/** Registers the worker (once) and starts the periodic update check. Safe to call repeatedly. */
export function registerServiceWorker(): void {
  if (started) return;
  started = true;
  updateSW = registerSW({
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
        registration.update().catch((e) => console.warn('[SW] update check failed', e));
      };
      window.setInterval(check, 120_000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    }
  });
}

/** Applies a waiting update as soon as it becomes safe (status or VR session changes). */
export function watchForSafeUpdates(): void {
  let lastStatus = useGameStore.getState().status;
  useGameStore.subscribe((s) => {
    if (s.status === lastStatus) return;
    lastStatus = s.status;
    applyUpdateIfSafe();
  });
  xrStore.subscribe(applyUpdateIfSafe);
}
