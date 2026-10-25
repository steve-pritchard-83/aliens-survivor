import type { SoundKey } from './AudioCatalog';

type PlayFn = (key: SoundKey, volume: number, rate: number) => void;

/** Random distant booms, console alarms and sparks that keep the klaxon-lit corridor feeling alive. */
export class AmbienceLoop {
  private timer: number | null = null;

  constructor(private readonly play: PlayFn) {}

  public setActive(active: boolean): void {
    if (active && this.timer === null) {
      this.timer = window.setInterval(() => this.tick(), 3400);
    } else if (!active && this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const roll = Math.random();
    if (roll < 0.4)
      this.play(Math.random() > 0.5 ? 'distant_boom1' : 'distant_boom2', 0.42, 0.9 + Math.random() * 0.15);
    else if (roll < 0.75) this.play('console_alarm', 0.28, 0.85);
    else this.play('spark', 0.35, 0.95 + Math.random() * 0.1);
  }
}
