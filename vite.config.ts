import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['models/*.glb', 'audio/*.wav', 'audio/*.mp3', 'fonts/*.otf'],
      manifest: false, // Using public/manifest.json directly per PRD structure
      workbox: {
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,glb,wav,mp3,otf,json}']
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
