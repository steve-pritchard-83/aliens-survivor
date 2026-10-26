import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, isSimulationFrozen, ActiveThreat, GameState } from '../core/GameStore';
import { AudioManager } from '../core/AudioManager';
import { CombatSystem, TargetProvider } from '../core/CombatEvents';
import { BALANCE } from '../data/balance';
import { moveConstrained } from '../core/CorridorNav';
import { getActiveLevel } from '../levels';
import { pickSpawnNode } from '../systems/waveDirector';
import { sharedImpactFx } from './fx/sharedImpactFx';
import { animateFace, animateWorm, AnimMode } from './SmallAlienAnim';
import { buildSmallAlienAssets } from './small/smallAssets';
import { meltScale, restoreMelt, tintMelt } from './fx/meltTint';
import {
  createSmallSim,
  spawnSmall,
  stepSmall,
  SmallPose,
  SmallEvents,
  SMALL_DEATH_SECONDS,
  SmallAlienSim
} from './small/smallSim';

const _sphere = new THREE.Sphere(),
  _ray = new THREE.Ray(),
  _hitVec = new THREE.Vector3();

const SMALL_ALIEN_ID = 99;
const FH_EMISSIVE = { hex: 0x221808, intensity: 0 };
const CB_EMISSIVE = { hex: 0x28100c, intensity: 0 };
const _pose: SmallPose = { pitch: 0, roll: 0, melt: 0 };
const _events: SmallEvents = { playerDamage: 0, leapHit: false, died: false };
const _meltScale = { x: 1, y: 1, z: 1 };
// Reused threat record published to the store (read via getState by the tracker and auto-aim)
const _threat: ActiveThreat = { id: SMALL_ALIEN_ID, x: 0, z: 0, state: 'PURSUING' };

function clearSmallThreat(state: GameState): void {
  if (state.smallThreat !== null) state.setSmallThreat(null);
}

function resetMaterials(mats: THREE.MeshStandardMaterial[], e: { hex: number; intensity: number }): void {
  restoreMelt(mats);
  for (let i = 0; i < mats.length; i++) {
    mats[i].emissive.setHex(e.hex);
    mats[i].emissiveIntensity = e.intensity;
  }
}

function animationMode(e: SmallAlienSim): AnimMode {
  if (e.state === 'DEAD') return 'DEAD';
  if (e.state === 'LEAPING') return 'LEAP';
  if (e.state === 'ATTACKING') return 'BITE';
  return e.state === 'PURSUING' ? 'RUN' : 'IDLE';
}

