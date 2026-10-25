import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { constrainToCorridor } from '../core/CorridorNav';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { quality } from '../core/QualityState';

const PARTICLE_COUNT = 64,
  GIB_POOL_SIZE = 12,
  PUDDLE_POOL_SIZE = 16;
const LIMB_BONE_ROOTS = [
  'XenosBiped_l_Arm_ShoulderSHJnt_028',
  'XenosBiped_r_Arm_ShoulderSHJnt_046',
  'XenosBiped_l_Leg_Knee1SHJnt_077',
  'XenosBiped_r_Leg_Knee1SHJnt_087',
  'XenosBiped_Neck_TopSHJnt_09'
];

export interface ImpactFXHandle {
  triggerImpact: (point: THREE.Vector3, origin: THREE.Vector3, dir: THREE.Vector3, isKill: boolean) => void;
  triggerAcidPool: (x: number, z: number, size?: number) => void;
  triggerLimbGib: (xenoId: number, slot: number, point: THREE.Vector3, dir: THREE.Vector3, yaw: number) => void;
  startXenoMelt: (xenoId: number, duration: number) => void;
}

interface SeveredGib {
  active: boolean;
  xenoId: number;
  settled: boolean;
  melting: boolean;
  meltTimer: number;
  meltDuration: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
}
interface AcidPuddle {
  active: boolean;
  timer: number;
  maxTimer: number;
  targetScale: number;
}

