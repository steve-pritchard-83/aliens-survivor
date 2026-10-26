import { AudioManager } from './AudioManager';
import type { SoundKey } from './AudioCatalog';

// Metal deck footsteps for the player and the enemies. A step is due every `stride` metres actually walked, so
// stepping stops the moment movement does (walking into a wall is silent) and the cadence follows the speed.

const STEP_SOUNDS: readonly SoundKey[] = ['step_metal1', 'step_metal2', 'step_metal3', 'step_metal4'];

export interface StepProfile {
  /** Metres walked between steps. */
  stride: number;
  volume: number;
  /** Playback rate (pitch), with a random spread either way. Lower is heavier. */
  rate: number;
  rateJitter: number;
}

export const PLAYER_STEP: StepProfile = { stride: 1.5, volume: 0.4, rate: 1, rateJitter: 0.08 };
export const DRONE_STEP: StepProfile = { stride: 1.7, volume: 0.6, rate: 1, rateJitter: 0.12 };
/** The Praetorian and other big enemies: slower, deeper, louder. */
export const BOSS_STEP: StepProfile = { stride: 2.6, volume: 1, rate: 0.7, rateJitter: 0.06 };

let lastPick = -1;

/** A random step sound that is never the same one twice in a row. */
export function pickStepSound(): SoundKey {
  let i = Math.floor(Math.random() * STEP_SOUNDS.length);
  if (i === lastPick) i = (i + 1 + Math.floor(Math.random() * (STEP_SOUNDS.length - 1))) % STEP_SOUNDS.length;
  lastPick = i;
  return STEP_SOUNDS[i];
}

/** Accumulates distance walked and says when the next step is due. */
export class StrideCounter {
  private walked = 0;

  /** Adds distance; returns true once per `stride`. */
  public add(distance: number, stride: number): boolean {
    this.walked += distance;
    if (this.walked < stride) return false;
    // Keep the remainder so the cadence stays even, but never bank more than one step after a long gap
    this.walked = this.walked >= stride * 2 ? 0 : this.walked - stride;
    return true;
  }

  public reset(): void {
    this.walked = 0;
  }
}

function pitch(profile: StepProfile): number {
  return profile.rate + (Math.random() * 2 - 1) * profile.rateJitter;
}

/** The player's own footstep: not positional, it is under your feet. */
export function playPlayerStep(): void {
  AudioManager.play2D(pickStepSound(), PLAYER_STEP.volume, pitch(PLAYER_STEP));
}

/** An enemy's footstep, positioned where it is standing. */
export function playEnemyStep(profile: StepProfile, x: number, y: number, z: number): void {
  AudioManager.play3D(pickStepSound(), x, y, z, profile.volume, pitch(profile));
}
