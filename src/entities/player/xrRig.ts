import * as THREE from 'three';
import { constrainToCorridorInto, XZ } from '../../core/CorridorNav';

const _before = new THREE.Vector3();
const _after = new THREE.Vector3();
const _clamped: XZ = { x: 0, z: 0 };

/**
 * Head position in the XR origin's local space, from this frame's viewer pose (the true head centre).
 * three.js only refreshes the user camera at render time, so inside a frame callback it still holds the
 * previous frame's pose (and a single eye's offset); the viewer pose is current and eye-independent.
 * Falls back to the camera's local position when no pose is available.
 */
export function readHeadLocal(
  frame: XRFrame | undefined,
  refSpace: XRSpace | null,
  camera: THREE.Camera,
  out: THREE.Vector3
): void {
  const pose = frame && refSpace ? frame.getViewerPose(refSpace as XRReferenceSpace) : undefined;
  if (pose) {
    const p = pose.transform.position;
    out.set(p.x, p.y, p.z);
  } else out.copy(camera.position);
}

function headWorld(origin: THREE.Object3D, headLocal: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
  origin.updateWorldMatrix(true, false);
  return origin.localToWorld(target.copy(headLocal));
}

/**
 * Applies a yaw to the XR origin while keeping the player's head where it was, so a turn rotates the view
 * about the head instead of swinging the player around the play-space centre.
 */
export function turnAboutHead(origin: THREE.Object3D, headLocal: THREE.Vector3, yaw: number): void {
  headWorld(origin, headLocal, _before);
  origin.rotation.y = yaw;
  origin.updateMatrixWorld(true);
  headWorld(origin, headLocal, _after);
  origin.position.x += _before.x - _after.x;
  origin.position.z += _before.z - _after.z;
  origin.updateMatrixWorld(true);
}

/**
 * Moves the XR origin so the head advances by (dx, dz) and stays inside the corridor. Because the clamp is
 * applied to the head position, physically walking into a wall pushes the player back as well.
 * Writes the resulting head position to `out`.
 */
export function moveHeadClamped(
  origin: THREE.Object3D,
  headLocal: THREE.Vector3,
  dx: number,
  dz: number,
  margin: number,
  out: XZ
): void {
  headWorld(origin, headLocal, _before);
  constrainToCorridorInto(_before.x + dx, _before.z + dz, margin, _clamped);
  origin.position.x += _clamped.x - _before.x;
  origin.position.z += _clamped.z - _before.z;
  origin.updateMatrixWorld(true);
  out.x = _clamped.x;
  out.z = _clamped.z;
}

/** Teleports the XR origin so the head is at (x, z) (used when a mission or VR session starts). */
export function placeHeadAt(origin: THREE.Object3D, headLocal: THREE.Vector3, x: number, z: number): void {
  headWorld(origin, headLocal, _before);
  origin.position.x += x - _before.x;
  origin.position.z += z - _before.z;
  origin.updateMatrixWorld(true);
}
