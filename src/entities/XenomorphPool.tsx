import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, ActiveThreat, isSimulationFrozen } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';
import { CombatSystem, TargetProvider } from '../core/CombatEvents';
import { BALANCE } from '../data/balance';
import { getActiveLevel } from '../levels';
import {
  shouldSpawnBoss,
  scaledSpawnInterval,
  scaledHp,
  droneBaseSpeed,
  droneMaxHp,
  pickSpawnNode
} from '../systems/waveDirector';
import type { GameRules } from '../data/difficulty';
import { XenomorphImpactFX, ImpactFXHandle } from './XenomorphImpactFX';
import { POOL_SIZE, PooledXenomorph, sanitizeClips } from './XenoTypes';
import { buildXenoPool, resetXenoPool, spawnXeno } from './xeno/xenoPool';
import { applyXenoHit, DeathCounter } from './xeno/xenoDamage';
import { stepXeno, XenoPose, XenoEvents } from './xeno/xenoAI';
import { stepXenoDeath } from './xeno/xenoDeath';

const _sphere = new THREE.Sphere(),
  _ray = new THREE.Ray(),
  _hitVec = new THREE.Vector3();
const _pose: XenoPose = { pitch: 0, roll: 0 };
const _events: XenoEvents = { playerDamage: 0, leapHit: false, slash: false, leapStarted: false };
const THREAT_PUBLISH_SECONDS = 0.1;

// Threat records published to the store at 10 Hz; objects are reused so publishing allocates nothing
const _threatRecords: ActiveThreat[] = Array.from({ length: POOL_SIZE }, (_, id) => ({
  id,
  x: 0,
  z: 0,
  state: 'PURSUING'
}));
const _publishedThreats: ActiveThreat[] = [];

function publishThreats(pool: PooledXenomorph[]): ActiveThreat[] {
  _publishedThreats.length = 0;
  for (let i = 0; i < pool.length; i++) {
    const x = pool[i];
    if (!x.active || x.state === 'DEAD') continue;
    const rec = _threatRecords[i];
    rec.x = x.x;
    rec.z = x.z;
    rec.state = x.state === 'LEAPING' ? 'PURSUING' : x.state;
    _publishedThreats.push(rec);
  }
  return _publishedThreats;
}

function countActive(pool: PooledXenomorph[]): number {
  let n = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i].active) n++;
  return n;
}

function anyActiveBoss(pool: PooledXenomorph[]): boolean {
  for (let i = 0; i < pool.length; i++) if (pool[i].active && pool[i].isBoss) return true;
  return false;
}

/** Plays a hiss/sprint from a random pursuing drone, if any. */
function ambientHiss(pool: PooledXenomorph[]): void {
  let pursuing = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i].active && pool[i].state === 'PURSUING') pursuing++;
  if (pursuing === 0) return;
  let pick = Math.floor(Math.random() * pursuing);
  for (let i = 0; i < pool.length; i++) {
    const s = pool[i];
    if (!s.active || s.state !== 'PURSUING' || pick-- > 0) continue;
    const key = Math.random() < 0.35 ? 'xeno_sprint' : Math.random() > 0.5 ? 'xeno_hiss1' : 'xeno_hiss2';
    AudioManager.play3D(key, s.x, s.y + 0.8, s.z, 0.78);
    return;
  }
}

