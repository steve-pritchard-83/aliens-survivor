import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { useGameStore } from '../src/core/GameStore';
import { CombatSystem, TargetProvider } from '../src/core/CombatEvents';
import { BALANCE } from '../src/data/balance';
import { createRifleState, MUZZLE_FLASH_SECONDS } from '../src/entities/rifle/RifleState';
import { updateFiring, updateReloadStages, FireContext } from '../src/entities/rifle/rifleFiring';
import { computeReloadPose, stepRecoil, ReloadPose } from '../src/entities/rifle/rifleViewmodel';
import { checkAutoTarget } from '../src/entities/rifle/autoTarget';
import type { ActiveThreat } from '../src/core/GameTypes';

const s = () => useGameStore.getState();
const camera = new THREE.PerspectiveCamera();
camera.position.set(-0.32, 1.15, 20);
camera.lookAt(-0.32, 1.15, 0);
camera.updateMatrixWorld(true);
const ctx: FireContext = { camera, weapon: null, muzzle: null };

function targetAhead(dist: number): TargetProvider {
  return {
    query: (origin, _dir, maxDist, out) => {
      if (dist > maxDist) return Infinity;
      out.id = 1;
      out.point.set(origin.x, origin.y, origin.z - dist);
      return dist;
    },
    applyHit: () => undefined
  };
}

describe('rifle firing', () => {
  beforeEach(() => {
    CombatSystem.unregisterProvider('xeno');
    CombatSystem.unregisterEnvRaycaster();
    s().startGame();
  });

  it('fires one round per cooldown and registers hits on targets', () => {
    CombatSystem.registerProvider('xeno', targetAhead(6));
    const rs = createRifleState();
    updateFiring(rs, s(), true, 0.016, ctx);
    expect(s().ammo).toBe(BALANCE.WEAPON.MAGAZINE_DEFAULT - 1);
    expect(s().shotsHit).toBe(1);
    expect(rs.muzzleTimer).toBe(MUZZLE_FLASH_SECONDS);
    expect(rs.wasFiring).toBe(true);
    // Cooldown blocks the very next frame
    updateFiring(rs, s(), true, 0.016, ctx);
    expect(s().ammo).toBe(BALANCE.WEAPON.MAGAZINE_DEFAULT - 1);
    // After the fire interval it fires again
    updateFiring(rs, s(), true, s().fireInterval, ctx);
    expect(s().ammo).toBe(BALANCE.WEAPON.MAGAZINE_DEFAULT - 2);
  });

  it('shots into empty space use ammo but never count as hits', () => {
    const rs = createRifleState();
    updateFiring(rs, s(), true, 0.016, ctx);
    expect(s().shotsFired).toBe(1);
    expect(s().shotsHit).toBe(0);
  });

  it('does not fire when the trigger is released and cools the barrel', () => {
    const rs = createRifleState();
    rs.continuousFire = 2;
    updateFiring(rs, s(), false, 0.1, ctx);
    expect(s().shotsFired).toBe(0);
    expect(rs.continuousFire).toBeCloseTo(2 - 0.25, 5);
  });

  it('jams after sustained fire and starts a reload', () => {
    const rs = createRifleState();
    rs.continuousFire = BALANCE.WEAPON.JAM_THRESHOLD_SECONDS;
    updateFiring(rs, s(), true, 0.1, ctx);
    expect(s().isJammed).toBe(true);
    expect(s().isReloading).toBe(true);
  });

  it('an empty magazine dry-fires into a reload', () => {
    const rs = createRifleState();
    useGameStore.setState({ ammo: 0 });
    updateFiring(rs, s(), true, 0.016, ctx);
    expect(s().isReloading).toBe(true);
    expect(rs.fireCooldown).toBeCloseTo(0.25);
  });

  it('reload stages kick the viewmodel at the documented progress points', () => {
    const rs = createRifleState();
    useGameStore.setState({ isReloading: true, reloadProgress: 0.1 });
    updateReloadStages(rs, s());
    expect(rs.lastReloadStage).toBe(1);
    useGameStore.setState({ reloadProgress: 0.6 });
    updateReloadStages(rs, s());
    expect(rs.lastReloadStage).toBe(2);
    useGameStore.setState({ reloadProgress: 0.9 });
    updateReloadStages(rs, s());
    expect(rs.lastReloadStage).toBe(3);
    expect(rs.boltKick).toBe(1);
    useGameStore.setState({ isReloading: false });
    updateReloadStages(rs, s());
    expect(rs.lastReloadStage).toBe(0);
  });
});

describe('rifle viewmodel', () => {
  it('recoil eases back to rest and the muzzle flash expires', () => {
    const rs = createRifleState();
    rs.recoilOffset = 0.06;
    rs.recoilPitch = 0.04;
    rs.muzzleTimer = MUZZLE_FLASH_SECONDS;
    for (let i = 0; i < 60; i++) stepRecoil(rs, 0.016);
    expect(Math.abs(rs.recoilOffset)).toBeLessThan(1e-3);
    expect(Math.abs(rs.recoilPitch)).toBeLessThan(1e-3);
    expect(rs.muzzleTimer).toBe(0);
  });

  it('reload pose is continuous-ish across phases and returns to rest at the end', () => {
    const pose: ReloadPose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
    computeReloadPose(0, pose);
    expect(pose.roll).toBeCloseTo(0, 5);
    computeReloadPose(0.36, pose);
    expect(pose.roll).toBeGreaterThan(0.4);
    computeReloadPose(0.5, pose);
    expect(pose.yaw).toBeCloseTo(0.16, 5);
    computeReloadPose(0.999, pose);
    expect(Math.abs(pose.pitch)).toBeLessThan(0.01);
    expect(Math.abs(pose.y)).toBeLessThan(0.01);
  });
});

describe('auto-target', () => {
  const aheadThreat = (z: number): ActiveThreat => ({ id: 1, x: -0.32, z, state: 'PURSUING' });
  const origin = new THREE.Vector3(-0.32, 1.15, 20);
  const dir = new THREE.Vector3(0, 0, -1);

  beforeEach(() => {
    CombatSystem.unregisterProvider('xeno');
    CombatSystem.unregisterEnvRaycaster();
  });

  it('is false with no threats', () => {
    expect(checkAutoTarget(origin, dir, [], null)).toBe(false);
  });

  it('is true when a threat is in the crosshair, via the target probe', () => {
    CombatSystem.registerProvider('xeno', targetAhead(8));
    expect(checkAutoTarget(origin, dir, [aheadThreat(12)], null)).toBe(true);
  });

  it('falls back to the aim cone when the probe misses but a threat is dead ahead', () => {
    expect(checkAutoTarget(origin, dir, [aheadThreat(12)], null)).toBe(true);
  });

  it('is false for threats behind the player, dead threats, or far off-axis', () => {
    expect(checkAutoTarget(origin, dir, [aheadThreat(30)], null)).toBe(false);
    expect(checkAutoTarget(origin, dir, [{ ...aheadThreat(12), state: 'DEAD' }], null)).toBe(false);
    expect(checkAutoTarget(origin, dir, [{ id: 1, x: -8, z: 14, state: 'PURSUING' }], null)).toBe(false);
  });

  it('also tracks the small alien', () => {
    expect(checkAutoTarget(origin, dir, [], { id: 99, x: -0.32, z: 15, state: 'PURSUING' })).toBe(true);
  });
});
