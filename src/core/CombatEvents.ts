import * as THREE from 'three';

export interface HitResult {
  hitXenoId: number | null;
  hitPoint: THREE.Vector3 | null;
}

export interface WallHitResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

export type WallImpactHandler = (point: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3) => void;
export type EnvRaycaster = (origin: THREE.Vector3, dir: THREE.Vector3) => WallHitResult | null;

class CombatDispatcher {
  private handler: ((origin: THREE.Vector3, dir: THREE.Vector3) => HitResult) | null = null;
  private auxHandler: ((origin: THREE.Vector3, dir: THREE.Vector3) => HitResult) | null = null;
  private envRaycaster: EnvRaycaster | null = null;
  private wallImpactHandler: WallImpactHandler | null = null;

  public registerHandler(fn: (origin: THREE.Vector3, dir: THREE.Vector3) => HitResult): void {
    this.handler = fn;
  }
  public unregisterHandler(): void {
    this.handler = null;
  }

  public registerAuxHandler(fn: (origin: THREE.Vector3, dir: THREE.Vector3) => HitResult): void {
    this.auxHandler = fn;
  }
  public unregisterAuxHandler(): void {
    this.auxHandler = null;
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

  public fireRay(origin: THREE.Vector3, dir: THREE.Vector3): HitResult {
    const r1 = this.handler ? this.handler(origin, dir) : { hitXenoId: null, hitPoint: null };
    const r2 = this.auxHandler ? this.auxHandler(origin, dir) : { hitXenoId: null, hitPoint: null };
    if (r2.hitXenoId !== null && r2.hitPoint) {
      if (!r1.hitPoint || origin.distanceTo(r2.hitPoint) < origin.distanceTo(r1.hitPoint)) return r2;
    }
    return r1;
  }

  public fireEnvironmentRay(origin: THREE.Vector3, dir: THREE.Vector3): WallHitResult | null {
    return this.envRaycaster ? this.envRaycaster(origin, dir) : null;
  }

  public triggerWallImpact(point: THREE.Vector3, normal: THREE.Vector3, dir: THREE.Vector3): void {
    if (this.wallImpactHandler) {
      this.wallImpactHandler(point, normal, dir);
    }
  }
}

export const CombatSystem = new CombatDispatcher();
