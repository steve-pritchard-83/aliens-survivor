import * as THREE from 'three';

// Bishop is authored as a static 1.75m mesh in a lowered T-pose facing +Z, with no skeleton.
// This builds a procedural skeleton + smooth skin weights so he can be posed (arms IK'd onto the rifle) and animated (walk cycle).
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Rest-pose joint positions measured from the mesh (right-hand side mirrored by sign of x)
const J = {
  hips: [0, 0.88, 0], thigh: [0.09, 0.86, 0], knee: [0.09, 0.48, 0], ankle: [0.09, 0.09, 0],
  shoulder: [0.22, 1.36, -0.01], elbow: [0.50, 1.26, -0.02], wrist: [0.72, 1.17, -0.02]
};
// Bone layout: 0 = hips; per side (L base = 1, R base = 6): +0 thigh, +1 shin, +2 foot, +3 upper arm, +4 forearm
const sideBase = (s: number) => (s > 0 ? 1 : 6);

export interface BishopRig {
  group: THREE.Group; bones: THREE.Bone[]; rifleMount: THREE.Group;
}

function skinWeights(x: number, y: number): { idx: number[]; w: number[] } {
  const s = x >= 0 ? 1 : -1, ax = Math.abs(x), base = sideBase(s);
  const armMask = sstep(0.17, 0.27, ax) * sstep(0.98, 1.08, y);
  if (armMask > 0) {
    const fore = sstep(0.44, 0.56, ax);
    return { idx: [0, base + 3, base + 4, 0], w: [1 - armMask, armMask * (1 - fore), armMask * fore, 0] };
  }
  const legZone = 1 - sstep(0.8, 0.92, y);
  const foot = 1 - sstep(0.07, 0.15, y), shin = Math.max(0, 1 - sstep(0.43, 0.54, y) - foot), thigh = Math.max(0, 1 - shin - foot);
  return { idx: [0, base, base + 1, base + 2], w: [1 - legZone, legZone * thigh, legZone * shin, legZone * foot] };
}

export function buildBishopRig(source: THREE.Object3D): BishopRig {
  source.updateMatrixWorld(true);
  const bones: THREE.Bone[] = [], world: THREE.Vector3[] = [];
  const mk = (name: string, w: number[], parent: number, sign = 1) => {
    const b = new THREE.Bone(), wp = new THREE.Vector3(w[0] * sign, w[1], w[2]);
    b.name = name; world.push(wp);
    if (parent < 0) b.position.copy(wp); else { b.position.copy(wp).sub(world[parent]); bones[parent].add(b); }
    bones.push(b);
  };
  mk('hips', J.hips, -1);
  for (const s of [1, -1]) {
    const b0 = bones.length;
    mk('thigh', J.thigh, 0, s); mk('shin', J.knee, b0, s); mk('foot', J.ankle, b0 + 1, s);
    mk('upper', J.shoulder, 0, s); mk('fore', J.elbow, b0 + 3, s);
  }

  const group = new THREE.Group(), skinned: THREE.SkinnedMesh[] = [];
  group.add(bones[0]);
  source.traverse((ch) => {
    if (!(ch as THREE.Mesh).isMesh) return;
    const m = ch as THREE.Mesh, geo = m.geometry.clone();
    geo.applyMatrix4(m.matrixWorld); // bake node transforms so vertices are in the 1.75m rig frame
    const pos = geo.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const { idx, w } = skinWeights(pos.getX(i), pos.getY(i)), sum = w[0] + w[1] + w[2] + w[3] || 1;
      for (let k = 0; k < 4; k++) { si[i * 4 + k] = idx[k]; sw[i * 4 + k] = w[k] / sum; }
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const src = Array.isArray(m.material) ? m.material[0] : m.material, mat = (src as THREE.MeshStandardMaterial).clone();
    mat.roughness = 0.5; mat.metalness = 0.1; mat.emissive.setHex(0x10161c); mat.emissiveIntensity = 0.3;
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.frustumCulled = false; group.add(sm); skinned.push(sm);
  });
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skinned.forEach((sm) => sm.bind(skeleton, sm.matrixWorld));

  const rifleMount = new THREE.Group();
  group.add(rifleMount);
  return { group, bones, rifleMount };
}

const _X = new THREE.Vector3(1, 0, 0);
const _S = new THREE.Vector3(), _E0 = new THREE.Vector3(), _W0 = new THREE.Vector3(), _dir = new THREE.Vector3(), _pole = new THREE.Vector3();
const _E = new THREE.Vector3(), _T = new THREE.Vector3(), _ru = new THREE.Vector3(), _rf = new THREE.Vector3(), _qU = new THREE.Quaternion(), _qF = new THREE.Quaternion();

