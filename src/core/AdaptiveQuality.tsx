import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';

export function AdaptiveQuality() {
  const { session } = useXR();
  const { gl } = useThree();
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const currentScaleRef = useRef(0.72);

  useEffect(() => {
    if (session) {
      try { gl.xr.setFoveation(1.0); } catch {}
      try { gl.xr.setFramebufferScaleFactor(0.72); } catch {}
    }
  }, [session, gl]);

  useFrame(() => {
    if (!session) return;
    framesRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;
    if (elapsed >= 1200) {
      const fps = (framesRef.current * 1000) / elapsed;
      framesRef.current = 0;
      lastTimeRef.current = now;

      if (fps < 66 && currentScaleRef.current > 0.58) {
        currentScaleRef.current = Math.max(0.58, Number((currentScaleRef.current - 0.05).toFixed(2)));
        try { gl.xr.setFramebufferScaleFactor(currentScaleRef.current); } catch {}
      } else if (fps >= 71.5 && currentScaleRef.current < 0.80) {
        currentScaleRef.current = Math.min(0.80, Number((currentScaleRef.current + 0.05).toFixed(2)));
        try { gl.xr.setFramebufferScaleFactor(currentScaleRef.current); } catch {}
      }
    }
  });

  return null;
}
