import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

/**
 * Pooled enemies, effects and pickups are hidden until they are used, and three.js only compiles the shaders of
 * visible objects, so the first time each one appears the game stalls while its shader compiles (a hitch in the
 * middle of a fight). This compiles everything once, shortly after the scene has loaded, by making hidden objects
 * visible for a moment. Nothing is rendered while they are visible. Renders nothing itself.
 */
export function ShaderWarmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      try {
        gl.compile(scene, camera);
      } catch (e) {
        console.warn('[ShaderWarmup] compile failed', e);
      } finally {
        for (const o of hidden) o.visible = false;
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [gl, scene, camera]);

  return null;
}
