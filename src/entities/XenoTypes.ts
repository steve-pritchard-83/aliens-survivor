import * as THREE from 'three';

export const POOL_SIZE = 6;
export const CLIP_IDLE = 'alien_xenos_drone_SK_Xenos_Drone_skeleton|idle';
export const CLIP_RUN = 'alien_xenos_drone_SK_Xenos_Drone_skeleton|run1';
export const CLIP_WALK = 'alien_xenos_drone_SK_Xenos_Drone_skeleton|walk';
export const CLIP_DIE = 'alien_xenos_drone_SK_Xenos_Drone_skeleton|die';
export const CLIP_LEAP = 'alien_xenos_drone_SK_Xenos_Drone_skeleton|attack2';
export const ATK_CLIPS = [
  'alien_xenos_drone_SK_Xenos_Drone_skeleton|attack1',
  'alien_xenos_drone_SK_Xenos_Drone_skeleton|attack2',
  'alien_xenos_drone_SK_Xenos_Drone_skeleton|kill1'
];

export const LIMB_NAMES = [
  'XenosBiped_l_Arm_ShoulderSHJnt_028',
  'XenosBiped_r_Arm_ShoulderSHJnt_046',
  'XenosBiped_l_Leg_Knee1SHJnt_077',
  'XenosBiped_r_Leg_Knee1SHJnt_087',
  'XenosBiped_Neck_TopSHJnt_09'
];

export interface PooledXenomorph {
  id: number;
  active: boolean;
  isBoss: boolean;
  state: 'SPAWNING' | 'PURSUING' | 'LEAPING' | 'ATTACKING' | 'DEAD';
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  laneOffset: number;
  preferCW: boolean;
  animPhase: number;
  deathVariant: number;
  targetCorner: number;
  leapCooldown: number;
  leapVx: number;
  leapVz: number;
  stateTimer: number;
  attackCooldown: number;
  hitFlashTimer: number;
  gaitTimer: number;
  root: THREE.Group;
  clonedMeshGroup: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  currentClip: string;
  materials: THREE.MeshStandardMaterial[];
  limbBones: (THREE.Object3D | null)[];
  severedLimbs: boolean[];
}

export function sanitizeClips(clips: THREE.AnimationClip[]): THREE.AnimationClip[] {
  return clips.map((raw) => {
    const c = raw.clone();
    c.tracks = c.tracks.filter(
      (t) => !t.name.includes('TrajectorySHJnt_02.position') && !t.name.endsWith('.scale')
    );
    if (c.name === CLIP_DIE) {
      c.tracks.forEach((t) => {
        if (t.name.includes('ROOTSHJnt_03.position')) {
          for (let i = 0; i < t.values.length; i += 3) {
            t.values[i + 1] = Math.min(6.0, t.values[i + 1] * 0.15);
            t.values[i + 2] = Math.min(155.92, t.values[i + 2]);
          }
        }
      });
    }
    return c;
  });
}

export function playClip(
  xeno: PooledXenomorph,
  clipName: string,
  loop = true,
  timeScale = 1.0,
  startTime = -1
): void {
  if (xeno.currentClip === clipName && loop) {
    if (xeno.actions[clipName]) xeno.actions[clipName].timeScale = timeScale;
    return;
  }
  xeno.actions[xeno.currentClip]?.fadeOut(0.15);
  const next = xeno.actions[clipName];
  if (!next) return;

  next.reset()
    .setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1)
    .fadeIn(0.15)
    .play();

  next.clampWhenFinished = !loop;
  next.timeScale = timeScale;
  next.time = startTime >= 0
    ? startTime
    : loop
    ? (xeno.animPhase % 1.0) * (next.getClip().duration || 1.0)
    : 0;

  xeno.currentClip = clipName;
}
