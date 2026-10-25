import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useGameStore } from './core/GameStore';

// Register Workbox Service Worker for offline Mobile PWA & Meta Quest 2 asset caching
registerSW({ immediate: true });

// Test hook for the browser smoke test (?e2e=1 or dev server); inert in normal play
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e')) {
  window.__game = useGameStore;
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
