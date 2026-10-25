import { GREEN, INK, solidButton, overlay } from './uiStyles';
import { PwaInstallMode, INSTALL_STEPS } from './pwaInstall';

export interface BeforeInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Optional install suggestion for mobile browsers: playing in the browser is always one tap away. */
export function PwaInstallPrompt({
  mode,
  onInstall,
  onContinue
}: {
  mode: PwaInstallMode;
  onInstall: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install the app"
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
        <h2 style={{ fontSize: 24, letterSpacing: 4, color: GREEN, marginBottom: 12 }}>
          INSTALL FOR THE BEST EXPERIENCE
        </h2>
        <p style={{ color: '#99d6be', fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
          Installing adds a home screen icon, fullscreen play and offline support. You can also play right now in the
          browser.
        </p>
        <button
          onClick={onContinue}
          style={solidButton({
            width: '100%',
            padding: '14px 20px',
            fontSize: 18,
            letterSpacing: 2,
            color: INK,
            marginBottom: 12
          })}
        >
          PLAY IN BROWSER
        </button>
        {mode === 'native' ? (
          <button
            onClick={onInstall}
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
            INSTALL APP
          </button>
        ) : (
          <ol
            aria-label="How to install"
            style={{
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.35)',
              padding: '12px 14px 12px 32px',
              borderRadius: 4,
              fontSize: 13,
              color: '#aaffd4',
              textAlign: 'left',
              lineHeight: 1.6
            }}
          >
            {INSTALL_STEPS[mode].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
