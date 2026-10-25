// Usage: node scripts/tick-progress.mjs P0.3 <hash> ["note"]  — marks a task done in .ai/UPLIFT_PROGRESS.md
import { readFileSync, writeFileSync } from 'node:fs';

const [id, hash = '', note = ''] = process.argv.slice(2);
const file = '.ai/UPLIFT_PROGRESS.md';
const lines = readFileSync(file, 'utf8').split('\n');
const idx = lines.findIndex((l) => l.startsWith(`- [ ] ${id} `) || l.startsWith(`- [x] ${id} `));
if (idx < 0) {
  console.error(`task ${id} not found`);
  process.exit(1);
}
const text = lines[idx].replace(/^- \[[ x]\] (\S+)(?: \([0-9a-f]+\))? /, '');
lines[idx] = `- [x] ${id}${hash ? ` (${hash})` : ''} ${text}${note ? ` — ${note}` : ''}`;
writeFileSync(file, lines.join('\n'));
