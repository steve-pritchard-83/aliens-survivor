import * as THREE from 'three';
import type { GameState } from '../../core/GameTypes';
import { useGameStore } from '../../core/GameStore';
import { AudioManager } from '../../core/AudioManager';
import { CombatSystem, DamageSpec } from '../../core/CombatEvents';
import { Haptics } from '../../core/Haptics';
import { xrControllerState } from '../../core/XRControllerState';
import { WEAPONS, WeaponProfile } from '../../data/weapons';
import { weaponDamage } from '../../systems/combatMath';
import { RifleState, MUZZLE_FLASH_SECONDS } from './RifleState';

const _dmg: DamageSpec = { amount: 0, source: 'player' };
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();

export interface FireContext {
  camera: THREE.Camera;
  weapon: THREE.Group | null;
  muzzle: THREE.Group | null;
}

/** Fires the reload audio/kick cues as the reload progresses through its stages. */
export function updateReloadStages(rs: RifleState, state: GameState): void {
  if (!state.isReloading) {
    rs.lastReloadStage = 0;
    return;
  }
  if (state.reloadProgress > 0.05 && rs.lastReloadStage === 0) {
    AudioManager.play2D('reload_out', 0.75);
    rs.lastReloadStage = 1;
    rs.recoilPitch = -0.05;
    rs.recoilOffset = 0.025;
  } else if (state.reloadProgress > 0.55 && rs.lastReloadStage === 1) {
    AudioManager.play2D('reload_in', 0.8);
    rs.lastReloadStage = 2;
    rs.recoilPitch = 0.085;
    rs.recoilRoll = -0.09;
  } else if (state.reloadProgress > 0.85 && rs.lastReloadStage === 2) {
    AudioManager.play2D('reload_slap', 0.85);
    rs.lastReloadStage = 3;
    rs.recoilOffset = -0.045;
    rs.recoilPitch = -0.06;
    rs.recoilRoll = 0.14;
    rs.boltKick = 1.0;
    Haptics.reload();
  }
}

function stopBurstAudio(rs: RifleState, withTail: boolean): void {
  if (!rs.wasFiring) return;
  AudioManager.stopPulseLoop(withTail);
  rs.wasFiring = false;
}

function aimRay(state: GameState, ctx: FireContext, heat: number, weapon: WeaponProfile): void {
  const handActive = state.settings.leftHanded ? xrControllerState.leftHand.active : xrControllerState.rightHand.active;
  if (handActive && ctx.muzzle && ctx.weapon) {
    ctx.muzzle.getWorldPosition(_origin);
    ctx.weapon.getWorldDirection(_dir).negate();
  } else {
    ctx.camera.getWorldPosition(_origin);
    ctx.camera.getWorldDirection(_dir);
  }
  const spread = Math.min(weapon.spreadMax, heat * weapon.spreadPerSecond);
  _dir.x += (Math.random() - 0.5) * spread;
  _dir.y += (Math.random() - 0.5) * spread;
  _dir.normalize();
}

function fireOneRound(rs: RifleState, state: GameState, ctx: FireContext, weapon: WeaponProfile): void {
  // Carry the overshoot so the rate does not snap to whole frames (about 12% slower at 72 Hz otherwise)
  rs.fireCooldown += state.fireInterval;
  rs.wasFiring = true;
  rs.recoilOffset = 0.058 + Math.random() * 0.015;
  rs.recoilPitch = 0.038 + Math.random() * 0.018;
  rs.recoilYaw = (Math.random() - 0.5) * 0.026;
  rs.recoilRoll = (Math.random() - 0.5) * 0.065;
  rs.boltKick = 1.0;
  rs.muzzleTimer = MUZZLE_FLASH_SECONDS;
  AudioManager.playPulseShot(weapon.shotSounds);
  Haptics.fire();
  if (ctx.muzzle) {
    ctx.muzzle.rotation.z = Math.random() * Math.PI * 2;
    ctx.muzzle.scale.setScalar(0.85 + Math.random() * 0.35);
  }
  aimRay(state, ctx, rs.continuousFire, weapon);
  _dmg.amount = weaponDamage(weapon, state.activeUpgrades.includes('ap_ammo'));
  const outcome = CombatSystem.resolveShot(_origin, _dir, _dmg, weapon.maxRange);
  if (outcome.kind === 'target') state.registerHit();
  else if (outcome.kind === 'wall') {
    AudioManager.play2D(Math.random() > 0.5 ? 'ricochet1' : 'ricochet2', 0.45, 0.9 + Math.random() * 0.2);
  }
  if (state.ammo <= 0) stopBurstAudio(rs, true);
}

/** Trigger logic: jam heat, fire-rate cooldown, dry-fire reload, and burst audio tail on release. */
export function updateFiring(rs: RifleState, state: GameState, isFiring: boolean, dt: number, ctx: FireContext): void {
  const weapon = WEAPONS[state.activeWeapon];
  rs.fireCooldown -= dt;
  if (!isFiring || state.isReloading || state.isJammed) {
    // Nothing is banked while the trigger is up: a fresh pull fires at once and no further
    rs.fireCooldown = Math.max(0, rs.fireCooldown);
    stopBurstAudio(rs, true);
    rs.continuousFire = Math.max(0, rs.continuousFire - dt * 2.5);
    return;
  }
  // The carried overshoot is at most one interval
  rs.fireCooldown = Math.max(rs.fireCooldown, -state.fireInterval);
  rs.continuousFire += dt;
  if (rs.continuousFire > weapon.jamThresholdSeconds) {
    stopBurstAudio(rs, false);
    useGameStore.setState({ isJammed: true });
    AudioManager.play2D('empty_click', 0.85);
    state.startReload();
    return;
  }
  if (rs.fireCooldown > 0) return;
  if (state.ammo > 0 && state.fireRound()) {
    fireOneRound(rs, state, ctx, weapon);
  } else if (state.ammo <= 0) {
    stopBurstAudio(rs, true);
    rs.fireCooldown = 0.25;
    AudioManager.play2D('empty_click', 0.7);
    state.startReload();
  }
}
