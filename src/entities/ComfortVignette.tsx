import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useGameStore } from '../core/GameStore';
import { comfort } from '../core/ComfortState';
import { vignetteTarget, smoothStrength } from '../systems/comfort';

// The quad is drawn in clip space, so it covers the whole view of each eye regardless of head pose
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uStrength;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float edge = smoothstep(mix(1.0, 0.35, uStrength), mix(1.5, 0.9, uStrength), r);
    gl_FragColor = vec4(0.0, 0.0, 0.0, edge * clamp(uStrength * 1.2, 0.0, 0.92));
  }
`;

/** Peripheral darkening during turning and movement to reduce VR motion sickness. */
export function ComfortVignette() {
  const { session } = useXR();
  const meshRef = useRef<THREE.Mesh>(null);
  const strengthRef = useRef(0);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uStrength: { value: 0 } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false
      }),
    []
  );

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!session || !mesh) return;
    const state = useGameStore.getState();
    comfort.snapPulse = Math.max(0, comfort.snapPulse - dt);
    const playing = state.status === 'PLAYING';
    const target = playing
      ? vignetteTarget(comfort.turnRate, comfort.move, comfort.snapPulse, state.settings.vignette)
      : 0;
    strengthRef.current = smoothStrength(strengthRef.current, target, dt);
    material.uniforms.uStrength.value = strengthRef.current;
    mesh.visible = strengthRef.current > 0.01;
  });

  if (!session) return null;
  return (
    <mesh ref={meshRef} material={material} frustumCulled={false} renderOrder={999} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
