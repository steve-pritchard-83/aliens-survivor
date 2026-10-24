export type SoundKey =
  | 'pulse_shot' | 'pulse_shot2' | 'pulse_shot3' | 'pulse_shot4' | 'pulse_tail'
  | 'reload_out' | 'reload_in' | 'reload_slap' | 'empty_click'
  | 'tracker_sweep' | 'tracker_ping'
  | 'xeno_hiss1' | 'xeno_hiss2' | 'xeno_hit' | 'xeno_death1' | 'xeno_death2'
  | 'xeno_attack' | 'xeno_sprint' | 'xeno_bodyfall' | 'xeno_gib1' | 'xeno_explode1'
  | 'small_screech1' | 'small_screech2' | 'small_death' | 'small_skitter' | 'small_bite' | 'small_leap'
  | 'bullet_flesh1' | 'bullet_flesh2' | 'ricochet1' | 'ricochet2'
  | 'acid_fizz' | 'acid_burn' | 'vent_clang' | 'marine_pain' | 'marine_death'
  | 'torch_on' | 'torch_off' | 'distant_boom1' | 'distant_boom2' | 'console_alarm' | 'spark' | 'ui_beep' | 'defeat';

const SOUND_URLS: Record<SoundKey, string> = {
  pulse_shot: '/audio/sfx_pulse.wav', pulse_shot2: '/audio/sfx_pulse2.wav',
  pulse_shot3: '/audio/sfx_pulse3.wav', pulse_shot4: '/audio/sfx_pulse4.wav',
  pulse_tail: '/audio/sfx_pulse_tail.wav', reload_out: '/audio/sfx_reload_out.wav',
  reload_in: '/audio/sfx_reload_in.wav', reload_slap: '/audio/sfx_reload_slap.wav',
  empty_click: '/audio/sfx_empty.wav', tracker_sweep: '/audio/sfx_tracker_sweep.wav',
  tracker_ping: '/audio/sfx_tracker_ping.wav', xeno_hiss1: '/audio/sfx_xeno_hiss1.wav',
  xeno_hiss2: '/audio/sfx_xeno_hiss2.wav', xeno_hit: '/audio/sfx_xeno_hit.wav',
  xeno_death1: '/audio/sfx_xeno_death1.wav', xeno_death2: '/audio/sfx_xeno_death2.wav',
  xeno_attack: '/audio/sfx_xeno_attack.wav', xeno_sprint: '/audio/sfx_xeno_sprint.wav',
  xeno_bodyfall: '/audio/sfx_xeno_bodyfall.wav', xeno_gib1: '/audio/sfx_xeno_gib1.wav',
  xeno_explode1: '/audio/sfx_xeno_explode1.wav', small_screech1: '/audio/sfx_small_screech1.wav',
  small_screech2: '/audio/sfx_small_screech2.wav', small_death: '/audio/sfx_small_death.wav',
  small_skitter: '/audio/sfx_small_skitter.wav', small_bite: '/audio/sfx_small_bite.wav',
  small_leap: '/audio/sfx_small_leap.wav', bullet_flesh1: '/audio/sfx_bullet_flesh1.wav',
  bullet_flesh2: '/audio/sfx_bullet_flesh2.wav', ricochet1: '/audio/sfx_ricochet1.wav',
  ricochet2: '/audio/sfx_ricochet2.wav', acid_fizz: '/audio/sfx_acid_fizz.wav',
  acid_burn: '/audio/sfx_acid_burn.wav', vent_clang: '/audio/sfx_vent_clang.wav',
  marine_pain: '/audio/sfx_marine_pain.wav', marine_death: '/audio/sfx_marine_death.wav',
  torch_on: '/audio/sfx_torch_on.wav', torch_off: '/audio/sfx_torch_off.wav',
  distant_boom1: '/audio/sfx_distant_boom1.wav', distant_boom2: '/audio/sfx_distant_boom2.wav',
  console_alarm: '/audio/sfx_console_alarm.wav', spark: '/audio/sfx_spark.wav', ui_beep: '/audio/sfx_ui_beep.wav',
  defeat: '/audio/defeat.mp3'
};

