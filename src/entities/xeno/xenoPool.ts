import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { BALANCE } from '../../data/balance';
import { POOL_SIZE, LIMB_NAMES, PooledXenomorph, playClip, CLIP_IDLE } from '../XenoTypes';

export const XENO_BASE_EMISSIVE = { hex: 0x101c22, intensity: 0 };
const BOSS_EMISSIVE_HEX = 0x331010;

/** Builds the fixed pool of drones once (cloned skeleton, tinted materials, animation mixer each). */
export function buildXenoPool(scene: THREE.Group, clips: THREE.AnimationClip[]): PooledXenomorph[] {
  return Array.from({ length: POOL_SIZE }, (_, i) => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Group;
    cloned.scale.setScalar(BALANCE.XENO_POOL.SCALE);
    cloned.position.set(0.09, -0.24, 0);
    const materials: THREE.MeshStandardMaterial[] = [];
    cloned.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const m = child as THREE.Mesh,
        mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.roughness = 0.34;
      mat.metalness = 0.22;
      mat.color.setRGB(1.45, 1.52, 1.6);
      mat.emissive.setHex(XENO_BASE_EMISSIVE.hex);
      mat.emissiveIntensity = XENO_BASE_EMISSIVE.intensity;
      m.material = mat;
      materials.push(mat);
    });
    const limbBones = LIMB_NAMES.map((name) => cloned.getObjectByName(name) ?? null),
      wrapper = new THREE.Group();
    wrapper.visible = false;
    wrapper.add(cloned);
    const mixer = new THREE.AnimationMixer(cloned),
      actions: Record<string, THREE.AnimationAction> = {};
    clips.forEach((clip) => {
      actions[clip.name] = mixer.clipAction(clip);
    });
    return {
      id: i,
      active: false,
      isBoss: false,
      state: 'DEAD',
      hp: 320,
      maxHp: 320,
      x: 0,
      y: -50,
      z: 0,
      yaw: 0,
      speed: 3.2,
      laneOffset: (i % 2 === 0 ? -1 : 1) * 0.14,
      preferCW: i % 2 === 0,
      animPhase: i * 0.41,
      deathVariant: 0,
      targetCorner: -1,
      leapCooldown: 1.0,
      leapVx: 0,
      leapVz: 0,
      stateTimer: 0,
      attackCooldown: 0,
      gaitTimer: 0,
      root: wrapper,
      clonedMeshGroup: cloned,
      mixer,
      actions,
      currentClip: '',
      materials,
      limbBones,
      severedLimbs: [false, false, false, false, false]
    };
  });
}

/** Deactivates every drone (new run). */
export function resetXenoPool(pool: PooledXenomorph[]): void {
  for (let i = 0; i < pool.length; i++) {
    const x = pool[i];
    x.active = false;
    x.state = 'DEAD';
    x.root.visible = false;
    x.y = -50;
  }
}

export interface SpawnParams {
  nodeX: number;
  nodeY: number;
  nodeZ: number;
  isBoss: boolean;
  hp: number;
  scale: number;
  baseSpeed: number;
}

/** Brings a pooled drone to life at a spawn node. Visual reset only; audio is left to the caller. */
export function spawnXeno(x: PooledXenomorph, p: SpawnParams): void {
  x.isBoss = p.isBoss;
  x.active = true;
  x.state = 'SPAWNING';
  x.stateTimer = 0.7;
  x.hp = p.hp;
  x.maxHp = p.hp;
  x.x = p.nodeX;
  x.y = p.nodeY;
  x.z = p.nodeZ;
  const speed = p.isBoss ? BALANCE.PRAETORIAN.SPEED : p.baseSpeed;
  x.speed = speed * (Math.random() < 0.3 ? 0.82 : 0.94 + Math.random() * 0.18);
  x.laneOffset = (Math.random() - 0.5) * 0.24;
  x.preferCW = Math.random() < 0.5;
  x.targetCorner = -1;
  x.leapCooldown = 0.35;
  x.gaitTimer = 2.0 + Math.random() * 2.5;
  x.attackCooldown = 0;
  x.severedLimbs.fill(false);
  x.clonedMeshGroup.traverse((o) => {
    if ((o as THREE.Bone).isBone) o.scale.set(1, 1, 1);
  });
  x.root.scale.set(1, 1, 1);
  x.clonedMeshGroup.scale.setScalar(p.scale);
  x.clonedMeshGroup.position.set(0.09, -0.24, 0);
  for (let i = 0; i < x.materials.length; i++) {
    x.materials[i].emissive.setHex(p.isBoss ? BOSS_EMISSIVE_HEX : XENO_BASE_EMISSIVE.hex);
    x.materials[i].emissiveIntensity = XENO_BASE_EMISSIVE.intensity;
  }
  x.root.position.set(x.x, x.y, x.z);
  x.root.visible = true;
  playClip(x, CLIP_IDLE, true, 1.0);
}
