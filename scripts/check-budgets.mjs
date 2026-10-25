// Budget gate run by `npm run verify` after a production build. Exits 1 on any breach.
import { bundleStats, countLights, evaluate, LIMITS, KB, MB } from './budgets.mjs';

const stats = bundleStats('dist');
const lights = countLights('src');

const row = (label, value, limit) => console.log(`${label.padEnd(18)} ${value.padStart(12)}   (limit ${limit})`);
row('largest JS chunk', `${(stats.largestChunk.bytes / KB).toFixed(0)} kB`, `${LIMITS.largestChunkBytes / KB} kB`);
row('total JS', `${(stats.totalJs / MB).toFixed(2)} MB`, `${(LIMITS.totalJsBytes / MB).toFixed(1)} MB`);
row('precache', `${(stats.precache / MB).toFixed(2)} MB`, `${LIMITS.precacheBytes / MB} MB`);
row('dynamic lights', String(lights.length), String(LIMITS.dynamicLights));

const failures = evaluate(stats, lights);
if (failures.length > 0) {
  console.error(`\nBudget failures:\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('\nAll budgets within limits.');
