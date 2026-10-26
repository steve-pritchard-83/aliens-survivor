import { useEffect, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useGameStore } from '../core/GameStore';

export function LevelUpModal() {
  const status = useGameStore((s) => s.status);
  const offered = useGameStore((s) => s.offeredUpgrades);
  const chooseUpgrade = useGameStore((s) => s.chooseUpgrade);
  const level = useGameStore((s) => s.level);

  useEffect(() => {
    if (status !== 'LEVEL_UP') return;
    const onKey = (e: KeyboardEvent) => {
      const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code.replace('Numpad', 'Digit'));
      if (idx >= 0 && idx < offered.length) chooseUpgrade(offered[idx].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, offered, chooseUpgrade]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, status === 'LEVEL_UP' && offered.length > 0);

  if (status !== 'LEVEL_UP' || offered.length === 0) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 8, 4, 0.92)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        pointerEvents: 'auto'
      }}
    >
      <div style={{ color: '#00ff88', fontSize: 13, letterSpacing: 3, marginBottom: 6 }}>
        WEYLAND-YUTANI // USCM TACTICAL PROMOTION
      </div>
      <h2
        id="levelup-title"
        style={{ color: '#ffffff', fontSize: 'clamp(26px, 5vw, 42px)', letterSpacing: 4, margin: '0 0 24px 0' }}
      >
        LEVEL {level} FIELD UPGRADE
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18,
          maxWidth: 960,
          width: '100%'
        }}
      >
        {offered.map((card, index) => (
          <div
            key={card.id}
            onClick={() => chooseUpgrade(card.id)}
            style={{
              background: 'rgba(0, 24, 12, 0.85)',
              border: '2px solid #00ff88',
              borderRadius: 8,
              padding: '24px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(0, 255, 136, 0.25)',
              transition: 'transform 0.15s, border-color 0.15s'
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>{card.icon}</div>
            <h3 style={{ color: '#00ff88', fontSize: 18, letterSpacing: 2, margin: '0 0 10px 0' }}>{card.title}</h3>
            <p style={{ color: '#aaffd4', fontSize: 14, lineHeight: 1.5, flex: 1, margin: '0 0 16px 0' }}>
              {card.desc}
            </p>
            {/* No handler of its own: the click (or Enter) bubbles to the card, so an upgrade is applied once */}
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#00ff88',
                color: '#021207',
                border: 'none',
                borderRadius: 4,
                fontWeight: 'bold',
                fontFamily: 'inherit',
                fontSize: 14,
                letterSpacing: 2,
                cursor: 'pointer'
              }}
            >
              INSTALL UPGRADE [{index + 1}]
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
