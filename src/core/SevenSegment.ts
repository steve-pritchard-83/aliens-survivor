const SEG_MAP: Record<string, number> = {
  '0': 0b1111110,
  '1': 0b0110000,
  '2': 0b1101101,
  '3': 0b1111001,
  '4': 0b0110011,
  '5': 0b1011011,
  '6': 0b1011111,
  '7': 0b1110000,
  '8': 0b1111111,
  '9': 0b1111011,
  '-': 0b0000001,
  J: 0b0111100,
  M: 0b1110110
};

export function draw7SegmentCounter(ctx: CanvasRenderingContext2D, text: string, color = '#ff1a11') {
  ctx.fillStyle = '#070101';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#1f0606';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 124, 60);
  const drawDigit = (ch: string, ox: number, oy: number, w: number, h: number) => {
    const mask = SEG_MAP[ch] ?? 0,
      t = 6,
      hw = h / 2;
    const segs: [number, number, number, number, number][] = [
      [0b1000000, ox + t, oy, w - 2 * t, t],
      [0b0100000, ox + w - t, oy + t, t, hw - t],
      [0b0010000, ox + w - t, oy + hw + 2, t, hw - t],
      [0b0001000, ox + t, oy + h - t, w - 2 * t, t],
      [0b0000100, ox, oy + hw + 2, t, hw - t],
      [0b0000010, ox, oy + t, t, hw - t],
      [0b0000001, ox + t, oy + hw - t / 2, w - 2 * t, t]
    ];
    segs.forEach(([bit, sx, sy, sw, sh]) => {
      const lit = (mask & bit) !== 0;
      ctx.shadowBlur = lit ? 8 : 0;
      ctx.shadowColor = color;
      ctx.fillStyle = lit ? color : '#220505';
      ctx.fillRect(sx, sy, sw, sh);
    });
  };
  const padded = text.padStart(2, '0').slice(-2);
  drawDigit(padded[0], 18, 9, 38, 46);
  drawDigit(padded[1], 72, 9, 38, 46);
  ctx.shadowBlur = 0;
}
