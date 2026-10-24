import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager';
import { useGameStore } from '../core/GameStore';

// 12 Wall & Ceiling Electrical Junction Boxes across the Double-Size Figure-8 Sulaco Sector (Z = 8.30..35.90)
const SPARK_EMITTERS: [number, number, number, number, number][] = [
  [-1.25, 1.85, 15.2, 1.0, 0.0],    // South-East Spine bulkhead panel
  [-0.35, 2.15, 22.1, -0.8, -0.5],  // Central East T-junction ceiling conduit
  [-1.25, 1.85, 29.0, 1.0, 0.0],    // North-East Spine bulkhead panel
  [-0.80, 2.30, 35.6, 0.0, -1.0],   // Far North-East Corner overhead junction
  [-6.80, 1.95, 35.10, 0.0, 1.0],   // Far North Wing inner wall conduit
  [-13.20, 2.30, 35.6, 0.0, -1.0],  // Far North-West Corner overhead pipe
  [-12.70, 1.85, 29.0, -1.0, 0.0],  // North-West Spine inner bulkhead panel
  [-6.80, 1.95, 21.30, 0.0, 1.0],   // Central Crossway inner wall conduit
  [-13.20, 2.30, 21.8, 0.0, -1.0],  // Central West T-junction overhead pipe
  [-12.70, 1.85, 15.2, -1.0, 0.0],  // South-West Spine inner bulkhead panel
  [-13.20, 2.30, 8.40, 0.0, 1.0],   // South-West Corner overhead junction
  [-6.80, 1.95, 8.90, 0.0, -1.0]    // South Wing inner wall conduit
];

const SPARKS_PER_BURST = 42;

export function CorridorAtmosphereFX() {
  const sparkPointsRef = useRef<THREE.Points>(null);
  const sparkLightRef = useRef<THREE.PointLight>(null);
  const strobeLight1Ref = useRef<THREE.PointLight>(null);
  const strobeLight2Ref = useRef<THREE.PointLight>(null);

  const burstTimerRef = useRef(0);
  const nextBurstDelayRef = useRef(1.2);

  const sparkVel = useMemo(() => new Float32Array(SPARKS_PER_BURST * 3), []);
  const sparkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS_PER_BURST * 3), 3));
    return geo;
  }, []);

  useFrame(({ clock }, dt) => {
    const state = useGameStore.getState();
    if (state.status === 'PAUSED') return;

    const t = clock.getElapsedTime();
    const phase = state.phase;

    // High-Contrast Emergency Strobe Tubes (Sharp industrial double-flash pattern)
    const strobeCycle1 = (t * (phase === 1 ? 1.8 : 3.2)) % 1.0;
    const isFlash1 = (strobeCycle1 > 0.0 && strobeCycle1 < 0.06) || (strobeCycle1 > 0.12 && strobeCycle1 < 0.17);
    if (strobeLight1Ref.current) {
      strobeLight1Ref.current.intensity = isFlash1 ? (phase >= 2 ? 32 : 20) : 0.4;
    }

    const strobeCycle2 = ((t + 0.47) * (phase === 1 ? 2.1 : 3.6)) % 1.0;
    const isFlash2 = (strobeCycle2 > 0.0 && strobeCycle2 < 0.055) || (strobeCycle2 > 0.11 && strobeCycle2 < 0.16);
    if (strobeLight2Ref.current) {
      strobeLight2Ref.current.intensity = isFlash2 ? (phase >= 2 ? 32 : 20) : 0.4;
    }

    // Wall & Ceiling Electrical Spark Showers
    if (burstTimerRef.current <= 0) {
      nextBurstDelayRef.current -= dt;
      if (nextBurstDelayRef.current <= 0) {
        const idx = Math.floor(Math.random() * SPARK_EMITTERS.length);
        const [ex, ey, ez, nx, nz] = SPARK_EMITTERS[idx];

        if (sparkPointsRef.current) {
          const posAttr = sparkPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < SPARKS_PER_BURST; i++) {
            posAttr.setXYZ(
              i,
              ex + (Math.random() - 0.5) * 0.08,
              ey + (Math.random() - 0.5) * 0.08,
              ez + (Math.random() - 0.5) * 0.08
            );
            sparkVel[i * 3] = nx * (1.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 2.8;
            sparkVel[i * 3 + 1] = (Math.random() - 0.3) * 2.4;
            sparkVel[i * 3 + 2] = nz * (1.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 2.8;
          }
          posAttr.needsUpdate = true;
          sparkPointsRef.current.visible = true;
        }

        if (sparkLightRef.current) {
          sparkLightRef.current.position.set(ex + nx * 0.15, ey, ez + nz * 0.15);
          sparkLightRef.current.intensity = 24;
        }

        if (state.status === 'PLAYING') {
          AudioManager.play3D('spark', ex, ey, ez, 0.75, 0.92 + Math.random() * 0.18);
        }

        burstTimerRef.current = 0.55;
        nextBurstDelayRef.current = phase === 1 ? 1.5 + Math.random() * 1.8 : 0.6 + Math.random() * 1.2;
      }
    } else {
      burstTimerRef.current -= dt;
      if (sparkPointsRef.current) {
        const posAttr = sparkPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < SPARKS_PER_BURST; i++) {
          let px = posAttr.getX(i) + sparkVel[i * 3] * dt;
          let py = posAttr.getY(i) + sparkVel[i * 3 + 1] * dt;
          let pz = posAttr.getZ(i) + sparkVel[i * 3 + 2] * dt;
          sparkVel[i * 3 + 1] -= 11.5 * dt;

          if (py <= 0.02) {
            py = 0.02;
            sparkVel[i * 3 + 1] = Math.abs(sparkVel[i * 3 + 1]) * 0.45;
            sparkVel[i * 3] *= 0.75;
            sparkVel[i * 3 + 2] *= 0.75;
          }
          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
      }

      if (sparkLightRef.current) {
        sparkLightRef.current.intensity = (Math.random() > 0.25 ? 22 : 4) * (burstTimerRef.current / 0.55);
      }

      if (burstTimerRef.current <= 0) {
        if (sparkPointsRef.current) sparkPointsRef.current.visible = false;
        if (sparkLightRef.current) sparkLightRef.current.intensity = 0;
      }
    }
  });

  return (
    <group name="CorridorAtmosphereFX">
      <pointLight ref={strobeLight1Ref} position={[-6.8, 2.25, 22.1]} color="#d8f0ff" intensity={0} distance={18} decay={1.4} />

      <points ref={sparkPointsRef} geometry={sparkGeo} visible={false}>
        <pointsMaterial
          color="#ffdd66"
          size={0.045}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
