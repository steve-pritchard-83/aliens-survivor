import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { quality } from '../core/QualityState';
import { getActiveLevel } from '../levels';

const SPARKS_PER_BURST = 42;

export function CorridorAtmosphereFX() {
  const emitters = getActiveLevel().scene.sparkEmitters;
  const sparkPointsRef = useRef<THREE.Points>(null);
  const burstTimerRef = useRef(0);
  const nextBurstDelayRef = useRef(1.2);

  const sparkVel = useMemo(() => new Float32Array(SPARKS_PER_BURST * 3), []);
  const sparkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS_PER_BURST * 3), 3));
    return geo;
  }, []);

  useFrame((_, dt) => {
    const state = useGameStore.getState();
    if (isSimulationFrozen(state.status)) return;

    const phase = state.phase;

    // Wall & Ceiling Electrical Spark Showers
    if (burstTimerRef.current <= 0) {
      nextBurstDelayRef.current -= dt;
      if (nextBurstDelayRef.current <= 0 && quality.tier > 0) {
        const idx = Math.floor(Math.random() * emitters.length);
        const [ex, ey, ez, nx, nz] = emitters[idx];

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
          const px = posAttr.getX(i) + sparkVel[i * 3] * dt;
          let py = posAttr.getY(i) + sparkVel[i * 3 + 1] * dt;
          const pz = posAttr.getZ(i) + sparkVel[i * 3 + 2] * dt;
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

      if (burstTimerRef.current <= 0 && sparkPointsRef.current) {
        sparkPointsRef.current.visible = false;
      }
    }
  });

  return (
    <group name="CorridorAtmosphereFX">
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
