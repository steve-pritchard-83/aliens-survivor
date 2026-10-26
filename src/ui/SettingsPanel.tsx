import { useEffect, useRef } from 'react';
import { useGameStore } from '../core/GameStore';
import { useFocusTrap } from './useFocusTrap';
import { SNAP_ANGLE_OPTIONS, VIGNETTE_OPTIONS, MOUSE_SENSITIVITY_RANGE } from '../core/Persistence';
import { formatTimer, solidButton, overlay, GREEN, INK } from './uiStyles';
import { ChoiceRow, ToggleRow, SliderRow, Choice } from './SettingsControls';

const percent = (v: number) => `${Math.round(v * 100)}%`;

const SNAP_CHOICES: readonly Choice<number>[] = SNAP_ANGLE_OPTIONS.map((a) => ({
  value: a,
  label: a === 0 ? 'Smooth' : `${Math.round(a * (180 / Math.PI))}°`
}));
const VIGNETTE_CHOICES: readonly Choice<(typeof VIGNETTE_OPTIONS)[number]>[] = VIGNETTE_OPTIONS.map((v) => ({
  value: v,
  label: v.toUpperCase()
}));

const sectionTitle = { color: GREEN, fontSize: 12, letterSpacing: 3, margin: '8px 0 -2px 0' } as const;

export function SettingsPanel({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  const status = useGameStore((s) => s.status);
  const timeRemaining = useGameStore((s) => (s.status === 'PAUSED' ? s.timeRemaining : 0));
  const kills = useGameStore((s) => s.kills);
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, status === 'PAUSED');
  useEffect(() => {
    if (status !== 'PAUSED') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, onResume]);

  if (status !== 'PAUSED') return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Tactical pause and settings"
      onClick={(e) => e.stopPropagation()}
      style={overlay({
        position: 'absolute',
        inset: 0,
        background: 'rgba(3, 10, 7, 0.90)',
        cursor: 'default',
        zIndex: 50,
        overflowY: 'auto'
      })}
    >
      <h1 style={{ fontSize: 'clamp(28px, 6vw, 44px)', letterSpacing: 6, color: GREEN, margin: '0 0 6px 0' }}>
        TACTICAL PAUSE & SETTINGS
      </h1>
      <p style={{ color: '#99d6be', fontSize: 15, marginBottom: 16 }}>
        TIME REMAINING: {formatTimer(timeRemaining)} // HOSTILES ELIMINATED: {kills}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 480,
          width: '100%',
          background: 'rgba(0, 20, 10, 0.75)',
          padding: 18,
          borderRadius: 6,
          border: '1px solid rgba(0, 255, 136, 0.4)',
          marginBottom: 20,
          textAlign: 'left'
        }}
      >
        <div style={sectionTitle}>AUDIO</div>
        <SliderRow
          label="Master volume"
          value={settings.masterVolume}
          min={0}
          max={1}
          step={0.05}
          format={percent}
          onChange={(v) => update({ masterVolume: v })}
        />
        <SliderRow
          label="Music"
          value={settings.musicVolume}
          min={0}
          max={1}
          step={0.05}
          format={percent}
          onChange={(v) => update({ musicVolume: v })}
        />
        <SliderRow
          label="Effects"
          value={settings.sfxVolume}
          min={0}
          max={1}
          step={0.05}
          format={percent}
          onChange={(v) => update({ sfxVolume: v })}
        />

        <div style={sectionTitle}>COMFORT (VR)</div>
        <ChoiceRow
          label="Snap turn"
          value={settings.snapAngle}
          choices={SNAP_CHOICES}
          onChange={(v) => update({ snapAngle: v })}
        />
        <ChoiceRow
          label="Comfort vignette"
          value={settings.vignette}
          choices={VIGNETTE_CHOICES}
          onChange={(v) => update({ vignette: v })}
        />
        <ToggleRow label="Seated mode" value={settings.seatedMode} onChange={(v) => update({ seatedMode: v })} />
        <ToggleRow label="Left-handed" value={settings.leftHanded} onChange={(v) => update({ leftHanded: v })} />
        <ToggleRow
          label="Reduced flash (photosensitivity)"
          value={settings.reducedFlash}
          onChange={(v) => update({ reducedFlash: v })}
        />

        <div style={sectionTitle}>CONTROLS (DESKTOP)</div>
        <SliderRow
          label="Mouse sensitivity"
          value={settings.mouseSensitivity}
          min={MOUSE_SENSITIVITY_RANGE.min}
          max={MOUSE_SENSITIVITY_RANGE.max}
          step={0.1}
          format={(v) => `${v.toFixed(1)}x`}
          onChange={(v) => update({ mouseSensitivity: v })}
        />
        <ToggleRow label="Invert Y axis" value={settings.invertY} onChange={(v) => update({ invertY: v })} />
        <ToggleRow label="Show status bar" value={settings.showHud2D} onChange={(v) => update({ showHud2D: v })} />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onResume}
          style={solidButton({ padding: '12px 30px', fontSize: 18, letterSpacing: 2, color: INK })}
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
