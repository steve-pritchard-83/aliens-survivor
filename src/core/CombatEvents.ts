import * as THREE from 'three';

export interface HitResult {
  hitXenoId: number | null;
  hitPoint: THREE.Vector3 | null;
}

class CombatDispatcher {
  private handler: ((origin: THREE.Vector3, dir: THREE.Vector3) => HitResult) | null = null;
  private auxHandler: ((origin: THREE.Vector3, dir: THREE.Vector3) => HitResult) | null = null;

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

  public fireRay(origin: THREE.Vector3, dir: THREE.Vector3): HitResult {
    const r1 = this.handler ? this.handler(origin, dir) : { hitXenoId: null, hitPoint: null };
    const r2 = this.auxHandler ? this.auxHandler(origin, dir) : { hitXenoId: null, hitPoint: null };
    if (r2.hitXenoId !== null && r2.hitPoint) {
      if (!r1.hitPoint || origin.distanceTo(r2.hitPoint) < origin.distanceTo(r1.hitPoint)) return r2;
    }
    return r1;
  }
}

export const CombatSystem = new CombatDispatcher();
