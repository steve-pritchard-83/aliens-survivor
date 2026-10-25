import { describe, it, expect, afterEach, vi } from 'vitest';
import { Platform } from '../src/core/Platform';
import { AmbienceLoop } from '../src/core/AmbienceLoop';
import { quality, setTier, onTierChange, MAX_TIER } from '../src/core/QualityState';

function stubBrowser(userAgent: string, search = '', extra: Record<string, unknown> = {}) {
  const nav = { userAgent, maxTouchPoints: 0 };
  vi.stubGlobal('navigator', nav);
  vi.stubGlobal('window', {
    navigator: nav,
    location: { search },
    matchMedia: () => ({ matches: false }),
    innerWidth: 1280,
    ...extra
  });
  vi.stubGlobal('sessionStorage', { getItem: () => null });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setTier(MAX_TIER);
});

describe('Platform detection', () => {
  it('recognises Quest browsers and Quest 3 variants', () => {
    stubBrowser('Mozilla/5.0 (X11; Linux x86_64) OculusBrowser/35.0 Quest 3 VR');
    expect(Platform.isQuest).toBe(true);
    expect(Platform.isQuest3).toBe(true);
    expect(Platform.isVrApp).toBe(true);
    expect(Platform.isMobile).toBe(false);
    stubBrowser('Mozilla/5.0 (X11; Linux x86_64) OculusBrowser/30.0 Quest 2 VR');
    expect(Platform.isQuest3).toBe(false);
    expect(Platform.isQuest).toBe(true);
  });

  it('reports a mouse on a touchscreen laptop but not on a phone', () => {
    // Touchscreen laptop: touch points present, but a fine pointer (mouse/trackpad) too
    stubBrowser('Mozilla/5.0 (Windows NT 10.0) Chrome/120', '', {
      matchMedia: (q: string) => ({ matches: q === '(any-pointer: fine)' })
    });
    (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints = 2;
    expect(Platform.isTouch).toBe(true);
    expect(Platform.hasMouse).toBe(true);
    // Phone: coarse pointer only
    stubBrowser('Mozilla/5.0 (Linux; Android 14) Mobile Chrome/120', '', { matchMedia: () => ({ matches: false }) });
    expect(Platform.hasMouse).toBe(false);
  });

  it('treats ?vr=1 as a VR app on any browser', () => {
    stubBrowser('Mozilla/5.0 Chrome/120', '?vr=1');
    expect(Platform.isQuest).toBe(false);
    expect(Platform.isVrApp).toBe(true);
  });

  it('detects phones and PWA standalone launches', () => {
    stubBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Chrome/120', '?source=pwa');
    expect(Platform.isMobile).toBe(true);
    expect(Platform.isStandalone).toBe(true);
    stubBrowser('Mozilla/5.0 (Windows NT 10.0) Chrome/120');
    expect(Platform.isMobile).toBe(false);
    expect(Platform.isStandalone).toBe(false);
  });

  it('enables debug from the query string', () => {
    stubBrowser('Mozilla/5.0 Chrome/120', '?debug=1');
    expect(Platform.isDebug).toBe(true);
    stubBrowser('Mozilla/5.0 Chrome/120', '');
    expect(Platform.isDebug).toBe(false);
  });
});

describe('AmbienceLoop', () => {
  it('plays an ambient cue every interval while active and stops when deactivated', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setInterval, clearInterval });
    const played: string[] = [];
    const loop = new AmbienceLoop((key) => played.push(key));
    loop.setActive(true);
    loop.setActive(true);
    vi.advanceTimersByTime(3400 * 3);
    expect(played).toHaveLength(3);
    loop.setActive(false);
    vi.advanceTimersByTime(3400 * 3);
    expect(played).toHaveLength(3);
  });
});

describe('QualityState', () => {
  it('clamps tiers and notifies listeners only on change', () => {
    const seen: number[] = [];
    const off = onTierChange((t) => seen.push(t));
    setTier(1);
    setTier(1);
    setTier(-5);
    setTier(99);
    off();
    setTier(0);
    expect(seen).toEqual([1, 0, MAX_TIER]);
    expect(quality.tier).toBe(0);
  });
});
