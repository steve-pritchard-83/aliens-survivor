import { describe, it, expect, afterEach, vi } from 'vitest';
import { pwaInstallMode, readPwaDismissed, writePwaDismissed, INSTALL_STEPS } from '../src/ui/pwaInstall';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

afterEach(() => vi.unstubAllGlobals());

describe('pwaInstallMode', () => {
  it('prefers the native prompt whenever the browser offered one', () => {
    expect(pwaInstallMode(ANDROID, true)).toBe('native');
    expect(pwaInstallMode(IPHONE, true)).toBe('native');
  });
  it('falls back to platform instructions', () => {
    expect(pwaInstallMode(IPHONE, false)).toBe('ios');
    expect(pwaInstallMode('Mozilla/5.0 (iPad; CPU OS 16_0)', false)).toBe('ios');
    expect(pwaInstallMode(ANDROID, false)).toBe('android-menu');
  });
  it('has steps for every non-native mode', () => {
    expect(INSTALL_STEPS.ios.length).toBeGreaterThan(0);
    expect(INSTALL_STEPS['android-menu'].length).toBeGreaterThan(0);
  });
});

describe('prompt dismissal', () => {
  it('persists in localStorage', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v)
    });
    expect(readPwaDismissed()).toBe(false);
    writePwaDismissed();
    expect(readPwaDismissed()).toBe(true);
  });

  it('shows the prompt again, without throwing, when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    });
    expect(readPwaDismissed()).toBe(false);
    expect(() => writePwaDismissed()).not.toThrow();
  });
});
