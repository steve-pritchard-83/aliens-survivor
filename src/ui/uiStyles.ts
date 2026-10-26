import type { CSSProperties } from 'react';

export const GREEN = '#00ff88';
export const INK = '#03120a';
export const RED = '#ff3333';

export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60),
    s = Math.floor(sec % 60),
    ms = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

/** Filled call-to-action button used across the menus. */
export function solidButton(extra: CSSProperties = {}): CSSProperties {
  return {
    fontFamily: 'inherit',
    background: GREEN,
    color: INK,
    border: 'none',
    borderRadius: 4,
    fontWeight: 'bold',
    cursor: 'pointer',
    ...extra
  };
}

/** Full-screen dimmed overlay container. */
export function overlay(extra: CSSProperties = {}): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    textAlign: 'center',
    padding: 24,
    ...extra
  };
}

export const hintStyle: CSSProperties = {
  position: 'absolute',
  bottom: 18,
  fontSize: 11,
  letterSpacing: 1.5,
  // 0.75 keeps the hint above 4.5:1 against the near-black background
  color: 'rgba(0, 255, 136, 0.75)',
  pointerEvents: 'none'
};
