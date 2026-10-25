import type { ScoreEntry } from '../systems/scoring';
import { formatTimer, GREEN } from './uiStyles';

const cell = { padding: '3px 10px', textAlign: 'right' } as const;

/** Top scores for one difficulty; `highlightRank` marks the run that was just played (1-based, -1 for none). */
export function Leaderboard({
  entries,
  highlightRank = -1,
  limit = 5
}: {
  entries: readonly ScoreEntry[];
  highlightRank?: number;
  limit?: number;
}) {
  if (entries.length === 0) return null;
  return (
    <table
      aria-label="Leaderboard"
      style={{ borderCollapse: 'collapse', color: '#aaffd4', fontSize: 13, letterSpacing: 1, margin: '0 auto 16px' }}
    >
      <thead>
        <tr style={{ color: GREEN, borderBottom: '1px solid rgba(0, 255, 136, 0.4)' }}>
          {['#', 'SCORE', 'KILLS', 'ACC', 'TIME'].map((h) => (
            <th key={h} scope="col" style={{ ...cell, fontWeight: 'normal' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.slice(0, limit).map((e, i) => (
          <tr
            key={`${e.date}-${i}`}
            aria-current={i + 1 === highlightRank ? 'true' : undefined}
            style={i + 1 === highlightRank ? { color: '#ffcc66', background: 'rgba(255, 204, 102, 0.12)' } : undefined}
          >
            <td style={cell}>{i + 1}</td>
            <td style={cell}>{e.score.toLocaleString('en-US')}</td>
            <td style={cell}>{e.kills}</td>
            <td style={cell}>{e.accuracy}%</td>
            <td style={cell}>{formatTimer(e.survivedSeconds).slice(0, 5)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
