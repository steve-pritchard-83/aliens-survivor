import { AmbienceLoop } from './AmbienceLoop';
import { SoundKey, SOUND_URLS, BGM_URL, CRITICAL_SOUNDS, HRTF_SOUNDS } from './AudioCatalog';

export type { SoundKey };

export interface AudioVolumes {
  master: number;
  music: number;
  sfx: number;
}

// 0.4 x the default music level (0.8) reproduces the original fixed BGM volume of 0.32
const BGM_BASE_VOLUME = 0.4;
const MAX_VOICES = 24;
const PULSE_VARIANTS: SoundKey[] = ['pulse_shot', 'pulse_shot2', 'pulse_shot3', 'pulse_shot4'];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

class WebAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private volumes: AudioVolumes = { master: 1, music: 0.8, sfx: 1 };
  private buffers = new Map<SoundKey, AudioBuffer>();
  private bgmAudio: HTMLAudioElement | null = null;
  private ambience = new AmbienceLoop((key, volume, rate) => this.play2D(key, volume, rate));
  private loadingPromise: Promise<void> | null = null;
  private activePulseSrc: AudioBufferSourceNode | null = null;
  private activePulseGain: GainNode | null = null;
  private activeTailSrc: AudioBufferSourceNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private defeatMute = false;

  public async unlock(): Promise<void> {
    this.defeatMute = false;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.loadingPromise) this.loadingPromise = this.preloadAll();
    await this.loadingPromise;
  }

  /** Sets master / music / effects levels (0..1). Safe to call before audio is unlocked. */
  public setVolumes(partial: Partial<AudioVolumes>): void {
    if (partial.master !== undefined) this.volumes.master = clamp01(partial.master);
    if (partial.music !== undefined) this.volumes.music = clamp01(partial.music);
    if (partial.sfx !== undefined) this.volumes.sfx = clamp01(partial.sfx);
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (this.masterGain) this.masterGain.gain.value = this.volumes.master;
    if (this.sfxGain) this.sfxGain.gain.value = this.volumes.sfx;
    // BGM plays through an <audio> element, outside the Web Audio graph, so its level is applied directly
    if (this.bgmAudio) this.bgmAudio.volume = clamp01(BGM_BASE_VOLUME * this.volumes.music * this.volumes.master);
  }

  private async preloadAll(): Promise<void> {
    if (!this.ctx) return;
    const entries = Object.entries(SOUND_URLS) as [SoundKey, string][];
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          const arr = await res.arrayBuffer();
          if (this.ctx) this.buffers.set(key, await this.ctx.decodeAudioData(arr));
        } catch (e) {
          console.warn('[AudioManager] failed to load', key, e);
        }
      })
    );
  }

  public startBGM(): void {
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio(BGM_URL);
      this.bgmAudio.loop = true;
      this.applyVolumes();
    }
    this.bgmAudio.play().catch((e) => console.warn('[AudioManager] BGM play blocked', e));
  }

  public pauseBGM(): void {
    this.bgmAudio?.pause();
    this.stopPulseLoop(false);
  }

  public resumeBGM(): void {
    this.bgmAudio?.play().catch((e) => console.warn('[AudioManager] BGM resume blocked', e));
  }

  public stopBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    this.stopPulseLoop(false);
  }

  public updateListener(x: number, y: number, z: number, yaw: number): void {
    if (!this.ctx) return;
    const l = this.ctx.listener,
      fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    if (l.positionX) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      l.forwardX.value = fx;
      l.forwardY.value = 0;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  }

  /** True if a new sound may start: not muted by defeat and, for non-critical sounds, under the voice cap. */
  private canPlay(key: SoundKey): boolean {
    if (!this.ctx || !this.sfxGain) return false;
    if (this.defeatMute && key !== 'defeat') return false;
    return this.activeSources.size < MAX_VOICES || CRITICAL_SOUNDS.has(key);
  }

  private track(src: AudioBufferSourceNode): void {
    this.activeSources.add(src);
    src.onended = () => {
      this.activeSources.delete(src);
    };
  }

  public play2D(key: SoundKey, volume = 0.6, playbackRate = 1.0): void {
    if (!this.canPlay(key)) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx || !this.sfxGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.sfxGain);
    this.track(src);
    src.start(0);
  }

  // Monophonic Pulse Rifle Burst Controller: prevents overlapping multi-shot comb-filtering echo
  public playPulseShot(): void {
    if (!this.ctx || !this.sfxGain || this.defeatMute) return;
    const now = this.ctx.currentTime;
    if (this.activeTailSrc) {
      try {
        this.activeTailSrc.stop();
      } catch {
        /* source already stopped: non-fatal */
      }
      this.activeTailSrc = null;
    }
    if (this.activePulseSrc && this.activePulseGain) {
      try {
        this.activePulseGain.gain.setValueAtTime(this.activePulseGain.gain.value, now);
        this.activePulseGain.gain.linearRampToValueAtTime(0.001, now + 0.012);
        this.activePulseSrc.stop(now + 0.014);
      } catch {
        /* source already stopped: non-fatal */
      }
    }
    const buf = this.buffers.get(PULSE_VARIANTS[Math.floor(Math.random() * PULSE_VARIANTS.length)]);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.99 + Math.random() * 0.02;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.58, now);
    src.connect(gain);
    gain.connect(this.sfxGain);
    this.track(src);
    src.start(0);
    this.activePulseSrc = src;
    this.activePulseGain = gain;
  }

  public stopPulseLoop(withTail = true): void {
    if (!this.ctx || !this.activePulseSrc) return;
    const now = this.ctx.currentTime;
    try {
      this.activePulseGain?.gain.setValueAtTime(this.activePulseGain.gain.value, now);
      this.activePulseGain?.gain.linearRampToValueAtTime(0.001, now + 0.025);
      this.activePulseSrc.stop(now + 0.028);
    } catch {
      /* source already stopped: non-fatal */
    }
    this.activePulseSrc = null;
    this.activePulseGain = null;
    if (withTail && this.sfxGain) {
      const tailBuf = this.buffers.get('pulse_tail');
      if (tailBuf) {
        const tailSrc = this.ctx.createBufferSource();
        tailSrc.buffer = tailBuf;
        const tailGain = this.ctx.createGain();
        tailGain.gain.value = 0.42;
        tailSrc.connect(tailGain);
        tailGain.connect(this.sfxGain);
        tailSrc.start(0);
        this.activeTailSrc = tailSrc;
      }
    }
  }

  public play3D(key: SoundKey, x: number, y: number, z: number, volume = 0.85, playbackRate = 1.0): void {
    if (!this.canPlay(key)) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx || !this.sfxGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const panner = this.ctx.createPanner();
    // HRTF is the most expensive panner: reserve it for the cues that need precise direction
    panner.panningModel = HRTF_SOUNDS.has(key) ? 'HRTF' : 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2.5;
    panner.maxDistance = 42;
    panner.rolloffFactor = 1.2;
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else panner.setPosition(x, y, z);
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(panner);
    panner.connect(gain);
    gain.connect(this.sfxGain);
    this.track(src);
    src.start(0);
  }

  public stopAllSFX(): void {
    this.activeSources.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch {
        /* source already stopped: non-fatal */
      }
    });
    this.activeSources.clear();
    this.stopPulseLoop(false);
  }

  public triggerDefeat(): void {
    this.defeatMute = true;
    this.stopBGM();
    this.setKlaxonActive(false);
    this.stopAllSFX();
    this.play2D('defeat', 1.0);
  }

  public resetAudio(): void {
    this.defeatMute = false;
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  public setKlaxonActive(active: boolean): void {
    this.ambience.setActive(active);
  }
}

export const AudioManager = new WebAudioController();
