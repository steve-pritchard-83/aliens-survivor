/** True for the dev server and for ?e2e=1 sessions: enables the inert test hooks used by Playwright. */
export function isE2E(): boolean {
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e');
}
