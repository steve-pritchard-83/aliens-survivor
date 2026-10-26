import * as THREE from 'three';
import type { TargetProvider } from '../../core/CombatEvents';
import { BALANCE } from '../../data/balance';
import type { ImpactFXHandle } from '../XenomorphImpactFX';
import type { PooledXenomorph } from '../XenoTypes';
import { applyXenoHit, DeathCounter } from './xenoDamage';

const _sphere = new THREE.Sphere(),
  _ray = new THREE.Ray(),
  _hitVec = new THREE.Vector3();

/** Fits the hit sphere to the enemy: the Alien Queen is far larger than a drone, and smaller while still emerging. */
export function setHitSphere(x: PooledXenomorph, sphere: THREE.Sphere): void {
  const spawning = x.state === 'SPAWNING';
  if (x.isBoss) {
    sphere.center.set(x.x, x.y + BALANCE.QUEEN.HIT_CENTER_Y, x.z);
    sphere.radius = BALANCE.QUEEN.HIT_RADIUS * (spawning ? 0.65 : 1);
  } else {
    sphere.center.set(x.x, x.y + BALANCE.XENO_POOL.HIT_CENTER_Y, x.z);
    sphere.radius = spawning ? BALANCE.XENO_POOL.SPAWN_HIT_RADIUS : BALANCE.XENO_POOL.HIT_RADIUS;
  }
}

/** The combat provider for the pool: side-effect-free queries, and hit application through applyXenoHit. */
export function createXenoProvider(
  pool: PooledXenomorph[],
  getFx: () => ImpactFXHandle | null,
  counter: DeathCounter
): TargetProvider {
  return {
    query: (origin, dir, maxDist, out) => {
      _ray.set(origin, dir);
      let closestDist = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const x = pool[i];
        if (!x.active || x.state === 'DEAD') continue;
        setHitSphere(x, _sphere);
        if (!_ray.intersectSphere(_sphere, _hitVec)) continue;
        const d = origin.distanceTo(_hitVec);
        if (d < closestDist && d <= maxDist) {
          closestDist = d;
          out.id = x.id;
          out.point.copy(_hitVec);
        }
      }
      return closestDist;
    },
    applyHit: (id, point, origin, dir, dmg) => applyXenoHit(pool[id], point, origin, dir, dmg, getFx(), counter)
  };
}
