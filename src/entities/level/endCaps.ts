import * as THREE from 'three';

/** The map is symmetric about this x (the west spine's outer wall and the east spine's mirror each other). */
const MIRROR_X = -13.8;

/**
 * Source patches (xMin, xMax, zMin, zMax) holding an end wall that exists, to be mirrored onto the end that is
 * missing one: the north hall's east end becomes its west end, and the south hall's west end becomes its east end.
 */
const SOURCE_PATCHES: readonly [number, number, number, number][] = [
  [0.8, 1.0, 35.1, 36.7], // the inner face of the north hall's east end (x = 0.90)
  [-14.8, -14.6, 7.5, 9.1] // the inner face of the south hall's west end (x = -14.70)
];

const _a = new THREE.Vector3(),
  _b = new THREE.Vector3(),
  _c = new THREE.Vector3(),
  _n = new THREE.Vector3();

function inSource(x: number, z: number): boolean {
  for (const p of SOURCE_PATCHES) if (x >= p[0] && x <= p[1] && z >= p[2] && z <= p[3]) return true;
  return false;
}

/**
 * Builds the two end walls the figure-8 model lacks (the corridor sections never included them) by mirroring the
 * wall at the opposite end of the same hall. Returns world-space meshes sharing the original materials, so they
 * match the surrounding walls; add them to the level and to the wall raycast.
 */
export function buildEndCaps(group: THREE.Object3D): THREE.Mesh[] {
  group.updateMatrixWorld(true);
  const caps: THREE.Mesh[] = [];
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry,
      pos = geo.attributes.position as THREE.BufferAttribute,
      uv = geo.attributes.uv as THREE.BufferAttribute | undefined,
      index = geo.index;
    if (!pos || !index) return;

    const positions: number[] = [],
      uvs: number[] = [];
    const push = (v: THREE.Vector3, i: number) => {
      positions.push(MIRROR_X - v.x, v.y, v.z);
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    };
    for (let i = 0; i < index.count; i += 3) {
      const ia = index.getX(i),
        ib = index.getX(i + 1),
        ic = index.getX(i + 2);
      _a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
      _b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
      _c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
      _n.crossVectors(_b.clone().sub(_a), _c.clone().sub(_a)).normalize();
      if (Math.abs(_n.x) < 0.7) continue; // only walls that face along x are end walls
      if (!inSource((_a.x + _b.x + _c.x) / 3, (_a.z + _b.z + _c.z) / 3)) continue;
      // Mirroring flips the winding, so the second and third vertices swap to keep the face pointing inward
      push(_a, ia);
      push(_c, ic);
      push(_b, ib);
    }
    if (positions.length === 0) return;
    const capGeo = new THREE.BufferGeometry();
    capGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    capGeo.computeVertexNormals();
    const cap = new THREE.Mesh(capGeo, mesh.material);
    cap.matrixAutoUpdate = false;
    caps.push(cap);
  });
  return caps;
}
