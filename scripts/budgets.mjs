// Budget checks shared by scripts/check-budgets.mjs and the unit tests.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

export const KB = 1024;
export const MB = 1024 * 1024;

export const LIMITS = {
  largestChunkBytes: 900 * KB,
  totalJsBytes: 1.6 * MB,
  precacheBytes: 36 * MB,
  dynamicLights: 4
};

// Mirrors workbox globPatterns in vite.config.ts
const PRECACHE_EXTENSIONS = new Set(['.js', '.css', '.html', '.glb', '.wav', '.m4a', '.mp3', '.otf', '.json']);
const NOT_PRECACHED = [/^sw\.js$/, /^workbox-.*\.js$/];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** Sizes of the built bundle: largest/total JS chunk bytes and the service-worker precache payload. */
export function bundleStats(distDir) {
  const files = walk(distDir);
  let largestChunk = { name: '', bytes: 0 };
  let totalJs = 0;
  let precache = 0;
  for (const file of files) {
    const rel = file
      .slice(distDir.length + 1)
      .split('\\')
      .join('/');
    const base = rel.split('/').pop();
    const bytes = statSync(file).size;
    const ext = extname(file);
    if (ext === '.js' && rel.startsWith('assets/')) {
      totalJs += bytes;
      if (bytes > largestChunk.bytes) largestChunk = { name: rel, bytes };
    }
    if (PRECACHE_EXTENSIONS.has(ext) && !NOT_PRECACHED.some((re) => re.test(base))) precache += bytes;
  }
  return { largestChunk, totalJs, precache };
}

const LIGHT_PATTERN =
  /<(pointLight|spotLight|directionalLight)\b|new\s+(?:THREE\.)?(PointLight|SpotLight|DirectionalLight)\b/g;

/** Counts dynamic light declarations in the source tree (the Quest 2 budget is 4). */
export function countLights(srcDir) {
  const hits = [];
  for (const file of walk(srcDir)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(LIGHT_PATTERN)) hits.push({ file, light: match[1] || match[2] });
  }
  return hits;
}

/** Returns a list of human-readable budget failures (empty when everything is within budget). */
export function evaluate(stats, lights, limits = LIMITS) {
  const failures = [];
  if (stats.largestChunk.bytes > limits.largestChunkBytes)
    failures.push(`largest chunk ${stats.largestChunk.name} is ${(stats.largestChunk.bytes / KB).toFixed(0)} kB`);
  if (stats.totalJs > limits.totalJsBytes) failures.push(`total JS is ${(stats.totalJs / MB).toFixed(2)} MB`);
  if (stats.precache > limits.precacheBytes) failures.push(`precache is ${(stats.precache / MB).toFixed(2)} MB`);
  if (lights.length > limits.dynamicLights)
    failures.push(`${lights.length} dynamic lights (max ${limits.dynamicLights})`);
  return failures;
}
