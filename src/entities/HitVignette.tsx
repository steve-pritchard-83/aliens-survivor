import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { useDisposeOnUnmount } from './fx/useDisposeOnUnmount';

// Drawn in clip space like the comfort vignette, so it covers the whole view of each eye whatever the head does
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uFlash;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    // Blood-red at the edges of the view, with a faint wash over everything at the moment of impact
    float edge = smoothstep(0.3, 1.25, r);
    float alpha = (0.12 + edge * 0.78) * uFlash;
    gl_FragColor = vec4(0.62, 0.02, 0.02, clamp(alpha, 0.0, 0.88));
  }
`;

/**
 * Red screen flash when the player is hit, inside a headset (the DOM overlay used on flat screens is not drawn in
 * VR). Reads the same `damageFlash` the flat HUD uses, which decays on its own and is scaled by the damage taken.
 */
export function HitVignette() {
  const { session } = useXR();
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uFlash: { value: 0 } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false
      }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!session || !mesh) return;
    const flash = useGameStore.getState().damageFlash;
    material.uniforms.uFlash.value = flash;
    mesh.visible = flash > 0.01;
  });

  useDisposeOnUnmount(material);

  if (!session) return null;
  return (
    <mesh ref={meshRef} material={material} frustumCulled={false} renderOrder={1000} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
