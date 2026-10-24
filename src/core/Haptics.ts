// Web Vibration API tactical haptic feedback system
class HapticsController {
  private hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  public fire(): void {
    if (!this.hasVibrate) return;
    try { navigator.vibrate(14); } catch { /* ignore */ }
  }

  public hit(): void {
    if (!this.hasVibrate) return;
    try { navigator.vibrate(28); } catch { /* ignore */ }
  }

  public kill(): void {
    if (!this.hasVibrate) return;
    try { navigator.vibrate([40, 20, 35]); } catch { /* ignore */ }
  }

  public damage(): void {
    if (!this.hasVibrate) return;
    try { navigator.vibrate([60, 30, 80]); } catch { /* ignore */ }
  }

  public reload(): void {
    if (!this.hasVibrate) return;
    try { navigator.vibrate([16, 45, 20]); } catch { /* ignore */ }
  }

  public trackerPing(): void {
    if (!this.hasVibrate) return;
    try { navigator.vibrate(10); } catch { /* ignore */ }
  }
}

export const Haptics = new HapticsController();
