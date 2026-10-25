import { BALANCE } from '../../data/balance';
import type { XZ } from '../../core/CorridorNav';

/**
 * Horizontal displacement for one frame from a stick/keyboard input, relative to the head yaw.
 * Frame-rate independent: the same total distance is covered per second whatever the frame times.
 */
export function velocityDelta(moveX: number, moveZ: number, yaw: number, dt: number, out: XZ): void {
  const sin = Math.sin(yaw),
    cos = Math.cos(yaw);
  // forward = (-sin, -cos), right = (cos, -sin)
  const step = BALANCE.PLAYER.MOVE_SPEED * dt;
  out.x = (cos * moveX - sin * moveZ) * step;
  out.z = (-sin * moveX - cos * moveZ) * step;
}