function createAcidTextures(): { dropletTex: THREE.CanvasTexture; puddleTex: THREE.CanvasTexture } {
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

function buildActualLimbTemplates(scene: THREE.Group): {
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

export const XenomorphImpactFX = forwardRef<ImpactFXHandle>((_, ref) => {
  const { scene } = useGLTF('/models/xenomorph.glb');
  const acidPointsRef = useRef<THREE.Points>(null);
  const gibGroupRef = useRef<THREE.Group>(null),
    puddleGroupRef = useRef<THREE.Group>(null);
  const impactTimerRef = useRef(0),
    nextGibIdxRef = useRef(0),
    nextPuddleIdxRef = useRef(0);

  const { dropletTex, puddleTex } = useMemo(() => createAcidTextures(), []);
  const { geos: limbGeos, mat: limbMat } = useMemo(() => buildActualLimbTemplates(scene), [scene]);
  const particleVel = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const gibState = useMemo<SeveredGib[]>(
    () =>
      Array.from({ length: GIB_POOL_SIZE }, () => ({
        active: false,
        xenoId: -1,
        settled: false,
        melting: false,
        meltTimer: 0,
        meltDuration: 2.2,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0
      })),
    []
  );
  const puddleState = useMemo<AcidPuddle[]>(
    () =>
      Array.from({ length: PUDDLE_POOL_SIZE }, () => ({
        active: false,
        timer: 0,
        maxTimer: 14,
        targetScale: 0.9
      })),
    []
  );
  const acidGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    return geo;
  }, []);

  const spawnPuddle = (x: number, z: number, size = 0.85) => {
    const grp = puddleGroupRef.current;
    if (!grp) return;
    const idx = nextPuddleIdxRef.current++ % PUDDLE_POOL_SIZE,
      m = grp.children[idx] as THREE.Mesh;
    if (!m) return;
    const [cx, cz] = constrainToCorridor(x, z, 0.22);
    m.position.set(cx, 0.015 + (idx % 5) * 0.001, cz);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    m.scale.setScalar(0.12);
    m.visible = true;
    Object.assign(puddleState[idx], { active: true, timer: 14.0, maxTimer: 14.0, targetScale: size });
  };

  useImperativeHandle(ref, () => ({
    triggerImpact(point, _origin, dir, isKill) {
      if (acidPointsRef.current) {
        const posAttr = acidPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const speedMult = isKill ? 4.4 : 2.8;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          posAttr.setXYZ(
            i,
            point.x + (Math.random() - 0.5) * 0.08,
            point.y + (Math.random() - 0.5) * 0.08,
            point.z + (Math.random() - 0.5) * 0.08
          );
          particleVel[i * 3] = (Math.random() - 0.5) * speedMult - dir.x * 1.4;
          particleVel[i * 3 + 1] = Math.random() * speedMult * 0.8 + 0.45;
          particleVel[i * 3 + 2] = (Math.random() - 0.5) * speedMult - dir.z * 1.4;
        }
        posAttr.needsUpdate = true;
        acidPointsRef.current.geometry.setDrawRange(0, quality.tier === 0 ? PARTICLE_COUNT >> 1 : PARTICLE_COUNT);
        acidPointsRef.current.visible = true;
      }
      impactTimerRef.current = 0.34;
    },
    triggerAcidPool(x, z, size = 1.05) {
      spawnPuddle(x, z, size);
    },
    triggerLimbGib(xenoId, slot, point, dir, yaw) {
      const grp = gibGroupRef.current;
      if (!grp) return;
      const idx = nextGibIdxRef.current++ % GIB_POOL_SIZE,
        mesh = grp.children[idx] as THREE.Mesh;
      if (!mesh) return;
      mesh.geometry = limbGeos[slot] ?? limbGeos[0];
      mesh.position.copy(point);
      mesh.rotation.set((Math.random() - 0.5) * 0.5, yaw + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
      mesh.scale.set(1, 1, 1);
      mesh.visible = true;
      Object.assign(gibState[idx], {
        active: true,
        xenoId,
        settled: false,
        melting: false,
        meltTimer: 0,
        meltDuration: 2.2,
        vx: -dir.x * 0.65 + (Math.random() - 0.5) * 1.4,
        vy: 1.15 + Math.random() * 0.85,
        vz: -dir.z * 0.65 + (Math.random() - 0.5) * 1.4,
        rx: (Math.random() - 0.5) * 7,
        ry: (Math.random() - 0.5) * 8,
        rz: (Math.random() - 0.5) * 7
      });
    },
    startXenoMelt(xenoId, duration) {
      for (let i = 0; i < GIB_POOL_SIZE; i++) {
        const g = gibState[i];
        if (g.active && g.xenoId === xenoId && !g.melting) {
          g.melting = true;
          g.meltTimer = duration;
          g.meltDuration = duration;
          const m = gibGroupRef.current?.children[i] as THREE.Mesh | undefined;
          if (m) spawnPuddle(m.position.x, m.position.z, 0.58);
        }
      }
    }
  }));

  useFrame((_, dt) => {
    if (isSimulationFrozen(useGameStore.getState().status)) return;
    if (impactTimerRef.current > 0) {
      impactTimerRef.current -= dt;
      if (acidPointsRef.current) {
        const posAttr = acidPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const px = posAttr.getX(i) + particleVel[i * 3] * dt,
            py = Math.max(0.02, posAttr.getY(i) + particleVel[i * 3 + 1] * dt),
            pz = posAttr.getZ(i) + particleVel[i * 3 + 2] * dt;
          particleVel[i * 3 + 1] -= 13.5 * dt;
          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
      }
      if (impactTimerRef.current <= 0 && acidPointsRef.current) {
        acidPointsRef.current.visible = false;
      }
    }

    const pGrp = puddleGroupRef.current;
    if (pGrp) {
      for (let i = 0; i < PUDDLE_POOL_SIZE; i++) {
        const p = puddleState[i];
        if (!p.active) continue;
        const m = pGrp.children[i] as THREE.Mesh;
        if ((p.timer -= dt) <= 0) {
          p.active = false;
          m.visible = false;
          continue;
        }
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, p.targetScale, dt * 2.2));
        (m.material as THREE.MeshBasicMaterial).opacity = Math.min(0.88, p.timer * 0.4);
      }
    }

    const grp = gibGroupRef.current;
    if (grp) {
      for (let i = 0; i < GIB_POOL_SIZE; i++) {
        const g = gibState[i];
        if (!g.active) continue;
        const m = grp.children[i] as THREE.Mesh;
        if (!g.settled) {
          const [nx, nz] = constrainToCorridor(m.position.x + g.vx * dt, m.position.z + g.vz * dt, 0.22);
          m.position.set(nx, m.position.y + g.vy * dt, nz);
          g.vy -= 11.5 * dt;
          m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, 0, dt * 4);
          m.rotation.y += g.ry * dt;
          m.rotation.z = THREE.MathUtils.lerp(m.rotation.z, 0, dt * 4);
          if (m.position.y <= 0.05) {
            m.position.y = 0.05;
            if (Math.abs(g.vy) < 1.35) {
              g.settled = true;
              m.rotation.x = 0;
              m.rotation.z = 0;
            } else {
              g.vy = Math.abs(g.vy) * 0.25;
              g.vx *= 0.48;
              g.vz *= 0.48;
              g.ry *= 0.45;
            }
          }
        }
        if (g.melting) {
          g.meltTimer -= dt;
          const prog = 1.0 - Math.max(0, g.meltTimer / g.meltDuration);
          if (prog > 0.3) {
            const k = (prog - 0.3) / 0.7;
            m.position.y = 0.05 - k * 0.14;
            m.scale.set(1 + k * 0.35, Math.max(0.02, 1 - k * 0.95), 1 + k * 0.35);
          }
          if (g.meltTimer <= 0) {
            g.active = false;
            m.visible = false;
          }
        }
      }
    }
  });

  return (
    <group>
      <points ref={acidPointsRef} geometry={acidGeo} visible={false}>
        <pointsMaterial
          map={dropletTex}
          color="#b8ff22"
          size={0.052}
          transparent
          opacity={0.95}
          alphaTest={0.08}
          depthWrite={false}
        />
      </points>
      <group ref={puddleGroupRef}>
        {Array.from({ length: PUDDLE_POOL_SIZE }, (_, i) => (
          <mesh key={i} visible={false}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial map={puddleTex} transparent opacity={0.88} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <group ref={gibGroupRef}>
        {Array.from({ length: GIB_POOL_SIZE }, (_, i) => (
          <mesh key={i} geometry={limbGeos[0]} material={limbMat} visible={false} />
        ))}
      </group>
    </group>
  );
});
