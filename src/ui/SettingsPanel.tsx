import { useGameStore } from '../core/GameStore';

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60),
    s = Math.floor(sec % 60),
    ms = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

export function SettingsPanel({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  const status = useGameStore((s) => s.status);
  const timeRemaining = useGameStore((s) => (s.status === 'PAUSED' ? s.timeRemaining : 0));
  const kills = useGameStore((s) => s.kills);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  if (status !== 'PAUSED') return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(3, 10, 7, 0.90)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        cursor: 'default',
        padding: 24,
        textAlign: 'center',
        zIndex: 50
      }}
    >
      <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)', letterSpacing: 6, color: '#00ff88', margin: '0 0 6px 0' }}>
        TACTICAL PAUSE & SETTINGS
      </h1>
      <p style={{ color: '#99d6be', fontSize: 15, marginBottom: 20 }}>
        TIME REMAINING: {formatTimer(timeRemaining)} // HOSTILES ELIMINATED: {kills}
      </p>

      {/* Settings Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 420,
          width: '100%',
          background: 'rgba(0, 20, 10, 0.75)',
          padding: 18,
          borderRadius: 6,
          border: '1px solid rgba(0, 255, 136, 0.4)',
          marginBottom: 24,
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaffd4', fontSize: 14 }}>VR Snap Turn:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {([Math.PI / 2, Math.PI / 4, 0] as const).map((ang) => (
              <button
                key={ang}
                onClick={() => updateSettings({ snapAngle: ang })}
                style={{
                  padding: '4px 10px',
                  background: settings.snapAngle === ang ? '#00ff88' : 'transparent',
                  color: settings.snapAngle === ang ? '#000' : '#00ff88',
                  border: '1px solid #00ff88',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {ang === 0 ? 'Smooth' : ang === Math.PI / 4 ? '45°' : '90°'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaffd4', fontSize: 14 }}>Reduced Flash (Photosensitivity):</span>
          <button
            onClick={() => updateSettings({ reducedFlash: !settings.reducedFlash })}
            style={{
              padding: '4px 12px',
              background: settings.reducedFlash ? '#00ff88' : 'transparent',
              color: settings.reducedFlash ? '#000' : '#00ff88',
              border: '1px solid #00ff88',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {settings.reducedFlash ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaffd4', fontSize: 14 }}>Left-Handed VR Mode:</span>
          <button
            onClick={() => updateSettings({ leftHanded: !settings.leftHanded })}
            style={{
              padding: '4px 12px',
              background: settings.leftHanded ? '#00ff88' : 'transparent',
              color: settings.leftHanded ? '#000' : '#00ff88',
              border: '1px solid #00ff88',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {settings.leftHanded ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onResume}
          style={{
            padding: '12px 30px',
            fontSize: 18,
            fontFamily: 'inherit',
            letterSpacing: 2,
            background: '#00ff88',
            color: '#03120a',
            border: 'none',
            borderRadius: 4,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          RESUME MISSION
        </button>
        <button
          onClick={onRestart}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontFamily: 'inherit',
            letterSpacing: 2,
            background: 'transparent',
            color: '#ff6644',
            border: '2px solid #ff6644',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          RESTART DROP
        </button>
      </div>
    </div>
  );
}
