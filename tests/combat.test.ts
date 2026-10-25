import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CombatSystem, TargetProvider, DamageSpec } from '../src/core/CombatEvents';

const ORIGIN = new THREE.Vector3(0, 1, 0);
const DIR = new THREE.Vector3(0, 0, -1);
const DMG: DamageSpec = { amount: 24, source: 'player' };

/** Provider whose target sits `dist` metres down -Z. */
function makeProvider(id: number, dist: number) {
  const applyHit = vi.fn();
  const provider: TargetProvider = {
    query: (origin, _dir, maxDist, out) => {
      if (dist > maxDist) return Infinity;
      out.id = id;
      out.point.set(origin.x, origin.y, origin.z - dist);
      return dist;
    },
    applyHit
  };
  return { provider, applyHit };
}

function setWall(dist: number | null) {
  if (dist === null) {
    CombatSystem.unregisterEnvRaycaster();
    return;
  }
  const result = { point: new THREE.Vector3(0, 1, -dist), normal: new THREE.Vector3(0, 0, 1) };
  CombatSystem.registerEnvRaycaster(() => result);
}

describe('CombatSystem', () => {
  beforeEach(() => {
    CombatSystem.unregisterProvider('xeno');
    CombatSystem.unregisterProvider('small');
    CombatSystem.unregisterWallImpactHandler();
    setWall(null);
  });

  it('queryTarget never applies damage', () => {
    const xeno = makeProvider(3, 5);
    CombatSystem.registerProvider('xeno', xeno.provider);
    const outcome = CombatSystem.queryTarget(ORIGIN, DIR);
    expect(outcome.kind).toBe('target');
    expect(outcome.id).toBe(3);
    expect(xeno.applyHit).not.toHaveBeenCalled();
  });

  it('a nearer wall occludes the target for queries and for real shots', () => {
    const xeno = makeProvider(1, 10);
    const onWall = vi.fn();
    CombatSystem.registerProvider('xeno', xeno.provider);
    CombatSystem.registerWallImpactHandler(onWall);
    setWall(4);
    expect(CombatSystem.queryTarget(ORIGIN, DIR).kind).toBe('wall');
    expect(CombatSystem.resolveShot(ORIGIN, DIR, DMG).kind).toBe('wall');
    expect(xeno.applyHit).not.toHaveBeenCalled();
    expect(onWall).toHaveBeenCalledTimes(1);
  });

  it('applies damage exactly once when the target is nearer than the wall', () => {
    const xeno = makeProvider(2, 3);
    CombatSystem.registerProvider('xeno', xeno.provider);
    setWall(9);
    const outcome = CombatSystem.resolveShot(ORIGIN, DIR, DMG);
    expect(outcome.kind).toBe('target');
    expect(outcome.target).toBe('xeno');
    expect(xeno.applyHit).toHaveBeenCalledTimes(1);
    expect(xeno.applyHit.mock.calls[0][0]).toBe(2);
    expect(xeno.applyHit.mock.calls[0][4]).toBe(DMG);
  });

  it('the nearest of two providers wins', () => {
    const far = makeProvider(1, 12);
    const near = makeProvider(99, 6);
    CombatSystem.registerProvider('xeno', far.provider);
    CombatSystem.registerProvider('small', near.provider);
    const outcome = CombatSystem.resolveShot(ORIGIN, DIR, DMG);
    expect(outcome.target).toBe('small');
    expect(near.applyHit).toHaveBeenCalledTimes(1);
    expect(far.applyHit).not.toHaveBeenCalled();
  });

  it('reports none with no providers and no wall, and respects range', () => {
    expect(CombatSystem.resolveShot(ORIGIN, DIR, DMG).kind).toBe('none');
    const xeno = makeProvider(1, 40);
    CombatSystem.registerProvider('xeno', xeno.provider);
    expect(CombatSystem.queryTarget(ORIGIN, DIR).kind).toBe('none');
  });

  it('re-registering a kind replaces the previous provider', () => {
    const first = makeProvider(1, 3);
    const second = makeProvider(2, 3);
    CombatSystem.registerProvider('xeno', first.provider);
    CombatSystem.registerProvider('xeno', second.provider);
    CombatSystem.resolveShot(ORIGIN, DIR, DMG);
    expect(first.applyHit).not.toHaveBeenCalled();
    expect(second.applyHit).toHaveBeenCalledTimes(1);
  });
});
