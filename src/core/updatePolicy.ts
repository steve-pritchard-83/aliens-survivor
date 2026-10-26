import type { GameStatus } from './GameTypes';

/** A waiting service worker may only take over (which reloads the page) between missions and outside VR. */
export function canApplyUpdate(status: GameStatus, inXr: boolean): boolean {
  return !inXr && (status === 'MENU' || status === 'DEFEAT' || status === 'VICTORY');
}
