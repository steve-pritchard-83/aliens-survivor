import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}
const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  rewrites: { source: string; destination: string }[];
  headers: HeaderRule[];
};

const valueFor = (source: string, key: string) =>
  config.headers.find((h) => h.source === source)?.headers.find((h) => h.key === key)?.value;

describe('vercel.json', () => {
  it('never caches the files that decide what version is running', () => {
    const rule = config.headers.find((h) => h.source.includes('sw.js'));
    expect(rule?.source).toContain('index.html');
    expect(rule?.headers[0].value).toMatch(/max-age=0, must-revalidate/);
    // The document itself is requested as "/", not "/index.html"
    expect(valueFor('/', 'Cache-Control')).toMatch(/max-age=0, must-revalidate/);
  });

  it('caches hashed assets forever', () => {
    expect(valueFor('/assets/(.*)', 'Cache-Control')).toMatch(/immutable/);
  });

  it('serves the Digital Asset Links file as JSON (the Quest app depends on it)', () => {
    expect(valueFor('/.well-known/assetlinks.json', 'Content-Type')).toBe('application/json');
  });

  it('keeps WebXR allowed while adding baseline security headers', () => {
    expect(valueFor('/(.*)', 'X-Content-Type-Options')).toBe('nosniff');
    expect(valueFor('/(.*)', 'Referrer-Policy')).toBeTruthy();
    expect(valueFor('/(.*)', 'Permissions-Policy')).toContain('xr-spatial-tracking=(self)');
  });

  it('rewrites only extensionless paths to the app, so a missing model or sound is a 404', () => {
    const rewrite = config.rewrites[0];
    const re = new RegExp('^' + rewrite.source.replace(/^\//, '/') + '$');
    expect(re.test('/')).toBe(true);
    expect(re.test('/some/route')).toBe(true);
    expect(re.test('/models/missing.glb')).toBe(false);
    expect(re.test('/audio/missing.m4a')).toBe(false);
  });
});
