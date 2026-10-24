import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../core/GameStore';
import { InputManager, InputMode } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { xrStore } from '../core/XRStore';

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

export function HUD() {
  const status = useGameStore((s) => s.status);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const kills = useGameStore((s) => s.kills);
  const shotsFired = useGameStore((s) => s.shotsFired);
  const shotsHit = useGameStore((s) => s.shotsHit);
  const damageFlash = useGameStore((s) => s.damageFlash);
  const startGame = useGameStore((s) => s.startGame);
  const resumeGame = useGameStore((s) => s.resumeGame);

  const [inputMode, setInputMode] = useState<InputMode>(InputManager.mode);
  const [joyOffset, setJoyOffset] = useState<[number, number]>([0, 0]);
  const joyOriginRef = useRef<[number, number] | null>(null);
  const lookTouchRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    return InputManager.onModeChange((m) => setInputMode(m));
  }, []);

  const handleLaunch = async (mode: 'STANDARD' | 'VR') => {
    await AudioManager.unlock();
    AudioManager.play2D('ui_beep', 0.8);
    AudioManager.startBGM();
    AudioManager.setKlaxonActive(true);
    try { await navigator.wakeLock?.request('screen'); } catch { /* ignore */ }
    startGame();
    if (mode === 'VR') xrStore.enterVR().catch(() => {});
    else InputManager.requestPointerLock();
  };

  const handleResume = () => {
    AudioManager.play2D('ui_beep', 0.65);
    AudioManager.resumeBGM();
    AudioManager.setKlaxonActive(true);
    resumeGame();
    InputManager.requestPointerLock();
  };

  const onLeftTouchStart = (e: React.TouchEvent) => { joyOriginRef.current = [e.changedTouches[0].clientX, e.changedTouches[0].clientY]; };
  const onLeftTouchMove = (e: React.TouchEvent) => {
    if (!joyOriginRef.current) return;
    const t = e.changedTouches[0], dx = t.clientX - joyOriginRef.current[0], dy = t.clientY - joyOriginRef.current[1];
    const dist = Math.min(48, Math.hypot(dx, dy)), angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * dist, oy = Math.sin(angle) * dist;
    setJoyOffset([ox, oy]); InputManager.setTouchMove(ox / 48, -oy / 48);
  };
  const onLeftTouchEnd = () => { joyOriginRef.current = null; setJoyOffset([0, 0]); InputManager.setTouchMove(0, 0); };
  const onRightTouchStart = (e: React.TouchEvent) => { lookTouchRef.current = [e.changedTouches[0].clientX, e.changedTouches[0].clientY]; };
  const onRightTouchMove = (e: React.TouchEvent) => {
    if (!lookTouchRef.current) return;
    const t = e.changedTouches[0];
    InputManager.addTouchLook((t.clientX - lookTouchRef.current[0]) * 0.0055, (t.clientY - lookTouchRef.current[1]) * 0.0055);
    lookTouchRef.current = [t.clientX, t.clientY];
  };
  const onRightTouchEnd = () => { lookTouchRef.current = null; };
  const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {damageFlash > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, transparent 40%, rgba(220, 15, 15, ${damageFlash * 0.68}) 100%)`, pointerEvents: 'none' }} />
      )}

      {/* Center Reticle */}
      {status === 'PLAYING' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 22, height: 22, transform: 'translate(-50%, -50%)', border: '1.5px solid rgba(0, 255, 136, 0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 4, height: 4, background: '#00ff88', borderRadius: '50%' }} />
        </div>
      )}

      {/* Mobile Touch Controls - strictly only visible when touch input is active */}
      {status === 'PLAYING' && inputMode === 'TOUCH' && (
        <>
          <div
            onTouchStart={onLeftTouchStart}
            onTouchMove={onLeftTouchMove}
            onTouchEnd={onLeftTouchEnd}
            style={{ position: 'absolute', bottom: 205, left: 28, width: 110, height: 110, borderRadius: '50%', border: '1.5px dashed rgba(0, 255, 136, 0.35)', background: 'rgba(0, 40, 25, 0.2)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(0, 255, 136, 0.45)', transform: `translate(${joyOffset[0]}px, ${joyOffset[1]}px)` }} />
          </div>
          <div onTouchStart={onRightTouchStart} onTouchMove={onRightTouchMove} onTouchEnd={onRightTouchEnd} style={{ position: 'absolute', top: 90, right: 0, width: '45%', bottom: 180, pointerEvents: 'auto' }} />
          <button
            onTouchStart={() => InputManager.setTouchFire(true)}
            onTouchEnd={() => InputManager.setTouchFire(false)}
            onMouseDown={() => InputManager.setTouchFire(true)}
            onMouseUp={() => InputManager.setTouchFire(false)}
            style={{ position: 'absolute', bottom: 125, right: 28, width: 84, height: 84, borderRadius: '50%', background: 'rgba(220, 40, 25, 0.55)', border: '2px solid #ff5533', color: '#fff', fontFamily: 'inherit', fontSize: 16, letterSpacing: 1, pointerEvents: 'auto', cursor: 'pointer' }}
          >
            FIRE
          </button>
        </>
      )}

      {/* Pause Overlay Modal */}
      {status === 'PAUSED' && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, background: 'rgba(3, 10, 7, 0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', cursor: 'default', padding: 24, textAlign: 'center' }}
        >
          <h1 style={{ fontSize: 50, letterSpacing: 6, color: '#00ff88', marginBottom: 8 }}>TACTICAL PAUSE</h1>
          <p style={{ color: '#99d6be', fontSize: 16, marginBottom: 24 }}>
            TIME REMAINING: {formatTimer(timeRemaining)} // HOSTILES ELIMINATED: {kills}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleResume} style={{ padding: '14px 32px', fontSize: 20, fontFamily: 'inherit', letterSpacing: 2, background: '#00ff88', color: '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>
              RESUME MISSION
            </button>
            <button onClick={() => handleLaunch('STANDARD')} style={{ padding: '14px 28px', fontSize: 18, fontFamily: 'inherit', letterSpacing: 2, background: 'transparent', color: '#ff6644', border: '2px solid #ff6644', borderRadius: 4, cursor: 'pointer' }}>
              RESTART DROP
            </button>
          </div>
        </div>
      )}

      {/* Main Briefing / Victory / Defeat Modal */}
      {(status === 'MENU' || status === 'VICTORY' || status === 'DEFEAT') && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, background: 'rgba(3, 8, 6, 0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', cursor: 'default', padding: 24, textAlign: 'center' }}
        >
          <h1 style={{ fontSize: 54, letterSpacing: 6, color: status === 'DEFEAT' ? '#ff3333' : '#00ff88', marginBottom: 8 }}>
            {status === 'MENU' ? 'ALIENS SURVIVOR' : status === 'VICTORY' ? 'DROPSHIP DOCKED // SURVIVED' : 'MIA // BIO-SIGNALS FLATLINED'}
          </h1>
          <p style={{ maxWidth: 540, color: '#99d6be', fontSize: 16, lineHeight: 1.5, marginBottom: 24 }}>
            {status === 'MENU'
              ? 'USS SULACO — SECTOR 4 CORRIDOR. Emergency klaxons active. Hold the corridor against Xenomorph breaches for 5 minutes until rescue dropship extraction.'
              : `SURVIVAL TIME: ${formatTimer(300 - timeRemaining)} | XENOMORPHS ELIMINATED: ${kills} | ACCURACY: ${accuracy}%`}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => handleLaunch('STANDARD')} style={{ padding: '14px 32px', fontSize: 20, fontFamily: 'inherit', letterSpacing: 2, background: '#00ff88', color: '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>
              {status === 'MENU' ? 'INITIATE COMBAT DROP' : 'REDEPLOY MARINE'}
            </button>
            <button onClick={() => handleLaunch('VR')} style={{ padding: '14px 28px', fontSize: 18, fontFamily: 'inherit', letterSpacing: 2, background: 'transparent', color: '#00ff88', border: '2px solid #00ff88', borderRadius: 4, cursor: 'pointer' }}>
              ENTER META QUEST XR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
