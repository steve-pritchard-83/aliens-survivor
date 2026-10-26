import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { readGlbJson, summarise } from '../scripts/list-asset-metadata.mjs';

const credits = readFileSync('CREDITS.md', 'utf8');
const models = readdirSync('public/models').filter((f) => f.endsWith('.glb'));

describe('CREDITS.md stays in sync with the shipped models', () => {
  it('lists every shipped model with its embedded author and source', () => {
    expect(models.length).toBeGreaterThan(0);
    for (const file of models) {
      const info = summarise(readGlbJson(readFileSync(`public/models/${file}`)));
      expect(credits, `${file} row`).toContain(`\`${file}\``);
      expect(info.author, `${file} author metadata`).toBeTruthy();
      const authorName = String(info.author).split(' (')[0];
      expect(credits, `${file} author`).toContain(authorName);
      expect(credits, `${file} source`).toContain(String(info.source));
    }
  });

  it('names the licence of every model that is not plain CC BY 4.0, so restrictive terms are not missed', () => {
    for (const file of models) {
      const info = summarise(readGlbJson(readFileSync(`public/models/${file}`)));
      const licence = String(info.license).split(' ')[0];
      if (/^CC-BY-4\.0/.test(licence)) continue;
      expect(credits, `${file} licence ${licence}`).toContain(licence);
    }
  });
});

describe('GLB metadata reader', () => {
  it('rejects non-GLB data', () => {
    expect(() => readGlbJson(Buffer.from('not a glb file at all'))).toThrow('not a GLB file');
  });

  it('summarises a minimal GLB', () => {
    const json = Buffer.from(
      JSON.stringify({
        asset: { version: '2.0', generator: 'test', extras: { author: 'A', license: 'L' } },
        meshes: [{}],
        materials: [{}, {}]
      })
    );
    const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + padded.length, 8);
    const chunk = Buffer.alloc(8);
    chunk.writeUInt32LE(padded.length, 0);
    chunk.writeUInt32LE(0x4e4f534a, 4);
    const info = summarise(readGlbJson(Buffer.concat([header, chunk, padded])));
    expect(info).toMatchObject({
      generator: 'test',
      author: 'A',
      license: 'L',
      meshes: 1,
      materials: 2,
      animations: 0
    });
  });
});
