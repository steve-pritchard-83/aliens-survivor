import { BALANCE } from '../../data/balance';
import { getHallId, moveConstrained } from '../../core/CorridorNav';
import { getActiveLevel } from '../../levels';
import { advanceCorner } from '../../systems/corridorPathing';
import { PooledXenomorph, playClip, CLIP_RUN, CLIP_WALK, CLIP_LEAP, ATK_CLIPS } from '../XenoTypes';

const LEAP_SECONDS = 0.78;

export interface XenoPose {
  pitch: number;
  roll: number;
}

/** One-frame outputs the component turns into audio and player damage. */
export interface XenoEvents {
  playerDamage: number;
  leapHit: boolean;
  slash: boolean;
  leapStarted: boolean;
}

function turnToward(x: PooledXenomorph, dx: number, dz: number, rate: number): void {
  let diff = Math.atan2(dx, dz) - x.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  x.yaw += diff * rate;
}

function randomAttackClip(): string {
  return ATK_CLIPS[Math.floor(Math.random() * ATK_CLIPS.length)];
}

function legsIntact(x: PooledXenomorph): boolean {
  return !x.severedLimbs[2] && !x.severedLimbs[3];
}

function pursue(x: PooledXenomorph, px: number, pz: number, dt: number, dist: number, xH: number, pH: number): void {
  let tx = px,
    tz = pz;
  if (xH === pH) {
    x.targetCorner = -1;
    if (dist > 2.2) {
      const lane = getActiveLevel().halls[xH].lane;
      if (lane.axis === 'x') tx = lane.value + x.laneOffset;
      else tz = lane.value + x.laneOffset;
    }
  } else {
    x.targetCorner = advanceCorner(x.targetCorner, xH, pH, x.x, x.z, px, pz);
    if (x.targetCorner >= 0) {
      tx = getActiveLevel().corners[x.targetCorner][0];
      tz = getActiveLevel().corners[x.targetCorner][1];
    }
  }
  const dx = tx - x.x,
    dz = tz - x.z,
    dT = Math.hypot(dx, dz);
  if (dT > 0.04) {
    turnToward(x, dx, dz, Math.min(1, dt * 12));
    moveConstrained(x, x.x + (dx / dT) * x.speed * dt, x.z + (dz / dT) * x.speed * dt, 0.24);
  }
}

function stepPursuing(x: PooledXenomorph, px: number, pz: number, dt: number, dist: number, ev: XenoEvents): void {
  x.leapCooldown = Math.max(0, x.leapCooldown - dt);
  if ((x.gaitTimer -= dt) <= 0) {
    x.gaitTimer = 2.0 + Math.random() * 2.5;
    const nextClip = !legsIntact(x) || Math.random() < 0.28 ? CLIP_WALK : CLIP_RUN;
    playClip(x, nextClip, true, nextClip === CLIP_WALK ? 1.25 : 0.92 + Math.random() * 0.25);
  }
  const xH = getHallId(x.x, x.z),
    pH = getHallId(px, pz);
  if (
    xH === pH &&
    legsIntact(x) &&
    x.leapCooldown <= 0 &&
    dist >= BALANCE.XENO_POOL.LEAP_MIN_DIST &&
    dist <= BALANCE.XENO_POOL.LEAP_MAX_DIST
  ) {
    x.state = 'LEAPING';
    x.stateTimer = LEAP_SECONDS;
    x.leapCooldown = 3.2;
    const inv = 1 / Math.max(0.1, dist);
    x.leapVx = (px - x.x) * inv * (x.speed * 2.35);
    x.leapVz = (pz - x.z) * inv * (x.speed * 2.35);
    x.yaw = Math.atan2(x.leapVx, x.leapVz);
    playClip(x, CLIP_LEAP, false, 1.45);
    ev.leapStarted = true;
  } else if (dist <= 1.75) {
    x.state = 'ATTACKING';
    x.attackCooldown = 0.35;
    playClip(x, randomAttackClip(), true, 1.05);
  } else {
    pursue(x, px, pz, dt, dist, xH, pH);
  }
}

function stepLeaping(x: PooledXenomorph, dt: number, dist: number, pose: XenoPose, ev: XenoEvents): void {
  x.stateTimer -= dt;
  const u = 1.0 - Math.max(0, x.stateTimer / LEAP_SECONDS);
  x.y = Math.sin(u * Math.PI) * 0.96;
  pose.pitch = Math.cos(u * Math.PI) * -0.52;
  moveConstrained(x, x.x + x.leapVx * dt, x.z + x.leapVz * dt, 0.24);
  if (dist <= 1.65) {
    x.y = 0.0;
    pose.pitch = 0;
    x.state = 'ATTACKING';
    x.attackCooldown = 0.75;
    ev.playerDamage = BALANCE.XENO_POOL.LEAP_DAMAGE;
    ev.leapHit = true;
    playClip(x, ATK_CLIPS[0], true, 1.1);
  } else if (x.stateTimer <= 0) {
    x.y = 0.0;
    pose.pitch = 0;
    x.state = 'PURSUING';
    playClip(x, CLIP_RUN, true, 1.0);
  }
}

function stepAttacking(x: PooledXenomorph, px: number, pz: number, dt: number, dist: number, ev: XenoEvents): void {
  x.yaw = Math.atan2(px - x.x, pz - x.z);
  if (dist > 2.05) {
    x.state = 'PURSUING';
    playClip(x, legsIntact(x) ? CLIP_RUN : CLIP_WALK, true, 1.0);
  } else if ((x.attackCooldown -= dt) <= 0) {
    x.attackCooldown = BALANCE.XENO_POOL.SLASH_INTERVAL;
    playClip(x, randomAttackClip(), true, 1.05);
    ev.playerDamage = BALANCE.XENO_POOL.SLASH_DAMAGE;
    ev.slash = true;
  }
}

/** Advances a living (non-DEAD) drone one frame. Death animation lives in xenoDeath.ts. */
export function stepXeno(x: PooledXenomorph, px: number, pz: number, dt: number, pose: XenoPose, ev: XenoEvents): void {
  ev.playerDamage = 0;
  ev.leapHit = false;
  ev.slash = false;
  ev.leapStarted = false;
  pose.pitch = 0;
  pose.roll = 0;
  const dist = Math.hypot(px - x.x, pz - x.z);
  if (x.state === 'SPAWNING') {
    x.stateTimer -= dt;
    x.y += (0 - x.y) * dt * 4.5;
    x.yaw = Math.atan2(px - x.x, pz - x.z);
    if (x.stateTimer <= 0) {
      x.y = 0.0;
      x.state = 'PURSUING';
      playClip(x, CLIP_RUN, true, 0.95);
    }
  } else if (x.state === 'PURSUING') stepPursuing(x, px, pz, dt, dist, ev);
  else if (x.state === 'LEAPING') stepLeaping(x, dt, dist, pose, ev);
  else if (x.state === 'ATTACKING') stepAttacking(x, px, pz, dt, dist, ev);
}
