import { useGameStore } from '../core/GameStore';

/**
 * The red hit wash on flat screens. It is its own component so that the per-frame flash value re-renders only
 * this element, not the whole HUD.
 */
export function DamageFlashOverlay() {
  const damageFlash = useGameStore((s) => s.damageFlash);
  if (damageFlash <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // A faint red wash over the whole view, and blood-red closing in from the edges
        background: `radial-gradient(ellipse at center, rgba(160, 0, 0, ${damageFlash * 0.16}) 0%, rgba(170, 5, 5, ${damageFlash * 0.2}) 35%, rgba(190, 8, 8, ${damageFlash * 0.85}) 100%)`,
        pointerEvents: 'none'
      }}
    />
  );
}
