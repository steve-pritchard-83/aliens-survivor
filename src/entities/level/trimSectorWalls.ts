import * as THREE from 'three';

// Trim interior join walls & end-caps so all 4 L-corridor sections form a seamless Double-Size Figure-8 Sector
export function trimSectorWalls(
  root: THREE.Object3D,
  isRotatedCopy: boolean,
  zShift: number,
  openNorthEnd: boolean,
  openSouthEnd: boolean
) {
  const v0 = new THREE.Vector3(),
    v1 = new THREE.Vector3(),
    v2 = new THREE.Vector3();
  const loc0 = new THREE.Vector3(),
    loc1 = new THREE.Vector3(),
    loc2 = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry = mesh.geometry.clone();
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const index = mesh.geometry.index;
    if (!pos || !index) return;

    const toWorld = (idx: number, target: THREE.Vector3, locTarget: THREE.Vector3) => {
      locTarget.fromBufferAttribute(pos, idx).applyMatrix4(mesh.matrixWorld);
      if (isRotatedCopy) target.set(-13.8 - locTarget.x, locTarget.y, 30.4 + zShift - locTarget.z);
      else {
        target.copy(locTarget);
        target.z += zShift;
      }
    };

    const newIndices: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i),
        b = index.getX(i + 1),
        c = index.getX(i + 2);
      toWorld(a, v0, loc0);
      toWorld(b, v1, loc1);
      toWorld(c, v2, loc2);
      const minY = Math.min(v0.y, v1.y, v2.y),
        maxY = Math.max(v0.y, v1.y, v2.y);
      const cx = (v0.x + v1.x + v2.x) / 3,
        cz = (v0.z + v1.z + v2.z) / 3;
      const locCx = (loc0.x + loc1.x + loc2.x) / 3,
        locCz = (loc0.z + loc1.z + loc2.z) / 3;
      const inWallBand = maxY > 0.18 && minY < 1.85;

      // 1. Remove interior end-caps and perpendicular turn-blocking wall panels at section joins
      const isEndCap = inWallBand && (locCx < -13.35 || locCz < 8.8);
      const isTurnBlocker = inWallBand && ((locCx < -12.6 && locCz < 21.05) || (locCx < -0.5 && locCz < 9.6));

      // 2. Open doorways between North and South sectors at the center junction (Z = 22.1)
      const inNorthJunction =
        openNorthEnd &&
        inWallBand &&
        ((cx > -1.1 && cx < 0.0) || (cx > -13.7 && cx < -12.6)) &&
        cz > 22.6 + zShift &&
        cz < 24.1 + zShift;
      const inSouthJunction =
        openSouthEnd &&
        inWallBand &&
        ((cx > -1.1 && cx < 0.0) || (cx > -13.7 && cx < -12.6)) &&
        cz > 6.3 + zShift &&
        cz < 7.7 + zShift;

      if (!isEndCap && !isTurnBlocker && !inNorthJunction && !inSouthJunction) newIndices.push(a, b, c);
    }
    mesh.geometry.setIndex(newIndices);
  });
}
