/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  /** Zustand store exposed for the Playwright smoke test (see main.tsx). */
  __game?: typeof import('./core/GameStore').useGameStore;
  /** XR store, exposed for e2e (see main.tsx). */
  __xr?: typeof import('./core/XRStore').xrStore;
  /** World position of the player's head/camera, exposed for e2e (see PlayerController). */
  __headPosition?: () => { x: number; y: number; z: number };
  /** Selected row of the VR pause menu, exposed for e2e (see vrPauseMenu). */
  __vrMenuRow?: number;
  /** Emulated Quest 3 (IWER), installed only in e2e builds with ?iwer=1. */
  __xrDevice?: import('iwer').XRDevice;
}

/** Build stamp injected by vite.config.ts (see the main menu). */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_E2E_XR?: string;
  /** Build-time flag that lets ?e2e=1 enable the Playwright test hooks (see core/e2e.ts). Absent from normal builds. */
  readonly VITE_E2E?: string;
}
