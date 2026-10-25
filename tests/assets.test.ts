import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('shipped web assets', () => {
  const html = readFileSync('index.html', 'utf8');
  const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));

  it('the viewport allows pinch-zoom (menus must be zoomable)', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)![1];
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/);
  });

  it('the manifest describes the real game length and points at existing icons', () => {
    expect(manifest.description).toContain('5-minute');
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(`public${icon.src}`), icon.src).toBe(true);
    }
    expect(existsSync(`public${manifest.start_url.split('?')[0]}`) || manifest.start_url.startsWith('/')).toBe(true);
  });

  it('has focus styles for keyboard users', () => {
    expect(html).toContain(':focus-visible');
  });
});
