import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { trimSectorWalls } from './level/trimSectorWalls';
import { buildEndCaps } from './level/endCaps';
import { registerEnvironmentRaycast } from './level/envRaycast';
import { CorridorAtmosphereFX } from './CorridorAtmosphereFX';
import { MistFX } from './MistFX';
import { AlienEggs } from './AlienEggs';

export function CorridorLevel() {
  const { scene } = useGLTF('/models/corridor.glb');
  const phase = useGameStore((s) => s.phase);
  const status = useGameStore((s) => s.status);

  const beacon1Ref = useRef<THREE.Group>(null);
  const beacon2Ref = useRef<THREE.Group>(null);
  const beacon3Ref = useRef<THREE.Group>(null);
  const beacon4Ref = useRef<THREE.Group>(null);
  const sectorMeshGroupRef = useRef<THREE.Group>(null);

  const { c1, c2, c3, c4 } = useMemo(() => {
    const s1 = scene.clone(true),
      s2 = scene.clone(true),
      s3 = scene.clone(true),
      s4 = scene.clone(true);
    [s1, s2, s3, s4].forEach((s) => s.scale.setScalar(3.5));
    trimSectorWalls(s1, false, 0, true, false);
    trimSectorWalls(s2, true, 0, true, false);
    trimSectorWalls(s3, false, 13.8, false, true);
    trimSectorWalls(s4, true, 13.8, false, true);
    return { c1: s1, c2: s2, c3: s3, c4: s4 };
  }, [scene]);

  useEffect(() => {
    [c1, c2, c3, c4].forEach((root) => {
      root.traverse((child) => {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            const std = mat as THREE.MeshStandardMaterial;
            if (std && std.isMeshStandardMaterial) {
              std.roughness = 0.52;
              std.metalness = 0.22;
              std.aoMapIntensity = 0.32;
              if (std.normalScale) std.normalScale.set(1.2, 1.2);
              std.needsUpdate = true;
            }
          });
        }
      });
    });

    // The two outer corners the model never closed get mirrored end walls (before the raycast meshes are collected)
    const group = sectorMeshGroupRef.current;
    const caps = group ? buildEndCaps(group) : [];
    caps.forEach((cap) => group?.add(cap));
    const meshes: THREE.Mesh[] = [];
    group?.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);
    });
    const unregister = registerEnvironmentRaycast(meshes);
    return () => {
      unregister();
      caps.forEach((cap) => {
        group?.remove(cap);
        cap.geometry.dispose();
      });
    };
  }, [c1, c2, c3, c4]);

  useFrame(({ clock }) => {
    if (isSimulationFrozen(status)) return;
    const t = clock.getElapsedTime();
    const rotSpeed = phase === 1 ? 3.2 : phase === 2 ? 4.8 : 6.8;
    if (beacon1Ref.current) beacon1Ref.current.rotation.y = t * rotSpeed;
    if (beacon2Ref.current) beacon2Ref.current.rotation.y = -t * rotSpeed * 1.05;
    if (beacon3Ref.current) beacon3Ref.current.rotation.y = t * rotSpeed * 0.95;
    if (beacon4Ref.current) beacon4Ref.current.rotation.y = -t * rotSpeed * 1.1;
  });

  const ambientIntensity = phase === 1 ? 0.95 : phase === 2 ? 0.82 : 0.74;
  const hemiIntensity = phase === 1 ? 1.05 : phase === 2 ? 0.88 : 0.78;
  const beaconColor = phase === 1 ? '#ff7700' : '#ff1111';
  const beaconPower = phase === 1 ? 9.0 : 12.0;
  const stripPower = phase === 1 ? 7.5 : 6.0;

  return (
    <group name="SulacoSector">
      <fog attach="fog" args={['#0b2b34', 1.5, 15]} />
      <ambientLight intensity={ambientIntensity} color={phase === 1 ? '#7db6c6' : '#5e3232'} />
      <hemisphereLight args={['#62aab8', '#12262c', hemiIntensity]} />

      {/* Optimized Single Bulkhead Sector Key Light */}
      <pointLight
        position={[-6.9, 2.3, 22.1]}
        color="#a6c8e4"
        intensity={stripPower * 1.5}
        distance={34.0}
        decay={1.1}
      />

      {/* South & North Sector Loops */}
      <group ref={sectorMeshGroupRef}>
        <primitive object={c1} receiveShadow />
        <primitive object={c2} position={[-13.8, 0, 30.4]} rotation={[0, Math.PI, 0]} receiveShadow />
        <primitive object={c3} position={[0, 0, 13.8]} receiveShadow />
        <primitive object={c4} position={[-13.8, 0, 44.2]} rotation={[0, Math.PI, 0]} receiveShadow />
      </group>
      {/* Randomly positioned, subtly back-lit Ovomorph Eggs */}
      <AlienEggs />

      {/* Single Synchronized Emergency Alarm Beacon */}
      <group position={[-0.32, 2.15, 14.0]} ref={beacon1Ref}>
        <pointLight position={[0.32, 0, 0]} color={beaconColor} intensity={beaconPower} distance={9} decay={1.8} />
      </group>

      <CorridorAtmosphereFX />
      <MistFX />
    </group>
  );
}

useGLTF.preload('/models/corridor.glb');
