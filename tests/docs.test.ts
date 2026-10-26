import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const tracked = ['HANDOFF.md', 'README.md', '.ai/CONTEXT.md', '.ai/CONVENTIONS.md', 'docs/AUDIT.md', 'CHANGELOG.md'];

function markdownFiles(): string[] {
  const files = readdirSync('.').filter((f) => f.endsWith('.md'));
  for (const dir of ['.ai', 'docs']) {
    for (const f of readdirSync(dir, { recursive: true }) as string[])
      if (f.endsWith('.md')) files.push(`${dir}/${f}`.replace(/\\/g, '/'));
  }
  return files;
}

// A UTF-8 file re-saved as Windows-1252 turns characters such as the less-or-equal sign and box drawing into runs
// that start with U+00E2; a leading byte-order mark is the other tell.
const MOJIBAKE = /\u00e2[\u0080-\u00bf\u20ac\u201a-\u203a\u02c6\u0152\u017d\u0153\u017e\u0178]/;

describe('tracked documentation', () => {
  it('is clean UTF-8: no byte-order mark and no double-encoded characters', () => {
    for (const file of markdownFiles()) {
      const text = readFileSync(file, 'utf8');
      expect(text.charCodeAt(0), `${file} starts with a BOM`).not.toBe(0xfeff);
      expect(text, `${file} has double-encoded characters`).not.toMatch(MOJIBAKE);
    }
  });

  it('contains no machine-specific details', () => {
    for (const file of tracked) {
      const text = readFileSync(file, 'utf8');
      expect(text, `${file} headset serial`).not.toMatch(/1WMHH831BS0504/);
      expect(text, `${file} local adb path`).not.toMatch(/C:\\RSL/i);
      expect(text, `${file} local audit path`).not.toMatch(/\.gemini/);
    }
  });

  it('every architecture decision record is short and has the standard sections', () => {
    const adrs = readdirSync('docs/adr').filter((f) => f.endsWith('.md'));
    expect(adrs.length).toBeGreaterThanOrEqual(6);
    for (const file of adrs) {
      const text = readFileSync(`docs/adr/${file}`, 'utf8');
      expect(text.split('\n').length, file).toBeLessThanOrEqual(40);
      for (const heading of ['## Context', '## Decision', '## Consequences'])
        expect(text, `${file} ${heading}`).toContain(heading);
    }
  });

  it('HANDOFF points at files that exist', () => {
    const text = readFileSync('HANDOFF.md', 'utf8');
    for (const path of ['docs/AUDIT.md', 'CREDITS.md', 'docs/IP_REVIEW.md', '.ai/UPLIFT_PROGRESS.md']) {
      expect(text, path).toContain(path);
      expect(() => readFileSync(path)).not.toThrow();
    }
  });
});
