import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../core/GameStore';
import { InputManager, InputMode } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { Platform } from '../core/Platform';
import { launchMission } from '../core/MissionLauncher';
import { xrStore } from '../core/XRStore';
import { SettingsPanel } from './SettingsPanel';
import { LevelUpModal } from './LevelUpModal';
import { TouchControls } from './TouchControls';
import { PwaInstallPrompt, BeforeInstallEvent } from './PwaInstallPrompt';
import { pwaInstallMode, readPwaDismissed, writePwaDismissed } from './pwaInstall';
import { VictoryScreen } from './VictoryScreen';
import { MainMenu } from './MainMenu';
import { GREEN, INK, solidButton } from './uiStyles';

function isDesktopPointer(inputMode: InputMode): boolean {
  return inputMode === 'DESKTOP' && !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
}

export function HUD() {
  const status = useGameStore((s) => s.status);
  const timeRemaining = useGameStore((s) => (s.status !== 'PLAYING' ? s.timeRemaining : 0));
  const recordKills = useGameStore((s) => s.recordKills);
  const kills = useGameStore((s) => s.kills),
    shotsFired = useGameStore((s) => s.shotsFired);
  const shotsHit = useGameStore((s) => s.shotsHit),
    damageFlash = useGameStore((s) => s.damageFlash);
  const pauseGame = useGameStore((s) => s.pauseGame),
    resumeGame = useGameStore((s) => s.resumeGame);

  const [inputMode, setInputMode] = useState<InputMode>(InputManager.mode);
  const [isQuest] = useState(() => Platform.isQuest);
  const [isVrApp] = useState(() => Platform.isVrApp);
  const [isStandalone, setIsStandalone] = useState(true);
  const [pwaDismissed, setPwaDismissed] = useState(readPwaDismissed);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallEvent | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const unsub = InputManager.onModeChange(setInputMode);
    setIsStandalone(Platform.isStandalone);
    setIsMobileDevice(Platform.isMobile);
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallEvent);
    };
    const handleInstalled = () => setIsStandalone(true);
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
    launchMission();
    if (mode === 'VR') xrStore.enterVR().catch((e) => console.warn('[HUD] enterVR failed', e));
    try {
      await navigator.wakeLock?.request('screen');
    } catch {
      /* wake lock unsupported or denied: non-fatal */
    }
    if (mode !== 'VR' && isDesktopPointer(inputMode)) InputManager.requestPointerLock();
  };

  const handleResume = () => {
    AudioManager.play2D('ui_beep', 0.65);
    AudioManager.resumeBGM();
    AudioManager.setKlaxonActive(true);
    resumeGame();
    if (isDesktopPointer(inputMode)) InputManager.requestPointerLock();
  };

  const dismissPwaPrompt = () => {
    writePwaDismissed();
    setPwaDismissed(true);
  };

  const handleInstallPWA = async () => {
    dismissPwaPrompt();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setIsStandalone(true);
    setDeferredPrompt(null);
  };

  const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
  const best = Math.max(recordKills, kills);

  if (isVrApp && status === 'PLAYING') return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {damageFlash > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle, transparent 40%, rgba(220, 15, 15, ${damageFlash * 0.68}) 100%)`,
            pointerEvents: 'none'
          }}
        />
      )}
      {status === 'PLAYING' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 22,
            height: 22,
            transform: 'translate(-50%, -50%)',
            border: '1.5px solid rgba(0, 255, 136, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ width: 4, height: 4, background: GREEN, borderRadius: '50%' }} />
        </div>
      )}
      {status === 'PLAYING' && inputMode === 'TOUCH' && !isQuest && <TouchControls onPause={pauseGame} />}
      {status === 'PLAYING' && !isVrApp && isQuest && inputMode !== 'XR' && (
        <button
          onClick={() => xrStore.enterVR().catch((e) => console.warn('[HUD] enterVR failed', e))}
          style={solidButton({
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '14px 28px',
            fontSize: 18,
            letterSpacing: 2,
            color: INK,
            pointerEvents: 'auto',
            zIndex: 30,
            boxShadow: '0 0 25px rgba(0,255,136,0.6)'
          })}
        >
          ENTER FULLSCREEN 3D VR
        </button>
      )}
      {status === 'MENU' && isMobileDevice && !isStandalone && !pwaDismissed && (
        <PwaInstallPrompt
          mode={pwaInstallMode(navigator.userAgent, deferredPrompt !== null)}
          onInstall={handleInstallPWA}
          onContinue={dismissPwaPrompt}
        />
      )}
      <SettingsPanel onResume={handleResume} onRestart={() => handleLaunch('STANDARD')} />
      <LevelUpModal />
      {status === 'VICTORY' && (
        <VictoryScreen kills={kills} accuracy={accuracy} best={best} onRedeploy={() => handleLaunch('STANDARD')} />
      )}
      {!isVrApp && (status === 'MENU' || status === 'DEFEAT') && (
        <MainMenu
          status={status}
          vrCapable={isQuest || isVrApp}
          stats={{ timeRemaining, kills, accuracy, best }}
          onLaunch={handleLaunch}
        />
      )}
    </div>
  );
}
