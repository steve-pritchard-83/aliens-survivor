import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { trimSectorWalls } from '../src/entities/level/trimSectorWalls';
import { buildXenoPool, resetXenoPool, spawnXeno } from '../src/entities/xeno/xenoPool';
import { POOL_SIZE } from '../src/entities/XenoTypes';
import { BALANCE } from '../src/data/balance';

/** One-triangle-per-entry indexed mesh; each triangle is given as three [x, y, z] points. */
function meshFromTriangles(tris: [number, number, number][][]): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  tris.forEach((tri) => {
    tri.forEach((p) => {
      indices.push(positions.length / 3);
      positions.push(p[0], p[1], p[2]);
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
}

describe('trimSectorWalls', () => {
  it('removes wall panels in the end-cap band and keeps floors and interior walls', () => {
    const endCap: [number, number, number][] = [
      [-13.5, 0.5, 15],
      [-13.5, 1.5, 15],
      [-13.5, 1.0, 16]
    ];
    const interior: [number, number, number][] = [
      [-5, 0.5, 15],
      [-5, 1.5, 15],
      [-5, 1.0, 16]
    ];
    const floor: [number, number, number][] = [
      [-13.5, 0, 15],
      [-12.5, 0, 15],
      [-13, 0, 16]
    ];
    const mesh = meshFromTriangles([endCap, interior, floor]);
    const root = new THREE.Group();
    root.add(mesh);
    trimSectorWalls(root, false, 0, false, false);
    // Original index buffer had 9 entries; the end-cap triangle is gone
    expect(mesh.geometry.index!.count).toBe(6);
  });

  it('clones geometry so the shared source is untouched', () => {
    const mesh = meshFromTriangles([
      [
        [-13.5, 0.5, 15],
        [-13.5, 1.5, 15],
        [-13.5, 1.0, 16]
      ]
    ]);
    const source = mesh.geometry;
    const root = new THREE.Group();
    root.add(mesh);
    trimSectorWalls(root, false, 0, false, false);
    expect(mesh.geometry).not.toBe(source);
    expect(source.index!.count).toBe(3);
  });
});

describe('xeno pool', () => {
  it('builds a fixed pool of inactive drones', () => {
    const pool = buildXenoPool(new THREE.Group(), []);
    expect(pool).toHaveLength(POOL_SIZE);
    expect(pool.every((x) => !x.active && !x.root.visible && x.state === 'DEAD')).toBe(true);
    expect(new Set(pool.map((x) => x.id)).size).toBe(POOL_SIZE);
  });

  it('spawning configures a drone and resetting deactivates everything', () => {
    const pool = buildXenoPool(new THREE.Group(), []);
    const x = pool[0];
    x.severedLimbs[2] = true;
    spawnXeno(x, { nodeX: -0.32, nodeY: 0, nodeZ: 22.1, isBoss: false, hp: 300, scale: 0.45, baseSpeed: 3 });
    expect(x.active).toBe(true);
    expect(x.state).toBe('SPAWNING');
    expect(x.hp).toBe(300);
    expect(x.severedLimbs.every((s) => !s)).toBe(true);
    expect(x.root.visible).toBe(true);
    expect(x.speed).toBeGreaterThan(3 * 0.8);
    expect(x.speed).toBeLessThan(3 * 1.2);
    resetXenoPool(pool);
    expect(pool.every((p) => !p.active && !p.root.visible)).toBe(true);
  });

  it('bosses use the Praetorian speed instead of the phase speed', () => {
    const pool = buildXenoPool(new THREE.Group(), []);
    spawnXeno(pool[1], {
      nodeX: 0,
      nodeY: 0,
      nodeZ: 0,
      isBoss: true,
      hp: BALANCE.PRAETORIAN.HP,
      scale: BALANCE.PRAETORIAN.SCALE,
      baseSpeed: 99
    });
    expect(pool[1].isBoss).toBe(true);
    expect(pool[1].speed).toBeLessThan(BALANCE.PRAETORIAN.SPEED * 1.2);
  });
});
