/** Mutable per-frame state of the pulse rifle viewmodel and trigger (not React state: updated every frame). */
export interface RifleState {
  fireCooldown: number;
  recoilOffset: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilRoll: number;
  boltKick: number;
  muzzleTimer: number;
  lastReloadStage: number;
  continuousFire: number;
  wasFiring: boolean;
}

export const MUZZLE_FLASH_SECONDS = 0.055;

export function createRifleState(): RifleState {
  return {
    fireCooldown: 0,
    recoilOffset: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    recoilRoll: 0,
    boltKick: 0,
    muzzleTimer: 0,
    lastReloadStage: 0,
    continuousFire: 0,
    wasFiring: false
  };
}
