import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleStats, countLights, evaluate, LIMITS, MB } from '../scripts/budgets.mjs';

describe('light budget', () => {
  it('the real source tree stays within the Quest 2 dynamic light cap', () => {
    const lights = countLights('src');
    expect(lights.length).toBeLessThanOrEqual(LIMITS.dynamicLights);
    // Documented lights: key + beacon in the level, flashlight + muzzle on the rifle
    expect(lights.map((l) => l.light).sort()).toEqual(['pointLight', 'pointLight', 'pointLight', 'spotLight']);
  });

  it('counts both JSX and constructor forms but ignores ambient and hemisphere lights', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lights-'));
    writeFileSync(
      join(dir, 'a.tsx'),
      '<pointLight /><spotLight/><ambientLight/><hemisphereLight/>\nconst x = new THREE.DirectionalLight(); new PointLight();'
    );
    expect(countLights(dir)).toHaveLength(4);
    rmSync(dir, { recursive: true });
  });
});

describe('bundle budgets', () => {
  it('measures chunks and the precache payload, excluding generated service-worker files', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'assets', 'big.js'), Buffer.alloc(2000));
    writeFileSync(join(dist, 'assets', 'small.js'), Buffer.alloc(500));
    writeFileSync(join(dist, 'index.html'), Buffer.alloc(100));
    writeFileSync(join(dist, 'sw.js'), Buffer.alloc(9999));
    writeFileSync(join(dist, 'workbox-abc.js'), Buffer.alloc(9999));
    writeFileSync(join(dist, 'movie.mp4'), Buffer.alloc(9999));
    const stats = bundleStats(dist);
    expect(stats.largestChunk).toEqual({ name: 'assets/big.js', bytes: 2000 });
    expect(stats.totalJs).toBe(2500);
    expect(stats.precache).toBe(2600);
    rmSync(dist, { recursive: true });
  });

  it('reports each breached budget', () => {
    const stats = { largestChunk: { name: 'assets/x.js', bytes: 2 * MB }, totalJs: 3 * MB, precache: 20 * MB };
    const lights = Array.from({ length: 5 }, () => ({ file: 'f', light: 'pointLight' }));
    expect(evaluate(stats, lights)).toHaveLength(4);
    expect(evaluate({ largestChunk: { name: '', bytes: 1 }, totalJs: 1, precache: 1 }, [])).toEqual([]);
  });
});
