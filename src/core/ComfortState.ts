/** Locomotion signals written by the VR controller poll and read by the comfort vignette (reused, never reallocated). */
export const comfort = {
  /** Smooth-turn speed in rad/s (0 when snap turning or still). */
  turnRate: 0,
  /** Locomotion stick magnitude 0..1. */
  move: 0,
  /** Seconds of full-strength vignette remaining after a snap turn. */
  snapPulse: 0
};

export const SNAP_PULSE_SECONDS = 0.12;
