export const BALANCE = {
  MISSION_DURATION_SECONDS: 300,
  PLAYER: {
    MAX_HP: 100,
    MOVE_SPEED: 4.2,
    REGEN_DELAY: 8.0,
    REGEN_RATE: 2.0
  },
  WEAPON: {
    MAGAZINE_DEFAULT: 99,
    MAGAZINE_EXTENDED: 150,
    FIRE_INTERVAL_DEFAULT: 0.085,
    FIRE_INTERVAL_OVERCLOCKED: 0.065,
    RELOAD_TIME: 2.5,
    JAM_THRESHOLD_SECONDS: 5.0,
    BASE_DAMAGE: 24,
    AP_DAMAGE: 34
  },
  PHASES: {
    PHASE_1_END: 225,
    PHASE_2_END: 120,
    PHASE_3_END: 45
  },
  XENO_POOL: {
    MAX_DRONES: 6,
    SPAWN_INTERVALS: [3.5, 2.8, 2.2, 1.6],
    BASE_SPEEDS: [2.85, 3.35, 3.85, 4.35],
    MAX_HPS: [300, 360, 420, 480]
  },
  PRAETORIAN: {
    HP: 1100,
    SPEED: 3.2,
    SCALE: 0.65,
    DAMAGE_RESISTANCE: 0.35
  },
  XP: {
    DRONE_KILL: 25,
    SMALL_KILL: 15,
    PRAETORIAN_KILL: 150,
    LEVEL_THRESHOLDS: [50, 120, 220, 360, 550, 800, 1150]
  }
} as const;

export interface UpgradeCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const UPGRADE_CATALOG: UpgradeCard[] = [
  { id: 'fire_rate', title: 'OVERCLOCKED ACTUATOR', desc: '+25% Pulse Rifle Rate of Fire', icon: '⚡' },
  { id: 'extended_mag', title: '150-ROUND DRUM', desc: 'Extended 150-Round Ammo Capacity & Instant Reload', icon: '📦' },
  { id: 'armor_boost', title: 'REINFORCED CHITIN ARMOR', desc: '+50 Max HP & Immediate Full Medical Heal', icon: '🛡️' },
  { id: 'ap_ammo', title: 'M309 ARMOR PIERCING', desc: '+40% Pulse Rifle Kinetic Impact & Dismemberment', icon: '💥' },
  { id: 'tracker_gain', title: '360° SCANNER ARRAY', desc: 'Upgrades Motion Tracker to Full 360° Corridor Coverage', icon: '📡' },
  { id: 'acid_proofing', title: 'HAZMAT ACID RESIST', desc: '50% Damage Reduction From Xenomorph Acid Pools', icon: '🧪' }
];
