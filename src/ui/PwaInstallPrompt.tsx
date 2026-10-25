import { GREEN, solidButton, overlay } from './uiStyles';

export interface BeforeInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Full-screen gate shown to mobile browsers that have not installed the PWA. */
export function PwaInstallPrompt({
  canPrompt,
  onInstall,
  onLaunchInstalled
}: {
  canPrompt: boolean;
  onInstall: () => void;
  onLaunchInstalled: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={overlay({ position: 'fixed', inset: 0, background: 'rgba(2, 6, 4, 0.96)', zIndex: 100 })}
    >
      <div
        style={{
          border: `2px solid ${GREEN}`,
          padding: '26px 24px',
          maxWidth: 460,
          background: 'rgba(0, 20, 10, 0.92)',
          borderRadius: 6,
          boxShadow: '0 0 35px rgba(0, 255, 136, 0.3)'
        }}
      >
        <div style={{ color: '#ffaa33', fontSize: 13, letterSpacing: 3, marginBottom: 8 }}>
          WEYLAND-YUTANI // USCM PROTOCOL
        </div>
        <h2 style={{ fontSize: 24, letterSpacing: 4, color: GREEN, marginBottom: 12 }}>PWA INSTALLATION MANDATORY</h2>
        <p style={{ color: '#99d6be', fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
          Mobile browser play is restricted. Install the simulator to your Home Screen for full hardware acceleration,
          low-latency haptics, and fullscreen targeting.
        </p>
        {canPrompt ? (
          <button
            onClick={onInstall}
            style={solidButton({
              width: '100%',
              padding: '14px 20px',
              fontSize: 18,
              letterSpacing: 2,
              marginBottom: 12
            })}
          >
            INSTALL MISSION PWA
          </button>
        ) : (
          <div
            style={{
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.35)',
              padding: '12px 14px',
              borderRadius: 4,
              fontSize: 13,
              color: '#aaffd4',
              marginBottom: 14,
              textAlign: 'left',
              lineHeight: 1.6
            }}
          >
            <div>
              1. Tap Safari Share button <strong>[ ⎋ ]</strong>
            </div>
            <div>
              2. Select <strong>"Add to Home Screen" [+]</strong>
            </div>
            <div>3. Launch from your Home Screen app icon</div>
          </div>
        )}
        <button
          onClick={onLaunchInstalled}
          style={{
            width: '100%',
            background: 'rgba(0, 255, 136, 0.12)',
            border: `1px solid ${GREEN}`,
            color: GREEN,
            padding: '10px 16px',
            fontSize: 13,
            fontFamily: 'inherit',
            letterSpacing: 2,
            cursor: 'pointer',
            borderRadius: 4
          }}
        >
          TRIGGER / LAUNCH INSTALLED PWA
        </button>
      </div>
    </div>
  );
}
