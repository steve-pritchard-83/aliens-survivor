import { useEffect } from 'react';
import { registerServiceWorker } from './swRegistration';

/**
 * Mounts inside the scene's Suspense boundary, so it only runs once the first models have loaded. Registering the
 * service worker then lets its precache reuse those downloads instead of racing them.
 */
export function ServiceWorkerStarter() {
  useEffect(() => {
    // A short delay keeps the precache (a burst of downloads) off the frames right after the scene appears
    const timer = window.setTimeout(registerServiceWorker, 2000);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
