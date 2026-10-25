// Prints the provenance metadata embedded in each shipped GLB (author, licence, generator) so CREDITS.md can be
// filled from facts. Usage: node scripts/list-asset-metadata.mjs [dir]   (default: public/models)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const JSON_CHUNK = 0x4e4f534a; // 'JSON'

/** Reads the JSON chunk of a GLB without loading any geometry. */
export function readGlbJson(buffer) {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB file');
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    if (type === JSON_CHUNK) return JSON.parse(buffer.toString('utf8', offset + 8, offset + 8 + length));
    offset += 8 + length;
  }
  throw new Error('GLB has no JSON chunk');
}

/** Collects the fields that usually carry attribution. */
export function summarise(json) {
  const asset = json.asset ?? {};
  const extras = asset.extras ?? {};
  return {
    generator: asset.generator ?? null,
    copyright: asset.copyright ?? null,
    author: extras.author ?? null,
    license: extras.license ?? null,
    source: extras.source ?? null,
    title: extras.title ?? null,
    extensionsUsed: json.extensionsUsed ?? [],
    meshes: (json.meshes ?? []).length,
    materials: (json.materials ?? []).length,
    animations: (json.animations ?? []).length
  };
}

if (process.argv[1]?.endsWith('list-asset-metadata.mjs')) {
  const dir = process.argv[2] ?? 'public/models';
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.glb'))
    .sort()) {
    const path = join(dir, file);
    const info = summarise(readGlbJson(readFileSync(path)));
    console.log(`\n${file}  (${(statSync(path).size / 1024).toFixed(0)} kB)`);
    for (const [k, v] of Object.entries(info))
      console.log(`  ${k}: ${Array.isArray(v) ? v.join(', ') || '-' : (v ?? '-')}`);
  }
}
