import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useGameStore } from '../core/GameStore';
import { InputManager, InputMode } from '../core/InputManager';
import { AudioManager } from '../core/AudioManager';
import { Platform } from '../core/Platform';
import { launchMission, pauseMission, resumeMission } from '../core/MissionLauncher';
import { xrStore } from '../core/XRStore';
import { SettingsPanel } from './SettingsPanel';
import { LevelUpModal } from './LevelUpModal';
import { TouchControls } from './TouchControls';
import { PwaInstallPrompt, BeforeInstallEvent } from './PwaInstallPrompt';
import { pwaInstallMode, readPwaDismissed, writePwaDismissed } from './pwaInstall';
import { VictoryScreen } from './VictoryScreen';
import { MainMenu } from './MainMenu';
import { StatusBar } from './StatusBar';
import { GREEN, INK, solidButton } from './uiStyles';

function isDesktopPointer(inputMode: InputMode): boolean {
  return inputMode === 'DESKTOP' && Platform.hasMouse;
}

export function HUD() {
  const status = useGameStore((s) => s.status);
  const timeRemaining = useGameStore((s) => (s.status !== 'PLAYING' ? s.timeRemaining : 0));
  const recordKills = useGameStore((s) => s.recordKills);
  const showStatusBar = useGameStore((s) => s.settings.showHud2D);
  const levelUpPending = useGameStore((s) => s.levelUpPending);
  const difficulty = useGameStore((s) => s.settings.difficulty);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const lastRun = useGameStore((s) => s.lastRun);
  const leaderboard = useGameStore((s) => s.leaderboard);
  // End screens show the board of the difficulty the run was played on; the start menu shows the selected one
  const board = leaderboard[lastRun?.entry.difficulty ?? difficulty];
  const kills = useGameStore((s) => s.kills),
    shotsFired = useGameStore((s) => s.shotsFired);
  const shotsHit = useGameStore((s) => s.shotsHit),
    damageFlash = useGameStore((s) => s.damageFlash);

  const [inputMode, setInputMode] = useState<InputMode>(InputManager.mode);
  const [isQuest] = useState(() => Platform.isQuest);
  const [isVrApp] = useState(() => Platform.isVrApp);
  // Desktop and other browsers offer VR only when a headset is actually available
  const [vrSupported, setVrSupported] = useState(() => Platform.isVrApp);
  const hasXrSession = useStore(xrStore, (s) => s.session != null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [pwaDismissed, setPwaDismissed] = useState(readPwaDismissed);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallEvent | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (Platform.isVrApp) return;
    navigator.xr
      ?.isSessionSupported('immersive-vr')
      .then(setVrSupported)
      .catch((e) => console.warn('[HUD] VR support check failed', e));
  }, []);

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
    if (mode === 'VR') {
      // Enter first (this must happen inside the click): a failed entry must not leave a flat mission running
      try {
        await xrStore.enterVR();
      } catch (e) {
        console.warn('[HUD] enterVR failed', e);
        return;
      }
      if (!xrStore.getState().session) return;
    }
    launchMission();
    try {
      await navigator.wakeLock?.request('screen');
    } catch {
      /* wake lock unsupported or denied: non-fatal */
    }
    if (mode !== 'VR' && isDesktopPointer(inputMode)) InputManager.requestPointerLock();
  };

  const handleResume = () => {
    AudioManager.play2D('ui_beep', 0.65);
    resumeMission();
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
            // A faint red wash over the whole view, and blood-red closing in from the edges
            background: `radial-gradient(ellipse at center, rgba(160, 0, 0, ${damageFlash * 0.16}) 0%, rgba(170, 5, 5, ${damageFlash * 0.2}) 35%, rgba(190, 8, 8, ${damageFlash * 0.85}) 100%)`,
            pointerEvents: 'none'
          }}
        />
      )}
      {status === 'PLAYING' && levelUpPending && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#9aeaff',
            fontSize: 12,
            letterSpacing: 3,
            textShadow: '0 0 8px rgba(120, 220, 255, 0.7)'
          }}
        >
          FIELD PROMOTION READY - HOLD THE LINE
        </div>
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
      {status === 'PLAYING' && showStatusBar && inputMode !== 'XR' && !isQuest && <StatusBar />}
      {status === 'PLAYING' && inputMode === 'TOUCH' && !isQuest && <TouchControls onPause={pauseMission} />}
      {isVrApp && !hasXrSession && (
        // On Quest the flat page is only ever seen after leaving VR: offer the way back in
        <button
          onClick={() =>
            xrStore
              .enterVR()
              .then(() => AudioManager.unlock())
              .catch((e) => console.warn('[HUD] enterVR failed', e))
          }
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
            zIndex: 100,
            boxShadow: '0 0 25px rgba(0,255,136,0.6)'
          })}
        >
          ENTER VR
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
        <VictoryScreen
          kills={kills}
          accuracy={accuracy}
          best={best}
          lastRun={lastRun}
          board={board}
          onRedeploy={() => handleLaunch('STANDARD')}
        />
      )}
      {!isVrApp && (status === 'MENU' || status === 'DEFEAT') && (
        <MainMenu
          status={status}
          vrCapable={vrSupported}
          stats={{ timeRemaining, kills, accuracy, best }}
          difficulty={difficulty}
          onDifficulty={(id) => updateSettings({ difficulty: id })}
          lastRun={status === 'DEFEAT' ? lastRun : null}
          board={status === 'DEFEAT' ? board : leaderboard[difficulty]}
          onLaunch={handleLaunch}
        />
      )}
    </div>
  );
}
