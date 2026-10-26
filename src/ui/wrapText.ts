/**
 * Greedy word wrap for monospace canvas text: breaks `text` into lines of at most `maxChars`, and at most
 * `maxLines` lines (the last one is cut with an ellipsis if there is more). A single word longer than a line is
 * split rather than overflowing.
 */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  for (let word of words) {
    while (word.length > maxChars) {
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = (last.length >= maxChars ? last.slice(0, maxChars - 1) : last) + '…';
  return kept;
}
