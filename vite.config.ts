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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Normalise Windows separators so the patterns below work on every platform
          const path = id.replace(/\\/g, '/');
          if (!path.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/(three|three-stdlib|three-mesh-bvh)\//.test(path)) return 'three';
          if (/\/node_modules\/(@react-three\/xr|@pmndrs)\//.test(path)) return 'xr';
          if (/\/node_modules\/@react-three\//.test(path)) return 'r3f';
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'react';
          return undefined;
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
