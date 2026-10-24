export type InputMode = 'DESKTOP' | 'TOUCH' | 'XR';

export interface InputSnapshot {
  mode: InputMode;
  moveX: number; // -1 (left) to +1 (right)
  moveZ: number; // -1 (backward) to +1 (forward)
  lookDeltaX: number;
  lookDeltaY: number;
  snapTurn: number;
  isFiring: boolean;
  reloadRequested: boolean;
  pointerLocked: boolean;
}

class InputManagerController {
  public mode: InputMode = 'DESKTOP';
  private keys = new Set<string>();
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private xrMoveX = 0;
  private xrMoveZ = 0;
  private lookDX = 0;
  private lookDY = 0;
  private snapTurnAngle = 0;
  private mouseDown = false;
  private touchFiring = false;
  private xrFiring = false;
  private reloadFlag = false;
  public trackerToggleFlag = false;
  public flashlightToggleFlag = false;
  public pauseToggleFlag = false;
  public pointerLocked = false;
  public gyroEnabled = false;
  public onPointerUnlockCallback: (() => void) | null = null;
  private initialized = false;
  private ignoreMouseUntil = 0;
  private modeListeners = new Set<(m: InputMode) => void>();

  public onModeChange(fn: (m: InputMode) => void) {
    this.modeListeners.add(fn);
    return () => { this.modeListeners.delete(fn); };
  }

  private setMode(m: InputMode) {
    if (this.mode === m) return;
    this.mode = m;
    this.modeListeners.forEach((fn) => fn(m));
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia?.('(pointer: coarse)').matches;
    if (isTouch) {
      this.setMode('TOUCH');
    }

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchstart', this.onTouchActivity, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('deviceorientation', this.onDeviceOrientation);
  }

  private onTouchActivity = () => {
    if (this.mode !== 'XR') this.setMode('TOUCH');
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'XR') this.setMode('DESKTOP');
    this.keys.add(e.code);
    if (e.code === 'KeyR') {
      this.reloadFlag = true;
    } else if (e.code === 'Tab') {
      e.preventDefault();
      this.trackerToggleFlag = true;
    } else if (e.code === 'KeyF') {
      this.flashlightToggleFlag = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      this.pauseToggleFlag = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.mode !== 'XR') this.setMode('DESKTOP');
    if (e.button === 0 && this.pointerLocked) {
      this.mouseDown = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.mode !== 'XR') this.setMode('DESKTOP');
    if (!this.pointerLocked || performance.now() < this.ignoreMouseUntil) return;
    // Guard against browser pointer-lock re-center warp anomalies (> 80px spike)
    if (Math.abs(e.movementX) > 80 || Math.abs(e.movementY) > 80) return;
    const mx = Math.max(-45, Math.min(45, e.movementX));
    const my = Math.max(-45, Math.min(45, e.movementY));
    this.lookDX += mx * 0.0022;
    this.lookDY += my * 0.0022;
  };

  private onPointerLockChange = () => {
    const wasLocked = this.pointerLocked;
    this.pointerLocked = document.pointerLockElement !== null;
    this.lookDX = 0;
    this.lookDY = 0;
    if (this.pointerLocked) {
      this.ignoreMouseUntil = performance.now() + 120;
    } else {
      this.mouseDown = false;
      this.keys.clear();
      if (wasLocked && this.onPointerUnlockCallback) {
        this.onPointerUnlockCallback();
      }
    }
  };

  public releasePointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.pointerLocked = false;
    this.mouseDown = false;
    this.keys.clear();
  }

  private onDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (!this.gyroEnabled || this.mode !== 'TOUCH') return;
    if (e.gamma !== null && e.beta !== null) {
      // Subtle gyro assist when enabled on mobile
      this.lookDX += (e.gamma * 0.00015);
    }
  };

  public requestPointerLock(): void {
    if (typeof window === 'undefined') return;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || this.mode === 'TOUCH';
    if (isTouch) return;
    const canvas = document.querySelector('canvas');
    if (canvas && !this.pointerLocked && this.mode === 'DESKTOP') {
      canvas.requestPointerLock?.();
    }
  }

  public setTouchMove(x: number, z: number): void {
    this.mode = 'TOUCH';
    this.touchMoveX = Math.max(-1, Math.min(1, x));
    this.touchMoveZ = Math.max(-1, Math.min(1, z));
  }

  public addTouchLook(dx: number, dy: number): void {
    this.mode = 'TOUCH';
    this.lookDX += dx;
    this.lookDY += dy;
  }

  public setTouchFire(firing: boolean): void {
    this.mode = 'TOUCH';
    this.touchFiring = firing;
  }

  public triggerReload(): void {
    this.reloadFlag = true;
  }

  public addSnapTurn(angle: number): void {
    this.snapTurnAngle += angle;
  }

  public isFiringActive(): boolean {
    return this.mouseDown || this.touchFiring || this.xrFiring;
  }

  public setXRState(active: boolean, moveX = 0, moveZ = 0, firing = false): void {
    if (active) {
      this.mode = 'XR';
      this.xrMoveX = moveX;
      this.xrMoveZ = moveZ;
      this.xrFiring = firing;
    } else if (this.mode === 'XR') {
      this.mode = 'DESKTOP';
      this.xrFiring = false;
    }
  }

  public consumeSnapshot(): InputSnapshot {
    let kbX = 0;
    let kbZ = 0;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbX += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbX -= 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbZ += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbZ -= 1;

    if (kbX !== 0 && kbZ !== 0) {
      const inv = 1 / Math.SQRT2;
      kbX *= inv;
      kbZ *= inv;
    }

    const moveX = this.mode === 'XR' ? this.xrMoveX : (kbX !== 0 ? kbX : this.touchMoveX);
    const moveZ = this.mode === 'XR' ? this.xrMoveZ : (kbZ !== 0 ? kbZ : this.touchMoveZ);
    const isFiring = this.mouseDown || this.touchFiring || this.xrFiring;
    const reloadRequested = this.reloadFlag;
    const snapTurn = this.snapTurnAngle;

    const snap: InputSnapshot = {
      mode: this.mode,
      moveX,
      moveZ,
      lookDeltaX: Math.max(-0.22, Math.min(0.22, this.lookDX)),
      lookDeltaY: Math.max(-0.22, Math.min(0.22, this.lookDY)),
      snapTurn,
      isFiring,
      reloadRequested,
      pointerLocked: this.pointerLocked
    };

    this.lookDX = 0;
    this.lookDY = 0;
    this.snapTurnAngle = 0;
    this.reloadFlag = false;
    return snap;
  }
}

export const InputManager = new InputManagerController();
