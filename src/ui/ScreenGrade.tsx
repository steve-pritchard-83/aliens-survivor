import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../core/GameStore';

const FILL: CSSProperties = { position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' };

/** A small tile of random grey noise as a data URL, tiled and jittered by CSS to make film grain. */
function makeGrainUrl(): string {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/**
 * The film look over flat-screen play: a teal grade (soft-light tint plus a gentle colour pass toward monochrome),
 * a heavy vignette and animated fine grain. VR gets its look from the fog and lights instead, since DOM layers
 * are not drawn in a headset. The grain stops jittering when reduced flash is on.
 */
export function ScreenGrade() {
  const grain = useMemo(makeGrainUrl, []);
  const reducedFlash = useGameStore((s) => s.settings.reducedFlash);
  return (
    <>
      <style>{`@keyframes grainShift{0%{background-position:0 0}25%{background-position:-37px 21px}50%{background-position:19px -43px}75%{background-position:-23px -17px}100%{background-position:0 0}}`}</style>
      <div style={{ ...FILL, background: 'rgba(30, 120, 150, 0.16)', mixBlendMode: 'soft-light' }} />
      <div style={{ ...FILL, background: 'rgba(25, 95, 125, 0.13)', mixBlendMode: 'color' }} />
      <div
        style={{
          ...FILL,
          background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 42%, rgba(1, 8, 12, 0.74) 100%)'
        }}
      />
      <div
        style={{
          ...FILL,
          backgroundImage: `url(${grain})`,
          backgroundSize: '128px 128px',
          mixBlendMode: 'overlay',
          opacity: 0.2,
          animation: reducedFlash ? undefined : 'grainShift 0.45s steps(4) infinite'
        }}
      />
    </>
  );
}
