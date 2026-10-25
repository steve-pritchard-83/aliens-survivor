import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useGameStore, isSimulationFrozen } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';
import { CombatSystem, TargetProvider } from '../core/CombatEvents';
import { BALANCE } from '../data/balance';
import { CORRIDOR_SPAWN_NODES, moveConstrained, getHallId, CORNERS } from '../core/CorridorNav';
import { advanceCorner, HALL_LANE } from '../systems/corridorPathing';
import { pickSpawnNode } from '../systems/waveDirector';
import { XenomorphImpactFX, ImpactFXHandle } from './XenomorphImpactFX';
import { buildFaceRig, buildWormRig, animateFace, animateWorm, groundModel, AnimMode } from './SmallAlienAnim';

const _sphere = new THREE.Sphere(),
  _ray = new THREE.Ray(),
  _hitVec = new THREE.Vector3();

const SMALL_ALIEN_ID = 99;
const SMALL_FALLBACK_NODES = [0, 4, 5, 10];

export function SmallAlienSpawner() {
  const fhGltf = useGLTF('/models/facehugger.glb'),
    cbGltf = useGLTF('/models/chestburster.glb');
  const rootRef = useRef<THREE.Group>(null),
    fxRef = useRef<ImpactFXHandle>(null);
  const lastRunIdRef = useRef(useGameStore.getState().runId);

  const entityRef = useRef({
    active: false,
    kind: 'FACEHUGGER' as 'FACEHUGGER' | 'CHESTBURSTER',
    state: 'DEAD' as 'SPAWNING' | 'PURSUING' | 'LEAPING' | 'ATTACKING' | 'DEAD',
    hp: 90,
    maxHp: 90,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 4.5,
    targetCorner: -1,
    leapCooldown: 0.6,
    leapVx: 0,
    leapVz: 0,
    stateTimer: 0,
    attackCooldown: 0,
    hitFlashTimer: 0,
    vocalTimer: 1.5,
    spawnCooldown: BALANCE.SMALL_ALIEN.FIRST_SPAWN_DELAY as number,
    animTime: 0
  });

  const { fhGroup, cbGroup, fhMats, cbMats, faceRig, wormRig } = useMemo(() => {
    const fhClone = SkeletonUtils.clone(fhGltf.scene) as THREE.Group,
      cbClone = SkeletonUtils.clone(cbGltf.scene) as THREE.Group;
    fhClone.scale.setScalar(0.72);
    cbClone.scale.setScalar(0.85);
    const fMats: THREE.MeshStandardMaterial[] = [],
      cMats: THREE.MeshStandardMaterial[] = [];
    const prep = (
      root: THREE.Group,
      list: THREE.MeshStandardMaterial[],
      r: number,
      g: number,
      b: number,
      em: number
    ) => {
      root.traverse((ch) => {
        if (!(ch as THREE.Mesh).isMesh) return;
        const m = ch as THREE.Mesh,
          mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.roughness = 0.34;
        mat.metalness = 0.15;
        mat.color.setRGB(r, g, b);
        mat.emissive.setHex(em);
        mat.emissiveIntensity = 0.4;
        m.material = mat;
        list.push(mat);
      });
    };
    prep(fhClone, fMats, 1.35, 1.18, 0.92, 0x221808);
    prep(cbClone, cMats, 1.38, 1.05, 0.88, 0x28100c);
    const fWrap = new THREE.Group();
    fWrap.add(fhClone);
    fWrap.visible = false;
    const cWrap = new THREE.Group();
    cWrap.add(cbClone);
    cWrap.visible = false;
    groundModel(fWrap, fhClone);
    groundModel(cWrap, cbClone); // rest each model exactly on the floor
    return {
      fhGroup: fWrap,
      cbGroup: cWrap,
      fhMats: fMats,
      cbMats: cMats,
      faceRig: buildFaceRig(fWrap),
      wormRig: buildWormRig(cWrap)
    };
  }, [fhGltf.scene, cbGltf.scene]);

  useEffect(() => {
    const r = rootRef.current;
    if (!r) return;
    r.add(fhGroup, cbGroup);
    return () => {
      r.remove(fhGroup, cbGroup);
    };
  }, [fhGroup, cbGroup]);

  useEffect(() => {
    const smallProvider: TargetProvider = {
      query: (origin, dir, maxDist, out) => {
        const e = entityRef.current;
        if (!e.active || e.state === 'DEAD') return Infinity;
        _ray.set(origin, dir);
        _sphere.center.set(e.x, e.y + 0.25, e.z);
        _sphere.radius = 0.48;
        if (!_ray.intersectSphere(_sphere, _hitVec)) return Infinity;
        const d = origin.distanceTo(_hitVec);
        if (d > maxDist) return Infinity;
        out.id = SMALL_ALIEN_ID;
        out.point.copy(_hitVec);
        return d;
      },
      // Small aliens take a flat hit regardless of weapon damage (kept from original balance).
      applyHit: (_id, pt, origin, dir) => {
        const e = entityRef.current;
        const isKill = (e.hp -= BALANCE.SMALL_ALIEN.DAMAGE_PER_HIT) <= 0;
        fxRef.current?.triggerImpact(pt, origin, dir, isKill);
        e.hitFlashTimer = 0.12;
        (e.kind === 'FACEHUGGER' ? fhMats : cbMats).forEach((m) => {
          m.emissive.setHex(0xffffff);
          m.emissiveIntensity = 0.45;
        });
        moveConstrained(e, e.x + dir.x * 0.16, e.z + dir.z * 0.16, 0.2);
        AudioManager.play3D(Math.random() > 0.5 ? 'bullet_flesh1' : 'bullet_flesh2', pt.x, pt.y, pt.z, 0.9, 1.05);
        AudioManager.play3D('acid_fizz', pt.x, pt.y, pt.z, 0.75, 1.15);
        if (isKill) {
          e.state = 'DEAD';
          e.stateTimer = 2.4;
          e.y = 0.0;
          AudioManager.play3D('xeno_gib1', e.x, 0.2, e.z, 0.88, 1.2);
          AudioManager.play3D('acid_burn', e.x, 0.1, e.z, 0.82, 1.1);
          fxRef.current?.triggerAcidPool(e.x, e.z, 0.68);
          useGameStore.getState().registerKill('small');
        }
      }
    };
    CombatSystem.registerProvider('small', smallProvider);
    return () => CombatSystem.unregisterProvider('small');
  }, [fhMats, cbMats]);

  useFrame(({ clock }, dt) => {
    const state = useGameStore.getState(),
      now = clock.getElapsedTime(),
      e = entityRef.current,
      r = rootRef.current;
    if (!r) return;
    if (state.status === 'PLAYING' && state.runId !== lastRunIdRef.current) {
      lastRunIdRef.current = state.runId;
      e.active = false;
      e.state = 'DEAD';
      e.spawnCooldown = BALANCE.SMALL_ALIEN.FIRST_SPAWN_DELAY;
      fhGroup.visible = false;
      cbGroup.visible = false;
      state.setSmallThreat(null);
    }
    if (isSimulationFrozen(state.status)) return;
    if (state.status === 'MENU' || state.status === 'VICTORY') {
      e.active = false;
      fhGroup.visible = false;
      cbGroup.visible = false;
      state.setSmallThreat(null);
      return;
    }
    const [px, , pz] = state.playerPos,
      pyaw = state.playerYaw;

    // Spawn at most ONE Facehugger or Chestburster at a time randomly from off-screen vents
    if (!e.active && state.status === 'PLAYING' && (e.spawnCooldown -= dt) <= 0) {
      const node = CORRIDOR_SPAWN_NODES[pickSpawnNode(px, pz, pyaw, -1, SMALL_FALLBACK_NODES)],
        isFH = Math.random() < 0.5;
      Object.assign(e, {
        active: true,
        kind: isFH ? 'FACEHUGGER' : 'CHESTBURSTER',
        state: 'SPAWNING',
        stateTimer: 0.45,
        hp: isFH ? BALANCE.SMALL_ALIEN.FACEHUGGER_HP : BALANCE.SMALL_ALIEN.CHESTBURSTER_HP,
        maxHp: isFH ? BALANCE.SMALL_ALIEN.FACEHUGGER_HP : BALANCE.SMALL_ALIEN.CHESTBURSTER_HP,
        x: node.position[0],
        y: Math.min(0.6, node.position[1]),
        z: node.position[2],
        yaw: Math.atan2(px - node.position[0], pz - node.position[2]),
        speed: isFH ? 4.65 : 4.25,
        targetCorner: -1,
        leapCooldown: 0.4,
        attackCooldown: 0,
        hitFlashTimer: 0,
        vocalTimer: 1.1
      });
      r.scale.set(1, 1, 1);
      fhGroup.visible = isFH;
      cbGroup.visible = !isFH;
      fhMats.forEach((m) => {
        m.emissive.setHex(0x221808);
        m.emissiveIntensity = 0.38;
      });
      cbMats.forEach((m) => {
        m.emissive.setHex(0x28100c);
        m.emissiveIntensity = 0.42;
      });
      AudioManager.play3D('vent_clang', e.x, e.y + 0.5, e.z, 0.78, 1.25);
    }

    if (!e.active) {
      state.setSmallThreat(null);
      return;
    }
    e.animTime += dt;
    if (e.hitFlashTimer > 0 && (e.hitFlashTimer -= dt) <= 0) {
      if (e.kind === 'FACEHUGGER')
        fhMats.forEach((m) => {
          m.emissive.setHex(0x221808);
          m.emissiveIntensity = 0.38;
        });
      else
        cbMats.forEach((m) => {
          m.emissive.setHex(0x28100c);
          m.emissiveIntensity = 0.42;
        });
    }

    const distToPlayer = Math.hypot(px - e.x, pz - e.z);
    let pitchTilt = 0,
      rollTilt = 0;

    if (e.state === 'SPAWNING') {
      e.stateTimer -= dt;
      e.y = THREE.MathUtils.lerp(e.y, 0.0, dt * 6.0);
      e.yaw = Math.atan2(px - e.x, pz - e.z);
      if (e.stateTimer <= 0) {
        e.y = 0.0;
        e.state = 'PURSUING';
      }
    } else if (e.state === 'PURSUING') {
      e.leapCooldown = Math.max(0, e.leapCooldown - dt);
      const xH = getHallId(e.x, e.z),
        pH = getHallId(px, pz);
      if (xH === pH && e.leapCooldown <= 0 && distToPlayer >= 1.6 && distToPlayer <= 6.2) {
        e.state = 'LEAPING';
        e.stateTimer = 0.58;
        e.leapCooldown = 2.2;
        const inv = 1 / Math.max(0.1, distToPlayer);
        e.leapVx = (px - e.x) * inv * (e.speed * 2.4);
        e.leapVz = (pz - e.z) * inv * (e.speed * 2.4);
        e.yaw = Math.atan2(e.leapVx, e.leapVz);
      } else if (distToPlayer <= 1.45) {
        e.state = 'ATTACKING';
        e.attackCooldown = 0.25;
      } else {
        let tx = px,
          tz = pz;
        if (xH === pH) {
          e.targetCorner = -1;
          const slither = Math.sin(now * (e.kind === 'CHESTBURSTER' ? 9.5 : 6.5)) * 0.22;
          if (distToPlayer > 1.8) {
            const lane = HALL_LANE[xH];
            if (lane.axis === 'x') tx = lane.value + slither;
            else tz = lane.value + slither;
          }
        } else {
          e.targetCorner = advanceCorner(e.targetCorner, xH, pH, e.x, e.z, px, pz);
          if (e.targetCorner >= 0) [tx, tz] = CORNERS[e.targetCorner];
        }
        const dx = tx - e.x,
          dz = tz - e.z,
          dT = Math.hypot(dx, dz);
        if (dT > 0.04) {
          let diff = Math.atan2(dx, dz) - e.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          e.yaw += diff * Math.min(1, dt * 15);
          moveConstrained(e, e.x + (dx / dT) * e.speed * dt, e.z + (dz / dT) * e.speed * dt, 0.18);
        }
      }
    } else if (e.state === 'LEAPING') {
      e.stateTimer -= dt;
      const u = 1.0 - Math.max(0, e.stateTimer / 0.58);
      e.y = Math.sin(u * Math.PI) * (e.kind === 'FACEHUGGER' ? 1.35 : 0.88);
      pitchTilt = (u - 0.5) * -0.6;
      moveConstrained(e, e.x + e.leapVx * dt, e.z + e.leapVz * dt, 0.18);
      if (distToPlayer <= 1.45) {
        e.y = 0.0;
        pitchTilt = 0;
        e.state = 'ATTACKING';
        e.attackCooldown = 0.65;
        AudioManager.play2D('marine_pain', 0.75);
        state.takeDamage(BALANCE.SMALL_ALIEN.LEAP_DAMAGE, now);
        if (useGameStore.getState().status === 'DEFEAT') AudioManager.play2D('marine_death', 0.9);
      } else if (e.stateTimer <= 0) {
        e.y = 0.0;
        pitchTilt = 0;
        e.state = 'PURSUING';
      }
    } else if (e.state === 'ATTACKING') {
      e.yaw = Math.atan2(px - e.x, pz - e.z);
      if (distToPlayer > 1.75) e.state = 'PURSUING';
      else if ((e.attackCooldown -= dt) <= 0) {
        e.attackCooldown = 0.95;
        AudioManager.play2D('marine_pain', 0.65);
        state.takeDamage(BALANCE.SMALL_ALIEN.BITE_DAMAGE, now);
        if (useGameStore.getState().status === 'DEFEAT') AudioManager.play2D('marine_death', 0.9);
      }
    } else if (e.state === 'DEAD') {
      e.stateTimer -= dt;
      const meltProg = 1.0 - Math.max(0, e.stateTimer / 2.4);
      rollTilt = Math.min(1, meltProg * 3.0) * (e.kind === 'FACEHUGGER' ? Math.PI * 0.88 : 0.65);
      // A flipped facehugger would otherwise sink into the deck, so lift it as it rolls onto its back
      e.y = (e.kind === 'FACEHUGGER' ? 0.2 : 0.05) * Math.min(1, meltProg * 3.0);
      if (meltProg > 0.3) {
        const k = (meltProg - 0.3) / 0.7;
        e.y -= k * 0.18;
        r.scale.set(1 + k * 0.2, Math.max(0.05, 1 - k * 0.92), 1 + k * 0.2);
        (e.kind === 'FACEHUGGER' ? fhMats : cbMats).forEach((m) => {
          m.emissive.setHex(0x185510);
          m.emissiveIntensity = 0.85 * (1 - k * 0.5);
        });
      }
      if (e.stateTimer <= 0) {
        e.active = false;
        fhGroup.visible = false;
        cbGroup.visible = false;
        r.scale.set(1, 1, 1);
        e.spawnCooldown = 4.5 + Math.random() * 3.5;
        state.setSmallThreat(null);
        return;
      }
    }

    r.position.set(e.x, e.y, e.z);
    r.rotation.set(pitchTilt, e.yaw, rollTilt, 'YXZ');

    // Skeletal animation (after the root pose is set so bone motion is expressed in the creature's own frame)
    const mode: AnimMode =
      e.state === 'DEAD'
        ? 'DEAD'
        : e.state === 'LEAPING'
          ? 'LEAP'
          : e.state === 'ATTACKING'
            ? 'BITE'
            : e.state === 'PURSUING'
              ? 'RUN'
              : 'IDLE';
    const phase = e.animTime * (e.kind === 'FACEHUGGER' ? 17 : 11),
      animT = mode === 'DEAD' ? 2.4 - e.stateTimer : e.animTime;
    if (e.kind === 'FACEHUGGER') animateFace(faceRig, mode, phase, animT);
    else animateWorm(wormRig, mode, phase, animT);
    state.setSmallThreat(
      e.state !== 'DEAD' ? { id: 99, x: e.x, z: e.z, state: e.state === 'LEAPING' ? 'PURSUING' : e.state } : null
    );
  });

  return (
    <group ref={rootRef} name="SmallAlienContainer">
      <XenomorphImpactFX ref={fxRef} />
    </group>
  );
}
useGLTF.preload('/models/facehugger.glb');
useGLTF.preload('/models/chestburster.glb');
