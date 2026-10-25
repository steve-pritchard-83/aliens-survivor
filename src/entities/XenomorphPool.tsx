import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useGameStore, ActiveThreat, isSimulationFrozen } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';
import { CombatSystem, TargetProvider } from '../core/CombatEvents';
import {
  CORRIDOR_SPAWN_NODES,
  constrainToCorridor,
  getHallId,
  isSpawnVisibleToPlayer,
  CORNERS,
  HALL_CORNERS,
  ADJ_CORNERS
} from '../core/CorridorNav';
import { XenomorphImpactFX, ImpactFXHandle } from './XenomorphImpactFX';
import {
  POOL_SIZE,
  CLIP_IDLE,
  CLIP_RUN,
  CLIP_WALK,
  CLIP_DIE,
  CLIP_LEAP,
  ATK_CLIPS,
  LIMB_NAMES,
  PooledXenomorph,
  sanitizeClips,
  playClip
} from './XenoTypes';

const _sphere = new THREE.Sphere(),
  _ray = new THREE.Ray(),
  _hitVec = new THREE.Vector3(),
  _jointPos = new THREE.Vector3(),
  _closestHitPoint = new THREE.Vector3();

export function XenomorphPool() {
  const { scene, animations } = useGLTF('/models/xenomorph.glb');
  const containerRef = useRef<THREE.Group>(null),
    fxRef = useRef<ImpactFXHandle>(null);
  const spawnCooldownRef = useRef(5.0),
    hissTimerRef = useRef(3.5),
    lastSpawnIndexRef = useRef(-1),
    deathCounterRef = useRef(0),
    threatsTimerRef = useRef(0);
  const lastRunIdRef = useRef(useGameStore.getState().runId);
  const cleanClips = useMemo(() => sanitizeClips(animations), [animations]);

  const pool = useMemo<PooledXenomorph[]>(
    () =>
      Array.from({ length: POOL_SIZE }, (_, i) => {
        const cloned = SkeletonUtils.clone(scene) as THREE.Group;
        cloned.scale.setScalar(0.45);
        cloned.position.set(0.09, -0.24, 0);
        const materials: THREE.MeshStandardMaterial[] = [];
        cloned.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const m = child as THREE.Mesh,
            mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.roughness = 0.34;
          mat.metalness = 0.22;
          mat.color.setRGB(1.45, 1.52, 1.6);
          mat.emissive.setHex(0x101c22);
          mat.emissiveIntensity = 0.42;
          m.material = mat;
          materials.push(mat);
        });
        const limbBones = LIMB_NAMES.map((name) => cloned.getObjectByName(name) ?? null),
          wrapper = new THREE.Group();
        wrapper.visible = false;
        wrapper.add(cloned);
        const mixer = new THREE.AnimationMixer(cloned),
          actions: Record<string, THREE.AnimationAction> = {};
        cleanClips.forEach((clip) => {
          actions[clip.name] = mixer.clipAction(clip);
        });
        return {
          id: i,
          active: false,
          isBoss: false,
          state: 'DEAD',
          hp: 320,
          maxHp: 320,
          x: 0,
          y: -50,
          z: 0,
          yaw: 0,
          speed: 3.2,
          laneOffset: (i % 2 === 0 ? -1 : 1) * 0.14,
          preferCW: i % 2 === 0,
          animPhase: i * 0.41,
          deathVariant: 0,
          targetCorner: -1,
          leapCooldown: 1.0,
          leapVx: 0,
          leapVz: 0,
          stateTimer: 0,
          attackCooldown: 0,
          hitFlashTimer: 0,
          gaitTimer: 0,
          root: wrapper,
          clonedMeshGroup: cloned,
          mixer,
          actions,
          currentClip: '',
          materials,
          limbBones,
          severedLimbs: [false, false, false, false, false]
        };
      }),
    [scene, cleanClips]
  );

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    pool.forEach((x) => c.add(x.root));
    return () => {
      pool.forEach((x) => c.remove(x.root));
    };
  }, [pool]);
  useEffect(() => {
    const xenoProvider: TargetProvider = {
      query: (origin, dir, maxDist, out) => {
        _ray.set(origin, dir);
        let closestDist = Infinity;
        for (let i = 0; i < pool.length; i++) {
          const x = pool[i];
          if (!x.active || x.state === 'DEAD') continue;
          _sphere.center.set(x.x, x.y + 0.72, x.z);
          _sphere.radius = x.state === 'SPAWNING' ? 0.54 : 0.84;
          if (!_ray.intersectSphere(_sphere, _hitVec)) continue;
          const d = origin.distanceTo(_hitVec);
          if (d < closestDist && d <= maxDist) {
            closestDist = d;
            out.id = x.id;
            out.point.copy(_hitVec);
          }
        }
        return closestDist;
      },
      applyHit: (id, closestPoint, origin, dir, dmg) => {
        const t = pool[id],
          prevHp = t.hp,
          relY = closestPoint.y - t.y;
        const isKill = (t.hp -= dmg.amount * (t.state === 'SPAWNING' ? 0.75 : 1) * (t.isBoss ? 0.65 : 1)) <= 0;
        fxRef.current?.triggerImpact(closestPoint, origin, dir, isKill);
        const flashIntensity = useGameStore.getState().settings.reducedFlash ? 0.22 : 0.45;
        t.hitFlashTimer = 0.12;
        t.materials.forEach((m) => {
          m.emissive.setHex(0xffffff);
          m.emissiveIntensity = flashIntensity;
        });
        [t.x, t.z] = constrainToCorridor(t.x + dir.x * 0.12, t.z + dir.z * 0.12, 0.25);
        const severSlot = (slot: number) => {
          const bone = t.limbBones[slot];
          if (t.severedLimbs[slot] || !bone) return;
          t.root.updateMatrixWorld(true);
          bone.getWorldPosition(_jointPos);
          t.severedLimbs[slot] = true;
          fxRef.current?.triggerLimbGib(t.id, slot, _jointPos, dir, t.yaw);
          fxRef.current?.triggerImpact(_jointPos, origin, dir, true);
          AudioManager.play3D('xeno_gib1', _jointPos.x, _jointPos.y, _jointPos.z, 0.95, 0.95 + Math.random() * 0.15);
          AudioManager.play3D('xeno_explode1', _jointPos.x, _jointPos.y, _jointPos.z, 0.85, 1.0 + Math.random() * 0.2);
          AudioManager.play3D('acid_burn', _jointPos.x, _jointPos.y, _jointPos.z, 0.85, 0.95 + Math.random() * 0.2);
          if ((slot === 2 || slot === 3) && (t.speed *= 0.68) && t.state === 'PURSUING')
            playClip(t, CLIP_WALK, true, 1.35);
        };
        if (prevHp > t.maxHp * 0.45 && t.hp <= t.maxHp * 0.45 && relY < 0.4) severSlot(2);
        if (isKill) {
          if (relY > 0.85) severSlot(4);
          else if (Math.random() < 0.4) severSlot(Math.random() < 0.5 ? 0 : 1);
        }
        AudioManager.play3D(
          Math.random() > 0.5 ? 'bullet_flesh1' : 'bullet_flesh2',
          closestPoint.x,
          closestPoint.y,
          closestPoint.z,
          0.9,
          0.95 + Math.random() * 0.15
        );
        AudioManager.play3D(
          'acid_fizz',
          closestPoint.x,
          closestPoint.y,
          closestPoint.z,
          0.75,
          1.0 + Math.random() * 0.2
        );
        if (isKill) {
          const dv = deathCounterRef.current++ % 4;
          t.deathVariant = dv;
          t.state = 'DEAD';
          t.stateTimer = 2.8;
          t.y = 0.0;
          t.clonedMeshGroup.scale.set(dv === 1 ? -0.45 : 0.45, 0.45, 0.45);
          t.clonedMeshGroup.position.set(dv === 1 ? -0.09 : 0.09, -0.24, 0);
          playClip(t, CLIP_DIE, false, [1.15, 1.25, 1.1, 1.3][dv], 0.0);
          AudioManager.play3D(Math.random() > 0.4 ? 'xeno_death1' : 'xeno_death2', t.x, t.y + 0.8, t.z, 0.95);
          AudioManager.play3D('xeno_explode1', t.x, t.y + 0.6, t.z, 0.88);
          AudioManager.play3D('xeno_bodyfall', t.x, 0.1, t.z, 0.8);
          AudioManager.play3D('acid_burn', t.x, 0.1, t.z, 0.85);
          fxRef.current?.triggerAcidPool(t.x, t.z, 1.15);
          fxRef.current?.startXenoMelt(t.id, 2.8);
          useGameStore.getState().registerKill(t.isBoss);
        } else AudioManager.play3D('xeno_hit', t.x, t.y + 0.8, t.z, 0.75, 0.95 + Math.random() * 0.15);
      }
    };
    CombatSystem.registerProvider('xeno', xenoProvider);
    return () => CombatSystem.unregisterProvider('xeno');
  }, [pool]);
  useFrame(({ clock }, dt) => {
    const state = useGameStore.getState(),
      now = clock.getElapsedTime();
    if (state.status === 'PLAYING' && state.runId !== lastRunIdRef.current) {
      lastRunIdRef.current = state.runId;
      pool.forEach((x) => {
        x.active = false;
        x.state = 'DEAD';
        x.root.visible = false;
        x.y = -50;
      });
      spawnCooldownRef.current = 5.0;
    }
    if (isSimulationFrozen(state.status)) return;
    if (state.status === 'MENU') {
      pool.forEach((x) => {
        x.active = false;
        x.root.visible = false;
      });
      return;
    }
    if (state.status === 'VICTORY') {
      pool.forEach((x) => {
        if (x.active && (x.y += dt * 2.5) > 3.0) {
          x.active = false;
          x.root.visible = false;
        } else if (x.active) x.root.position.set(x.x, x.y, x.z);
      });
      return;
    }
    const phase = state.phase,
      spawnInterval = phase === 1 ? 3.5 : phase === 2 ? 2.8 : phase === 3 ? 2.2 : 1.6;
    const baseSpeed = phase === 1 ? 2.85 : phase === 2 ? 3.35 : phase === 3 ? 3.85 : 4.35,
      maxHp = phase === 1 ? 300 : phase === 2 ? 360 : phase === 3 ? 420 : 480;
    const activeCount = pool.reduce((acc, x) => acc + (x.active ? 1 : 0), 0),
      [px, , pz] = state.playerPos,
      pyaw = state.playerYaw;
    const freeXeno =
      state.status === 'PLAYING' && (spawnCooldownRef.current -= dt) <= 0 && activeCount < 2
        ? pool.find((x) => !x.active)
        : undefined;
    if (freeXeno) {
      const hidden = CORRIDOR_SPAWN_NODES.map((_, i) => i).filter(
        (i) =>
          !isSpawnVisibleToPlayer(
            CORRIDOR_SPAWN_NODES[i].position[0],
            CORRIDOR_SPAWN_NODES[i].position[2],
            px,
            pz,
            pyaw
          )
      );
      const cands = hidden.length > 0 ? hidden : [0, 4, 5, 6];
      let idx = cands[Math.floor(Math.random() * cands.length)];
      if (idx === lastSpawnIndexRef.current && cands.length > 1) idx = cands[(cands.indexOf(idx) + 1) % cands.length];
      lastSpawnIndexRef.current = idx;
      const node = CORRIDOR_SPAWN_NODES[idx];
      const isBoss = phase >= 3 && !pool.some((x) => x.active && x.isBoss);
      const droneHp = isBoss ? 1100 : maxHp,
        droneScale = isBoss ? 0.62 : 0.45;
      freeXeno.isBoss = isBoss;
      Object.assign(freeXeno, {
        active: true,
        state: 'SPAWNING',
        stateTimer: 0.7,
        hp: droneHp,
        maxHp: droneHp,
        hitFlashTimer: 0,
        x: node.position[0],
        y: node.position[1],
        z: node.position[2],
        speed: (isBoss ? 3.1 : baseSpeed) * (Math.random() < 0.3 ? 0.82 : 0.94 + Math.random() * 0.18),
        laneOffset: (Math.random() - 0.5) * 0.24,
        preferCW: Math.random() < 0.5,
        targetCorner: -1,
        leapCooldown: 0.35,
        gaitTimer: 2.0 + Math.random() * 2.5,
        attackCooldown: 0
      });
      freeXeno.severedLimbs.fill(false);
      freeXeno.clonedMeshGroup.traverse((o) => {
        if ((o as THREE.Bone).isBone) o.scale.set(1, 1, 1);
      });
      freeXeno.root.scale.set(1, 1, 1);
      freeXeno.clonedMeshGroup.scale.setScalar(droneScale);
      freeXeno.clonedMeshGroup.position.set(0.09, -0.24, 0);
      freeXeno.materials.forEach((m) => {
        m.emissive.setHex(isBoss ? 0x331010 : 0x101c22);
        m.emissiveIntensity = 0.42;
      });
      freeXeno.root.position.set(freeXeno.x, freeXeno.y, freeXeno.z);
      freeXeno.root.visible = true;
      playClip(freeXeno, CLIP_IDLE, true, 1.0);
      AudioManager.play3D('vent_clang', freeXeno.x, freeXeno.y + 1.0, freeXeno.z, 0.85);
      if (isBoss) AudioManager.play3D('xeno_hiss1', freeXeno.x, freeXeno.y + 1.2, freeXeno.z, 1.0, 0.75);
      spawnCooldownRef.current = spawnInterval;
    }
    if ((hissTimerRef.current -= dt) <= 0 && activeCount > 0) {
      hissTimerRef.current = 2.4 + Math.random() * 2.4;
      const pursuing = pool.filter((x) => x.active && x.state === 'PURSUING');
      if (pursuing.length > 0) {
        const s = pursuing[Math.floor(Math.random() * pursuing.length)];
        AudioManager.play3D(
          Math.random() < 0.35 ? 'xeno_sprint' : Math.random() > 0.5 ? 'xeno_hiss1' : 'xeno_hiss2',
          s.x,
          s.y + 0.8,
          s.z,
          0.78
        );
      }
    }
    const threats: ActiveThreat[] = [];
    for (const x of pool) {
      if (!x.active) continue;
      x.mixer.update(dt);
      for (let b = 0; b < 5; b++) if (x.limbBones[b]) x.limbBones[b]!.scale.setScalar(x.severedLimbs[b] ? 0.0001 : 1.0);
      if (x.hitFlashTimer > 0 && (x.hitFlashTimer -= dt) <= 0)
        x.materials.forEach((m) => {
          m.emissive.setHex(0x101c22);
          m.emissiveIntensity = 0.42;
        });
      const distToPlayer = Math.hypot(px - x.x, pz - x.z);
      let pitchTilt = 0,
        rollTilt = 0;
      if (x.state === 'SPAWNING') {
        x.stateTimer -= dt;
        x.y = THREE.MathUtils.lerp(x.y, 0.0, dt * 4.5);
        x.yaw = Math.atan2(px - x.x, pz - x.z);
        if (x.stateTimer <= 0) {
          x.y = 0.0;
          x.state = 'PURSUING';
          playClip(x, CLIP_RUN, true, 0.95);
        }
      } else if (x.state === 'PURSUING') {
        x.leapCooldown = Math.max(0, x.leapCooldown - dt);
        if ((x.gaitTimer -= dt) <= 0) {
          x.gaitTimer = 2.0 + Math.random() * 2.5;
          const nextClip = x.severedLimbs[2] || x.severedLimbs[3] || Math.random() < 0.28 ? CLIP_WALK : CLIP_RUN;
          playClip(x, nextClip, true, nextClip === CLIP_WALK ? 1.25 : 0.92 + Math.random() * 0.25);
        }
        const xH = getHallId(x.x, x.z),
          pH = getHallId(px, pz);
        if (
          xH === pH &&
          !x.severedLimbs[2] &&
          !x.severedLimbs[3] &&
          x.leapCooldown <= 0 &&
          distToPlayer >= 3.2 &&
          distToPlayer <= 8.5
        ) {
          x.state = 'LEAPING';
          x.stateTimer = 0.78;
          x.leapCooldown = 3.2;
          const inv = 1 / Math.max(0.1, distToPlayer);
          x.leapVx = (px - x.x) * inv * (x.speed * 2.35);
          x.leapVz = (pz - x.z) * inv * (x.speed * 2.35);
          x.yaw = Math.atan2(x.leapVx, x.leapVz);
          playClip(x, CLIP_LEAP, false, 1.45);
          AudioManager.play3D('xeno_attack', x.x, x.y + 0.9, x.z, 0.95, 1.15);
          AudioManager.play3D('xeno_sprint', x.x, x.y + 0.9, x.z, 0.85, 1.2);
        } else if (distToPlayer <= 1.75) {
          x.state = 'ATTACKING';
          x.attackCooldown = 0.35;
          playClip(x, ATK_CLIPS[Math.floor(Math.random() * ATK_CLIPS.length)], true, 1.05);
        } else {
          let tx = px,
            tz = pz;
          if (xH === pH) {
            x.targetCorner = -1;
            if (distToPlayer > 2.2) {
              if (xH === 0) tx = -0.32 + x.laneOffset;
              else if (xH === 1) tx = -13.48 + x.laneOffset;
              else if (xH === 2) tz = 35.9 + x.laneOffset;
              else if (xH === 3) tz = 22.1 + x.laneOffset;
              else tz = 8.3 + x.laneOffset;
            }
          } else {
            if (x.targetCorner < 0) {
              x.targetCorner = HALL_CORNERS[xH].reduce(
                (best, c) =>
                  Math.hypot(CORNERS[c][0] - x.x, CORNERS[c][1] - x.z) +
                    Math.hypot(px - CORNERS[c][0], pz - CORNERS[c][1]) <
                  Math.hypot(CORNERS[best][0] - x.x, CORNERS[best][1] - x.z) +
                    Math.hypot(px - CORNERS[best][0], pz - CORNERS[best][1])
                    ? c
                    : best,
                HALL_CORNERS[xH][0]
              );
            }
            if (Math.hypot(CORNERS[x.targetCorner][0] - x.x, CORNERS[x.targetCorner][1] - x.z) < 0.48) {
              x.targetCorner = HALL_CORNERS[pH].includes(x.targetCorner)
                ? -1
                : ADJ_CORNERS[x.targetCorner].reduce(
                    (best, c) =>
                      Math.hypot(px - CORNERS[c][0], pz - CORNERS[c][1]) <
                      Math.hypot(px - CORNERS[best][0], pz - CORNERS[best][1])
                        ? c
                        : best,
                    ADJ_CORNERS[x.targetCorner][0]
                  );
            }
            if (x.targetCorner >= 0) [tx, tz] = CORNERS[x.targetCorner];
          }
          const dx = tx - x.x,
            dz = tz - x.z,
            dT = Math.hypot(dx, dz);
          if (dT > 0.04) {
            let diff = Math.atan2(dx, dz) - x.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            x.yaw += diff * Math.min(1, dt * 12);
            [x.x, x.z] = constrainToCorridor(x.x + (dx / dT) * x.speed * dt, x.z + (dz / dT) * x.speed * dt, 0.24);
          }
        }
      } else if (x.state === 'LEAPING') {
        x.stateTimer -= dt;
        const u = 1.0 - Math.max(0, x.stateTimer / 0.78);
        x.y = Math.sin(u * Math.PI) * 0.96;
        pitchTilt = Math.cos(u * Math.PI) * -0.52;
        [x.x, x.z] = constrainToCorridor(x.x + x.leapVx * dt, x.z + x.leapVz * dt, 0.24);
        if (distToPlayer <= 1.65) {
          x.y = 0.0;
          pitchTilt = 0;
          x.state = 'ATTACKING';
          x.attackCooldown = 0.75;
          AudioManager.play2D('marine_pain', 0.75);
          state.takeDamage(38, now);
          if (useGameStore.getState().status === 'DEFEAT') AudioManager.play2D('marine_death', 0.9);
          playClip(x, ATK_CLIPS[0], true, 1.1);
        } else if (x.stateTimer <= 0) {
          x.y = 0.0;
          pitchTilt = 0;
          x.state = 'PURSUING';
          playClip(x, CLIP_RUN, true, 1.0);
        }
      } else if (x.state === 'ATTACKING') {
        x.yaw = Math.atan2(px - x.x, pz - x.z);
        if (distToPlayer > 2.05) {
          x.state = 'PURSUING';
          playClip(x, x.severedLimbs[2] || x.severedLimbs[3] ? CLIP_WALK : CLIP_RUN, true, 1.0);
        } else if ((x.attackCooldown -= dt) <= 0) {
          x.attackCooldown = 1.15;
          playClip(x, ATK_CLIPS[Math.floor(Math.random() * ATK_CLIPS.length)], true, 1.05);
          AudioManager.play3D('xeno_attack', x.x, x.y + 0.9, x.z, 0.9);
          AudioManager.play2D('marine_pain', 0.65);
          state.takeDamage(34, now);
          if (useGameStore.getState().status === 'DEFEAT') AudioManager.play2D('marine_death', 0.9);
        }
      } else if (x.state === 'DEAD') {
        x.stateTimer -= dt;
        const meltProg = 1.0 - Math.max(0, x.stateTimer / 2.8),
          c = Math.min(1, meltProg * 2.6),
          v = x.deathVariant;
        const dieT = 2.8 - x.stateTimer;
        const kneelOff =
          dieT <= 0.75 ? 0.226 + (dieT / 0.75) * 0.244 : dieT <= 1.5 ? 0.47 - ((dieT - 0.75) / 0.75) * 0.27 : 0.213;
        x.clonedMeshGroup.position.set(v === 1 ? -0.09 : 0.09, -0.24 - kneelOff, 0);
        pitchTilt = v === 2 ? c * 0.42 : v === 3 ? c * -0.35 : 0;
        rollTilt = v === 3 ? c * 0.48 : v === 1 ? c * -0.32 : 0;
        if (meltProg > 0.32) {
          const k = (meltProg - 0.32) / 0.68;
          x.y = -k * 0.42;
          x.root.scale.set(1 + k * 0.18, Math.max(0.04, 1 - k * 0.92), 1 + k * 0.18);
          x.materials.forEach((m) => {
            m.emissive.setHex(0x185510);
            m.emissiveIntensity = 0.85 * (1 - k * 0.5);
          });
        }
        if (x.stateTimer <= 0) {
          x.active = false;
          x.root.visible = false;
          x.root.scale.set(1, 1, 1);
          continue;
        }
      }
      x.root.position.set(x.x, x.y, x.z);
      x.root.rotation.set(pitchTilt, x.yaw, rollTilt, 'YXZ');
      if (x.state !== 'DEAD')
        threats.push({ id: x.id, x: x.x, z: x.z, state: x.state === 'LEAPING' ? 'PURSUING' : x.state });
    }
    if ((threatsTimerRef.current += dt) >= 0.1) {
      threatsTimerRef.current = 0;
      state.setActiveThreats(threats);
    }
  });
  return (
    <group ref={containerRef} name="XenomorphPoolContainer">
      <XenomorphImpactFX ref={fxRef} />
    </group>
  );
}
useGLTF.preload('/models/xenomorph.glb');
