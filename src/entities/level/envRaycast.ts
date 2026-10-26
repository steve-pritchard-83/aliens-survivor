import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { CombatSystem, WallHitResult } from '../../core/CombatEvents';
import { BALANCE } from '../../data/balance';

const MAX_RANGE = BALANCE.RANGES.ENV_RAY_MAX;

const _raycaster = new THREE.Raycaster();
const _hits: THREE.Intersection[] = [];
const _normalMatrix = new THREE.Matrix3();
const _result: WallHitResult = { point: new THREE.Vector3(), normal: new THREE.Vector3() };

/**
 * Registers the corridor meshes as the environment for hitscan. Each mesh gets a BVH so a ray costs
 * O(log n) instead of testing every triangle, and the query itself allocates nothing.
 * The returned result object is reused: callers must copy what they keep (CombatSystem does).
 * Returns a cleanup that unregisters the raycaster and frees the BVHs.
 */
export function registerEnvironmentRaycast(meshes: THREE.Mesh[]): () => void {
  for (const mesh of meshes) {
    mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
  }
  _raycaster.firstHitOnly = true;
  _raycaster.far = MAX_RANGE;

  CombatSystem.registerEnvRaycaster((origin, dir) => {
    if (meshes.length === 0) return null;
    _raycaster.set(origin, dir);
    _hits.length = 0;
    _raycaster.intersectObjects(meshes, false, _hits);
    if (_hits.length === 0) return null;
    const h = _hits[0];
    _result.point.copy(h.point);
    if (h.face) {
      _normalMatrix.getNormalMatrix(h.object.matrixWorld);
      _result.normal.copy(h.face.normal).applyNormalMatrix(_normalMatrix).normalize();
    } else _result.normal.set(0, 1, 0);
    if (_result.normal.dot(dir) > 0) _result.normal.negate();
    return _result;
  });

  return () => {
    CombatSystem.unregisterEnvRaycaster();
    for (const mesh of meshes) mesh.geometry.boundsTree = undefined;
  };
}
