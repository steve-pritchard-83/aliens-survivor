import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const tracked = ['HANDOFF.md', 'README.md', '.ai/CONTEXT.md', '.ai/CONVENTIONS.md', 'docs/AUDIT.md', 'CHANGELOG.md'];

describe('tracked documentation', () => {
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
