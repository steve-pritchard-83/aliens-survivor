import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../core/GameStore';
import { InputManager, InputMode } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { xrStore } from '../core/XRStore';

interface BeforeInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60), ms = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

export function HUD() {
  const status = useGameStore((s) => s.status), timeRemaining = useGameStore((s) => s.timeRemaining);
  const kills = useGameStore((s) => s.kills), shotsFired = useGameStore((s) => s.shotsFired);
  const shotsHit = useGameStore((s) => s.shotsHit), damageFlash = useGameStore((s) => s.damageFlash);
  const startGame = useGameStore((s) => s.startGame), pauseGame = useGameStore((s) => s.pauseGame), resumeGame = useGameStore((s) => s.resumeGame);

  const [inputMode, setInputMode] = useState<InputMode>(InputManager.mode);
  const [joyOrigin, setJoyOrigin] = useState<[number, number] | null>(null), [joyOffset, setJoyOffset] = useState<[number, number]>([0, 0]);
  const joyTouchId = useRef<number | null>(null), lookTouchId = useRef<number | null>(null), lookLastPos = useRef<[number, number] | null>(null);

  const [isQuest] = useState(() => typeof navigator !== 'undefined' && /OculusBrowser|Quest/i.test(navigator.userAgent));
  const [isStandalone, setIsStandalone] = useState(true);
  const [pwaDismissed, setPwaDismissed] = useState(() => { try { return sessionStorage.getItem('uscm_pwa_ack') === 'true'; } catch { return false; } });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallEvent | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [victoryVideoEnded, setVictoryVideoEnded] = useState(false);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const unsub = InputManager.onModeChange(setInputMode);
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.location.search.includes('source=pwa') || isQuest;
    setIsStandalone(standalone);
    const mobile = !isQuest && (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && (navigator.maxTouchPoints > 1 || window.innerWidth < 1024)));
    setIsMobileDevice(mobile);

    if (isQuest && typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr.isSessionSupported?.('immersive-vr').then((sup) => {
        if (sup) handleLaunch('VR');
      }).catch(() => {});
    }

    const handlePrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallEvent); };
    const handleInstalled = () => { setIsStandalone(true); };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      unsub();
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (status === 'DEFEAT' && prevStatusRef.current !== 'DEFEAT') {
      AudioManager.triggerDefeat();
    } else if (status === 'VICTORY' && prevStatusRef.current !== 'VICTORY') {
      AudioManager.setKlaxonActive(false);
      AudioManager.resumeBGM();
    }
    prevStatusRef.current = status;
  }, [status]);

  const handleLaunch = async (mode: 'STANDARD' | 'VR') => {
    try { sessionStorage.setItem('uscm_pwa_ack', 'true'); } catch { /* ignore */ }
    setPwaDismissed(true);
    setVictoryVideoEnded(false);
    startGame();
    if (mode === 'VR') xrStore.enterVR().catch(() => {});
    AudioManager.resetAudio();
    AudioManager.unlock().then(() => {
      AudioManager.play2D('ui_beep', 0.8);
      AudioManager.startBGM();
      AudioManager.setKlaxonActive(true);
    }).catch(() => {});
    try { await navigator.wakeLock?.request('screen'); } catch { /* ignore */ }
    if (mode !== 'VR' && inputMode === 'DESKTOP' && !('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
      InputManager.requestPointerLock();
    }
  };

  const handleResume = () => {
    AudioManager.play2D('ui_beep', 0.65); AudioManager.resumeBGM(); AudioManager.setKlaxonActive(true); resumeGame();
    if (inputMode === 'DESKTOP' && !('ontouchstart' in window) && navigator.maxTouchPoints === 0) InputManager.requestPointerLock();
  };

  const onLeftTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]; joyTouchId.current = t.identifier;
    setJoyOrigin([t.clientX, t.clientY]); setJoyOffset([0, 0]);
  };
  const onLeftTouchMove = (e: React.TouchEvent) => {
    if (!joyOrigin) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId.current) {
        const dx = t.clientX - joyOrigin[0], dy = t.clientY - joyOrigin[1], dist = Math.min(48, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
        const ox = Math.cos(a) * dist, oy = Math.sin(a) * dist;
        setJoyOffset([ox, oy]); InputManager.setTouchMove(ox / 48, -oy / 48); break;
      }
    }
  };
  const onLeftTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null; setJoyOrigin(null); setJoyOffset([0, 0]); InputManager.setTouchMove(0, 0); break;
      }
    }
  };
  const onRightTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]; lookTouchId.current = t.identifier; lookLastPos.current = [t.clientX, t.clientY];
  };
  const onRightTouchMove = (e: React.TouchEvent) => {
    if (!lookLastPos.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        InputManager.addTouchLook((t.clientX - lookLastPos.current[0]) * 0.0115, (t.clientY - lookLastPos.current[1]) * 0.0105);
        lookLastPos.current = [t.clientX, t.clientY]; break;
      }
    }
  };
  const onRightTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null; lookLastPos.current = null; break;
      }
    }
  };
  const handleInstallPWA = async () => {
    try { sessionStorage.setItem('uscm_pwa_ack', 'true'); } catch { /* ignore */ }
    setPwaDismissed(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setIsStandalone(true);
      setDeferredPrompt(null);
    }
  };

  const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {damageFlash > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, transparent 40%, rgba(220, 15, 15, ${damageFlash * 0.68}) 100%)`, pointerEvents: 'none' }} />
      )}
      {status === 'PLAYING' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 22, height: 22, transform: 'translate(-50%, -50%)', border: '1.5px solid rgba(0, 255, 136, 0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 4, height: 4, background: '#00ff88', borderRadius: '50%' }} />
        </div>
      )}
      {status === 'PLAYING' && inputMode === 'TOUCH' && (
        <>
          <button onClick={() => pauseGame()} onTouchStart={(e) => { e.stopPropagation(); pauseGame(); }} style={{ position: 'absolute', top: 16, right: 16, padding: '8px 18px', background: 'rgba(2, 24, 15, 0.75)', border: '1.5px solid rgba(0, 255, 136, 0.7)', color: '#00ff88', fontFamily: 'inherit', fontSize: 13, letterSpacing: 2, borderRadius: 4, pointerEvents: 'auto', cursor: 'pointer', zIndex: 20 }}>
            PAUSE
          </button>
          <div onTouchStart={onLeftTouchStart} onTouchMove={onLeftTouchMove} onTouchEnd={onLeftTouchEnd} onTouchCancel={onLeftTouchEnd} style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', pointerEvents: 'auto' }} />
          <div onTouchStart={onRightTouchStart} onTouchMove={onRightTouchMove} onTouchEnd={onRightTouchEnd} onTouchCancel={onRightTouchEnd} style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', pointerEvents: 'auto' }} />
          {joyOrigin && (
            <div style={{ position: 'fixed', left: joyOrigin[0] - 55, top: joyOrigin[1] - 55, width: 110, height: 110, borderRadius: '50%', border: '2px solid rgba(0, 255, 136, 0.55)', background: 'radial-gradient(circle, rgba(0, 45, 25, 0.5) 0%, rgba(0, 255, 136, 0.1) 100%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0, 255, 136, 0.75)', boxShadow: '0 0 14px rgba(0, 255, 136, 0.6)', transform: `translate(${joyOffset[0]}px, ${joyOffset[1]}px)` }} />
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 18, left: 24, fontSize: 11, letterSpacing: 1.5, color: 'rgba(0, 255, 136, 0.45)', pointerEvents: 'none' }}>[LEFT SCREEN: MOVE]</div>
          <div style={{ position: 'absolute', bottom: 18, right: 24, fontSize: 11, letterSpacing: 1.5, color: 'rgba(0, 255, 136, 0.45)', pointerEvents: 'none' }}>[RIGHT SCREEN: AIM // AUTO-FIRE]</div>
        </>
      )}
      {status === 'MENU' && isMobileDevice && !isStandalone && !pwaDismissed && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 4, 0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', zIndex: 100, padding: 24, textAlign: 'center' }}>
          <div style={{ border: '2px solid #00ff88', padding: '26px 24px', maxWidth: 460, background: 'rgba(0, 20, 10, 0.92)', borderRadius: 6, boxShadow: '0 0 35px rgba(0, 255, 136, 0.3)' }}>
            <div style={{ color: '#ffaa33', fontSize: 13, letterSpacing: 3, marginBottom: 8 }}>WEYLAND-YUTANI // USCM PROTOCOL</div>
            <h2 style={{ fontSize: 24, letterSpacing: 4, color: '#00ff88', marginBottom: 12 }}>PWA INSTALLATION MANDATORY</h2>
            <p style={{ color: '#99d6be', fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
              Mobile browser play is restricted. Install the simulator to your Home Screen for full hardware acceleration, low-latency haptics, and fullscreen targeting.
            </p>
            {deferredPrompt ? (
              <button onClick={handleInstallPWA} style={{ width: '100%', padding: '14px 20px', fontSize: 18, fontFamily: 'inherit', letterSpacing: 2, background: '#00ff88', color: '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}>
                INSTALL MISSION PWA
              </button>
            ) : (
              <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.35)', padding: '12px 14px', borderRadius: 4, fontSize: 13, color: '#aaffd4', marginBottom: 14, textAlign: 'left', lineHeight: 1.6 }}>
                <div>1. Tap Safari Share button <strong>[ ⎋ ]</strong></div>
                <div>2. Select <strong>"Add to Home Screen" [+]</strong></div>
                <div>3. Launch from your Home Screen app icon</div>
              </div>
            )}
            <button onClick={() => { try { sessionStorage.setItem('uscm_pwa_ack', 'true'); } catch { /* ignore */ } setPwaDismissed(true); window.location.href = '/?source=pwa'; }} style={{ width: '100%', background: 'rgba(0, 255, 136, 0.12)', border: '1px solid #00ff88', color: '#00ff88', padding: '10px 16px', fontSize: 13, fontFamily: 'inherit', letterSpacing: 2, cursor: 'pointer', borderRadius: 4 }}>
              TRIGGER / LAUNCH INSTALLED PWA
            </button>
          </div>
        </div>
      )}
      {status === 'PAUSED' && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, background: 'rgba(3, 10, 7, 0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', cursor: 'default', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 50, letterSpacing: 6, color: '#00ff88', marginBottom: 8 }}>TACTICAL PAUSE</h1>
          <p style={{ color: '#99d6be', fontSize: 16, marginBottom: 24 }}>TIME REMAINING: {formatTimer(timeRemaining)} // HOSTILES ELIMINATED: {kills}</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleResume} style={{ padding: '14px 32px', fontSize: 20, fontFamily: 'inherit', letterSpacing: 2, background: '#00ff88', color: '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>RESUME MISSION</button>
            <button onClick={() => handleLaunch('STANDARD')} style={{ padding: '14px 28px', fontSize: 18, fontFamily: 'inherit', letterSpacing: 2, background: 'transparent', color: '#ff6644', border: '2px solid #ff6644', borderRadius: 4, cursor: 'pointer' }}>RESTART DROP</button>
          </div>
        </div>
      )}
      {status === 'VICTORY' && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60, pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src="/movies/victory.mp4" autoPlay playsInline onEnded={() => setVictoryVideoEnded(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {victoryVideoEnded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.42)', zIndex: 64, pointerEvents: 'none' }}>
              <h1 style={{ fontSize: 'clamp(54px, 11vw, 96px)', letterSpacing: 10, color: '#00ff88', textShadow: '0 0 35px rgba(0, 255, 136, 0.85), 0 0 70px rgba(0, 255, 136, 0.45)', fontWeight: 'bold', margin: 0 }}>VICTORY</h1>
              <p style={{ color: '#cceecc', fontSize: 'clamp(12px, 2.5vw, 17px)', letterSpacing: 5, textShadow: '0 0 10px rgba(0,0,0,0.9)', marginTop: 8 }}>EXTRACTION SUCCESSFUL // SECTOR 4 SECURED</p>
            </div>
          )}
          <div style={{ position: 'absolute', top: 18, left: 22, zIndex: 65, color: '#00ff88', textShadow: '0 0 10px rgba(0,0,0,0.9)', letterSpacing: 3, fontSize: 16 }}>USS SULACO // EXTRACTION COMPLETE</div>
          <div style={{ position: 'absolute', bottom: 20, zIndex: 65, display: 'flex', gap: 14, alignItems: 'center', background: 'rgba(2, 10, 6, 0.85)', padding: '10px 20px', borderRadius: 6, border: '1px solid rgba(0, 255, 136, 0.55)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ color: '#aaffd4', fontSize: 13, letterSpacing: 1.5 }}>SURVIVAL TIME: 05:00.0 | KILLS: {kills} | ACC: {accuracy}%</span>
            <button onClick={() => handleLaunch('STANDARD')} style={{ padding: '8px 22px', fontSize: 15, fontFamily: 'inherit', letterSpacing: 2, background: '#00ff88', color: '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>REDEPLOY MARINE</button>
          </div>
        </div>
      )}
      {(status === 'MENU' || status === 'DEFEAT') && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, background: 'rgba(3, 8, 6, 0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', cursor: 'default', padding: 24, textAlign: 'center', zIndex: 30 }}>
          <h1 style={{ fontSize: 52, letterSpacing: 5, color: status === 'DEFEAT' ? '#ff3333' : '#00ff88', marginBottom: 8 }}>
            {status === 'MENU' ? 'ALIENS SURVIVOR' : 'MIA // BIO-SIGNALS FLATLINED'}
          </h1>
          <p style={{ maxWidth: 540, color: status === 'DEFEAT' ? '#ff9999' : '#99d6be', fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>
            {status === 'MENU' ? 'USS SULACO — SECTOR 4 CORRIDOR. Emergency klaxons active. Hold the corridor against Xenomorph breaches for 5 minutes until rescue dropship extraction.' : `SURVIVAL TIME: ${formatTimer(300 - timeRemaining)} | XENOMORPHS ELIMINATED: ${kills} | ACCURACY: ${accuracy}%`}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {isQuest ? (
              <button onClick={() => handleLaunch('VR')} style={{ padding: '16px 36px', fontSize: 22, fontFamily: 'inherit', letterSpacing: 2, background: '#00ff88', color: '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 25px rgba(0,255,136,0.6)' }}>ENTER FULLSCREEN 3D VR</button>
            ) : (
              <>
                <button onClick={() => handleLaunch('STANDARD')} style={{ padding: '14px 32px', fontSize: 20, fontFamily: 'inherit', letterSpacing: 2, background: status === 'DEFEAT' ? '#ff3333' : '#00ff88', color: status === 'DEFEAT' ? '#fff' : '#03120a', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>{status === 'MENU' ? 'INITIATE COMBAT DROP' : 'REDEPLOY MARINE'}</button>
                <button onClick={() => handleLaunch('VR')} style={{ padding: '14px 28px', fontSize: 18, fontFamily: 'inherit', letterSpacing: 2, background: 'transparent', color: status === 'DEFEAT' ? '#ff6666' : '#00ff88', border: `2px solid ${status === 'DEFEAT' ? '#ff6666' : '#00ff88'}`, borderRadius: 4, cursor: 'pointer' }}>ENTER META QUEST XR</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
