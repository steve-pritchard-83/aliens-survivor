import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { velocityDelta } from '../src/entities/player/playerMotion';
import { turnAboutHead, moveHeadClamped, placeHeadAt, readHeadLocal } from '../src/entities/player/xrRig';
import { BALANCE } from '../src/data/balance';
import type { XZ } from '../src/core/CorridorNav';

describe('velocityDelta', () => {
  it('moves forward along the view direction (yaw 0 faces -Z, yaw PI faces +Z)', () => {
    const d: XZ = { x: 0, z: 0 };
    velocityDelta(0, 1, 0, 1, d);
    expect(d.x).toBeCloseTo(0, 6);
    expect(d.z).toBeCloseTo(-BALANCE.PLAYER.MOVE_SPEED, 6);
    velocityDelta(0, 1, Math.PI, 1, d);
    expect(d.z).toBeCloseTo(BALANCE.PLAYER.MOVE_SPEED, 6);
  });

  it('strafes right relative to the view (yaw 0: +X)', () => {
    const d: XZ = { x: 0, z: 0 };
    velocityDelta(1, 0, 0, 1, d);
    expect(d.x).toBeCloseTo(BALANCE.PLAYER.MOVE_SPEED, 6);
    expect(d.z).toBeCloseTo(0, 6);
  });

  it('covers the same distance per second at any frame rate', () => {
    const d: XZ = { x: 0, z: 0 };
    for (const fps of [30, 60, 72, 120]) {
      let x = 0,
        z = 0;
      for (let i = 0; i < fps; i++) {
        velocityDelta(0, 1, 0.7, 1 / fps, d);
        x += d.x;
        z += d.z;
      }
      expect(Math.hypot(x, z)).toBeCloseTo(BALANCE.PLAYER.MOVE_SPEED, 5);
    }
  });

  it('scales with stick deflection and is zero without input', () => {
    const d: XZ = { x: 0, z: 0 };
    velocityDelta(0, 0.5, 0, 1, d);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(BALANCE.PLAYER.MOVE_SPEED * 0.5, 6);
    velocityDelta(0, 0, 1.2, 1, d);
    expect(Math.hypot(d.x, d.z)).toBe(0);
  });
});

/** An XR rig: origin group with the camera as child at a local head offset (as in the real headset). */
function rig(headLocal: [number, number, number], originAt: [number, number, number] = [-0.32, 0, 13]) {
  const origin = new THREE.Group();
  origin.position.set(...originAt);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(...headLocal);
  origin.add(camera);
  origin.updateMatrixWorld(true);
  return { origin, camera };
}
const head = (camera: THREE.Camera) => camera.getWorldPosition(new THREE.Vector3());

describe('XR rig', () => {
  it('turning about the head keeps the head in place even when it is off-centre', () => {
    const { origin, camera } = rig([0.6, 1.6, -0.3]);
    const before = head(camera);
    for (const yaw of [Math.PI / 2, Math.PI, -Math.PI / 4, 0]) {
      turnAboutHead(origin, camera.position, yaw);
      const after = head(camera);
      expect(after.x).toBeCloseTo(before.x, 5);
      expect(after.z).toBeCloseTo(before.z, 5);
      expect(origin.rotation.y).toBeCloseTo(yaw, 6);
    }
  });

  it('moves the head by the requested delta inside the corridor', () => {
    const { origin, camera } = rig([0.2, 1.6, 0.1]);
    const start = head(camera);
    const out: XZ = { x: 0, z: 0 };
    moveHeadClamped(origin, camera.position, 0, 0.5, 0.15, out);
    const after = head(camera);
    expect(after.z).toBeCloseTo(start.z + 0.5, 5);
    expect(out.z).toBeCloseTo(after.z, 5);
    expect(out.x).toBeCloseTo(after.x, 5);
  });

  it('pushes the head back inside the walls, including room-scale steps with no stick input', () => {
    // East spine spans x in [-0.95, 0.32]; with the 0.15 margin the head may reach x = 0.17
    const { origin, camera } = rig([0, 1.6, 0], [0.1, 0, 13]);
    const out: XZ = { x: 0, z: 0 };
    camera.position.x = 1.5; // the player physically stepped 1.5 m right, through the wall
    origin.updateMatrixWorld(true);
    moveHeadClamped(origin, camera.position, 0, 0, BALANCE.PLAYER.XR_WALL_MARGIN, out);
    expect(head(camera).x).toBeLessThanOrEqual(0.32 - BALANCE.PLAYER.XR_WALL_MARGIN + 1e-6);
    expect(out.x).toBeLessThanOrEqual(0.17 + 1e-6);
  });

  it('walking into a wall with the stick stops at the margin', () => {
    const { origin, camera } = rig([0, 1.6, 0], [0.1, 0, 13]);
    const out: XZ = { x: 0, z: 0 };
    for (let i = 0; i < 20; i++) moveHeadClamped(origin, camera.position, 0.2, 0, BALANCE.PLAYER.XR_WALL_MARGIN, out);
    expect(head(camera).x).toBeCloseTo(0.17, 5);
  });

  it('placeHeadAt puts the head exactly on the target regardless of its local offset or yaw', () => {
    const { origin, camera } = rig([0.5, 1.6, -0.4]);
    origin.rotation.y = 1.1;
    origin.updateMatrixWorld(true);
    placeHeadAt(origin, camera.position, -0.32, 13);
    const h = head(camera);
    expect(h.x).toBeCloseTo(-0.32, 5);
    expect(h.z).toBeCloseTo(13, 5);
  });
});

describe('readHeadLocal', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(1, 2, 3);
  const out = new THREE.Vector3();

  it('uses the viewer pose when the frame provides one', () => {
    const frame = { getViewerPose: () => ({ transform: { position: { x: 0.4, y: 1.6, z: -0.2 } } }) };
    readHeadLocal(frame as unknown as XRFrame, {} as XRSpace, camera, out);
    expect(out.toArray()).toEqual([0.4, 1.6, -0.2]);
  });

  it('falls back to the camera when there is no frame, reference space or pose', () => {
    readHeadLocal(undefined, null, camera, out);
    expect(out.toArray()).toEqual([1, 2, 3]);
    const noPose = { getViewerPose: () => undefined };
    readHeadLocal(noPose as unknown as XRFrame, {} as XRSpace, camera, out);
    expect(out.toArray()).toEqual([1, 2, 3]);
  });
});

describe('configured walking speeds', () => {
  it('moves at a jog in VR, no faster than flat-screen play', () => {
    expect(BALANCE.PLAYER.XR_MOVE_SPEED).toBeGreaterThan(2.4);
    expect(BALANCE.PLAYER.XR_MOVE_SPEED).toBeLessThan(3.2);
    expect(BALANCE.PLAYER.XR_MOVE_SPEED).toBeLessThanOrEqual(BALANCE.PLAYER.MOVE_SPEED);
  });
});
