import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CombatSystem } from '../core/CombatEvents';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { quality } from '../core/QualityState';
import { createBulletMarkTexture, createSparkTexture } from './fx/wallImpactTextures';
import { useDisposeOnUnmount } from './fx/useDisposeOnUnmount';

const MAX_DECAL_COUNT = 48;
const MAX_SPARK_COUNT = 160;
const _unitZ = new THREE.Vector3(0, 0, 1),
  _refl = new THREE.Vector3();

interface DecalState {
  active: boolean;
  age: number;
  maxAge: number;
}
interface SparkState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export function WallImpactFX() {
  const decalGroupRef = useRef<THREE.Group>(null);
  const sparkPointsRef = useRef<THREE.Points>(null);
  const nextDecalIdx = useRef(0);
  const nextSparkIdx = useRef(0);
  const hadSparksRef = useRef(false);

  const markTexture = useMemo(() => createBulletMarkTexture(), []);
  const sparkTexture = useMemo(() => createSparkTexture(), []);
  const decalGeo = useMemo(() => new THREE.PlaneGeometry(0.22, 0.22), []);
  useDisposeOnUnmount(decalGeo);

  const decalStates = useMemo<DecalState[]>(
    () => Array.from({ length: MAX_DECAL_COUNT }, () => ({ active: false, age: 0, maxAge: 25.0 })),
    []
  );

  const sparkStates = useMemo<SparkState[]>(
    () =>
      Array.from({ length: MAX_SPARK_COUNT }, () => ({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.35
      })),
    []
  );

  const sparkPositions = useMemo(() => new Float32Array(MAX_SPARK_COUNT * 3), []);
  const sparkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    return geo;
  }, [sparkPositions]);

  useEffect(() => {
    CombatSystem.registerWallImpactHandler((point, normal, dir) => {
      // 1. Spawn Decal mark on wall
      const dGroup = decalGroupRef.current;
      if (dGroup && quality.tier > 0) {
        const idx = nextDecalIdx.current++ % MAX_DECAL_COUNT;
        const mesh = dGroup.children[idx] as THREE.Mesh;
        if (mesh) {
          mesh.position.copy(point).addScaledVector(normal, 0.005);
          mesh.quaternion.setFromUnitVectors(_unitZ, normal);
          mesh.rotateZ(Math.random() * Math.PI * 2);
          mesh.scale.setScalar(0.18 + Math.random() * 0.07);
          mesh.visible = true;
          decalStates[idx].active = true;
          decalStates[idx].age = 0;
          decalStates[idx].maxAge = 22.0 + Math.random() * 6.0;
        }
      }

      // 2. Spawn kinetic sparks bursting along reflection vector
      const dot = dir.dot(normal);
      _refl
        .copy(dir)
        .addScaledVector(normal, -2 * dot)
        .normalize();

      const fullCount = 14 + Math.floor(Math.random() * 5),
        sparkCount = quality.tier >= 2 ? fullCount : fullCount >> 1;
      for (let i = 0; i < sparkCount; i++) {
        const sIdx = nextSparkIdx.current++ % MAX_SPARK_COUNT;
        const s = sparkStates[sIdx];
        s.active = true;
        s.x = point.x + normal.x * 0.02 + (Math.random() - 0.5) * 0.02;
        s.y = point.y + normal.y * 0.02 + (Math.random() - 0.5) * 0.02;
        s.z = point.z + normal.z * 0.02 + (Math.random() - 0.5) * 0.02;
        const speed = 7.0 + Math.random() * 10.0;
        const cone = 0.65;
        s.vx = (_refl.x * 0.7 + normal.x * 0.3 + (Math.random() - 0.5) * cone) * speed;
        s.vy = (_refl.y * 0.7 + normal.y * 0.3 + (Math.random() - 0.5) * cone) * speed + 0.6;
        s.vz = (_refl.z * 0.7 + normal.z * 0.3 + (Math.random() - 0.5) * cone) * speed;
        s.life = 0.22 + Math.random() * 0.18;
        s.maxLife = s.life;
      }
    });

    return () => {
      CombatSystem.unregisterWallImpactHandler();
    };
  }, [decalStates, sparkStates]);

  useFrame((_, dt) => {
    if (isSimulationFrozen(useGameStore.getState().status)) return;
    // Animate and fade bullet marks
    const dGroup = decalGroupRef.current;
    if (dGroup) {
      for (let i = 0; i < MAX_DECAL_COUNT; i++) {
        const st = decalStates[i];
        if (!st.active) continue;
        st.age += dt;
        const mesh = dGroup.children[i] as THREE.Mesh;
        if (st.age >= st.maxAge) {
          st.active = false;
          mesh.visible = false;
        } else {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          const remaining = st.maxAge - st.age;
          mat.opacity = remaining < 3.0 ? remaining / 3.0 : 0.94;
        }
      }
    }

    // Animate kinetic sparks with gravity and friction
    let hasLiveSparks = false;
    for (let i = 0; i < MAX_SPARK_COUNT; i++) {
      const s = sparkStates[i];
      if (!s.active) {
        sparkPositions[i * 3 + 1] = -100; // hide under level
        continue;
      }
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        sparkPositions[i * 3 + 1] = -100;
        continue;
      }
      hasLiveSparks = true;
      s.vy -= 15.0 * dt; // gravity
      s.vx *= 1.0 - 4.0 * dt; // air drag
      s.vz *= 1.0 - 4.0 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      // Bounce off floor
      if (s.y <= 0.015) {
        s.y = 0.015;
        s.vy = Math.abs(s.vy) * 0.38;
        s.vx *= 0.65;
        s.vz *= 0.65;
      }
      sparkPositions[i * 3] = s.x;
      sparkPositions[i * 3 + 1] = s.y;
      sparkPositions[i * 3 + 2] = s.z;
    }

    if (sparkPointsRef.current && (hasLiveSparks || hadSparksRef.current)) {
      sparkPointsRef.current.geometry.attributes.position.needsUpdate = true;
      sparkPointsRef.current.visible = hasLiveSparks;
    }
    hadSparksRef.current = hasLiveSparks;
  });

  return (
    <group>
      <group ref={decalGroupRef}>
        {Array.from({ length: MAX_DECAL_COUNT }, (_, i) => (
          <mesh key={i} geometry={decalGeo} visible={false}>
            <meshBasicMaterial
              map={markTexture}
              transparent
              opacity={0.94}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        ))}
      </group>

      <points ref={sparkPointsRef} geometry={sparkGeo} visible={false}>
        <pointsMaterial
          map={sparkTexture}
          color="#ffcc66"
          size={0.062}
          transparent
          opacity={0.96}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
