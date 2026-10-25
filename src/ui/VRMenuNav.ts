const PRESS = 0.65;
const RELEASE = 0.25;

/**
 * Edge-detected VR menu input. Emits one event per stick push or trigger press, and swallows
 * everything for a short delay after arm() and until the trigger has been released once, so a
 * trigger still held from combat can never confirm a menu choice.
 */
export class VRMenuNav {
  private delay = 0;
  private releasedSeen = false;
  private latchX = 0;
  private latchY = 0;
  private triggerWas = false;
  private left = false;
  private right = false;
  private up = false;
  private down = false;
  private confirm = false;

  public arm(delaySeconds: number): void {
    this.delay = delaySeconds;
    this.releasedSeen = false;
    this.clearEvents();
  }

  public update(dt: number, stickX: number, stickY: number, trigger: boolean): void {
    this.clearEvents();
    if (this.delay > 0) this.delay -= dt;
    if (!trigger) this.releasedSeen = true;
    const swallow = this.delay > 0 || !this.releasedSeen;

    if (stickX > PRESS && this.latchX !== 1) {
      this.latchX = 1;
      if (!swallow) this.right = true;
    } else if (stickX < -PRESS && this.latchX !== -1) {
      this.latchX = -1;
      if (!swallow) this.left = true;
    } else if (Math.abs(stickX) < RELEASE) this.latchX = 0;

    if (stickY > PRESS && this.latchY !== 1) {
      this.latchY = 1;
      if (!swallow) this.down = true;
    } else if (stickY < -PRESS && this.latchY !== -1) {
      this.latchY = -1;
      if (!swallow) this.up = true;
    } else if (Math.abs(stickY) < RELEASE) this.latchY = 0;

    if (trigger && !this.triggerWas && !swallow) this.confirm = true;
    this.triggerWas = trigger;
  }

  public consumeLeft(): boolean {
    const v = this.left;
    this.left = false;
    return v;
  }
  public consumeRight(): boolean {
    const v = this.right;
    this.right = false;
    return v;
  }
  public consumeUp(): boolean {
    const v = this.up;
    this.up = false;
    return v;
  }
  public consumeDown(): boolean {
    const v = this.down;
    this.down = false;
    return v;
  }
  public consumeConfirm(): boolean {
    const v = this.confirm;
    this.confirm = false;
    return v;
  }

  private clearEvents(): void {
    this.left = this.right = this.up = this.down = this.confirm = false;
  }
}
