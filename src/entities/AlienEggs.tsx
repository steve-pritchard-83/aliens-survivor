import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { quality } from '../core/QualityState';
import { getActiveLevel } from '../levels';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function AlienEggs() {
  const gltf = useGLTF('/models/egg.glb');

  const eggs = useMemo(() => {
    const picked = [...getActiveLevel().scene.eggSpots].sort(() => Math.random() - 0.5).slice(0, 3);
    return picked.map(([x, z, yaw], idx) => {
      const obj = gltf.scene.clone(true);
      obj.traverse((ch) => {
        if (!(ch as THREE.Mesh).isMesh) return;
        const m = ch as THREE.Mesh,
          mat = (m.material as THREE.MeshStandardMaterial).clone();
        // Authentic dark, wet, glistening Giger Ovomorph chitin; lit by the corridor lights only
        mat.color.multiplyScalar(0.4);
        mat.roughness = 0.22;
        mat.metalness = 0.08;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        m.material = mat;
      });
      obj.scale.setScalar(0.2 + (idx % 2) * 0.03);
      obj.position.set(x, 0.0, z);
      obj.rotation.set(0, yaw, 0);
      return obj;
    });
  }, [gltf.scene]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = groupRef.current;
    if (g) g.visible = quality.tier > 0;
  });

  return (
    <group ref={groupRef} name="AlienEggs">
      {eggs.map((eggObj, i) => (
        <primitive key={i} object={eggObj} />
      ))}
    </group>
  );
}
useGLTF.preload('/models/egg.glb');
