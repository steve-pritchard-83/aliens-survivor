import * as THREE from 'three';
import type { ActiveThreat } from '../../core/GameTypes';
import { CombatSystem } from '../../core/CombatEvents';
import { BALANCE } from '../../data/balance';

const DRONE_RANGE_SQ = BALANCE.RANGES.AUTO_AIM_DRONE * BALANCE.RANGES.AUTO_AIM_DRONE;
const SMALL_RANGE_SQ = BALANCE.RANGES.AUTO_AIM_SMALL * BALANCE.RANGES.AUTO_AIM_SMALL;

const _losDir = new THREE.Vector3();

/** Touch auto-fire: true when a live threat is in the crosshair with a clear line of sight. Side-effect free. */
export function checkAutoTarget(
  camPos: THREE.Vector3,
  camDir: THREE.Vector3,
  threats: ActiveThreat[],
  small: ActiveThreat | null
): boolean {
  let hasCandidate = false;
  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    if (t.state !== 'DEAD' && (t.x - camPos.x) * camDir.x + (t.z - camPos.z) * camDir.z > 0) {
      hasCandidate = true;
      break;
    }
  }
  if (
    !hasCandidate &&
    small &&
    small.state !== 'DEAD' &&
    (small.x - camPos.x) * camDir.x + (small.z - camPos.z) * camDir.z > 0
  )
    hasCandidate = true;
  if (!hasCandidate) return false;

  // Side-effect free probe: never applies damage (see CombatSystem.queryTarget vs resolveShot)
  if (CombatSystem.queryTarget(camPos, camDir).kind === 'target') return true;
  const envProbe = CombatSystem.fireEnvironmentRay(camPos, camDir);
  const wallDist = envProbe ? camPos.distanceTo(envProbe.point) : BALANCE.RANGES.AUTO_AIM_OPEN_DISTANCE;

  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    if (t.state === 'DEAD') continue;
    const dx = t.x - camPos.x,
      dz = t.z - camPos.z,
      d2 = dx * dx + dz * dz;
    if (d2 > 0.4 && d2 < DRONE_RANGE_SQ) {
      const dist = Math.sqrt(d2);
      if (dist < wallDist && (dx * camDir.x + dz * camDir.z) / dist > 0.982) {
        _losDir.set(dx, 0.9 - camPos.y, dz).normalize();
        const losWall = CombatSystem.fireEnvironmentRay(camPos, _losDir);
        if (!losWall || camPos.distanceTo(losWall.point) >= dist - 0.35) return true;
      }
    }
  }
  if (small && small.state !== 'DEAD') {
    const dx = small.x - camPos.x,
      dz = small.z - camPos.z,
      d2 = dx * dx + dz * dz,
      dist = Math.sqrt(d2);
    if (d2 > 0.2 && d2 < SMALL_RANGE_SQ && dist < wallDist && (dx * camDir.x + dz * camDir.z) / dist > 0.98) {
      _losDir.set(dx, 0.25 - camPos.y, dz).normalize();
      const losWall = CombatSystem.fireEnvironmentRay(camPos, _losDir);
      if (!losWall || camPos.distanceTo(losWall.point) >= dist - 0.25) return true;
    }
  }
  return false;
}
