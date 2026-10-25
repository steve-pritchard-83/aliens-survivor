import * as THREE from 'three';

// Asset builders for the acid / dismemberment effects: procedural textures and per-limb gib geometry
const LIMB_BONE_ROOTS = [
  'XenosBiped_l_Arm_ShoulderSHJnt_028',
  'XenosBiped_r_Arm_ShoulderSHJnt_046',
  'XenosBiped_l_Leg_Knee1SHJnt_077',
  'XenosBiped_r_Leg_Knee1SHJnt_087',
  'XenosBiped_Neck_TopSHJnt_09'
];

export function createAcidTextures(): { dropletTex: THREE.CanvasTexture; puddleTex: THREE.CanvasTexture } {
  const c1 = document.createElement('canvas');
  c1.width = 128;
  c1.height = 128;
  const ctx1 = c1.getContext('2d')!,
    g1 = ctx1.createRadialGradient(64, 64, 2, 64, 64, 48);
  g1.addColorStop(0.0, 'rgba(245, 255, 190, 1.0)');
  g1.addColorStop(0.45, 'rgba(165, 255, 15, 0.98)');
  g1.addColorStop(0.75, 'rgba(85, 200, 0, 0.55)');
  g1.addColorStop(1.0, 'rgba(40, 100, 0, 0.0)');
  ctx1.fillStyle = g1;
  ctx1.fillRect(0, 0, 128, 128);

  const c2 = document.createElement('canvas');
  c2.width = 256;
  c2.height = 256;
  const ctx2 = c2.getContext('2d')!,
    g2 = ctx2.createRadialGradient(128, 128, 8, 128, 128, 120);
  g2.addColorStop(0.0, 'rgba(18, 68, 14, 0.96)');
  g2.addColorStop(0.45, 'rgba(28, 92, 18, 0.90)');
  g2.addColorStop(0.75, 'rgba(48, 135, 15, 0.65)');
  g2.addColorStop(0.92, 'rgba(85, 190, 20, 0.25)');
  g2.addColorStop(1.0, 'rgba(20, 60, 10, 0.0)');
  ctx2.fillStyle = g2;
  ctx2.fillRect(0, 0, 256, 256);
  return { dropletTex: new THREE.CanvasTexture(c1), puddleTex: new THREE.CanvasTexture(c2) };
}

export function buildActualLimbTemplates(scene: THREE.Group): {
  geos: THREE.BufferGeometry[];
  mat: THREE.MeshStandardMaterial;
} {
  let bodyMesh: THREE.SkinnedMesh | null = null;
  scene.traverse((c) => {
    if ((c as THREE.SkinnedMesh).isSkinnedMesh && !bodyMesh) bodyMesh = c as THREE.SkinnedMesh;
  });
  if (!bodyMesh)
    return { geos: LIMB_BONE_ROOTS.map(() => new THREE.BufferGeometry()), mat: new THREE.MeshStandardMaterial() };

  const sm = bodyMesh as THREE.SkinnedMesh,
    mat = (sm.material as THREE.MeshStandardMaterial).clone();
  mat.roughness = 0.34;
  mat.metalness = 0.22;
  mat.color.setRGB(1.45, 1.52, 1.6);
  mat.emissive.setHex(0x122618);
  mat.emissiveIntensity = 0.45;

  const srcGeo = sm.geometry,
    skinIndex = srcGeo.attributes.skinIndex as THREE.BufferAttribute;
  const skinWeight = srcGeo.attributes.skinWeight as THREE.BufferAttribute,
    index = srcGeo.index!,
    bones = sm.skeleton.bones;
  const srcPos = srcGeo.attributes.position as THREE.BufferAttribute;
  const srcNorm = srcGeo.attributes.normal as THREE.BufferAttribute,
    srcUv = srcGeo.attributes.uv as THREE.BufferAttribute;

  const geos = LIMB_BONE_ROOTS.map((rootName, slot) => {
    const descBones = new Set<THREE.Object3D>(),
      boneIdxSet = new Set<number>();
    scene.getObjectByName(rootName)?.traverse((b) => descBones.add(b));
    bones.forEach((b, idx) => {
      if (descBones.has(b)) boneIdxSet.add(idx);
    });

    const inLimb = new Uint8Array(skinIndex.count),
      usedVerts = new Map<number, number>();
    const posArr: number[] = [],
      normArr: number[] = [],
      uvArr: number[] = [],
      subIndices: number[] = [];
    for (let v = 0; v < skinIndex.count; v++) {
      let wSum = 0;
      if (boneIdxSet.has(skinIndex.getX(v))) wSum += skinWeight.getX(v);
      if (boneIdxSet.has(skinIndex.getY(v))) wSum += skinWeight.getY(v);
      if (boneIdxSet.has(skinIndex.getZ(v))) wSum += skinWeight.getZ(v);
      if (boneIdxSet.has(skinIndex.getW(v))) wSum += skinWeight.getW(v);
      if (wSum > 0.45) inLimb[v] = 1;
    }
    const addV = (oldIdx: number): number => {
      let nIdx = usedVerts.get(oldIdx);
      if (nIdx !== undefined) return nIdx;
      nIdx = posArr.length / 3;
      usedVerts.set(oldIdx, nIdx);
      posArr.push(srcPos.getX(oldIdx), srcPos.getY(oldIdx), srcPos.getZ(oldIdx));
      if (srcNorm) normArr.push(srcNorm.getX(oldIdx), srcNorm.getY(oldIdx), srcNorm.getZ(oldIdx));
      if (srcUv) uvArr.push(srcUv.getX(oldIdx), srcUv.getY(oldIdx));
      return nIdx;
    };
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i),
        b = index.getX(i + 1),
        c = index.getX(i + 2);
      if (inLimb[a] && inLimb[b] && inLimb[c]) subIndices.push(addV(a), addV(b), addV(c));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    if (normArr.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
    if (uvArr.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    g.setIndex(subIndices);
    g.computeBoundingBox();
    const center = new THREE.Vector3();
    g.boundingBox?.getCenter(center);
    g.translate(-center.x, -center.y, -center.z);
    g.scale(0.00765, 0.00765, 0.00765);
    if (slot <= 3) g.rotateX(Math.PI / 2);
    return g;
  });
  return { geos, mat };
}
