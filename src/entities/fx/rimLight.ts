import * as THREE from 'three';

/**
 * Adds a cold fresnel edge glow to a standard material, like the back-lit rim on the creatures in the film art.
 * It needs no scene light, so it costs nothing against the Quest light budget. Added to the emissive term, so
 * distance fog fades it out with everything else.
 */
export function applyRim(mat: THREE.MeshStandardMaterial, strength: number, power = 2.6, color = 0x5fd0e8): void {
  const c = new THREE.Color(color);
  const rgb = `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rimFactor = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), ${power.toFixed(2)});
      totalEmissiveRadiance += ${rgb} * rimFactor * ${strength.toFixed(3)};`
    );
  };
  mat.customProgramCacheKey = () => `rim-${strength}-${power}-${color}`;
  mat.needsUpdate = true;
}
