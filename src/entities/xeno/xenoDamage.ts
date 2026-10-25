import * as THREE from 'three';
import { AudioManager } from '../../core/AudioManager';
import { DamageSpec } from '../../core/CombatEvents';
import { moveConstrained } from '../../core/CorridorNav';
import { useGameStore } from '../../core/GameStore';
import { BALANCE } from '../../data/balance';
import { damageAgainstXeno } from '../../systems/combatMath';
import type { ImpactFXHandle } from '../XenomorphImpactFX';
import { PooledXenomorph, playClip, CLIP_WALK, CLIP_DIE } from '../XenoTypes';
import { XENO_DEATH_SECONDS } from './xenoDeath';

const _joint = new THREE.Vector3();
const DEATH_CLIP_SPEEDS = [1.15, 1.25, 1.1, 1.3];
const SLOT_LEFT_LEG = 2;
const SLOT_RIGHT_LEG = 3;
const SLOT_HEAD = 4;

/** Counter used to cycle through the four death animation variants. */
export interface DeathCounter {
  n: number;
}

function severLimb(
  t: PooledXenomorph,
  slot: number,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  fx: ImpactFXHandle | null
): void {
  const bone = t.limbBones[slot];
  if (t.severedLimbs[slot] || !bone) return;
  t.root.updateMatrixWorld(true);
  bone.getWorldPosition(_joint);
  t.severedLimbs[slot] = true;
  fx?.triggerLimbGib(t.id, slot, _joint, dir, t.yaw);
  fx?.triggerImpact(_joint, origin, dir, true);
  AudioManager.play3D('xeno_gib1', _joint.x, _joint.y, _joint.z, 0.95, 0.95 + Math.random() * 0.15);
  AudioManager.play3D('xeno_explode1', _joint.x, _joint.y, _joint.z, 0.85, 1.0 + Math.random() * 0.2);
  AudioManager.play3D('acid_burn', _joint.x, _joint.y, _joint.z, 0.85, 0.95 + Math.random() * 0.2);
  if ((slot === SLOT_LEFT_LEG || slot === SLOT_RIGHT_LEG) && (t.speed *= 0.68) && t.state === 'PURSUING') {
    playClip(t, CLIP_WALK, true, 1.35);
  }
}

function killXeno(t: PooledXenomorph, counter: DeathCounter, fx: ImpactFXHandle | null): void {
  const dv = counter.n++ % 4;
  const scale = BALANCE.XENO_POOL.SCALE;
  t.deathVariant = dv;
  t.state = 'DEAD';
  t.stateTimer = XENO_DEATH_SECONDS;
  t.y = 0.0;
  t.clonedMeshGroup.scale.set(dv === 1 ? -scale : scale, scale, scale);
  t.clonedMeshGroup.position.set(dv === 1 ? -0.09 : 0.09, -0.24, 0);
  playClip(t, CLIP_DIE, false, DEATH_CLIP_SPEEDS[dv], 0.0);
  AudioManager.play3D(Math.random() > 0.4 ? 'xeno_death1' : 'xeno_death2', t.x, t.y + 0.8, t.z, 0.95);
  AudioManager.play3D('xeno_explode1', t.x, t.y + 0.6, t.z, 0.88);
  AudioManager.play3D('xeno_bodyfall', t.x, 0.1, t.z, 0.8);
  AudioManager.play3D('acid_burn', t.x, 0.1, t.z, 0.85);
  fx?.triggerAcidPool(t.x, t.z, 1.15);
  fx?.startXenoMelt(t.id, XENO_DEATH_SECONDS);
  useGameStore.getState().registerKill(t.isBoss ? 'boss' : 'drone');
}

/** Applies a resolved shot to a drone: damage, flash, knockback, dismemberment, death. */
export function applyXenoHit(
  t: PooledXenomorph,
  point: THREE.Vector3,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  dmg: DamageSpec,
  fx: ImpactFXHandle | null,
  counter: DeathCounter
): void {
  const prevHp = t.hp,
    relY = point.y - t.y;
  const isKill = (t.hp -= damageAgainstXeno(dmg.amount, t.state === 'SPAWNING', t.isBoss)) <= 0;
  fx?.triggerImpact(point, origin, dir, isKill);
  moveConstrained(t, t.x + dir.x * 0.12, t.z + dir.z * 0.12, 0.25);
  if (prevHp > t.maxHp * 0.45 && t.hp <= t.maxHp * 0.45 && relY < 0.4) severLimb(t, SLOT_LEFT_LEG, origin, dir, fx);
  if (isKill) {
    if (relY > 0.85) severLimb(t, SLOT_HEAD, origin, dir, fx);
    else if (Math.random() < 0.4) severLimb(t, Math.random() < 0.5 ? 0 : 1, origin, dir, fx);
  }
  AudioManager.play3D(
    Math.random() > 0.5 ? 'bullet_flesh1' : 'bullet_flesh2',
    point.x,
    point.y,
    point.z,
    0.9,
    0.95 + Math.random() * 0.15
  );
  AudioManager.play3D('acid_fizz', point.x, point.y, point.z, 0.75, 1.0 + Math.random() * 0.2);
  if (isKill) killXeno(t, counter, fx);
  else AudioManager.play3D('xeno_hit', t.x, t.y + 0.8, t.z, 0.75, 0.95 + Math.random() * 0.15);
}
