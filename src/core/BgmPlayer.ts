import { BGM_URL } from './AudioCatalog';

/**
 * Background music. It plays through an <audio> element, outside the Web Audio graph, so its level is applied to
 * the element directly (the sound effects use gain nodes instead).
 */
export class BgmPlayer {
  private audio: HTMLAudioElement | null = null;
  private volume = 0;

  /** Sets the element volume (0..1); remembered for when the element is created. */
  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.audio) this.audio.volume = volume;
  }

  public start(): void {
    if (!this.audio) {
      this.audio = new Audio(BGM_URL);
      this.audio.loop = true;
      this.audio.volume = this.volume;
    }
    this.audio.play().catch((e) => console.warn('[BgmPlayer] play blocked', e));
  }

  public pause(): void {
    this.audio?.pause();
  }

  public resume(): void {
    this.audio?.play().catch((e) => console.warn('[BgmPlayer] resume blocked', e));
  }

  public stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}
