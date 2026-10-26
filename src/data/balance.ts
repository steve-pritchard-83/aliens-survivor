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
    LEAP_DAMAGE: 38,
    SLASH_DAMAGE: 34,
    SLASH_INTERVAL: 1.15,
    LEAP_MIN_DIST: 3.2,
    LEAP_MAX_DIST: 8.5
  },
  PRAETORIAN: {
    HP: 1100,
    SPEED: 3.1,
    SCALE: 0.62,
    /** Multiplier on damage taken (0.65 = 35% damage resistance). */
    DAMAGE_TAKEN_MULT: 0.65
  },
  SMALL_ALIEN: {
    FACEHUGGER_HP: 72,
    CHESTBURSTER_HP: 96,
    DAMAGE_PER_HIT: 30,
    LEAP_DAMAGE: 26,
    BITE_DAMAGE: 22,
    FIRST_SPAWN_DELAY: 7.0
  },
  XP: {
    DRONE_KILL: 25,
    SMALL_KILL: 15,
    PRAETORIAN_KILL: 150,
    LEVEL_THRESHOLDS: [50, 120, 220, 360, 550, 800, 1150]
  },
  TRACKER: {
    BASE_RANGE: 25.0
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
  { id: 'fire_rate', title: 'OVERCLOCKED ACTUATOR', desc: '+25% Pulse Rifle Rate of Fire', icon: '⚡' },
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
    title: '360° SCANNER ARRAY',
    desc: 'Upgrades Motion Tracker to Full 360° Corridor Coverage',
    icon: '📡'
  },
  {
    id: 'acid_proofing',
    title: 'HAZMAT ACID RESIST',
    desc: '50% Damage Reduction From Xenomorph Acid Pools',
    icon: '🧪'
  }
];
