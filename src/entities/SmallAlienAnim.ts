import * as THREE from 'three';

// Articulated procedural animation for Facehugger (spider tripod scuttle + whip tail) and Chestburster (serpentine undulation).
// Motion is computed directly in local bone frames for mathematical stability and fluid organic motion.
export type AnimMode = 'IDLE' | 'RUN' | 'LEAP' | 'BITE' | 'DEAD';
export interface BoneEntry {
  obj: THREE.Object3D;
  base: THREE.Quaternion;
}

const _qD = new THREE.Quaternion(),
  _eu = new THREE.Euler(0, 0, 0, 'YXZ');
const norm = (s: string) => s.replace(/[\s_]/g, '');

function indexBones(root: THREE.Object3D) {
  const map = new Map<string, THREE.Object3D>();
  root.traverse((o) => map.set(norm(o.name), o));
  return (key: string): BoneEntry | null => {
    const o = map.get(key);
    return o ? { obj: o, base: o.quaternion.clone() } : null;
  };
}

function rotateLocal(b: BoneEntry, x: number, y: number, z: number) {
  _eu.set(x, y, z, 'YXZ');
  _qD.setFromEuler(_eu);
  b.obj.quaternion.copy(b.base).multiply(_qD);
}

// Index loops, not forEach: these run every frame for every small alien (no closures or arrays per frame)
function reset(bs: BoneEntry[]): void {
  for (let i = 0; i < bs.length; i++) bs[i].obj.quaternion.copy(bs[i].base);
}

function resetBone(b: BoneEntry): void {
  b.obj.quaternion.copy(b.base);
}

export function groundModel(wrap: THREE.Object3D, model: THREE.Object3D) {
  wrap.updateMatrixWorld(true);
  wrap.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.update();
  });
  const box = new THREE.Box3().setFromObject(wrap, true);
  if (isFinite(box.min.y)) model.position.y -= box.min.y;
}

interface FaceLeg {
  hip: BoneEntry;
  knee: BoneEntry;
  ankle: BoneEntry;
  side: number;
  lane: number;
  parity: number;
}
export interface FaceRig {
  legs: FaceLeg[];
  tail: BoneEntry[];
  wrap: THREE.Object3D;
}

const LEG_DEFS: [string, string, string[]][] = [
  ['front', 'l', ['010', '011', '012']],
  ['front', 'r', ['013', '014', '015']],
  ['mid', 'l', ['016', '017', '018']],
  ['mid', 'r', ['019', '020', '021']],
  ['back', 'l', ['04', '05', '06']],
  ['back', 'r', ['07', '08', '09']]
];
const TAIL_KEYS = ['bonetail01022', 'bonetail02023', 'bonetail03024', 'bonetail04025', 'bonetail0500', 'bonetail06026'];

export function buildFaceRig(wrap: THREE.Object3D): FaceRig {
  wrap.updateMatrixWorld(true);
  const get = indexBones(wrap),
    legs: FaceLeg[] = [];
  LEG_DEFS.forEach(([lane, s, n]) => {
    const p = `boneleg${lane}${s}`;
    const hip = get(`${p}01${n[0]}`),
      knee = get(`${p}02${n[1]}`),
      ankle = get(`${p}03${n[2]}`);
    if (!hip || !knee || !ankle) return;
    const laneIdx = ['front', 'mid', 'back'].indexOf(lane),
      side = s === 'l' ? 1 : -1;
    // Tripod gait grouping: Left front + Right mid + Left back vs Right front + Left mid + Right back
    legs.push({ hip, knee, ankle, side, lane: laneIdx, parity: (laneIdx + (side > 0 ? 0 : 1)) % 2 });
  });
  return { legs, tail: TAIL_KEYS.map(get).filter((b): b is BoneEntry => !!b), wrap };
}

