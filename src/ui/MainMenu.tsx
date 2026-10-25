import { GREEN, RED, INK, solidButton, overlay, formatTimer } from './uiStyles';
import { ChoiceRow, Choice } from './SettingsControls';
import { DIFFICULTY, DIFFICULTY_ORDER, DifficultyId } from '../data/difficulty';
import type { ScoreEntry } from '../systems/scoring';
import type { RunSummary } from '../core/GameTypes';
import { Leaderboard } from './Leaderboard';

const DIFFICULTY_CHOICES: readonly Choice<DifficultyId>[] = DIFFICULTY_ORDER.map((id) => ({
  value: id,
  label: DIFFICULTY[id].label
}));

export interface MenuStats {
  timeRemaining: number;
  kills: number;
  accuracy: number;
  best: number;
}

/** Start and defeat screen for desktop, touch and VR-capable browsers. */
export function MainMenu({
  status,
  vrCapable,
  stats,
  difficulty,
  onDifficulty,
  lastRun,
  board,
  onLaunch
}: {
  status: 'MENU' | 'DEFEAT';
  vrCapable: boolean;
  stats: MenuStats;
  difficulty: DifficultyId;
  onDifficulty: (id: DifficultyId) => void;
  /** The run that just ended (defeat screen) and the leaderboard for the difficulty it was played on. */
  lastRun: RunSummary | null;
  board: readonly ScoreEntry[];
  onLaunch: (mode: 'STANDARD' | 'VR') => void;
}) {
  const defeat = status === 'DEFEAT';
  const accent = defeat ? RED : GREEN;
  const intro = vrCapable
    ? 'META QUEST 2 DETECTED. Dual 6DoF Touch Motion Controls & Stereoscopic 3D ready.'
    : 'USS SULACO — SECTOR 4 CORRIDOR. Emergency klaxons active. Hold the corridor against Xenomorph breaches for 5 minutes until rescue dropship extraction.';
  const summary = `SURVIVAL TIME: ${formatTimer(300 - stats.timeRemaining)} | XENOMORPHS ELIMINATED: ${stats.kills} | ACCURACY: ${stats.accuracy}% | BEST: ${stats.best}`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={overlay({
        position: 'absolute',
        inset: 0,
        background: 'rgba(3, 8, 6, 0.95)',
        cursor: 'default',
        zIndex: 30
      })}
    >
      <h1 style={{ fontSize: 50, letterSpacing: 5, color: accent, marginBottom: 8 }}>
        {defeat ? 'MIA // BIO-SIGNALS FLATLINED' : 'ALIENS SURVIVOR'}
      </h1>
      <p
        style={{
          maxWidth: 540,
          color: defeat ? '#ff9999' : '#99d6be',
          fontSize: 15,
          lineHeight: 1.5,
          marginBottom: 20
        }}
      >
        {defeat ? summary : intro}
      </p>
      {!defeat && stats.best > 0 && (
        <p style={{ color: '#ffcc66', letterSpacing: 3, fontSize: 14, marginBottom: 18 }}>BEST: {stats.best} KILLS</p>
      )}
      {defeat && lastRun && (
        <p style={{ color: '#ffcc66', letterSpacing: 3, fontSize: 16, marginBottom: 10 }}>
          SCORE: {lastRun.entry.score.toLocaleString('en-US')}{' '}
          {lastRun.rank > 0 ? `// RANK #${lastRun.rank}` : '// UNRANKED'}
        </p>
      )}
      <Leaderboard entries={board} highlightRank={defeat && lastRun ? lastRun.rank : -1} limit={defeat ? 5 : 3} />
      <div style={{ width: 'min(440px, 90vw)', marginBottom: 20 }}>
        <ChoiceRow label="Difficulty" value={difficulty} choices={DIFFICULTY_CHOICES} onChange={onDifficulty} />
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {vrCapable ? (
          <button
            onClick={() => onLaunch('VR')}
            style={solidButton({
              padding: '20px 48px',
              fontSize: 24,
              letterSpacing: 3,
              borderRadius: 6,
              boxShadow: '0 0 35px rgba(0,255,136,0.85)'
            })}
          >
            ▶ DEPLOY 3D VR
          </button>
        ) : (
          <>
            <button
              onClick={() => onLaunch('STANDARD')}
              style={solidButton({
                padding: '14px 32px',
                fontSize: 20,
                letterSpacing: 2,
                background: accent,
                color: defeat ? '#fff' : INK
              })}
            >
              {defeat ? 'REDEPLOY MARINE' : 'INITIATE COMBAT DROP'}
            </button>
            <button
              onClick={() => onLaunch('VR')}
              style={{
                padding: '14px 28px',
                fontSize: 18,
                fontFamily: 'inherit',
                letterSpacing: 2,
                background: 'transparent',
                color: defeat ? '#ff6666' : GREEN,
                border: `2px solid ${defeat ? '#ff6666' : GREEN}`,
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ENTER META QUEST XR
            </button>
          </>
        )}
      </div>
    </div>
  );
}