class WebAudioController {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();
  private bgmAudio: HTMLAudioElement | null = null;
  private ambienceTimer: number | null = null;
  private loadingPromise: Promise<void> | null = null;
  private activePulseSrc: AudioBufferSourceNode | null = null;
  private activePulseGain: GainNode | null = null;
  private activeTailSrc: AudioBufferSourceNode | null = null;

  public async unlock(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.loadingPromise) this.loadingPromise = this.preloadAll();
    await this.loadingPromise;
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
        } catch { /* ignore */ }
      })
    );
  }

  public startBGM(): void {
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio('/audio/bgm_sulaco.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.32;
    }
    this.bgmAudio.play().catch(() => {});
  }

  public pauseBGM(): void {
    this.bgmAudio?.pause();
    this.stopPulseLoop(false);
  }

  public resumeBGM(): void {
    this.bgmAudio?.play().catch(() => {});
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
    const l = this.ctx.listener, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    if (l.positionX) {
      l.positionX.value = x; l.positionY.value = y; l.positionZ.value = z;
      l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fz;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  }

  public play2D(key: SoundKey, volume = 0.6, playbackRate = 1.0): void {
    if (!this.ctx) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(0);
  }

  // Monophonic Pulse Rifle Burst Controller: prevents overlapping multi-shot comb-filtering echo
  public playPulseShot(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.activeTailSrc) {
      try { this.activeTailSrc.stop(); } catch { /* ignore */ }
      this.activeTailSrc = null;
    }
    if (this.activePulseSrc && this.activePulseGain) {
      try {
        this.activePulseGain.gain.setValueAtTime(this.activePulseGain.gain.value, now);
        this.activePulseGain.gain.linearRampToValueAtTime(0.001, now + 0.012);
        this.activePulseSrc.stop(now + 0.014);
      } catch { /* ignore */ }
    }
    const variants: SoundKey[] = ['pulse_shot', 'pulse_shot2', 'pulse_shot3', 'pulse_shot4'];
    const buf = this.buffers.get(variants[Math.floor(Math.random() * variants.length)]);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.99 + Math.random() * 0.02;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.58, now);
    src.connect(gain);
    gain.connect(this.ctx.destination);
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
    } catch { /* ignore */ }
    this.activePulseSrc = null;
    this.activePulseGain = null;
    if (withTail) {
      const tailBuf = this.buffers.get('pulse_tail');
      if (tailBuf) {
        const tailSrc = this.ctx.createBufferSource();
        tailSrc.buffer = tailBuf;
        const tailGain = this.ctx.createGain();
        tailGain.gain.value = 0.42;
        tailSrc.connect(tailGain);
        tailGain.connect(this.ctx.destination);
        tailSrc.start(0);
        this.activeTailSrc = tailSrc;
      }
    }
  }

  public play3D(key: SoundKey, x: number, y: number, z: number, volume = 0.85, playbackRate = 1.0): void {
    if (!this.ctx) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2.5;
    panner.maxDistance = 42;
    panner.rolloffFactor = 1.2;
    if (panner.positionX) {
      panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z;
    } else panner.setPosition(x, y, z);
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(panner);
    panner.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(0);
  }

  public setKlaxonActive(active: boolean): void {
    if (active && this.ambienceTimer === null) {
      this.ambienceTimer = window.setInterval(() => {
        const roll = Math.random();
        if (roll < 0.4) this.play2D(Math.random() > 0.5 ? 'distant_boom1' : 'distant_boom2', 0.42, 0.9 + Math.random() * 0.15);
        else if (roll < 0.75) this.play2D('console_alarm', 0.28, 0.85);
        else this.play2D('spark', 0.35, 0.95 + Math.random() * 0.1);
      }, 3400);
    } else if (!active && this.ambienceTimer !== null) {
      clearInterval(this.ambienceTimer);
      this.ambienceTimer = null;
    }
  }
}

export const AudioManager = new WebAudioController();
