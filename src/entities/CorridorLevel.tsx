import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { CombatSystem } from '../core/CombatEvents';
import { CorridorAtmosphereFX } from './CorridorAtmosphereFX';
import { AlienEggs } from './AlienEggs';



// Trim interior join walls & end-caps so all 4 L-corridor sections form a seamless Double-Size Figure-8 Sector
function trimSectorWalls(root: THREE.Object3D, isRotatedCopy: boolean, zShift: number, openNorthEnd: boolean, openSouthEnd: boolean) {
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const loc0 = new THREE.Vector3(), loc1 = new THREE.Vector3(), loc2 = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry = mesh.geometry.clone();
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const index = mesh.geometry.index;
    if (!pos || !index) return;

    const toWorld = (idx: number, target: THREE.Vector3, locTarget: THREE.Vector3) => {
      locTarget.fromBufferAttribute(pos, idx).applyMatrix4(mesh.matrixWorld);
      if (isRotatedCopy) target.set(-13.8 - locTarget.x, locTarget.y, 30.4 + zShift - locTarget.z);
      else { target.copy(locTarget); target.z += zShift; }
    };

    const newIndices: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      toWorld(a, v0, loc0); toWorld(b, v1, loc1); toWorld(c, v2, loc2);
      const minY = Math.min(v0.y, v1.y, v2.y), maxY = Math.max(v0.y, v1.y, v2.y);
      const cx = (v0.x + v1.x + v2.x) / 3, cz = (v0.z + v1.z + v2.z) / 3;
      const locCx = (loc0.x + loc1.x + loc2.x) / 3, locCz = (loc0.z + loc1.z + loc2.z) / 3;
      const inWallBand = maxY > 0.18 && minY < 1.85;

      // 1. Remove interior end-caps and perpendicular turn-blocking wall panels at section joins
      const isEndCap = inWallBand && (locCx < -13.35 || locCz < 8.8);
      const isTurnBlocker = inWallBand && ((locCx < -12.6 && locCz < 21.05) || (locCx < -0.5 && locCz < 9.6));

      // 2. Open doorways between North and South sectors at the center junction (Z = 22.1)
      const inNorthJunction = openNorthEnd && inWallBand &&
        ((cx > -1.1 && cx < 0.0) || (cx > -13.7 && cx < -12.6)) && cz > 22.6 + zShift && cz < 24.1 + zShift;
      const inSouthJunction = openSouthEnd && inWallBand &&
        ((cx > -1.1 && cx < 0.0) || (cx > -13.7 && cx < -12.6)) && cz > 6.3 + zShift && cz < 7.7 + zShift;

      if (!isEndCap && !isTurnBlocker && !inNorthJunction && !inSouthJunction) newIndices.push(a, b, c);
    }
    mesh.geometry.setIndex(newIndices);
  });
}

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
    const s1 = scene.clone(true), s2 = scene.clone(true), s3 = scene.clone(true), s4 = scene.clone(true);
    [s1, s2, s3, s4].forEach((s) => s.scale.setScalar(3.5));
    trimSectorWalls(s1, false, 0, true, false); trimSectorWalls(s2, true, 0, true, false);
    trimSectorWalls(s3, false, 13.8, false, true); trimSectorWalls(s4, true, 13.8, false, true);
    return { c1: s1, c2: s2, c3: s3, c4: s4 };
  }, [scene]);



  useEffect(() => {
    [c1, c2, c3, c4].forEach((root) => {
      root.traverse((child) => {
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

    const raycaster = new THREE.Raycaster();
    const _normMatrix = new THREE.Matrix3();
    const corridorMeshes: THREE.Mesh[] = [];
    sectorMeshGroupRef.current?.traverse((c) => { if ((c as THREE.Mesh).isMesh) corridorMeshes.push(c as THREE.Mesh); });

    CombatSystem.registerEnvRaycaster((origin, dir) => {
      if (corridorMeshes.length === 0 && sectorMeshGroupRef.current) {
        sectorMeshGroupRef.current.traverse((c) => { if ((c as THREE.Mesh).isMesh) corridorMeshes.push(c as THREE.Mesh); });
      }
      if (corridorMeshes.length === 0) return null;
      raycaster.set(origin, dir);
      raycaster.far = 52.0;
      const hits = raycaster.intersectObjects(corridorMeshes, false);
      if (hits.length > 0) {
        const h = hits[0];
        const norm = h.face ? h.face.normal.clone() : new THREE.Vector3(0, 1, 0);
        _normMatrix.getNormalMatrix(h.object.matrixWorld);
        norm.applyNormalMatrix(_normMatrix).normalize();
        if (norm.dot(dir) > 0) norm.negate();
        return { point: h.point, normal: norm };
      }
      return null;
    });

    return () => { CombatSystem.unregisterEnvRaycaster(); };
  }, [c1, c2, c3, c4]);

  useFrame(({ clock }) => {
    if (status === 'PAUSED') return;
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

  const STRIP_LIGHTS: [number, number, number][] = [
    [-0.32, 2.2, 22.1], [-13.48, 2.2, 22.1], [-6.9, 2.2, 22.1]
  ];

  return (
    <group name="SulacoSector">
      <fog attach="fog" args={['#04070a', 22, 60]} />
      <ambientLight intensity={ambientIntensity} color={phase === 1 ? '#86a2be' : '#5e3232'} />
      <hemisphereLight args={['#6e94b8', '#1a2634', hemiIntensity]} />

      {/* Optimized Sulaco Bulkhead Strip Lights */}
      {STRIP_LIGHTS.map((pos, i) => (
        <pointLight key={i} position={pos} color="#a6c8e4" intensity={stripPower} distance={28.0} decay={1.1} />
      ))}

      {/* South & North Sector Loops */}
      <group ref={sectorMeshGroupRef}>
        <primitive object={c1} receiveShadow />
        <primitive object={c2} position={[-13.8, 0, 30.4]} rotation={[0, Math.PI, 0]} receiveShadow />
        <primitive object={c3} position={[0, 0, 13.8]} receiveShadow />
        <primitive object={c4} position={[-13.8, 0, 44.2]} rotation={[0, Math.PI, 0]} receiveShadow />
      </group>
      {/* Randomly positioned, subtly back-lit Ovomorph Eggs */}
      <AlienEggs />

      {/* Balanced 2-Quadrant Emergency Beacons */}
      <group position={[-0.32, 2.15, 14.0]} ref={beacon1Ref}>
        <pointLight position={[0.32, 0, 0]} color={beaconColor} intensity={beaconPower} distance={8} decay={1.8} />
      </group>
      <group position={[-13.48, 2.15, 30.0]} ref={beacon4Ref}>
        <pointLight position={[0.32, 0, 0]} color={beaconColor} intensity={beaconPower} distance={8} decay={1.8} />
      </group>

      <CorridorAtmosphereFX />
    </group>
  );
}

useGLTF.preload('/models/corridor.glb');
