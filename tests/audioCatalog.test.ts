import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { SOUND_URLS, BGM_URL, CRITICAL_SOUNDS, HRTF_SOUNDS } from '../src/core/AudioCatalog';
import { AudioManager } from '../src/core/AudioManager';

describe('audio catalogue', () => {
  it('every sound and the BGM resolves to a file in public/', () => {
    for (const [key, url] of Object.entries(SOUND_URLS)) {
      expect(existsSync(`public${url}`), `${key} -> ${url}`).toBe(true);
    }
    expect(existsSync(`public${BGM_URL}`)).toBe(true);
  });

  it('policy tables only reference known sounds', () => {
    for (const key of [...CRITICAL_SOUNDS, ...HRTF_SOUNDS]) expect(SOUND_URLS).toHaveProperty(key);
  });

  it('gunfire stays uncompressed for sample-accurate starts', () => {
    expect(SOUND_URLS.pulse_shot.endsWith('.wav')).toBe(true);
    expect(SOUND_URLS.pulse_tail.endsWith('.wav')).toBe(true);
  });

  it('setVolumes is safe before audio is unlocked', () => {
    expect(() => AudioManager.setVolumes({ master: 2, music: -1, sfx: 0.5 })).not.toThrow();
    AudioManager.setVolumes({ master: 1, music: 0.8, sfx: 1 });
  });
});
