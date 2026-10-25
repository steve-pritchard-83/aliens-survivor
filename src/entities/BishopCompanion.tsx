import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';
import { CombatSystem } from '../core/CombatEvents';
import {
  constrainToCorridor, getHallId, CORNERS, HALL_CORNERS, ADJ_CORNERS
} from '../core/CorridorNav';
import { buildBishopRig, poseBishop } from './BishopRig';

const _rayOrigin = new THREE.Vector3(), _rayDir = new THREE.Vector3();

export function BishopCompanion() {
  const bishopGltf = useGLTF('/models/bishop.glb');
  const rifleGltf = useGLTF('/models/pulse_rifle.glb');

  const rootRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const tracerRef = useRef<THREE.Mesh>(null);
  const muzzleMarkerRef = useRef<THREE.Object3D>(null);

  const stateRef = useRef({
    x: -0.32, z: 11.4, yaw: Math.PI, targetCorner: -1,
    fireCooldown: 0.35, muzzleTimer: 0, walkPhase: 0, move: 0, prevStatus: 'MENU'
  });

  // Skinned, posable Bishop (procedural skeleton) holding a recentred M41A: native rifle spans z -29..57, so shift by its centre
  const { rig } = useMemo(() => {
    const rg = buildBishopRig(bishopGltf.scene);
    const r = rifleGltf.scene.clone(true);
    r.position.set(7.65, 4.95, -13.95);
    const holder = new THREE.Group();
    holder.scale.setScalar(0.0065); holder.add(r);
    rg.rifleMount.add(holder);
    return { rig: rg };
  }, [bishopGltf.scene, rifleGltf.scene]);

  useFrame(({ clock }, dt) => {
    const store = useGameStore.getState();
    const st = stateRef.current;
    const root = rootRef.current;
    if (!root || store.status === 'PAUSED') return;

    if (store.status === 'PLAYING' && st.prevStatus !== 'PLAYING') {
      st.x = -0.32; st.z = 11.4; st.yaw = Math.PI; st.targetCorner = -1;
      root.position.set(st.x, 0, st.z);
    }
    st.prevStatus = store.status;

    if (store.status === 'MENU') { root.visible = false; return; }
    root.visible = true;

    const [px, , pz] = store.playerPos;
    const pyaw = store.playerYaw;
    const now = clock.getElapsedTime();

    // Target formation position: 2.1m behind and slightly to the side of Ripley so Bishop stays in squad cover
    const fx = -Math.sin(pyaw), fz = -Math.cos(pyaw), rx = Math.cos(pyaw), rz = -Math.sin(pyaw);
    const [goalX, goalZ] = constrainToCorridor(px - fx * 2.1 + rx * 0.28, pz - fz * 2.1 + rz * 0.28, 0.22);

    const bH = getHallId(st.x, st.z), pH = getHallId(goalX, goalZ);
    const distToPlayer = Math.hypot(px - st.x, pz - st.z);

    // If Bishop gets separated too far (> 18m), snap him around the nearest behind-corner to stay with the squad
    if (distToPlayer > 18.0) {
      st.x = goalX; st.z = goalZ; st.targetCorner = -1;
    }

    let tx = goalX, tz = goalZ;
    if (bH === pH) {
      st.targetCorner = -1;
    } else {
      if (st.targetCorner < 0) {
        st.targetCorner = HALL_CORNERS[bH].reduce((best, c) => (Math.hypot(CORNERS[c][0] - st.x, CORNERS[c][1] - st.z) + Math.hypot(goalX - CORNERS[c][0], goalZ - CORNERS[c][1]) < Math.hypot(CORNERS[best][0] - st.x, CORNERS[best][1] - st.z) + Math.hypot(goalX - CORNERS[best][0], goalZ - CORNERS[best][1]) ? c : best), HALL_CORNERS[bH][0]);
      }
      if (Math.hypot(CORNERS[st.targetCorner][0] - st.x, CORNERS[st.targetCorner][1] - st.z) < 0.48) {
        st.targetCorner = HALL_CORNERS[pH].includes(st.targetCorner) ? -1 : ADJ_CORNERS[st.targetCorner].reduce((best, c) => (Math.hypot(goalX - CORNERS[c][0], goalZ - CORNERS[c][1]) < Math.hypot(goalX - CORNERS[best][0], goalZ - CORNERS[best][1]) ? c : best), ADJ_CORNERS[st.targetCorner][0]);
      }
      if (st.targetCorner >= 0) [tx, tz] = CORNERS[st.targetCorner];
    }

    const prevX = st.x, prevZ = st.z;
    const dx = tx - st.x, dz = tz - st.z, distToGoal = Math.hypot(dx, dz);

    // Avoid walking through the player: only advance if not encroaching on player's personal radius (1.8m)
    const movingCloserToPlayer = (dx * (px - st.x) + dz * (pz - st.z)) > 0;
    if (distToGoal > 0.45 && store.status === 'PLAYING' && (!movingCloserToPlayer || distToPlayer > 1.85)) {
      const moveSpeed = distToPlayer > 5.0 ? 5.2 : 4.15;
      [st.x, st.z] = constrainToCorridor(st.x + (dx / distToGoal) * moveSpeed * dt, st.z + (dz / distToGoal) * moveSpeed * dt, 0.22);
    }

    // If player backs into Bishop or gets too close (< 1.55m), smoothly step back away from player
    const sepDist = Math.hypot(st.x - px, st.z - pz);
    if (sepDist < 1.55 && store.status === 'PLAYING') {
      const awayX = sepDist > 0.05 ? (st.x - px) / sepDist : -fx;
      const awayZ = sepDist > 0.05 ? (st.z - pz) / sepDist : -fz;
      [st.x, st.z] = constrainToCorridor(st.x + awayX * 2.8 * dt, st.z + awayZ * 2.8 * dt, 0.22);
    }
    // Hard collision boundary: never let Bishop overlap player within 1.15m
    const hardDist = Math.hypot(st.x - px, st.z - pz);
    if (hardDist < 1.15) {
      const pushX = hardDist > 0.05 ? (st.x - px) / hardDist : -fx;
      const pushZ = hardDist > 0.05 ? (st.z - pz) / hardDist : -fz;
      [st.x, st.z] = constrainToCorridor(px + pushX * 1.15, pz + pushZ * 1.15, 0.22);
    }

    // Ground-truth displacement prevents foot sliding: stride phase is locked directly to distance traveled
    const frameDisplacement = Math.hypot(st.x - prevX, st.z - prevZ);
    const isMoving = frameDisplacement > 0.001;

    // Acquire nearest visible hostile (Xenomorph, Facehugger, or Chestburster) in the same hallway or within line-of-sight
    const allThreats = store.smallThreat ? [...store.activeThreats, store.smallThreat] : store.activeThreats;
    let bestTarget: { id: number; x: number; z: number; dist: number } | null = null;
    const curHall = getHallId(st.x, st.z);

    for (const t of allThreats) {
      if (t.state === 'DEAD') continue;
      const d = Math.hypot(t.x - st.x, t.z - st.z);
      if (d > 22.0) continue;
      const tHall = getHallId(t.x, t.z);
      const hasLOS = tHall === curHall || d < 5.2 ||
        (Math.abs(t.x - st.x) < 1.05 && (Math.abs(st.x - -0.32) < 1.1 || Math.abs(st.x - -13.48) < 1.1)) ||
        (Math.abs(t.z - st.z) < 1.05 && (Math.abs(st.z - 35.90) < 1.1 || Math.abs(st.z - 22.10) < 1.1 || Math.abs(st.z - 8.30) < 1.1));
      if (hasLOS && (!bestTarget || d < bestTarget.dist)) {
        bestTarget = { id: t.id, x: t.x, z: t.z, dist: d };
      }
    }

    // Rotate Bishop toward his target if engaging, otherwise toward movement direction or player's look direction
    const desiredYaw = bestTarget
      ? Math.atan2(bestTarget.x - st.x, bestTarget.z - st.z)
      : isMoving
      ? Math.atan2(dx, dz)
      : pyaw + Math.PI;
    let yawDiff = desiredYaw - st.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    st.yaw += yawDiff * Math.min(1, dt * 5.5);

    // Bishop's autonomous M41A Pulse Rifle suppressive fire (Unlimited Health, Tactical Burst Fire)
    st.fireCooldown = Math.max(0, st.fireCooldown - dt);
    st.muzzleTimer = Math.max(0, st.muzzleTimer - dt);

    if (store.status === 'PLAYING' && bestTarget && st.fireCooldown <= 0 && Math.abs(yawDiff) < 0.45) {
      st.fireCooldown = 0.24 + Math.random() * 0.12;
      st.muzzleTimer = 0.055;
      const targetHeight = bestTarget.id === 99 ? 0.25 : 0.72;
      if (muzzleMarkerRef.current) muzzleMarkerRef.current.getWorldPosition(_rayOrigin); else _rayOrigin.set(st.x, 0.92, st.z);
      _rayDir.set(bestTarget.x - _rayOrigin.x, targetHeight - _rayOrigin.y, bestTarget.z - _rayOrigin.z).normalize();
      const hit = CombatSystem.fireRay(_rayOrigin, _rayDir);
      const envHit = CombatSystem.fireEnvironmentRay(_rayOrigin, _rayDir);
      if (envHit && (!hit.hitPoint || _rayOrigin.distanceTo(envHit.point) < _rayOrigin.distanceTo(hit.hitPoint))) {
        CombatSystem.triggerWallImpact(envHit.point, envHit.normal, _rayDir);
      }
      AudioManager.play3D('pulse_shot', st.x, 0.95, st.z, 0.36, 1.04 + Math.random() * 0.04);
    }

    // Stride length = 0.65m; 1 full leg swing cycle (2*PI) per stride distance traveled
    st.move = THREE.MathUtils.lerp(st.move, isMoving ? 1 : 0, Math.min(1, dt * (isMoving ? 8.5 : 12.0)));
    if (isMoving) {
      st.walkPhase += (frameDisplacement / 0.65) * (Math.PI * 2);
    } else if (st.move < 0.04) {
      st.move = 0;
      st.walkPhase = 0;
    }
    poseBishop(rig, { phase: st.walkPhase, move: st.move, time: now, kick: (st.muzzleTimer / 0.055) * 0.035 });

    const flashOn = st.muzzleTimer > 0;
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible = flashOn;
      muzzleFlashRef.current.rotation.z = now * 35;
    }
    if (tracerRef.current) tracerRef.current.visible = st.muzzleTimer > 0.02;

    root.position.set(st.x, 0, st.z);
    root.rotation.set(0, st.yaw, 0);
  });

  // Bishop's rig is authored at 1.75m; scaled to 0.8 so he matches Ripley and the corridor proportions
  return (
    <group ref={rootRef} name="BishopCompanion">
      <group scale={0.8}>
        <primitive object={rig.group} />
        {/* Muzzle flash, tracer, flash light and fire-origin marker ride on the rifle mount */}
        <primitive object={rig.rifleMount}>
          <object3D ref={muzzleMarkerRef} position={[0, 0.03, 0.31]} />
          <mesh ref={muzzleFlashRef} position={[0, 0.03, 0.36]} visible={false}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshBasicMaterial color="#ffbb44" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh ref={tracerRef} position={[0, 0.03, 3.1]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
            <cylinderGeometry args={[0.004, 0.001, 5.6, 8]} />
            <meshBasicMaterial color="#ffdd77" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </primitive>
      </group>
    </group>
  );
}
useGLTF.preload('/models/bishop.glb');
