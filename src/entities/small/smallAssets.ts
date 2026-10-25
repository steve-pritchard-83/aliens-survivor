import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { buildFaceRig, buildWormRig, groundModel } from '../SmallAlienAnim';

/** Clone one creature, tint its materials and return the cloned scene with its material list. */
function prepareCreature(
  source: THREE.Group,
  scale: number,
  color: [number, number, number],
  emissive: number
): { wrap: THREE.Group; mats: THREE.MeshStandardMaterial[] } {
  const clone = SkeletonUtils.clone(source) as THREE.Group;
  clone.scale.setScalar(scale);
  const mats: THREE.MeshStandardMaterial[] = [];
  clone.traverse((ch) => {
    if (!(ch as THREE.Mesh).isMesh) return;
    const m = ch as THREE.Mesh,
      mat = (m.material as THREE.MeshStandardMaterial).clone();
    mat.roughness = 0.34;
    mat.metalness = 0.15;
    mat.color.setRGB(color[0], color[1], color[2]);
    mat.emissive.setHex(emissive);
    mat.emissiveIntensity = 0.12;
    m.material = mat;
    mats.push(mat);
  });
  const wrap = new THREE.Group();
  wrap.add(clone);
  wrap.visible = false;
  groundModel(wrap, clone); // rest the model exactly on the floor
  return { wrap, mats };
}

export function buildSmallAlienAssets(facehuggerScene: THREE.Group, chestbursterScene: THREE.Group) {
  const fh = prepareCreature(facehuggerScene, 0.72, [1.35, 1.18, 0.92], 0x221808);
  const cb = prepareCreature(chestbursterScene, 0.85, [1.38, 1.05, 0.88], 0x28100c);
  return {
    fhGroup: fh.wrap,
    cbGroup: cb.wrap,
    fhMats: fh.mats,
    cbMats: cb.mats,
    faceRig: buildFaceRig(fh.wrap),
    wormRig: buildWormRig(cb.wrap)
  };
}
