import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildQueenRig, queenPose, QueenPose } from '../src/entities/xeno/queenRig';
import { setHitSphere } from '../src/entities/xeno/xenoProvider';
import { buildXenoPool, spawnXeno } from '../src/entities/xeno/xenoPool';

const blank = (): QueenPose => ({ y: 0, z: 0, pitch: 0, roll: 0, yaw: 0, scaleY: 1 });
const SPAWN = { nodeX: -0.32, nodeY: 0, nodeZ: 22.1, hp: 1100, scale: 0.45, baseSpeed: 3 };

describe('queenPose', () => {
  it('stays finite and bounded in every state', () => {
    const p = blank();
    for (const state of ['SPAWNING', 'PURSUING', 'LEAPING', 'ATTACKING', 'DEAD'] as const) {
      for (let k = 0; k <= 3; k += 0.25) {
        queenPose(state, 1.3, k * 5, k, p);
        for (const v of Object.values(p)) expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(p.pitch)).toBeLessThan(1);
        expect(p.scaleY).toBeGreaterThan(0.9);
      }
    }
  });

  it('stomps and sways while pursuing', () => {
    const p = blank();
    queenPose('PURSUING', 0, Math.PI / 2, 0, p);
    expect(p.y).toBeGreaterThan(0.05);
    expect(Math.abs(p.roll)).toBeGreaterThan(0.05);
  });

  it('rears back before a slash and lunges forward at the strike', () => {
    const p = blank();
    queenPose('ATTACKING', 0, 0, 0.9, p);
    expect(p.pitch).toBeLessThan(0);
    expect(p.z).toBe(0);
    queenPose('ATTACKING', 0, 0, 0, p);
    expect(p.z).toBeGreaterThan(0.3);
    expect(p.pitch).toBeGreaterThan(0);
  });

  it('thrashes when killed, then slumps forward and goes still', () => {
    const p = blank();
    queenPose('DEAD', 0, 0, 0.2, p);
    expect(Math.abs(p.roll)).toBeGreaterThan(0.01);
    queenPose('DEAD', 0, 0, 2.5, p);
    expect(p.pitch).toBeGreaterThan(0.4);
    expect(p.roll).toBeCloseTo(0);
  });
});

describe('the Alien Queen on a pool slot', () => {
  it('replaces the drone clone for a boss and gives it back for a drone', () => {
    const x = buildXenoPool(new THREE.Group(), [])[0];
    const rig = buildQueenRig(new THREE.Group());
    spawnXeno(x, { ...SPAWN, isBoss: true, queen: rig });
    expect(x.clonedMeshGroup.visible).toBe(false);
    expect(rig.pivot.visible).toBe(true);
    expect(rig.pivot.parent).toBe(x.root);
    expect(rig.owner).toBe(x);
    expect(x.skin).toBe(rig.materials);
    spawnXeno(x, { ...SPAWN, isBoss: false, queen: rig });
    expect(x.clonedMeshGroup.visible).toBe(true);
    expect(rig.pivot.visible).toBe(false);
    expect(rig.owner).toBeNull();
    expect(x.skin).toBe(x.materials);
  });

  it('gives the boss a larger hit sphere than a drone', () => {
    const x = buildXenoPool(new THREE.Group(), [])[0];
    const boss = new THREE.Sphere();
    const drone = new THREE.Sphere();
    x.state = 'PURSUING';
    x.isBoss = true;
    setHitSphere(x, boss);
    x.isBoss = false;
    setHitSphere(x, drone);
    expect(boss.radius).toBeGreaterThan(drone.radius);
    expect(boss.center.y).toBeGreaterThan(drone.center.y);
  });
});
