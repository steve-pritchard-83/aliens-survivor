import { useGameStore } from '../core/GameStore';
import { InputManager } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { xrControllerState } from '../core/XRControllerState';
import { comfort, SNAP_PULSE_SECONDS } from '../core/ComfortState';
import type { XRHandPose } from '../core/XRControllerState';

/** Controller state gathered this frame (reused every frame). */
export interface VRControllerInput {
  moveX: number;
  moveZ: number;
  firing: boolean;
  anyButton: boolean;
  rightStickX: number;
  rightStickY: number;
}

/** Latches and cooldowns that persist between frames. */
export interface VRControllerLatches {
  weaponCooldown: number;
  snapTurnLatched: boolean;
  pauseCooldown: number;
  lightCooldown: number;
}

export function createVRControllerInput(): VRControllerInput {
  return { moveX: 0, moveZ: 0, firing: false, anyButton: false, rightStickX: 0, rightStickY: 0 };
}

export function createVRControllerLatches(): VRControllerLatches {
  return { weaponCooldown: 0, snapTurnLatched: false, pauseCooldown: 0, lightCooldown: 0 };
}

const SNAP_PRESS = 0.65;
const SNAP_RELEASE = 0.25;
const SMOOTH_DEADZONE = 0.15;
const SMOOTH_TURN_RATE = 2.2;
// Quest controller gamepad layout (xr-standard): 0 trigger, 1 grip, 3 stick click, 4 A/X, 5 B/Y
const BTN_TRIGGER = 0;
const BTN_GRIP = 1;
const BTN_STICK = 3;
const BTN_PRIMARY = 4;
const BTN_SECONDARY = 5;

function updateHandPose(hand: XRHandPose, source: XRInputSource, frame: XRFrame | undefined, refSpace: XRSpace | null) {
  const space = source.gripSpace || source.targetRaySpace;
  if (!frame || !refSpace || !space) return;
  const pose = frame.getPose(space, refSpace as XRReferenceSpace);
  if (!pose) return;
  const p = pose.transform.position,
    o = pose.transform.orientation;
  hand.active = true;
  hand.position.set(p.x, p.y, p.z);
  hand.quaternion.set(o.x, o.y, o.z, o.w);
}

function stickAxes(axes: readonly number[]): [number, number] {
  if (axes.length >= 4) return [axes[2] || 0, axes[3] || 0];
  if (axes.length >= 2) return [axes[0] || 0, axes[1] || 0];
  return [0, 0];
}

function applyTurn(turnAxis: number, dt: number, latches: VRControllerLatches): void {
  const state = useGameStore.getState();
  comfort.turnRate = 0;
  // Turning only applies during play; otherwise the stick drives menus and must not queue turns
  if (state.status !== 'PLAYING') {
    latches.snapTurnLatched = Math.abs(turnAxis) > SNAP_RELEASE;
    return;
  }
  const snap = state.settings.snapAngle;
  if (snap > 0) {
    if (Math.abs(turnAxis) > SNAP_PRESS && !latches.snapTurnLatched) {
      latches.snapTurnLatched = true;
      comfort.snapPulse = SNAP_PULSE_SECONDS;
      InputManager.addSnapTurn(turnAxis > 0 ? -snap : snap);
    } else if (Math.abs(turnAxis) < SNAP_RELEASE) latches.snapTurnLatched = false;
  } else if (Math.abs(turnAxis) > SMOOTH_DEADZONE) {
    comfort.turnRate = Math.abs(turnAxis) * SMOOTH_TURN_RATE;
    InputManager.addSnapTurn(-turnAxis * dt * SMOOTH_TURN_RATE);
  }
}

function togglePause(latches: VRControllerLatches): void {
  latches.pauseCooldown = 0.45;
  const s = useGameStore.getState();
  if (s.status === 'PLAYING') {
    AudioManager.play2D('ui_beep', 0.8);
    s.pauseGame();
  } else if (s.status === 'PAUSED') {
    AudioManager.play2D('ui_beep', 0.8);
    s.resumeGame();
  }
}

/** Reads both controllers: poses, locomotion, fire, reload, flashlight, turning and the pause buttons. */
export function pollControllers(
  xrSession: XRSession,
  refSpace: XRSpace | null,
  frame: XRFrame | undefined,
  dt: number,
  latches: VRControllerLatches,
  out: VRControllerInput
): void {
  out.moveX = out.moveZ = out.rightStickX = out.rightStickY = 0;
  out.firing = out.anyButton = false;
  const sources = xrSession.inputSources;
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const pad = source.gamepad;
    if (!pad) continue;
    const buttons = pad.buttons;
    if (
      buttons[BTN_TRIGGER]?.pressed ||
      buttons[BTN_GRIP]?.pressed ||
      buttons[BTN_PRIMARY]?.pressed ||
      buttons[BTN_SECONDARY]?.pressed
    )
      out.anyButton = true;
    const pausePressed = buttons[BTN_SECONDARY]?.pressed || buttons[BTN_STICK]?.pressed;
    const actuator = (pad.hapticActuators?.[0] as GamepadHapticActuator) || null;
    const [sx, sy] = stickAxes(pad.axes);

    if (source.handedness === 'left') {
      xrControllerState.leftHand.hapticActuator = actuator;
      updateHandPose(xrControllerState.leftHand, source, frame, refSpace);
      out.moveX = sx;
      out.moveZ = -sy;
      // Left grip cycles weapons (the right grip is reserved for steadying the rifle)
      if (buttons[BTN_GRIP]?.pressed && latches.weaponCooldown <= 0) {
        latches.weaponCooldown = 0.5;
        InputManager.weaponCycleFlag = true;
      }
      if (buttons[BTN_PRIMARY]?.pressed && latches.lightCooldown <= 0) {
        latches.lightCooldown = 0.35;
        useGameStore.getState().toggleFlashlight();
      }
    } else if (source.handedness === 'right') {
      xrControllerState.rightHand.hapticActuator = actuator;
      updateHandPose(xrControllerState.rightHand, source, frame, refSpace);
      out.firing = Boolean(buttons[BTN_TRIGGER]?.pressed);
      if (buttons[BTN_PRIMARY]?.pressed) useGameStore.getState().startReload();
      out.rightStickX = sx;
      out.rightStickY = sy;
      applyTurn(sx, dt, latches);
    }
    if (pausePressed && latches.pauseCooldown <= 0) togglePause(latches);
  }
  comfort.move = Math.min(1, Math.hypot(out.moveX, out.moveZ));
}