// Analytic two-bone IK: rotates upper arm + forearm so the wrist reaches `target` (rig frame), elbow pushed down/out/back
function solveArm(side: number, upper: THREE.Bone, fore: THREE.Bone, target: THREE.Vector3, shoulderDy: number) {
  _S.set(J.shoulder[0] * side, J.shoulder[1] + shoulderDy, J.shoulder[2]);
  _E0.set(J.elbow[0] * side, J.elbow[1], J.elbow[2]); _W0.set(J.wrist[0] * side, J.wrist[1], J.wrist[2]);
  const L1 = _E0.distanceTo(_W0.set(J.shoulder[0] * side, J.shoulder[1], J.shoulder[2])), L2 = Math.hypot(J.wrist[0] - J.elbow[0], J.wrist[1] - J.elbow[1], J.wrist[2] - J.elbow[2]);
  _W0.set(J.wrist[0] * side, J.wrist[1], J.wrist[2]);
  _ru.copy(_E0).sub(_W0.set(J.shoulder[0] * side, J.shoulder[1], J.shoulder[2])).normalize();
  _W0.set(J.wrist[0] * side, J.wrist[1], J.wrist[2]); _rf.copy(_W0).sub(_E0).normalize();
  _dir.copy(target).sub(_S); const d = Math.min(L1 + L2 - 0.004, Math.max(Math.abs(L1 - L2) + 0.05, _dir.length()));
  _dir.normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  _pole.set(side * 0.45, -1, -0.3); _pole.addScaledVector(_dir, -_pole.dot(_dir)).normalize();
  _E.copy(_S).addScaledVector(_dir, a).addScaledVector(_pole, h); _T.copy(_S).addScaledVector(_dir, d);
  _qU.setFromUnitVectors(_ru, _dir.copy(_E).sub(_S).normalize());
  _qF.setFromUnitVectors(_rf, _dir.copy(_T).sub(_E).normalize());
  upper.quaternion.copy(_qU); fore.quaternion.copy(_qU).invert().multiply(_qF);
}

export interface BishopPose { phase: number; move: number; time: number; kick: number; }
const _gripR = new THREE.Vector3(), _gripL = new THREE.Vector3();

export function poseBishop(rig: BishopRig, p: BishopPose) {
  const { bones, rifleMount } = rig;

  // Upright military android posture: steady hips with slight forward lean and natural stride yaw
  const pelvicLean = 0.04 * p.move;
  const pelvicYaw = Math.sin(p.phase) * 0.025 * p.move;
  bones[0].rotation.set(pelvicLean, pelvicYaw, 0);

  // Natural biped pendulum stride: thigh pendulum swing, knee flexion on forward lift, level foot
  [1, 6].forEach((base, i) => {
    const ph = p.phase + (i === 0 ? 0 : Math.PI);
    const sw = Math.sin(ph);
    const thighRot = -sw * 0.44 * p.move;
    const kneeBend = Math.max(0, sw) * 0.72 * p.move;
    const footRot = -thighRot - kneeBend * 0.82;
    bones[base].rotation.set(thighRot, 0, 0);
    bones[base + 1].rotation.set(kneeBend, 0, 0);
    bones[base + 2].rotation.set(footRot, 0, 0);
  });

  const dy = 0.018 * p.move * Math.abs(Math.sin(p.phase * 2)) + Math.sin(p.time * 2.2) * 0.003;
  const dxHips = Math.sin(p.phase) * 0.012 * p.move;
  bones[0].position.set(dxHips, J.hips[1] + dy, 0);

  // Weapon sway and recoil
  const breathe = Math.sin(p.time * 2.2) * 0.005;
  const walkSway = Math.cos(p.phase) * 0.012 * p.move;
  rifleMount.position.set(-0.05 + walkSway, 1.04 + dy + breathe, 0.2 - p.kick);
  rifleMount.rotation.set(-p.kick * 0.9 + 0.02 * p.move, -pelvicYaw * 0.7, 0);
  rifleMount.updateMatrix();

  _gripR.set(0, -0.085, -0.08).applyMatrix4(rifleMount.matrix);
  _gripL.set(0, -0.03, 0.09).applyMatrix4(rifleMount.matrix);
  solveArm(-1, bones[9], bones[10], _gripR, dy);
  solveArm(1, bones[4], bones[5], _gripL, dy);
}
