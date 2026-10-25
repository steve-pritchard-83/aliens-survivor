import type { GameState } from '../core/GameTypes';
import { AudioManager } from '../core/AudioManager';
import type { VRControllerInput } from './vrControllers';
import type { VRMenuNav } from './VRMenuNav';
import { VR_MENU_ROWS, adjustRow } from './vrMenuModel';

const ARM_SECONDS = 0.4;

/** Call when the pause menu opens: ignores input briefly and until the trigger is released. */
export function openPauseMenu(nav: VRMenuNav, selected: { current: number }): void {
  nav.arm(ARM_SECONDS);
  selected.current = 0;
}

/**
 * One frame of pause-menu input. Stick up/down moves between rows, left/right adjusts the selected row
 * (either controller's stick works), and a fresh trigger press confirms.
 */
export function stepPauseMenu(
  nav: VRMenuNav,
  selected: { current: number },
  st: GameState,
  dt: number,
  input: VRControllerInput
): void {
  const stickX = input.rightStickX || input.moveX;
  const stickY = input.rightStickY || -input.moveZ;
  nav.update(dt, stickX, stickY, input.firing);
  const rows = VR_MENU_ROWS.length;
  if (nav.consumeUp()) selected.current = (selected.current - 1 + rows) % rows;
  if (nav.consumeDown()) selected.current = (selected.current + 1) % rows;
  const dir = nav.consumeLeft() ? -1 : nav.consumeRight() ? 1 : nav.consumeConfirm() ? 0 : null;
  if (dir === null) return;
  const result = adjustRow(VR_MENU_ROWS[selected.current], dir, st.settings);
  if (result === 'RESUME') {
    AudioManager.play2D('ui_beep', 0.8);
    st.resumeGame();
  } else if (result) {
    AudioManager.play2D('ui_beep', 0.7);
    st.updateSettings(result);
  }
}
