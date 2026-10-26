import { BALANCE } from '../../data/balance';
import { getHallId, moveConstrained } from '../../core/CorridorNav';
import { getActiveLevel } from '../../levels';
import { advanceCorner } from '../../systems/corridorPathing';

export type SmallKind = 'FACEHUGGER' | 'CHESTBURSTER';
export type SmallState = 'SPAWNING' | 'PURSUING' | 'LEAPING' | 'ATTACKING' | 'DEAD';

export const SMALL_DEATH_SECONDS = 2.4;
const LEAP_SECONDS = 0.58;

/** Plain simulation record for the single facehugger / chestburster (no three.js types). */
export interface SmallAlienSim {
  active: boolean;
  kind: SmallKind;
  state: SmallState;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  targetCorner: number;
  leapCooldown: number;
  leapVx: number;
  leapVz: number;
  stateTimer: number;
  attackCooldown: number;
  vocalTimer: number;
  spawnCooldown: number;
  animTime: number;
}

/** Visual pose derived from the simulation for the current frame. */
export interface SmallPose {
  pitch: number;
  roll: number;
  /** 0..1 progress of the acid melt while dead. */
  melt: number;
}

/** One-frame outputs the component turns into audio, damage and cleanup. */
export interface SmallEvents {
  playerDamage: number;
  leapHit: boolean;
  died: boolean;
}

export function createSmallSim(): SmallAlienSim {
  return {
    active: false,
    kind: 'FACEHUGGER',
    state: 'DEAD',
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
    vocalTimer: 1.5,
    spawnCooldown: BALANCE.SMALL_ALIEN.FIRST_SPAWN_DELAY,
    animTime: 0
  };
}

export function spawnSmall(
  e: SmallAlienSim,
  nodeX: number,
  nodeY: number,
  nodeZ: number,
  px: number,
  pz: number,
  isFacehugger: boolean,
  hpMult = 1
): void {
  const baseHp = isFacehugger ? BALANCE.SMALL_ALIEN.FACEHUGGER_HP : BALANCE.SMALL_ALIEN.CHESTBURSTER_HP;
  const hp = Math.round(baseHp * hpMult);
  e.active = true;
  e.kind = isFacehugger ? 'FACEHUGGER' : 'CHESTBURSTER';
  e.state = 'SPAWNING';
  e.stateTimer = 0.45;
  e.hp = hp;
  e.maxHp = hp;
  e.x = nodeX;
  e.y = Math.min(0.6, nodeY);
  e.z = nodeZ;
  e.yaw = Math.atan2(px - nodeX, pz - nodeZ);
  e.speed = isFacehugger ? BALANCE.SMALL_ALIEN.SPEED_FACEHUGGER : BALANCE.SMALL_ALIEN.SPEED_CHESTBURSTER;
  e.targetCorner = -1;
  e.leapCooldown = 0.4;
  e.attackCooldown = 0;
  e.vocalTimer = 1.1;
}

function turnToward(e: SmallAlienSim, dx: number, dz: number, rate: number): void {
  let diff = Math.atan2(dx, dz) - e.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  e.yaw += diff * rate;
}

function pursue(e: SmallAlienSim, px: number, pz: number, now: number, dt: number, dist: number): void {
  const xH = getHallId(e.x, e.z),
    pH = getHallId(px, pz);
  let tx = px,
    tz = pz;
  if (xH === pH) {
    e.targetCorner = -1;
    const slither = Math.sin(now * (e.kind === 'CHESTBURSTER' ? 9.5 : 6.5)) * 0.22;
    if (dist > 1.8) {
      const lane = getActiveLevel().halls[xH].lane;
      if (lane.axis === 'x') tx = lane.value + slither;
      else tz = lane.value + slither;
    }
  } else {
    e.targetCorner = advanceCorner(e.targetCorner, xH, pH, e.x, e.z, px, pz);
    if (e.targetCorner >= 0) {
      tx = getActiveLevel().corners[e.targetCorner][0];
      tz = getActiveLevel().corners[e.targetCorner][1];
    }
  }
  const dx = tx - e.x,
    dz = tz - e.z,
    dT = Math.hypot(dx, dz);
  if (dT > 0.04) {
    turnToward(e, dx, dz, Math.min(1, dt * 15));
    moveConstrained(e, e.x + (dx / dT) * e.speed * dt, e.z + (dz / dT) * e.speed * dt, 0.18);
  }
}

