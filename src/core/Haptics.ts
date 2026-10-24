// Tactical haptic feedback system supporting Web Vibration API & Meta Quest 2 Touch Controllers
import { xrControllerState } from './XRControllerState';

class HapticsController {
  private hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  public fire(): void {
    if (this.hasVibrate) {
      try { navigator.vibrate(14); } catch { /* ignore */ }
    }
    xrControllerState.triggerHaptic('right', 0.85, 45);
  }

  public hit(): void {
    if (this.hasVibrate) {
      try { navigator.vibrate(28); } catch { /* ignore */ }
    }
    xrControllerState.triggerHaptic('right', 0.65, 35);
  }

  public kill(): void {
    if (this.hasVibrate) {
      try { navigator.vibrate([40, 20, 35]); } catch { /* ignore */ }
    }
    xrControllerState.triggerHaptic('both', 0.95, 80);
  }

  public damage(): void {
    if (this.hasVibrate) {
      try { navigator.vibrate([60, 30, 80]); } catch { /* ignore */ }
    }
    xrControllerState.triggerHaptic('both', 1.0, 140);
  }

  public reload(): void {
    if (this.hasVibrate) {
      try { navigator.vibrate([16, 45, 20]); } catch { /* ignore */ }
    }
    xrControllerState.triggerHaptic('right', 0.7, 90);
  }

  public trackerPing(): void {
    if (this.hasVibrate) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
    xrControllerState.triggerHaptic('left', 0.45, 30);
  }
}

export const Haptics = new HapticsController();
