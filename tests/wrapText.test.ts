import { describe, it, expect } from 'vitest';
import { wrapText } from '../src/ui/wrapText';
import { UPGRADE_CATALOG } from '../src/data/balance';

describe('wrapText', () => {
  it('wraps on word boundaries within the width', () => {
    expect(wrapText('Extended 150-Round Ammo Capacity', 16, 4)).toEqual(['Extended', '150-Round Ammo', 'Capacity']);
    for (const line of wrapText('Extended 150-Round Ammo Capacity & Instant Reload', 22, 4)) {
      expect(line.length).toBeLessThanOrEqual(22);
    }
  });

  it('cuts with an ellipsis past the line limit and splits over-long words', () => {
    const lines = wrapText('one two three four five six seven eight nine ten', 10, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(wrapText('abcdefghijkl', 5, 5)).toEqual(['abcde', 'fghij', 'kl']);
  });

  it('fits every upgrade card in the VR layout (titles in 2 lines, descriptions in 3)', () => {
    for (const u of UPGRADE_CATALOG) {
      expect(wrapText(u.title, 22, 2).join(' ')).not.toContain('…');
      expect(wrapText(u.desc, 22, 3).join(' ')).not.toContain('…');
    }
  });
});
