/**
 * True for the dev server, and for ?e2e=1 sessions in a build made with VITE_E2E=1.
 * The build-time flag means a production build (no VITE_E2E_XR/VITE_E2E in its env) can never
 * expose these hooks, however the URL is queried: there is no live `window.__game` to abuse.
 */
export function isE2E(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_E2E === '1' && new URLSearchParams(window.location.search).has('e2e');
}
