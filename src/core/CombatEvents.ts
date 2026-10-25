import * as THREE from 'three';

export interface WallHitResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

export type WallImpactHandler = (point: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3) => void;
export type EnvRaycaster = (origin: THREE.Vector3, dir: THREE.Vector3) => WallHitResult | null;

export type TargetKind = 'xeno' | 'small';

export interface DamageSpec {
  amount: number;
  source: 'player' | 'bishop';
}

export interface TargetQueryOut {
  id: number;
  point: THREE.Vector3;
}

/** Targets answer ray queries without side effects; damage is only applied through applyHit. */
export interface TargetProvider {
  /** Pure: distance to the nearest hit within maxDist (Infinity if none); on a hit writes id and point into `out`. */
  query(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, out: TargetQueryOut): number;
  applyHit(id: number, point: THREE.Vector3, origin: THREE.Vector3, dir: THREE.Vector3, dmg: DamageSpec): void;
}

/** Shared, reused result object: callers must copy any field they keep past the next call. */
export interface ShotOutcome {
  kind: 'none' | 'wall' | 'target';
  target: TargetKind | null;
  id: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

interface ProviderEntry {
  kind: TargetKind;
  provider: TargetProvider;
  out: TargetQueryOut;
}

const DEFAULT_RANGE = 32;

class CombatDispatcher {
  private entries: ProviderEntry[] = [];
  private envRaycaster: EnvRaycaster | null = null;
  private wallImpactHandler: WallImpactHandler | null = null;
  private outcome: ShotOutcome = {
    kind: 'none',
    target: null,
    id: -1,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3()
  };

  public registerProvider(kind: TargetKind, provider: TargetProvider): void {
    this.unregisterProvider(kind);
    this.entries.push({ kind, provider, out: { id: -1, point: new THREE.Vector3() } });
  }
  public unregisterProvider(kind: TargetKind): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].kind === kind) this.entries.splice(i, 1);
    }
  }

  public registerEnvRaycaster(fn: EnvRaycaster): void {
    this.envRaycaster = fn;
  }
  public unregisterEnvRaycaster(): void {
    this.envRaycaster = null;
  }

  public registerWallImpactHandler(fn: WallImpactHandler): void {
    this.wallImpactHandler = fn;
  }
  public unregisterWallImpactHandler(): void {
    this.wallImpactHandler = null;
  }

  public fireEnvironmentRay(origin: THREE.Vector3, dir: THREE.Vector3): WallHitResult | null {
    return this.envRaycaster ? this.envRaycaster(origin, dir) : null;
  }

  public triggerWallImpact(point: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3): void {
    if (this.wallImpactHandler) this.wallImpactHandler(point, normal, dir);
  }

  /** Nearest provider entry along the ray, or null. Pure. */
  private nearestEntry(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): ProviderEntry | null {
    let best: ProviderEntry | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const d = e.provider.query(origin, dir, maxDist, e.out);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private fill(kind: ShotOutcome['kind'], target: TargetKind | null, id: number, point?: THREE.Vector3): ShotOutcome {
    const o = this.outcome;
    o.kind = kind;
    o.target = target;
    o.id = id;
    if (point) o.point.copy(point);
    return o;
  }

  /**
   * Side-effect free: reports what a shot along this ray would hit, with walls occluding targets.
   * The environment ray only runs when a target is found, keeping per-frame probes cheap.
   */
  public queryTarget(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = DEFAULT_RANGE): ShotOutcome {
    const hit = this.nearestEntry(origin, dir, maxDist);
    if (!hit) return this.fill('none', null, -1);
    const wall = this.fireEnvironmentRay(origin, dir);
    if (wall && origin.distanceTo(wall.point) < origin.distanceTo(hit.out.point)) {
      this.fill('wall', null, -1, wall.point).normal.copy(wall.normal);
      return this.outcome;
    }
    return this.fill('target', hit.kind, hit.out.id, hit.out.point);
  }

  /** Resolves a real shot: applies damage to the nearest unoccluded target, otherwise triggers a wall impact. */
  public resolveShot(origin: THREE.Vector3, dir: THREE.Vector3, dmg: DamageSpec, maxDist = DEFAULT_RANGE): ShotOutcome {
    const hit = this.nearestEntry(origin, dir, maxDist);
    const wall = this.fireEnvironmentRay(origin, dir);
    const hitDist = hit ? origin.distanceTo(hit.out.point) : Infinity;
    const wallDist = wall ? origin.distanceTo(wall.point) : Infinity;
    if (hit && hitDist <= wallDist) {
      this.fill('target', hit.kind, hit.out.id, hit.out.point);
      hit.provider.applyHit(hit.out.id, this.outcome.point, origin, dir, dmg);
      return this.outcome;
    }
    if (wall) {
      this.fill('wall', null, -1, wall.point).normal.copy(wall.normal);
      this.triggerWallImpact(this.outcome.point, this.outcome.normal, dir);
      return this.outcome;
    }
    return this.fill('none', null, -1);
  }
}

export const CombatSystem = new CombatDispatcher();
