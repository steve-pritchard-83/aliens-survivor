// Pooled state records for severed limb gibs and acid puddles
export interface SeveredGib {
  active: boolean;
  xenoId: number;
  settled: boolean;
  melting: boolean;
  meltTimer: number;
  meltDuration: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
}
export interface AcidPuddle {
  active: boolean;
  timer: number;
  maxTimer: number;
  targetScale: number;
}

export function createGibPool(size: number): SeveredGib[] {
  return Array.from({ length: size }, () => ({
    active: false,
    xenoId: -1,
    settled: false,
    melting: false,
    meltTimer: 0,
    meltDuration: 2.2,
    vx: 0,
    vy: 0,
    vz: 0,
    rx: 0,
    ry: 0,
    rz: 0
  }));
}

export function createPuddlePool(size: number): AcidPuddle[] {
  return Array.from({ length: size }, () => ({ active: false, timer: 0, maxTimer: 14, targetScale: 0.9 }));
}
