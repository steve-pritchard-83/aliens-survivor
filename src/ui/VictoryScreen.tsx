import { useState } from 'react';
import { GREEN, solidButton } from './uiStyles';
import { Leaderboard } from './Leaderboard';
import type { ScoreEntry } from '../systems/scoring';
import type { RunSummary } from '../core/GameTypes';

/** Extraction video followed by the victory banner and stats bar. */
export function VictoryScreen({
  kills,
  accuracy,
  best,
  lastRun,
  board,
  onRedeploy
}: {
  kills: number;
  accuracy: number;
  best: number;
  lastRun: RunSummary | null;
  board: readonly ScoreEntry[];
  onRedeploy: () => void;
}) {
  const [videoEnded, setVideoEnded] = useState(false);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 60,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <video
        src="/movies/victory.mp4"
        autoPlay
        playsInline
        onEnded={() => setVideoEnded(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {videoEnded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.42)',
            zIndex: 64,
            pointerEvents: 'none'
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(54px, 11vw, 96px)',
              letterSpacing: 10,
              color: GREEN,
              textShadow: '0 0 35px rgba(0, 255, 136, 0.85), 0 0 70px rgba(0, 255, 136, 0.45)',
              fontWeight: 'bold',
              margin: 0
            }}
          >
            VICTORY
          </h1>
          <p
            style={{
              color: '#cceecc',
              fontSize: 'clamp(12px, 2.5vw, 17px)',
              letterSpacing: 5,
              textShadow: '0 0 10px rgba(0,0,0,0.9)',
              marginTop: 8
            }}
          >
            EXTRACTION SUCCESSFUL // SECTOR 4 SECURED
          </p>
          {lastRun && (
            <p
              style={{ color: '#ffcc66', letterSpacing: 4, fontSize: 'clamp(14px, 3vw, 22px)', margin: '18px 0 10px' }}
            >
              SCORE {lastRun.entry.score.toLocaleString('en-US')}{' '}
              {lastRun.rank > 0 ? `// RANK #${lastRun.rank}` : '// UNRANKED'}
            </p>
          )}
          <Leaderboard entries={board} highlightRank={lastRun ? lastRun.rank : -1} />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 22,
          zIndex: 65,
          color: GREEN,
          textShadow: '0 0 10px rgba(0,0,0,0.9)',
          letterSpacing: 3,
          fontSize: 16
        }}
      >
        USS SULACO // EXTRACTION COMPLETE
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          zIndex: 65,
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          background: 'rgba(2, 10, 6, 0.85)',
          padding: '10px 20px',
          borderRadius: 6,
          border: '1px solid rgba(0, 255, 136, 0.55)',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <span style={{ color: '#aaffd4', fontSize: 13, letterSpacing: 1.5 }}>
          SURVIVAL TIME: 05:00.0 | KILLS: {kills} | ACC: {accuracy}% | BEST: {best}
        </span>
        <button onClick={onRedeploy} style={solidButton({ padding: '8px 22px', fontSize: 15, letterSpacing: 2 })}>
          REDEPLOY MARINE
        </button>
      </div>
    </div>
  );
}