/** Advances the behaviour state machine one frame. Writes the visual pose and any events. */
export function stepSmall(
  e: SmallAlienSim,
  px: number,
  pz: number,
  now: number,
  dt: number,
  pose: SmallPose,
  ev: SmallEvents
): void {
  ev.playerDamage = 0;
  ev.leapHit = false;
  ev.died = false;
  pose.pitch = 0;
  pose.roll = 0;
  pose.melt = 0;
  const dist = Math.hypot(px - e.x, pz - e.z);

  if (e.state === 'SPAWNING') {
    e.stateTimer -= dt;
    e.y += (0 - e.y) * Math.min(1, dt * 6.0);
    e.yaw = Math.atan2(px - e.x, pz - e.z);
    if (e.stateTimer <= 0) {
      e.y = 0.0;
      e.state = 'PURSUING';
    }
  } else if (e.state === 'PURSUING') {
    e.leapCooldown = Math.max(0, e.leapCooldown - dt);
    const sameHall = getHallId(e.x, e.z) === getHallId(px, pz);
    if (
      sameHall &&
      e.leapCooldown <= 0 &&
      dist >= BALANCE.SMALL_ALIEN.LEAP_MIN_DIST &&
      dist <= BALANCE.SMALL_ALIEN.LEAP_MAX_DIST
    ) {
      e.state = 'LEAPING';
      e.stateTimer = LEAP_SECONDS;
      e.leapCooldown = BALANCE.SMALL_ALIEN.LEAP_COOLDOWN;
      const inv = 1 / Math.max(0.1, dist);
      e.leapVx = (px - e.x) * inv * (e.speed * 2.4);
      e.leapVz = (pz - e.z) * inv * (e.speed * 2.4);
      e.yaw = Math.atan2(e.leapVx, e.leapVz);
    } else if (dist <= BALANCE.SMALL_ALIEN.BITE_RANGE) {
      e.state = 'ATTACKING';
      e.attackCooldown = 0.25;
    } else {
      pursue(e, px, pz, now, dt, dist);
    }
  } else if (e.state === 'LEAPING') {
    e.stateTimer -= dt;
    const u = 1.0 - Math.max(0, e.stateTimer / LEAP_SECONDS);
    e.y = Math.sin(u * Math.PI) * (e.kind === 'FACEHUGGER' ? 1.35 : 0.88);
    pose.pitch = (u - 0.5) * -0.6;
    moveConstrained(e, e.x + e.leapVx * dt, e.z + e.leapVz * dt, 0.18);
    if (dist <= BALANCE.SMALL_ALIEN.BITE_RANGE) {
      e.y = 0.0;
      pose.pitch = 0;
      e.state = 'ATTACKING';
      e.attackCooldown = 0.65;
      ev.playerDamage = BALANCE.SMALL_ALIEN.LEAP_DAMAGE;
      ev.leapHit = true;
    } else if (e.stateTimer <= 0) {
      e.y = 0.0;
      pose.pitch = 0;
      e.state = 'PURSUING';
    }
  } else if (e.state === 'ATTACKING') {
    e.yaw = Math.atan2(px - e.x, pz - e.z);
    if (dist > BALANCE.SMALL_ALIEN.DISENGAGE_RANGE) e.state = 'PURSUING';
    else if ((e.attackCooldown -= dt) <= 0) {
      e.attackCooldown = BALANCE.SMALL_ALIEN.BITE_INTERVAL;
      ev.playerDamage = BALANCE.SMALL_ALIEN.BITE_DAMAGE;
    }
  } else {
    e.stateTimer -= dt;
    const melt = 1.0 - Math.max(0, e.stateTimer / SMALL_DEATH_SECONDS);
    const flip = Math.min(1, melt * 3.0);
    pose.roll = flip * (e.kind === 'FACEHUGGER' ? Math.PI * 0.88 : 0.65);
    // A flipped facehugger would otherwise sink into the deck, so lift it as it rolls onto its back
    e.y = (e.kind === 'FACEHUGGER' ? 0.2 : 0.05) * flip;
    if (melt > 0.3) e.y -= ((melt - 0.3) / 0.7) * 0.18;
    pose.melt = melt;
    if (e.stateTimer <= 0) ev.died = true;
  }
}
