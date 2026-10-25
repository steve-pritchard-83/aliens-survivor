import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      // Software WebGL so the 3D scene renders on CI machines without a GPU
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--autoplay-policy=no-user-gesture-required'
      ]
    }
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    // The build includes the IWER headset emulator for e2e/vr.spec.ts (a build-time flag, absent from normal builds)
    env: { VITE_E2E_XR: '1' },
    reuseExistingServer: false,
    timeout: 180_000
  }
});
