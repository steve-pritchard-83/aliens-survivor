/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  /** Zustand store exposed for the Playwright smoke test (see main.tsx). */
  __game?: typeof import('./core/GameStore').useGameStore;
}
