export const BALANCE = {
  MISSION_DURATION_SECONDS: 300,
  PLAYER: {
    MAX_HP: 100,
    /**
     * Walking speed in m/s on desktop and touch. Movement used to integrate from a position that was only refreshed
     * every 50 ms, so the real speed depended on frame rate (about 1.4 m/s at 60 fps, 2.8 at 30 fps). Now frame-rate
     * independent; 1.2 proved too slow on desktop, so this is a brisk walk.
     */
    MOVE_SPEED: 3.0,
    /** Walking speed in m/s in VR, kept lower than flat-screen play for comfort. */
    XR_MOVE_SPEED: 1.8,
    /** Raises the XR origin for seated play (headset sits lower than when standing), metres. */
    SEATED_HEIGHT_OFFSET: 0.45,
    /** Keep-out distance from corridor walls for the headset, so the view cannot poke through geometry. */
    XR_WALL_MARGIN: 0.15,
    REGEN_DELAY: 8.0,
    REGEN_RATE: 2.0
  },
  /** Weapon-agnostic damage rules. Per-weapon numbers (damage, magazine, reload...) live in data/weapons.ts. */
  WEAPON: {
    AP_MULTIPLIER: 1.4,
    /** Damage scale against aliens still emerging from vents (18 / 24). */
    SPAWNING_TARGET_DAMAGE_SCALE: 0.75
  },
  PHASES: {
    PHASE_1_END: 225,
    PHASE_2_END: 120,
    PHASE_3_END: 45
  },
  XENO_POOL: {
    MAX_DRONES: 6,
    MAX_CONCURRENT: 2,
    FIRST_SPAWN_DELAY: 5.0,
    SPAWN_INTERVALS: [3.5, 2.8, 2.2, 1.6],
    BASE_SPEEDS: [2.85, 3.35, 3.85, 4.35],
    MAX_HPS: [300, 360, 420, 480],
    SCALE: 0.45,
    /** Hit sphere (centre height above the deck, radius, and radius while still emerging), metres. */
    HIT_CENTER_Y: 0.72,
    HIT_RADIUS: 0.84,
    SPAWN_HIT_RADIUS: 0.54,
    LEAP_DAMAGE: 38,
    SLASH_DAMAGE: 34,
    SLASH_INTERVAL: 1.15,
    LEAP_MIN_DIST: 3.2,
    LEAP_MAX_DIST: 8.5,
    /** Chance per second (while a leap is possible) that a pursuing drone leaps. */
    LEAP_RATE_PER_SECOND: 1.4,
    /** Distances (m): starts a slash, a leap counts as a hit, and a slashing drone gives chase again. */
    ATTACK_RANGE: 1.75,
    LEAP_HIT_RANGE: 1.65,
    DISENGAGE_RANGE: 2.05,
    /** Seconds before the first slash after closing in, and after a leap lands. */
    ATTACK_FIRST_DELAY: 0.35,
    ATTACK_AFTER_LEAP_DELAY: 0.75,
    /** Keep-out distance from corridor walls (m). */
    WALL_MARGIN: 0.24,
    /** A leg comes off when HP first drops below this fraction of maximum. */
    LEG_SEVER_HP_FRACTION: 0.45
  },
  /** The Alien Queen boss (alien_queen.glb): one per phase 3 and 4, shown in place of a drone on a pool slot. */
  QUEEN: {
    FIRST_PHASE: 3,
    HP: 1100,
    SPEED: 3.1,
    /** Metres per model unit: the authored model is 295 units tall, so about 2.1 m (the corridor is 2.5 m high). */
    SCALE: 0.0072,
    HIT_CENTER_Y: 1.15,
    HIT_RADIUS: 1.15,
    /** Multiplier on damage taken (0.65 = 35% damage resistance). */
    DAMAGE_TAKEN_MULT: 0.65
  },
  SMALL_ALIEN: {
    FACEHUGGER_HP: 72,
    CHESTBURSTER_HP: 96,
    DAMAGE_PER_HIT: 30,
    LEAP_DAMAGE: 26,
    BITE_DAMAGE: 22,
    FIRST_SPAWN_DELAY: 7.0,
    SPEED_FACEHUGGER: 4.65,
    SPEED_CHESTBURSTER: 4.25,
    /** Leap distance window (m) and cooldown (s). */
    LEAP_MIN_DIST: 1.6,
    LEAP_MAX_DIST: 6.2,
    LEAP_COOLDOWN: 2.2,
    /** Distances (m): starts or lands a bite, and a biting alien gives chase again. */
    BITE_RANGE: 1.45,
    DISENGAGE_RANGE: 1.75,
    BITE_INTERVAL: 0.95,
    /** Hit sphere radius (m). */
    HIT_RADIUS: 0.48,
    /** Seconds until the next small alien is allowed: minimum plus a random spread. */
    RESPAWN_MIN_SECONDS: 4.5,
    RESPAWN_SPREAD_SECONDS: 3.5
  },
  XP: {
    DRONE_KILL: 25,
    SMALL_KILL: 15,
    QUEEN_KILL: 150,
    LEVEL_THRESHOLDS: [50, 120, 220, 360, 550, 800, 1150]
  },
  TRACKER: {
    BASE_RANGE: 25.0
  },
  /** A held-back level-up opens after a lull; see systems/levelUpGate.ts. */
  LEVEL_UP_GATE: {
    /** A hostile closer than this (m) counts as combat. */
    CALM_RADIUS: 14,
    /** The area must stay clear this long (s) before the cards open. */
    CALM_SECONDS: 1.5,
    /** Safety valve: the cards open after this long (s) even if the fight never lets up. */
    MAX_WAIT_SECONDS: 60
  },
  /**
   * Distances (m) used by shooting and auto-aim. They differ on purpose: the environment ray reaches the far end of
   * the longest hall, auto-aim only helps on targets worth correcting for, and the weapon's own range
   * (data/weapons.ts) is what bullets actually travel.
   */
  RANGES: {
    ENV_RAY_MAX: 52,
    /** Wall distance assumed by the auto-aim probe when no wall is hit. */
    AUTO_AIM_OPEN_DISTANCE: 55,
    AUTO_AIM_DRONE: 24,
    AUTO_AIM_SMALL: 18
  },
  /** Leaderboard score weights (see systems/scoring.ts). */
  SCORE: {
    DRONE_KILL: 100,
    SMALL_KILL: 60,
    BOSS_KILL: 1000,
    ACCURACY_PER_PERCENT: 10,
    SURVIVAL_PER_SECOND: 5
  }
} as const;