export function SmallAlienSpawner() {
  const fhGltf = useGLTF('/models/facehugger.glb'),
    cbGltf = useGLTF('/models/chestburster.glb');
  const rootRef = useRef<THREE.Group>(null);
  const lastRunIdRef = useRef(useGameStore.getState().runId);
  const entityRef = useRef<SmallAlienSim>(createSmallSim());

  const { fhGroup, cbGroup, fhMats, cbMats, faceRig, wormRig } = useMemo(
    () => buildSmallAlienAssets(fhGltf.scene, cbGltf.scene),
    [fhGltf.scene, cbGltf.scene]
  );

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
        sharedImpactFx.current?.triggerImpact(pt, origin, dir, isKill);
        moveConstrained(e, e.x + dir.x * 0.16, e.z + dir.z * 0.16, 0.2);
        AudioManager.play3D(Math.random() > 0.5 ? 'bullet_flesh1' : 'bullet_flesh2', pt.x, pt.y, pt.z, 0.9, 1.05);
        AudioManager.play3D('acid_fizz', pt.x, pt.y, pt.z, 0.75, 1.15);
        if (isKill) {
          e.state = 'DEAD';
          e.stateTimer = SMALL_DEATH_SECONDS;
          e.y = 0.0;
          AudioManager.play3D('xeno_gib1', e.x, 0.2, e.z, 0.88, 1.2);
          AudioManager.play3D('acid_burn', e.x, 0.1, e.z, 0.82, 1.1);
          sharedImpactFx.current?.triggerAcidPool(e.x, e.z, 0.68);
          useGameStore.getState().registerKill('small');
        }
      }
    };
    CombatSystem.registerProvider('small', smallProvider);
    return () => CombatSystem.unregisterProvider('small');
  }, [fhMats, cbMats]);

  const hideAll = () => {
    fhGroup.visible = false;
    cbGroup.visible = false;
  };

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
      hideAll();
      clearSmallThreat(state);
    }
    if (isSimulationFrozen(state.status)) return;
    if (state.status === 'MENU' || state.status === 'VICTORY') {
      e.active = false;
      hideAll();
      clearSmallThreat(state);
      return;
    }
    const [px, , pz] = state.playerPos;

    // Spawn at most ONE Facehugger or Chestburster at a time randomly from off-screen vents
    if (!e.active && state.status === 'PLAYING' && (e.spawnCooldown -= dt) <= 0) {
      const level = getActiveLevel();
      const node = level.spawnNodes[pickSpawnNode(px, pz, state.playerYaw, -1, level.spawnFallback.small)],
        isFH = Math.random() < 0.5;
      spawnSmall(e, node.position[0], node.position[1], node.position[2], px, pz, isFH, state.rules.enemyHpMult);
      r.scale.set(1, 1, 1);
      fhGroup.visible = isFH;
      cbGroup.visible = !isFH;
      resetMaterials(fhMats, FH_EMISSIVE);
      resetMaterials(cbMats, CB_EMISSIVE);
      AudioManager.play3D('vent_clang', e.x, e.y + 0.5, e.z, 0.78, 1.25);
    }
    if (!e.active) {
      clearSmallThreat(state);
      return;
    }

    e.animTime += dt;

    stepSmall(e, px, pz, now, dt, _pose, _events);

    if (_events.playerDamage > 0) {
      AudioManager.play2D('marine_pain', _events.leapHit ? 0.75 : 0.65);
      state.takeDamage(_events.playerDamage, now);
      if (useGameStore.getState().status === 'DEFEAT') AudioManager.play2D('marine_death', 0.9);
    }
    if (_events.died) {
      e.active = false;
      hideAll();
      r.scale.set(1, 1, 1);
      e.spawnCooldown = (4.5 + Math.random() * 3.5) * state.rules.spawnIntervalMult;
      clearSmallThreat(state);
      return;
    }
    if (e.state === 'DEAD' && _pose.melt > 0.3) {
      const k = (_pose.melt - 0.3) / 0.7;
      meltScale(k, _meltScale);
      r.scale.set(_meltScale.x, _meltScale.y, _meltScale.z);
      tintMelt(e.kind === 'FACEHUGGER' ? fhMats : cbMats, Math.min(1, k * 1.8));
    }

    r.position.set(e.x, e.y, e.z);
    r.rotation.set(_pose.pitch, e.yaw, _pose.roll, 'YXZ');

    // Skeletal animation (after the root pose is set so bone motion is expressed in the creature's own frame)
    const mode = animationMode(e);
    const phase = e.animTime * (e.kind === 'FACEHUGGER' ? 17 : 11),
      animT = mode === 'DEAD' ? SMALL_DEATH_SECONDS - e.stateTimer : e.animTime;
    if (e.kind === 'FACEHUGGER') animateFace(faceRig, mode, phase, animT);
    else animateWorm(wormRig, mode, phase, animT);

    if (e.state === 'DEAD') clearSmallThreat(state);
    else {
      _threat.x = e.x;
      _threat.z = e.z;
      _threat.state = e.state === 'LEAPING' ? 'PURSUING' : e.state;
      if (state.smallThreat !== _threat) state.setSmallThreat(_threat);
    }
  });

  return <group ref={rootRef} name="SmallAlienContainer"></group>;
}
useGLTF.preload('/models/facehugger.glb');
useGLTF.preload('/models/chestburster.glb');
