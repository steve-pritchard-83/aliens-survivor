import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /@pmndrs\/xr\/dist\/emulate\.js$/,
        replacement: '/src/core/emulate-stub.js'
      },
      {
        find: /^\.\/emulate\.js$/,
        replacement: '/src/core/emulate-stub.js'
      }
    ]
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['models/*.glb', 'audio/*.wav', 'audio/*.m4a', 'audio/*.mp3', 'fonts/*.otf'],
      manifest: false, // Using public/manifest.json directly per PRD structure
      workbox: {
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,glb,wav,m4a,mp3,otf,json}'],
        globIgnores: ['**/emulate*', '**/*room*', '**/office_*']
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