export function animateFace(rig: FaceRig, mode: AnimMode, phase: number, t: number) {
  reset(rig.tail);
  for (let i = 0; i < rig.legs.length; i++) {
    resetBone(rig.legs[i].hip);
    resetBone(rig.legs[i].knee);
    resetBone(rig.legs[i].ankle);
  }
  const isDead = mode === 'DEAD',
    isLeap = mode === 'LEAP',
    isBite = mode === 'BITE',
    isRun = mode === 'RUN';

  for (let i = 0; i < rig.legs.length; i++) {
    const l = rig.legs[i];
    const ph = phase + l.parity * Math.PI;
    let swing = 0,
      lift = 0,
      knee = 0,
      claw = 0;
    if (isRun) {
      swing = Math.sin(ph) * 0.48 * l.side;
      lift = Math.max(0, Math.cos(ph)) * 0.42;
      knee = -lift * 0.65 + 0.12;
      claw = lift * 0.25;
    } else if (isLeap) {
      swing = (0.35 + (l.lane === 0 ? 0.25 : -0.15)) * l.side;
      lift = -0.32;
      knee = 0.45;
      claw = 0.25 + Math.sin(t * 30 + i) * 0.15;
    } else if (isBite) {
      swing = Math.sin(t * 26 + i * 1.5) * 0.25;
      lift = 0.3 + Math.cos(t * 26 + i * 1.5) * 0.25;
      knee = -0.4;
      claw = 0.3;
    } else if (isDead) {
      const k = Math.min(1, t * 1.5);
      swing = l.side * 0.15 * k;
      lift = -0.65 * k;
      knee = -0.95 * k;
      claw = -0.55 * k;
    } else {
      swing = Math.sin(t * 2.5 + i * 1.2) * 0.08 * l.side;
    }
    rotateLocal(l.hip, lift, swing, 0);
    rotateLocal(l.knee, knee, 0, 0);
    rotateLocal(l.ankle, claw, 0, 0);
  }

  // Segmented scorpion whip tail: curls over the back while swaying organically
  const tailAmp = isRun ? 0.24 : isBite ? 0.35 : isLeap ? 0.08 : isDead ? 0.02 : 0.12;
  const tailCurl = isLeap ? -0.05 : isDead ? -0.25 : isBite ? -0.38 : -0.28;
  const tailSpeed = isRun ? phase * 0.6 : t * 4.0;
  for (let i = 0; i < rig.tail.length; i++) {
    const sway = Math.sin(tailSpeed - i * 0.72) * tailAmp;
    rotateLocal(rig.tail[i], tailCurl, sway, 0);
  }

  // Whole-body arachnid scuttle: dynamic deck tilt and rapid cadence bob
  rig.wrap.position.y = isRun ? Math.abs(Math.sin(phase * 2)) * 0.022 : 0;
  rig.wrap.rotation.z = isRun ? Math.sin(phase) * 0.08 : 0;
  rig.wrap.rotation.y = isRun ? Math.cos(phase) * 0.06 : 0;
}

export interface WormRig {
  spine: BoneEntry[];
  wrap: THREE.Object3D;
}
const SPINE_KEYS = [
  'bone00103',
  'bone00204',
  'bone00305',
  'bone00406',
  'bone00507',
  'bone00608',
  'bone00709',
  'bone008010',
  'bone009011',
  'bone011012'
];

export function buildWormRig(wrap: THREE.Object3D): WormRig {
  wrap.updateMatrixWorld(true);
  const get = indexBones(wrap);
  return { spine: SPINE_KEYS.map(get).filter((b): b is BoneEntry => !!b), wrap };
}

// Continuous serpentine undulation: traveling S-wave through 10 vertebrae with rearing neck and striking head
export function animateWorm(rig: WormRig, mode: AnimMode, phase: number, t: number) {
  reset(rig.spine);
  const n = rig.spine.length;
  const isRun = mode === 'RUN',
    isLeap = mode === 'LEAP',
    isBite = mode === 'BITE',
    isDead = mode === 'DEAD';
  const amp = isRun ? 0.32 : isBite ? 0.22 : isLeap ? 0.12 : isDead ? 0.04 : 0.14;
  const speed = isRun ? phase : t * 3.5;

  for (let i = 0; i < n; i++) {
    const frac = i / (n - 1);
    const env = 0.25 + 0.75 * frac;
    let waveZ = Math.sin(speed - (n - 1 - i) * 0.72) * amp * env;
    let pitchX = 0;
    if (isLeap) {
      pitchX = i >= 5 ? -0.16 : 0.04;
      waveZ *= 0.4;
    } else if (isBite) {
      pitchX = -0.08 - (i >= 6 ? 0.18 : 0) + Math.sin(t * 22) * 0.06;
      waveZ = Math.sin(t * 14 - i * 0.5) * 0.18;
    } else if (isDead) {
      const k = Math.min(1, t * 1.5);
      waveZ = (0.28 + i * 0.03) * k;
      pitchX = 0.05 * k;
    } else if (isRun) {
      // Elevate head vertebra slightly while slithering
      pitchX = i >= 7 ? -0.06 : 0.01;
    }
    rotateLocal(rig.spine[i], pitchX, 0, waveZ);
  }

  rig.wrap.position.y = isRun ? Math.abs(Math.sin(phase)) * 0.018 : 0;
  rig.wrap.rotation.y = isRun ? Math.sin(phase) * 0.14 : 0;
  rig.wrap.rotation.z = isRun ? Math.cos(phase) * 0.08 : 0;
}
