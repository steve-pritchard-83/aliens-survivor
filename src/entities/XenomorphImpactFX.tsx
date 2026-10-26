import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { constrainToCorridorInto } from '../core/CorridorNav';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { quality } from '../core/QualityState';
import { createAcidTextures, buildActualLimbTemplates } from './fx/acidFxAssets';
import { createGibPool, createPuddlePool } from './fx/acidFxState';

const _gibXZ = { x: 0, z: 0 };
const PARTICLE_COUNT = 64,
  GIB_POOL_SIZE = 12,
  PUDDLE_POOL_SIZE = 16;
export interface ImpactFXHandle {
  triggerImpact: (point: THREE.Vector3, origin: THREE.Vector3, dir: THREE.Vector3, isKill: boolean) => void;
  triggerAcidPool: (x: number, z: number, size?: number) => void;
  triggerLimbGib: (xenoId: number, slot: number, point: THREE.Vector3, dir: THREE.Vector3, yaw: number) => void;
  startXenoMelt: (xenoId: number, duration: number) => void;
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
  const gibState = useMemo(() => createGibPool(GIB_POOL_SIZE), []);
  const puddleState = useMemo(() => createPuddlePool(PUDDLE_POOL_SIZE), []);
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
    constrainToCorridorInto(x, z, 0.22, _gibXZ);
    m.position.set(_gibXZ.x, 0.015 + (idx % 5) * 0.001, _gibXZ.z);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    m.scale.setScalar(0.12);
    m.visible = true;
    const pud = puddleState[idx];
    pud.active = true;
    pud.timer = 14.0;
    pud.maxTimer = 14.0;
    pud.targetScale = size;
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
      const gib = gibState[idx];
      gib.active = true;
      gib.xenoId = xenoId;
      gib.settled = false;
      gib.melting = false;
      gib.meltTimer = 0;
      gib.meltDuration = 2.2;
      gib.vx = -dir.x * 0.65 + (Math.random() - 0.5) * 1.4;
      gib.vy = 1.15 + Math.random() * 0.85;
      gib.vz = -dir.z * 0.65 + (Math.random() - 0.5) * 1.4;
      gib.rx = (Math.random() - 0.5) * 7;
      gib.ry = (Math.random() - 0.5) * 8;
      gib.rz = (Math.random() - 0.5) * 7;
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
          constrainToCorridorInto(m.position.x + g.vx * dt, m.position.z + g.vz * dt, 0.22, _gibXZ);
          m.position.set(_gibXZ.x, m.position.y + g.vy * dt, _gibXZ.z);
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