/** Numeric effects of each upgrade card; GameStore and MotionTracker read these instead of literals. */
export const UPGRADE_EFFECTS = {
  armor_boost: { maxHpBonus: 50 },
  acid_proofing: { acidDamageMult: 0.5 },
  tracker_gain: { trackerRange: 42.0 }
} as const;

export interface UpgradeCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const UPGRADE_CATALOG: UpgradeCard[] = [
  { id: 'fire_rate', title: 'OVERCLOCKED ACTUATOR', desc: '+31% Pulse Rifle Rate of Fire', icon: '⚡' },
  {
    id: 'extended_mag',
    title: '150-ROUND DRUM',
    desc: 'Extended 150-Round Ammo Capacity & Instant Reload',
    icon: '📦'
  },
  { id: 'armor_boost', title: 'REINFORCED CHITIN ARMOR', desc: '+50 Max HP & Immediate Full Medical Heal', icon: '🛡️' },
  { id: 'ap_ammo', title: 'M309 ARMOR PIERCING', desc: '+40% Pulse Rifle Kinetic Impact & Dismemberment', icon: '💥' },
  {
    id: 'tracker_gain',
    title: 'LONG-RANGE SCANNER ARRAY',
    desc: `Extends Motion Tracker Range From ${BALANCE.TRACKER.BASE_RANGE} m To ${UPGRADE_EFFECTS.tracker_gain.trackerRange} m`,
    icon: '📡'
  },
  {
    id: 'acid_proofing',
    title: 'HAZMAT ACID RESIST',
    desc: '50% Damage Reduction From Xenomorph Acid Pools',
    icon: '🧪'
  }
];
