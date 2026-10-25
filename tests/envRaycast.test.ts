import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { registerEnvironmentRaycast } from '../src/entities/level/envRaycast';
import { CombatSystem } from '../src/core/CombatEvents';

function wallAt(z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial());
  mesh.position.set(0, 1, z);
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('environment raycast', () => {
  it('hits the nearest wall with a normal facing the shooter, using a BVH', () => {
    const near = wallAt(-5),
      far = wallAt(-12);
    const cleanup = registerEnvironmentRaycast([far, near]);
    expect(near.geometry.boundsTree).toBeDefined();
    const origin = new THREE.Vector3(0, 1, 0),
      dir = new THREE.Vector3(0, 0, -1);
    const hit = CombatSystem.fireEnvironmentRay(origin, dir);
    expect(hit).not.toBeNull();
    expect(hit!.point.z).toBeCloseTo(-5, 5);
    expect(hit!.normal.z).toBeGreaterThan(0.99);
    cleanup();
    expect(near.geometry.boundsTree).toBeUndefined();
    expect(CombatSystem.fireEnvironmentRay(origin, dir)).toBeNull();
  });

  it('misses when nothing is in range or in line, and reuses its result object', () => {
    const cleanup = registerEnvironmentRaycast([wallAt(-5)]);
    const origin = new THREE.Vector3(0, 1, 0);
    expect(CombatSystem.fireEnvironmentRay(origin, new THREE.Vector3(0, 0, 1))).toBeNull();
    expect(CombatSystem.fireEnvironmentRay(origin, new THREE.Vector3(1, 0, 0))).toBeNull();
    const a = CombatSystem.fireEnvironmentRay(origin, new THREE.Vector3(0, 0, -1));
    const b = CombatSystem.fireEnvironmentRay(origin, new THREE.Vector3(0, 0, -1));
    expect(a).toBe(b);
    cleanup();
  });

  it('respects the 52 m maximum range', () => {
    const cleanup = registerEnvironmentRaycast([wallAt(-60)]);
    const hit = CombatSystem.fireEnvironmentRay(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
    expect(hit).toBeNull();
    cleanup();
  });
});
