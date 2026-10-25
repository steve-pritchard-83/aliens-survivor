import * as THREE from 'three';

/** Very dark acid green that dying enemies melt toward. */
const MELT_GREEN = new THREE.Color(0x020f07);
const baseColors = new WeakMap<THREE.Material, THREE.Color>();

/** Darkens the materials toward the melt green; k runs from 0 (untouched) to 1 (fully melted). */
export function tintMelt(materials: THREE.MeshStandardMaterial[], k: number): void {
  for (const m of materials) {
    let base = baseColors.get(m);
    if (!base) {
      base = m.color.clone();
      baseColors.set(m, base);
    }
    m.color.copy(base).lerp(MELT_GREEN, k);
  }
}

/** Puts the original colours back when a pooled enemy is reused. */
export function restoreMelt(materials: THREE.MeshStandardMaterial[]): void {
  for (const m of materials) {
    const base = baseColors.get(m);
    if (base) m.color.copy(base);
  }
}

/** Gooey collapse shape for a melt progress k in 0..1: eased squash with a fading wobble and a spreading pool. */
export function meltScale(k: number, out: { x: number; y: number; z: number }): void {
  const e = k * k * (3 - 2 * k);
  const wobble = Math.sin(k * 22) * 0.05 * (1 - k);
  out.x = 1 + e * 0.38 + wobble;
  out.y = Math.max(0.03, 1 - e * 0.95);
  out.z = 1 + e * 0.38 - wobble;
}