export function XenomorphPool() {
  const { scene, animations } = useGLTF('/models/xenomorph.glb');
  const containerRef = useRef<THREE.Group>(null),
    fxRef = useRef<ImpactFXHandle>(null);
  const spawnCooldownRef = useRef<number>(BALANCE.XENO_POOL.FIRST_SPAWN_DELAY),
    hissTimerRef = useRef(3.5),
    lastSpawnIndexRef = useRef(-1),
    threatsTimerRef = useRef(0);
  const deathCounter = useRef<DeathCounter>({ n: 0 });
  const lastRunIdRef = useRef(useGameStore.getState().runId);
  const bossPhasesRef = useRef(new Set<number>());
  const cleanClips = useMemo(() => sanitizeClips(animations), [animations]);
  const pool = useMemo(() => buildXenoPool(scene, cleanClips), [scene, cleanClips]);

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
      applyHit: (id, point, origin, dir, dmg) =>
        applyXenoHit(pool[id], point, origin, dir, dmg, fxRef.current, deathCounter.current)
    };
    CombatSystem.registerProvider('xeno', xenoProvider);
    return () => CombatSystem.unregisterProvider('xeno');
  }, [pool]);

  useFrame(({ clock }, dt) => {
    const state = useGameStore.getState(),
      now = clock.getElapsedTime();
    if (state.status === 'PLAYING' && state.runId !== lastRunIdRef.current) {
      lastRunIdRef.current = state.runId;
      bossPhasesRef.current.clear();
      resetXenoPool(pool);
      spawnCooldownRef.current = BALANCE.XENO_POOL.FIRST_SPAWN_DELAY;
    }
    if (isSimulationFrozen(state.status)) return;
    if (state.status === 'MENU') {
      for (let i = 0; i < pool.length; i++) {
        pool[i].active = false;
        pool[i].root.visible = false;
      }
      return;
    }
    if (state.status === 'VICTORY') {
      for (let i = 0; i < pool.length; i++) {
        const x = pool[i];
        if (!x.active) continue;
        if ((x.y += dt * 2.5) > 3.0) {
          x.active = false;
          x.root.visible = false;
        } else x.root.position.set(x.x, x.y, x.z);
      }
      return;
    }

    const phase = state.phase,
      [px, , pz] = state.playerPos;
    const activeCount = countActive(pool);
    if (
      state.status === 'PLAYING' &&
      (spawnCooldownRef.current -= dt) <= 0 &&
      activeCount < state.rules.maxConcurrentDrones
    ) {
      const free = pool.find((x) => !x.active);
      if (free) spawnOne(free, phase, px, pz, state.playerYaw, state.rules);
    }
    if ((hissTimerRef.current -= dt) <= 0 && activeCount > 0) {
      hissTimerRef.current = 2.4 + Math.random() * 2.4;
      ambientHiss(pool);
    }

    for (let i = 0; i < pool.length; i++) {
      const x = pool[i];
      if (!x.active) continue;
      x.mixer.update(dt);
      for (let b = 0; b < 5; b++) if (x.limbBones[b]) x.limbBones[b]!.scale.setScalar(x.severedLimbs[b] ? 0.0001 : 1.0);
      if (x.state === 'DEAD') {
        if (stepXenoDeath(x, dt, _pose)) continue;
      } else {
        stepXeno(x, px, pz, dt, _pose, _events);
        applyEvents(x, now);
      }
      x.root.position.set(x.x, x.y, x.z);
      x.root.rotation.set(_pose.pitch, x.yaw, _pose.roll, 'YXZ');
    }
    if ((threatsTimerRef.current += dt) >= THREAT_PUBLISH_SECONDS) {
      threatsTimerRef.current = 0;
      state.setActiveThreats(publishThreats(pool));
    }
  });

  function spawnOne(
    free: PooledXenomorph,
    phase: 1 | 2 | 3 | 4,
    px: number,
    pz: number,
    pyaw: number,
    rules: GameRules
  ): void {
    const level = getActiveLevel();
    const idx = pickSpawnNode(px, pz, pyaw, lastSpawnIndexRef.current, level.spawnFallback.xeno);
    lastSpawnIndexRef.current = idx;
    const node = level.spawnNodes[idx];
    const isBoss = shouldSpawnBoss(phase, bossPhasesRef.current, anyActiveBoss(pool));
    if (isBoss) bossPhasesRef.current.add(phase);
    spawnXeno(free, {
      nodeX: node.position[0],
      nodeY: node.position[1],
      nodeZ: node.position[2],
      isBoss,
      hp: scaledHp(isBoss ? BALANCE.PRAETORIAN.HP : droneMaxHp(phase), rules),
      scale: isBoss ? BALANCE.PRAETORIAN.SCALE : BALANCE.XENO_POOL.SCALE,
      baseSpeed: droneBaseSpeed(phase)
    });
    AudioManager.play3D('vent_clang', free.x, free.y + 1.0, free.z, 0.85);
    if (isBoss) AudioManager.play3D('xeno_hiss1', free.x, free.y + 1.2, free.z, 1.0, 0.75);
    spawnCooldownRef.current = scaledSpawnInterval(phase, rules);
  }

  return (
    <group ref={containerRef} name="XenomorphPoolContainer">
      <XenomorphImpactFX ref={fxRef} />
    </group>
  );
}

/** Turns one frame of AI events into audio and player damage. */
function applyEvents(x: PooledXenomorph, now: number): void {
  if (_events.leapStarted) {
    AudioManager.play3D('xeno_attack', x.x, x.y + 0.9, x.z, 0.95, 1.15);
    AudioManager.play3D('xeno_sprint', x.x, x.y + 0.9, x.z, 0.85, 1.2);
  }
  if (_events.playerDamage <= 0) return;
  if (_events.slash) AudioManager.play3D('xeno_attack', x.x, x.y + 0.9, x.z, 0.9);
  AudioManager.play2D('marine_pain', _events.leapHit ? 0.75 : 0.65);
  const store = useGameStore.getState();
  store.takeDamage(_events.playerDamage, now);
  if (useGameStore.getState().status === 'DEFEAT') AudioManager.play2D('marine_death', 0.9);
}
useGLTF.preload('/models/xenomorph.glb');
