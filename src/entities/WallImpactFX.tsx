import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CombatSystem } from '../core/CombatEvents';

const MAX_DECAL_COUNT = 48;
const MAX_SPARK_COUNT = 160;
const _unitZ = new THREE.Vector3(0, 0, 1), _refl = new THREE.Vector3(), _normMat = new THREE.Matrix3();

interface DecalState { active: boolean; age: number; maxAge: number; }
interface SparkState {
  active: boolean; x: number; y: number; z: number;
  vx: number; vy: number; vz: number; life: number; maxLife: number;
}

function createBulletMarkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!, cx = 64, cy = 64;
  const outerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 60);
  outerGrad.addColorStop(0.0, 'rgba(10, 8, 8, 0.95)'); outerGrad.addColorStop(0.25, 'rgba(28, 18, 14, 0.85)');
  outerGrad.addColorStop(0.55, 'rgba(45, 30, 22, 0.55)'); outerGrad.addColorStop(0.8, 'rgba(20, 18, 16, 0.2)');
  outerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = outerGrad; ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(15, 12, 10, 0.65)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + (Math.random() - 0.5) * 0.4, len = 22 + Math.random() * 26;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
  }

  const rimGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 20);
  rimGrad.addColorStop(0.0, 'rgba(8, 6, 6, 1.0)'); rimGrad.addColorStop(0.55, 'rgba(255, 110, 25, 0.75)');
  rimGrad.addColorStop(0.85, 'rgba(120, 35, 10, 0.65)'); rimGrad.addColorStop(1.0, 'rgba(40, 15, 10, 0.0)');
  ctx.fillStyle = rimGrad; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#050404'; ctx.beginPath(); ctx.arc(cx, cy, 8.5, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false; tex.needsUpdate = true; return tex;
}

function createSparkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!, cx = 32, cy = 32;
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 28);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)'); g.addColorStop(0.25, 'rgba(255, 220, 100, 0.95)');
  g.addColorStop(0.65, 'rgba(255, 110, 15, 0.65)'); g.addColorStop(1.0, 'rgba(255, 40, 0, 0.0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false; tex.needsUpdate = true; return tex;
}

export function WallImpactFX() {
  const decalGroupRef = useRef<THREE.Group>(null);
  const sparkPointsRef = useRef<THREE.Points>(null);
  const impactLightRef = useRef<THREE.PointLight>(null);
  const flashTimerRef = useRef(0);
  const nextDecalIdx = useRef(0);
  const nextSparkIdx = useRef(0);
  const hadSparksRef = useRef(false);

  const markTexture = useMemo(() => createBulletMarkTexture(), []);
  const sparkTexture = useMemo(() => createSparkTexture(), []);
  const decalGeo = useMemo(() => new THREE.PlaneGeometry(0.22, 0.22), []);

  const decalStates = useMemo<DecalState[]>(() =>
    Array.from({ length: MAX_DECAL_COUNT }, () => ({ active: false, age: 0, maxAge: 25.0 })), []
  );

  const sparkStates = useMemo<SparkState[]>(() =>
    Array.from({ length: MAX_SPARK_COUNT }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.35 })), []
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
      if (dGroup) {
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
      _refl.copy(dir).addScaledVector(normal, -2 * dot).normalize();

      const sparkCount = 14 + Math.floor(Math.random() * 5);
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

      // 3. Incandescent wall flash
      if (impactLightRef.current) {
        impactLightRef.current.position.copy(point).addScaledVector(normal, 0.12);
        impactLightRef.current.intensity = 14.0;
        flashTimerRef.current = 0.055;
      }
    });

    return () => { CombatSystem.unregisterWallImpactHandler(); };
  }, [decalStates, sparkStates]);

  useFrame((_, dt) => {
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

    // Animate impact point light flash
    if (impactLightRef.current && flashTimerRef.current > 0) {
      flashTimerRef.current -= dt;
      impactLightRef.current.intensity = Math.max(0, impactLightRef.current.intensity - dt * 240);
      if (flashTimerRef.current <= 0) impactLightRef.current.intensity = 0;
    }
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

      <pointLight ref={impactLightRef} color="#ff9922" intensity={0} distance={5.5} decay={1.8} />
    </group>
  );
}
