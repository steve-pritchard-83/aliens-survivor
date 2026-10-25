import { useGameStore, PHASE_NAMES } from '../core/GameStore';
import { formatTimer, GREEN, RED } from './uiStyles';

const barTrack = { height: 8, background: 'rgba(0, 255, 136, 0.15)', borderRadius: 4, overflow: 'hidden' } as const;

/**
 * Compact readout for desktop and touch play: health, ammunition, mission clock and phase.
 * Selectors round their values so the bar re-renders a few times per second, not every frame.
 */
export function StatusBar() {
  const hp = useGameStore((s) => Math.ceil(s.hp));
  const maxHp = useGameStore((s) => s.maxHp);
  const ammo = useGameStore((s) => s.ammo);
  const maxAmmo = useGameStore((s) => s.maxAmmo);
  const isReloading = useGameStore((s) => s.isReloading);
  const isJammed = useGameStore((s) => s.isJammed);
  const seconds = useGameStore((s) => Math.ceil(s.timeRemaining));
  const phase = useGameStore((s) => s.phase);
  const level = useGameStore((s) => s.level);

  const low = hp <= maxHp * 0.3;
  const ammoLabel = isJammed ? 'JAMMED' : isReloading ? 'RELOADING' : `${ammo} / ${maxAmmo}`;

  return (
    <div
      role="group"
      aria-label="Mission status"
      style={{
        position: 'absolute',
        top: 14,
        left: 16,
        width: 'min(240px, 40vw)',
        padding: '8px 10px',
        background: 'rgba(2, 14, 8, 0.6)',
        border: '1px solid rgba(0, 255, 136, 0.4)',
        borderRadius: 4,
        color: GREEN,
        fontSize: 12,
        letterSpacing: 1.5,
        pointerEvents: 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>EVAC {formatTimer(seconds).slice(0, 5)}</span>
        <span>LVL {level}</span>
      </div>
      <div style={{ opacity: 0.7, margin: '2px 0 6px' }}>{PHASE_NAMES[phase]}</div>
      <div
        role="progressbar"
        aria-label="Health"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        style={barTrack}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`,
            height: '100%',
            background: low ? RED : GREEN
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span>HP {hp}</span>
        <span style={{ color: isJammed ? RED : GREEN }}>{ammoLabel}</span>
      </div>
    </div>
  );
}
