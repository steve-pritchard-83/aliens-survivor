import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { quality, setTier, stepTier, MAX_TIER } from './QualityState';

const WINDOW_MS = 1200;

/**
 * Frame-rate governor. three.js ignores framebuffer-scale changes while a session is presenting, so
 * resolution is chosen once at session start (XRStore) and this component only adjusts effect tiers.
 */
export function AdaptiveQuality() {
  const { session } = useXR();
  const { gl } = useThree();
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lowStreakRef = useRef(0);
  const highStreakRef = useRef(0);

  useEffect(() => {
    if (!session) {
      setTier(MAX_TIER);
      return;
    }
    try {
      gl.xr.setFoveation(1.0);
    } catch (e) {
      console.warn('[AdaptiveQuality] setFoveation failed', e);
    }
    lowStreakRef.current = 0;
    highStreakRef.current = 0;
    framesRef.current = 0;
    lastTimeRef.current = performance.now();
  }, [session, gl]);

  useFrame(() => {
    if (!session) return;
    framesRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;
    if (elapsed < WINDOW_MS) return;
    const fps = (framesRef.current * 1000) / elapsed;
    framesRef.current = 0;
    lastTimeRef.current = now;
    const next = stepTier(quality.tier, lowStreakRef.current, highStreakRef.current, fps);
    lowStreakRef.current = next.lowStreak;
    highStreakRef.current = next.highStreak;
    setTier(next.tier);
  });

  return null;
}
